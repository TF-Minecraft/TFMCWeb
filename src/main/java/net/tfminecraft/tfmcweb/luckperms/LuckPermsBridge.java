package net.tfminecraft.tfmcweb.luckperms;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;
import java.util.function.Supplier;
import java.util.logging.Level;

import org.bukkit.Bukkit;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.java.JavaPlugin;

import com.google.gson.JsonObject;

import net.tfminecraft.tfmcweb.Cache;
import net.tfminecraft.tfmcweb.TFMCWeb;
import net.tfminecraft.tfmcweb.api.LuckPermsBridgeClient;
import net.tfminecraft.tfmcweb.api.LuckPermsBridgeClient.CallResult;
import net.tfminecraft.tfmcweb.api.LuckPermsBridgeClient.Change;
import net.tfminecraft.tfmcweb.api.LuckPermsBridgeClient.ChangeResult;
import net.tfminecraft.tfmcweb.api.LuckPermsBridgeClient.ChangesResult;
import net.tfminecraft.tfmcweb.api.LuckPermsBridgeClient.UnchangedResult;

/**
 * Bridges LuckPerms and the staff panel. It publishes LuckPerms snapshots to this
 * server's site and, on the one server configured to apply, applies staff-queued
 * changes. One worker thread does both, so a snapshot never predates an applied change.
 */
public final class LuckPermsBridge {

	static final int REMEMBERED_RESULTS = 500;
	static final long STOP_WAIT_SECONDS = 10;

	@FunctionalInterface
	public interface StoreOpener {
		BridgeStore open();
	}

	private final JavaPlugin plugin;
	private final StoreOpener opener;
	private final Supplier<ScheduledExecutorService> workers;
	private final LongSupplier clock;

	/** Recent results by change id: a guard so a change seen twice is never applied twice. */
	private final Map<Long, ChangeResult> remembered = new LinkedHashMap<>() {
		@Override
		protected boolean removeEldestEntry(Map.Entry<Long, ChangeResult> eldest) {
			return size() > REMEMBERED_RESULTS;
		}
	};
	/** Results the site has not acknowledged yet; posted again every tick until it does. */
	private final Map<Long, ChangeResult> unposted = new LinkedHashMap<>();
	private final Set<String> failing = new HashSet<>();

	private ScheduledExecutorService worker;
	private volatile BridgeStore store;
	private volatile boolean active;
	private volatile long lastPublishedAt;
	private boolean loggedLuckPermsMissing;
	private boolean applying;
	private long snapshotMillis;
	private long nextSnapshotAt;
	private String uploadedHash;
	/** Last revision handed out; survives reloads, and the clock carries it across restarts. */
	private long lastRevision;

	public LuckPermsBridge(JavaPlugin plugin) {
		this(plugin, LuckPermsBridge::openLuckPerms, LuckPermsBridge::newWorker, System::currentTimeMillis);
	}

	LuckPermsBridge(
		JavaPlugin plugin,
		StoreOpener opener,
		Supplier<ScheduledExecutorService> workers,
		LongSupplier clock
	) {
		this.plugin = plugin;
		this.opener = opener;
		this.workers = workers;
		this.clock = clock;
	}

	/**
	 * Loads the LuckPerms store by name so this class does not reference the API.
	 * Absent LuckPerms then disables only the bridge.
	 */
	static BridgeStore openLuckPerms() {
		try {
			Class<?> type = Class.forName("net.tfminecraft.tfmcweb.luckperms.LuckPermsBridgeStore");
			return (BridgeStore) type.getMethod("open").invoke(null);
		} catch (ReflectiveOperationException | NoClassDefFoundError e) {
			throw new IllegalStateException("LuckPerms API is not available", e);
		}
	}

	static ScheduledExecutorService newWorker() {
		return Executors.newSingleThreadScheduledExecutor(task -> {
			Thread thread = new Thread(task, "TFMCWeb-LuckPerms");
			thread.setDaemon(true);
			return thread;
		});
	}

