package net.tfminecraft.TFMCWeb.listeners;

import java.lang.reflect.Method;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.logging.Level;

import org.bukkit.Bukkit;
import org.bukkit.event.Event;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.plugin.EventExecutor;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.java.JavaPlugin;

import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient;
import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient.IdentityStatus;
import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient.MirrorResult;
import net.tfminecraft.TFMCWeb.cache.LinkCache;

/**
 * Mirrors EssentialsX BanStatusChangeEvent → ProvinceSystem moderation outbox.
 */
public final class EssentialsBanListener {

	private static final String EVENT_CLASS = "net.ess3.api.events.BanStatusChangeEvent";

	private final JavaPlugin plugin;
	private final LinkCache linkCache;
	private boolean registered;

	public EssentialsBanListener(JavaPlugin plugin, LinkCache linkCache) {
		this.plugin = plugin;
		this.linkCache = linkCache;
	}

	public boolean register() {
		Plugin ess = Bukkit.getPluginManager().getPlugin("Essentials");
		if (ess == null || !ess.isEnabled()) {
			plugin.getLogger().info("Essentials not found — ban mirror disabled.");
			return false;
		}
		try {
			@SuppressWarnings("unchecked")
			Class<? extends Event> eventClass =
				(Class<? extends Event>) Class.forName(EVENT_CLASS);
			Listener marker = new Listener() {};
			EventExecutor executor = (listener, event) -> handle(event);
			Bukkit.getPluginManager().registerEvent(
				eventClass,
				marker,
				EventPriority.MONITOR,
				executor,
				plugin,
				true
			);
			registered = true;
			plugin.getLogger().info("Essentials ban mirror listener registered.");
			return true;
		} catch (ClassNotFoundException e) {
			plugin.getLogger().warning(
				"Essentials present but BanStatusChangeEvent missing — ban mirror disabled."
			);
			return false;
		} catch (Exception e) {
			plugin.getLogger().log(Level.WARNING, "Failed to register Essentials ban listener", e);
			return false;
		}
	}

	public boolean isRegistered() {
		return registered;
	}

