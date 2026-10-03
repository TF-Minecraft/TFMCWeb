package net.tfminecraft.tfmcweb.patreon;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.function.LongSupplier;
import java.util.logging.Level;

import org.bukkit.Bukkit;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import net.tfminecraft.tfmcweb.Cache;
import net.tfminecraft.tfmcweb.api.PatreonClient;
import net.tfminecraft.tfmcweb.api.PatreonClient.AckResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.RankChange;
import net.tfminecraft.tfmcweb.api.PatreonClient.RankChangesResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.RosterMember;
import net.tfminecraft.tfmcweb.api.PatreonClient.RosterResult;

/**
 * Polls the LuckPerms outbox on the one server configured to apply ranks.
 * Other servers leave this idle. Groups outside the configured mapping are never touched.
 */
public final class PatreonRankWriter {

	@FunctionalInterface
	public interface StoreOpener {
		PatreonGroupStore open();
	}

	private final JavaPlugin plugin;
	private final StoreOpener opener;
	private final LongSupplier clock;
	private BukkitTask task;
	private PatreonGroupStore store;
	private boolean active;
	private boolean loggedLuckPermsMissing;
	private long nextReconcileAt;

	public PatreonRankWriter(JavaPlugin plugin) {
		this(plugin, PatreonRankWriter::openLuckPerms, System::currentTimeMillis);
	}

	PatreonRankWriter(JavaPlugin plugin, StoreOpener opener, LongSupplier clock) {
		this.plugin = plugin;
		this.opener = opener;
		this.clock = clock;
	}

	/**
	 * Loads the LuckPerms store by name so this class does not reference the API.
	 * Absent LuckPerms then disables only the writer.
	 */
	static PatreonGroupStore openLuckPerms() {
		try {
			Class<?> type = Class.forName("net.tfminecraft.tfmcweb.patreon.LuckPermsPatreonGroupStore");
			return (PatreonGroupStore) type.getMethod("open").invoke(null);
		} catch (ReflectiveOperationException | NoClassDefFoundError e) {
			throw new IllegalStateException("LuckPerms API is not available", e);
		}
	}

	public void refresh() {
		stop();
		if (!Cache.patreonEnabled || !Cache.patreonApplyRanks) {
			return;
		}
		if (!luckPermsPresent()) {
			if (!loggedLuckPermsMissing) {
				plugin.getLogger().warning(
					"LuckPerms is not installed; Patreon rank writer disabled."
				);
				loggedLuckPermsMissing = true;
			}
			return;
		}
		try {
			store = opener.open();
		} catch (RuntimeException e) {
			plugin.getLogger().log(
				Level.WARNING,
				"[patreon] LuckPerms is unavailable; rank writer disabled",
				e
			);
			return;
		}
		if (store == null) {
			plugin.getLogger().warning("[patreon] LuckPerms is unavailable; rank writer disabled");
			return;
		}
		long ticks = Math.max(1, Cache.patreonPollSeconds) * 20L;
		task = Bukkit.getScheduler().runTaskTimerAsynchronously(plugin, this::tick, ticks, ticks);
		if (task == null) {
			store = null;
			plugin.getLogger().warning("[patreon] Could not schedule the rank writer");
			return;
		}
		active = true;
		nextReconcileAt = clock.getAsLong();
	}

	public void stop() {
		active = false;
		store = null;
		if (task != null) {
			task.cancel();
			task = null;
		}
	}

	public boolean isRunning() {
		return active && task != null;
	}

	public String statusDetail() {
		return statusText(isRunning());
	}

	public static String statusText(boolean running) {
		String text = "enabled=" + Cache.patreonEnabled
			+ " apply-ranks=" + Cache.patreonApplyRanks
			+ " poll=" + Cache.patreonPollSeconds + "s"
			+ " reconcile=" + Cache.patreonReconcileMinutes + "m"
			+ " writer=";
		if (running) {
			return text + "on";
		}
		if (Cache.patreonEnabled && Cache.patreonApplyRanks) {
			return text + "off (LuckPerms unavailable)";
		}
		return text + "off";
	}

	private void tick() {
		PatreonGroupStore current = store;
		if (!active || current == null) {
			return;
		}
		try {
			pollChanges(current);
		} catch (RuntimeException e) {
			plugin.getLogger().log(Level.WARNING, "[patreon] rank poll failed", e);
		}
		current = store;
		if (!active || current == null) {
			return;
		}
		long now = clock.getAsLong();
		if (now < nextReconcileAt) {
			return;
		}
		try {
			if (reconcile(current)) {
				nextReconcileAt = now + reconcileIntervalMillis();
			}
		} catch (RuntimeException e) {
			plugin.getLogger().log(Level.WARNING, "[patreon] roster reconcile failed", e);
		}
	}