	public void refresh() {
		stop();
		if (!enabled()) {
			return;
		}
		if (!luckPermsPresent()) {
			if (!loggedLuckPermsMissing) {
				plugin.getLogger().warning("LuckPerms is not installed; LuckPerms bridge disabled.");
				loggedLuckPermsMissing = true;
			}
			return;
		}
		BridgeStore opened;
		try {
			opened = opener.open();
		} catch (RuntimeException e) {
			plugin.getLogger().log(Level.WARNING, "[luckperms] LuckPerms is unavailable; bridge disabled", e);
			return;
		}
		if (opened == null) {
			plugin.getLogger().warning("[luckperms] LuckPerms is unavailable; bridge disabled");
			return;
		}
		applying = Cache.luckPermsBridgeApply;
		snapshotMillis = Cache.luckPermsBridgeSnapshotSeconds * 1000L;
		long period = applying ? Cache.luckPermsBridgePollSeconds : Cache.luckPermsBridgeSnapshotSeconds;
		nextSnapshotAt = 0L;
		uploadedHash = null;
		failing.clear();
		store = opened;
		active = true;
		worker = workers.get();
		worker.scheduleWithFixedDelay(this::tick, 1L, Math.max(1L, period), TimeUnit.SECONDS);
	}

	/** Stops the worker, letting a running pass finish so LuckPerms is never left half-changed. */
	public void stop() {
		active = false;
		store = null;
		ScheduledExecutorService current = worker;
		worker = null;
		if (current == null) {
			return;
		}
		current.shutdown();
		try {
			if (!current.awaitTermination(STOP_WAIT_SECONDS, TimeUnit.SECONDS)) {
				current.shutdownNow();
			}
		} catch (InterruptedException e) {
			current.shutdownNow();
			Thread.currentThread().interrupt();
		}
	}

	public boolean isRunning() {
		return active && worker != null;
	}

	public String statusDetail() {
		String text = statusText(isRunning());
		if (!isRunning()) {
			return text;
		}
		long at = lastPublishedAt;
		if (at == 0L) {
			return text + " last-snapshot=never";
		}
		return text + " last-snapshot=" + Math.max(0L, (clock.getAsLong() - at) / 1000L) + "s ago";
	}

	public static String statusText(boolean running) {
		String text = "publish=" + Cache.luckPermsBridgePublish
			+ " apply=" + Cache.luckPermsBridgeApply
			+ " poll=" + Cache.luckPermsBridgePollSeconds + "s"
			+ " snapshot=" + Cache.luckPermsBridgeSnapshotSeconds + "s"
			+ " bridge=";
		if (running) {
			return text + "on";
		}
		if (enabled()) {
			return text + "off (LuckPerms unavailable)";
		}
		return text + "off";
	}

	/** Applying needs current snapshots on the site too, so apply implies publish. */
	private static boolean enabled() {
		return Cache.luckPermsBridgePublish || Cache.luckPermsBridgeApply;
	}

	void tick() {
		BridgeStore current = store;
		if (!active || current == null) {
			return;
		}
		long now = clock.getAsLong();
		boolean applied = false;
		if (applying) {
			try {
				applied = pollChanges(current);
			} catch (RuntimeException e) {
				fail("changes", "[luckperms] change poll failed", e);
			}
		}
		if (!active) {
			return;
		}
		if (applied || now >= nextSnapshotAt) {
			nextSnapshotAt = now + snapshotMillis;
			publish(current);
		}
	}

	/** @return true when at least one change was applied in this pass */
	private boolean pollChanges(BridgeStore current) {
		boolean applied = false;
		ChangesResult batch = LuckPermsBridgeClient.listChanges();
		if (batch.ok) {
			recover("changes");
			for (Change change : batch.changes) {
				if (!active) {
					break;
				}
				Long id = Long.valueOf(change.id);
				if (remembered.containsKey(id)) {
					continue;
				}
				ChangeResult result = applyChange(current, change).withRevision(nextRevision());
				remembered.put(id, result);
				unposted.put(id, result);
				applied |= result.ok;
			}
		} else {
			fail("changes", "[luckperms] change poll failed (" + describe(batch.status) + ")", null);
		}
		postResults();
		return applied;
	}