	private void handle(Event event) {
		try {
			boolean nowBanned = readBanned(event);
			UUID uuid = readUuid(event);
			String name = readName(event);
			String reason = readReason(event);
			String duration = nowBanned ? readDuration(event) : null;
			String staffName = readControllerName(event);

			if (uuid == null && (name == null || name.isBlank())) {
				plugin.getLogger().fine("[ban-mirror] event missing player identity");
				return;
			}

			final boolean banned = nowBanned;
			final UUID playerUuid = uuid;
			final String mcName = name;
			final String banReason = reason;
			final String dur = duration;
			final String staff = staffName;

			Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
				UUID id = playerUuid;
				if (id == null && mcName != null) {
					@SuppressWarnings("deprecation")
					org.bukkit.OfflinePlayer offline = Bukkit.getOfflinePlayer(mcName);
					id = offline.getUniqueId();
				}
				if (id == null) {
					plugin.getLogger().warning("[ban-mirror] could not resolve UUID for " + mcName);
					return;
				}
				String discordId = resolveDiscordId(id);
				String eventType = banned ? "ban" : "unban";
				MirrorResult result = ProvinceSystemClient.postBanEvent(
					eventType,
					id.toString(),
					discordId,
					mcName,
					banReason,
					banned ? (dur != null ? dur : "Permanent") : null,
					staff
				);
				if (!result.ok) {
					plugin.getLogger().warning(
						"[ban-mirror] API failed for " + eventType + " " + mcName + ": " + result.error
					);
					return;
				}
				if (!result.mirrored) {
					plugin.getLogger().info(
						"[ban-mirror] " + eventType + " for " + mcName
							+ " — no Discord link, skip Discord side-effects"
					);
				}
			});
		} catch (Exception e) {
			plugin.getLogger().log(Level.WARNING, "[ban-mirror] handler failed", e);
		}
	}

	private String resolveDiscordId(UUID uuid) {
		LinkCache.Entry cached = linkCache.get(uuid);
		if (cached != null && cached.discordUserId != null && !cached.discordUserId.isBlank()) {
			return cached.discordUserId;
		}
		IdentityStatus status = ProvinceSystemClient.getIdentityStatus(uuid.toString());
		if (status.ok && status.discordUserId != null && !status.discordUserId.isBlank()) {
			linkCache.putFromStatus(uuid, status);
			return status.discordUserId;
		}
		return null;
	}

	private static boolean readBanned(Event event) throws Exception {
		Object value = tryInvoke(event, "getValue");
		if (value instanceof Boolean) {
			return ((Boolean) value).booleanValue();
		}
		Object banned = tryInvoke(event, "isBanned");
		if (banned instanceof Boolean) {
			return ((Boolean) banned).booleanValue();
		}
		return true;
	}

	private static UUID readUuid(Event event) throws Exception {
		Object affected = tryInvoke(event, "getAffected");
		if (affected == null) {
			return null;
		}
		Object uuid = tryInvoke(affected, "getUUID");
		if (uuid instanceof UUID) {
			return (UUID) uuid;
		}
		uuid = tryInvoke(affected, "getBase");
		if (uuid != null) {
			Object id = tryInvoke(uuid, "getUniqueId");
			if (id instanceof UUID) {
				return (UUID) id;
			}
		}
		return null;
	}

	private static String readName(Event event) throws Exception {
		Object affected = tryInvoke(event, "getAffected");
		if (affected != null) {
			Object name = tryInvoke(affected, "getName");
			if (name != null) {
				return String.valueOf(name);
			}
		}
		Object name = tryInvoke(event, "getName");
		return name != null ? String.valueOf(name) : null;
	}

	private static String readReason(Event event) throws Exception {
		Object entry = tryInvoke(event, "getEntry");
		if (entry == null) {
			entry = tryInvoke(event, "getBanEntry");
		}
		if (entry != null) {
			Object reason = tryInvoke(entry, "getReason");
			if (reason != null) {
				return String.valueOf(reason);
			}
		}
		return null;
	}

	private static String readDuration(Event event) throws Exception {
		Object entry = tryInvoke(event, "getEntry");
		if (entry == null) {
			entry = tryInvoke(event, "getBanEntry");
		}
		if (entry == null) {
			return "Permanent";
		}
		Object timeout = tryInvoke(entry, "getTimeout");
		if (timeout == null) {
			timeout = tryInvoke(entry, "getExpiration");
		}
		if (timeout == null) {
			return "Permanent";
		}
		long millis;
		if (timeout instanceof Long) {
			millis = ((Long) timeout).longValue();
		} else if (timeout instanceof Instant) {
			millis = ((Instant) timeout).toEpochMilli();
		} else {
			return "Permanent";
		}
		if (millis <= 0L) {
			return "Permanent";
		}
		Duration d = Duration.between(Instant.now(), Instant.ofEpochMilli(millis));
		if (d.isNegative() || d.isZero()) {
			return "Permanent";
		}
		long days = d.toDays();
		if (days >= 1) {
			return days + (days == 1 ? " day" : " days");
		}
		long hours = d.toHours();
		if (hours >= 1) {
			return hours + "h";
		}
		long minutes = Math.max(1, d.toMinutes());
		return minutes + "m";
	}

	private static String readControllerName(Event event) throws Exception {
		Object controller = tryInvoke(event, "getController");
		if (controller == null) {
			return null;
		}
		Object name = tryInvoke(controller, "getName");
		return name != null ? String.valueOf(name) : null;
	}

	private static Object tryInvoke(Object target, String method) throws Exception {
		if (target == null) {
			return null;
		}
		try {
			Method m = target.getClass().getMethod(method);
			return m.invoke(target);
		} catch (NoSuchMethodException e) {
			return null;
		}
	}
}