	private void pollChanges(PatreonGroupStore current) {
		RankChangesResult result = PatreonClient.listRankChanges();
		if (!result.ok) {
			plugin.getLogger().warning("[patreon] rank-changes: " + result.error);
			return;
		}
		if (result.changes.isEmpty()) {
			return;
		}
		List<Integer> applied = new ArrayList<>();
		for (RankChange change : result.changes) {
			try {
				if (applyChange(current, change)) {
					applied.add(Integer.valueOf(change.id));
				}
			} catch (RuntimeException e) {
				plugin.getLogger().log(
					Level.WARNING,
					"[patreon] rank change " + change.id + " failed",
					e
				);
			}
		}
		if (applied.isEmpty()) {
			return;
		}
		AckResult ack = PatreonClient.ackRankChanges(applied);
		if (!ack.ok) {
			plugin.getLogger().warning("[patreon] rank-changes ack failed: " + ack.error);
			return;
		}
		plugin.getLogger().info("[patreon] applied " + applied.size() + " rank change(s)");
	}

	private boolean applyChange(PatreonGroupStore current, RankChange change) {
		UUID player = parseUuid(change.playerUuid);
		if (player == null) {
			plugin.getLogger().warning("[patreon] rank change " + change.id + " has no player UUID");
			return false;
		}
		String addGroup = null;
		if (change.addTier != null) {
			addGroup = mappedGroup(change.addTier);
			if (addGroup == null) {
				plugin.getLogger().warning(
					"[patreon] rank change " + change.id + " has unmapped tier " + change.addTier
				);
				return false;
			}
		}
		Set<String> remove = new LinkedHashSet<>();
		for (String tier : change.removeTiers) {
			if (tier == null || tier.isBlank()) {
				continue;
			}
			String group = mappedGroup(tier);
			if (group == null) {
				plugin.getLogger().warning(
					"[patreon] rank change " + change.id + " skipped unmapped removal " + tier
				);
				continue;
			}
			if (sameGroup(addGroup, group)) {
				continue;
			}
			remove.add(group);
		}
		if (!current.setGroups(player, addGroup, remove)) {
			plugin.getLogger().warning("[patreon] rank change " + change.id + " was not saved");
			return false;
		}
		return true;
	}

	private boolean reconcile(PatreonGroupStore current) {
		RosterResult result = PatreonClient.listRoster();
		if (!result.ok) {
			plugin.getLogger().warning("[patreon] roster: " + result.error);
			return false;
		}
		boolean saved = true;
		for (RosterMember member : result.members) {
			if (!reconcileMember(current, member)) {
				saved = false;
			}
		}
		if (saved) {
			plugin.getLogger().info("[patreon] reconciled " + result.members.size() + " player(s)");
		}
		return saved;
	}

	private boolean reconcileMember(PatreonGroupStore current, RosterMember member) {
		UUID player = parseUuid(member.playerUuid);
		if (player == null) {
			plugin.getLogger().warning("[patreon] roster skipped an invalid player UUID");
			return true;
		}
		String desired = null;
		if (member.tierKey != null) {
			desired = mappedGroup(member.tierKey);
			if (desired == null) {
				plugin.getLogger().warning(
					"[patreon] roster skipped unmapped tier " + member.tierKey + " for " + player
				);
				return true;
			}
		}
		Set<String> remove = new LinkedHashSet<>();
		for (String group : Cache.patreonGroups.values()) {
			if (sameGroup(desired, group)) {
				continue;
			}
			remove.add(group);
		}
		if (!current.setGroups(player, desired, remove)) {
			plugin.getLogger().warning("[patreon] roster save failed for " + player);
			return false;
		}
		return true;
	}

	private static UUID parseUuid(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		try {
			return UUID.fromString(raw.trim());
		} catch (IllegalArgumentException e) {
			return null;
		}
	}

	private static boolean sameGroup(String left, String right) {
		if (left == null || right == null) {
			return false;
		}
		return left.toLowerCase(Locale.ROOT).equals(right.toLowerCase(Locale.ROOT));
	}

	/** @return the configured LuckPerms group, or null when the tier is not mapped */
	private static String mappedGroup(String tierKey) {
		if (tierKey == null || tierKey.isBlank()) {
			return null;
		}
		String group = Cache.patreonGroups.get(tierKey.trim().toLowerCase(Locale.ROOT));
		if (group == null || group.isBlank()) {
			return null;
		}
		return group.trim();
	}

	private static long reconcileIntervalMillis() {
		int minutes = Cache.patreonReconcileMinutes;
		if (minutes < 1) {
			minutes = 30;
		}
		return minutes * 60_000L;
	}

	private static boolean luckPermsPresent() {
		if (Bukkit.getPluginManager() == null) {
			return false;
		}
		Plugin luckPerms = Bukkit.getPluginManager().getPlugin("LuckPerms");
		return luckPerms != null && luckPerms.isEnabled();
	}
}
