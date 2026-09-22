package net.tfminecraft.tfmcweb.listeners;

import java.util.UUID;
import java.util.logging.Level;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;

import net.tfminecraft.tfmcweb.api.ProvinceSystemClient.IdentityStatus;
import net.tfminecraft.tfmcweb.entitlements.PlayerMetaSyncService;
import net.tfminecraft.tfmcweb.gate.DiscordGateService;

public final class PlayerJoinListener implements Listener {

	private final JavaPlugin plugin;
	private final DiscordGateService gateService;

	public PlayerJoinListener(JavaPlugin plugin, DiscordGateService gateService) {
		this.plugin = plugin;
		this.gateService = gateService;
	}

	@EventHandler(priority = EventPriority.MONITOR)
	public void onJoin(PlayerJoinEvent event) {
		Player player = event.getPlayer();
		UUID uuid = player.getUniqueId();
		PlayerMetaSyncService.pushForPlayer(player);
		Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
			try {
				IdentityStatus status = gateService.fetchAndCache(uuid);
				Bukkit.getScheduler().runTask(plugin, () -> {
					if (!player.isOnline()) {
						return;
					}
					if (status.ok) {
						gateService.applyGate(player, status.eligible);
					} else {
						plugin.getLogger().fine(
							"[join] status failed for " + player.getName() + ": " + status.error
						);
						gateService.applyGate(player);
					}
				});
			} catch (Exception e) {
				plugin.getLogger().log(Level.WARNING, "[join] identity sync failed", e);
			}
		});
	}
}
