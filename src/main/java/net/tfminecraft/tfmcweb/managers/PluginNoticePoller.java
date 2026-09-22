package net.tfminecraft.tfmcweb.managers;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import net.tfminecraft.tfmcweb.api.ProvinceSystemClient;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient.PluginNotice;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient.PluginNoticesResult;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient.SimpleResult;
import net.tfminecraft.tfmcweb.cache.LinkCache;
import net.tfminecraft.tfmcweb.gate.DiscordGateService;
import net.tfminecraft.tfmcweb.utils.ChatMessages;

/**
 * Polls ProvinceSystem identity notices once per second.
 */
public final class PluginNoticePoller {

	private final JavaPlugin plugin;
	private final LinkCache linkCache;
	private final DiscordGateService gateService;
	private BukkitTask task;

	public PluginNoticePoller(
		JavaPlugin plugin,
		LinkCache linkCache,
		DiscordGateService gateService
	) {
		this.plugin = plugin;
		this.linkCache = linkCache;
		this.gateService = gateService;
	}

	public void start() {
		if (task != null) {
			return;
		}
		task = Bukkit.getScheduler().runTaskTimerAsynchronously(plugin, this::tick, 20L, 20L);
	}

	public void stop() {
		if (task != null) {
			task.cancel();
			task = null;
		}
	}

	private void tick() {
		PluginNoticesResult result;
		try {
			result = ProvinceSystemClient.listPluginNotices();
		} catch (Exception e) {
			plugin.getLogger().log(Level.WARNING, "[notices] poll failed", e);
			return;
		}
		if (!result.ok) {
			plugin.getLogger().fine("[notices] " + result.error);
			return;
		}
		if (result.notices.isEmpty()) {
			return;
		}

		final List<PluginNotice> snapshot = new ArrayList<>(result.notices);
		Bukkit.getScheduler().runTask(plugin, () -> deliverAndAck(snapshot));
	}

	// Keep the existing legacy text representation, formatting, and exact-string comparisons.
	@SuppressWarnings("deprecation")
	private void deliverAndAck(List<PluginNotice> notices) {
		List<Integer> toAck = new ArrayList<>();

		for (PluginNotice notice : notices) {
			String type = notice.type == null ? "" : notice.type.trim();
			UUID uuid;
			try {
				uuid = UUID.fromString(notice.playerUuid);
			} catch (IllegalArgumentException e) {
				continue;
			}

			Player player = Bukkit.getPlayer(uuid);
			boolean online = player != null && player.isOnline();

			switch (type) {
				case "link_success":
					linkCache.putLinked(uuid, notice.discordUserId, notice.discordUsername);
					if (online) {
						gateService.applyGate(player, true);
						String name = notice.discordUsername;
						if (name != null && !name.isBlank()) {
							ChatMessages.info(
								player,
								"Discord linked successfully with "
									+ ChatColor.AQUA + name.trim()
							);
						} else {
							ChatMessages.info(player, "Discord linked successfully.");
						}
						toAck.add(Integer.valueOf(notice.id));
					}
					break;

				case "guild_left_grace":
					linkCache.putGrace(uuid, notice.discordUserId, notice.graceUntil);
					if (online) {
						gateService.applyGate(player, true);
					}
					toAck.add(Integer.valueOf(notice.id));
					break;

				case "guild_rejoined":
					linkCache.clearGrace(uuid);
					if (online) {
						gateService.applyGate(player, true);
					}
					toAck.add(Integer.valueOf(notice.id));
					break;

				case "grace_expired":
					linkCache.putUnlinked(uuid);
					if (online) {
						gateService.applyGate(player, false);
					} else {
						gateService.applyGate(uuid, false);
					}
					toAck.add(Integer.valueOf(notice.id));
					break;

				default:
					// Ignore unknown types (do not ack — leave for future owners).
					break;
			}
		}

		if (toAck.isEmpty()) {
			return;
		}

		Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
			SimpleResult ack = ProvinceSystemClient.ackPluginNotices(toAck);
			if (!ack.ok) {
				plugin.getLogger().warning("[notices] ack failed: " + ack.error);
			}
		});
	}
}