	/** Strictly increasing across snapshots and results, and across restarts via the clock. */
	private long nextRevision() {
		lastRevision = Math.max(lastRevision + 1, clock.getAsLong());
		return lastRevision;
	}

	private ChangeResult applyChange(BridgeStore current, Change change) {
		ChangeResult result;
		try {
			result = current.apply(change);
		} catch (RuntimeException e) {
			plugin.getLogger().log(Level.WARNING, "[luckperms] change " + change.id + " failed", e);
			result = ChangeResult.failure(change.id, BridgeStore.SAVE_FAILED);
		}
		if (result.ok) {
			plugin.getLogger().info("[luckperms] applied change " + change.id
				+ (change.description == null ? "" : ": " + change.description));
		} else {
			plugin.getLogger().warning("[luckperms] change " + change.id + " refused: " + result.error);
		}
		return result;
	}

	private void postResults() {
		if (unposted.isEmpty()) {
			return;
		}
		CallResult posted = LuckPermsBridgeClient.postResults(new ArrayList<>(unposted.values()));
		if (!posted.ok) {
			fail("results", "[luckperms] change results post failed (" + describe(posted.status) + ")", null);
			return;
		}
		recover("results");
		unposted.clear();
	}

	private void publish(BridgeStore current) {
		try {
			JsonObject data = current.snapshot();
			String hash = sha256(data.toString());
			long revision = nextRevision();
			if (hash.equals(uploadedHash)) {
				UnchangedResult check = LuckPermsBridgeClient.snapshotUnchanged(hash, revision);
				if (!check.ok) {
					fail("snapshot", "[luckperms] snapshot check failed (" + describe(check.status) + ")", null);
					return;
				}
				if (check.current) {
					published();
					return;
				}
			}
			JsonObject payload = new JsonObject();
			payload.addProperty("server", TFMCWeb.getRealmId());
			payload.addProperty("generated_at", clock.getAsLong() / 1000L);
			payload.addProperty("revision", revision);
			payload.addProperty("hash", hash);
			payload.add("groups", data.get("groups"));
			payload.add("tracks", data.get("tracks"));
			payload.add("users", data.get("users"));
			CallResult upload = LuckPermsBridgeClient.putSnapshot(payload.toString());
			if (!upload.ok) {
				fail("snapshot", "[luckperms] snapshot upload failed (" + describe(upload.status) + ")", null);
				return;
			}
			uploadedHash = hash;
			published();
		} catch (Exception e) {
			fail("snapshot", "[luckperms] snapshot failed", e);
		}
	}

	private void published() {
		lastPublishedAt = clock.getAsLong();
		recover("snapshot");
	}

	static String sha256(String text) throws NoSuchAlgorithmException {
		byte[] digest = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
		return HexFormat.of().formatHex(digest);
	}

	/** Logs the first failure of a kind until it recovers, so an outage does not flood the log. */
	private void fail(String kind, String message, Exception e) {
		if (!failing.add(kind)) {
			return;
		}
		if (e == null) {
			plugin.getLogger().warning(message);
		} else {
			plugin.getLogger().log(Level.WARNING, message, e);
		}
	}

	private void recover(String kind) {
		if (failing.remove(kind)) {
			plugin.getLogger().info("[luckperms] " + kind + " working again");
		}
	}

	private static String describe(int status) {
		return status > 0 ? "HTTP " + status : "site unreachable";
	}

	private static boolean luckPermsPresent() {
		if (Bukkit.getPluginManager() == null) {
			return false;
		}
		Plugin luckPerms = Bukkit.getPluginManager().getPlugin("LuckPerms");
		return luckPerms != null && luckPerms.isEnabled();
	}
}
