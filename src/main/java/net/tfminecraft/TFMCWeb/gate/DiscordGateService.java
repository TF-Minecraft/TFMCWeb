package net.tfminecraft.TFMCWeb.gate;

import java.lang.reflect.Method;
import java.util.UUID;
import java.util.logging.Level;

import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.entity.Player;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.java.JavaPlugin;

import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient;
import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient.IdentityStatus;
import net.tfminecraft.TFMCWeb.cache.LinkCache;

/**
 * Applies Survival Discord gate via RPCharacters (soft-depend, reflection).
 */
public final class DiscordGateService {

	private final JavaPlugin plugin;
	private final LinkCache linkCache;
	private final boolean rpcAvailable;
	private Method setGateUuid;
	private Method setGatePlayer;

	public DiscordGateService(JavaPlugin plugin, LinkCache linkCache) {
		this.plugin = plugin;
		this.linkCache = linkCache;
		this.rpcAvailable = resolveRpc();
	}

	private boolean resolveRpc() {
		Plugin rpc = Bukkit.getPluginManager().getPlugin("RPCharacters");
		if (rpc == null || !rpc.isEnabled()) {
			return false;
		}
		try {
			Class<?> cls = Class.forName("net.tfminecraft.RPCharacters.RPCharacters");
			setGateUuid = cls.getMethod("setDiscordGate", UUID.class, boolean.class);
			setGatePlayer = cls.getMethod("setDiscordGate", Player.class, boolean.class);
			return true;
		} catch (ReflectiveOperationException e) {
			plugin.getLogger().log(
				Level.WARNING,
				"RPCharacters present but setDiscordGate missing — rebuild RPC (17.01)",
				e
			);
			return false;
		}
	}

	public boolean isRpcAvailable() {
		return rpcAvailable;
	}

	/**
	 * Fetch status, update cache, apply gate. Call HTTP off main thread;
	 * this method may block — run async then applyGate on main for online player.
	 */
	public IdentityStatus fetchAndCache(UUID uuid) {
		IdentityStatus status = ProvinceSystemClient.getIdentityStatus(uuid.toString());
		if (status.ok) {
			linkCache.putFromStatus(uuid, status);
		}
		return status;
	}

	/** Apply gate from cache for an online player (main thread). */
	public void applyGate(Player player) {
		if (player == null || !player.isOnline()) {
			return;
		}
		boolean eligible = linkCache.isEligible(player.getUniqueId());
		applyGate(player, eligible);
	}

	public void applyGate(Player player, boolean eligible) {
		if (player == null || !rpcAvailable) {
			return;
		}
		boolean required = player.getGameMode() == GameMode.SURVIVAL && !eligible;
		invokeGate(player.getUniqueId(), player, required);
	}

	/** Offline-safe: set UUID gate flag; RPC reevaluates if online. */
	public void applyGate(UUID uuid, boolean eligible) {
		if (uuid == null || !rpcAvailable) {
			return;
		}
		Player online = Bukkit.getPlayer(uuid);
		if (online != null && online.isOnline()) {
			applyGate(online, eligible);
			return;
		}
		// Offline: store required only when not eligible; RPC clears on non-Survival join later.
		invokeGate(uuid, null, !eligible);
	}

	public void clearGate(UUID uuid) {
		if (uuid == null || !rpcAvailable) {
			return;
		}
		Player online = Bukkit.getPlayer(uuid);
		invokeGate(uuid, online, false);
	}

	private void invokeGate(UUID uuid, Player player, boolean required) {
		try {
			if (player != null && setGatePlayer != null) {
				setGatePlayer.invoke(null, player, Boolean.valueOf(required));
			} else if (setGateUuid != null) {
				setGateUuid.invoke(null, uuid, Boolean.valueOf(required));
			}
		} catch (ReflectiveOperationException e) {
			plugin.getLogger().log(Level.WARNING, "setDiscordGate failed for " + uuid, e);
		}
	}
}
