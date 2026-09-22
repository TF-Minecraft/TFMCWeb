package net.tfminecraft.TFMCWeb;

import java.io.File;

import org.bukkit.Bukkit;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.java.JavaPlugin;

import net.tfminecraft.TFMCWeb.cache.LinkCache;
import net.tfminecraft.TFMCWeb.gate.DiscordGateService;
import net.tfminecraft.TFMCWeb.listeners.EssentialsBanListener;
import net.tfminecraft.TFMCWeb.listeners.PlayerJoinListener;
import net.tfminecraft.TFMCWeb.loaders.ConfigLoader;
import net.tfminecraft.TFMCWeb.entitlements.PlayerMetaSyncService;
import net.tfminecraft.TFMCWeb.managers.LinkDiscordCommand;
import net.tfminecraft.TFMCWeb.managers.PluginNoticePoller;
import net.tfminecraft.TFMCWeb.managers.TokenCommand;
import net.tfminecraft.TFMCWeb.managers.UnlinkDiscordCommand;
import net.tfminecraft.TFMCWeb.managers.WarningCommand;
import net.tfminecraft.TFMCWeb.managers.WebCommand;

public class TFMCWeb extends JavaPlugin {

	public static TFMCWeb plugin;

	private final ConfigLoader configLoader = new ConfigLoader();
	private final LinkCache linkCache = new LinkCache();
	private DiscordGateService gateService;
	private PluginNoticePoller noticePoller;

	@Override
	public void onEnable() {
		plugin = this;
		if (!getDataFolder().exists()) {
			getDataFolder().mkdirs();
		}
		saveDefaultConfigFile();
		reloadLocalConfig();

		gateService = new DiscordGateService(this, linkCache);
		if (!gateService.isRpcAvailable()) {
			getLogger().info(
				"Discord Survival gate waiting for RPCharacters; availability is checked when used."
			);
		}

		noticePoller = new PluginNoticePoller(this, linkCache, gateService);
		noticePoller.start();

		if (getCommand("linkdiscord") != null) {
			getCommand("linkdiscord").setExecutor(new LinkDiscordCommand(this, linkCache, gateService));
		} else {
			getLogger().severe("Command linkdiscord missing from plugin.yml");
		}
		if (getCommand("unlinkdiscord") != null) {
			getCommand("unlinkdiscord").setExecutor(
				new UnlinkDiscordCommand(this, linkCache, gateService)
			);
		} else {
			getLogger().severe("Command unlinkdiscord missing from plugin.yml");
		}
		if (getCommand("web") != null) {
			WebCommand web = new WebCommand(this, linkCache, gateService);
			getCommand("web").setExecutor(web);
			getCommand("web").setTabCompleter(web);
		} else {
			getLogger().severe("Command web missing from plugin.yml");
		}
		if (getCommand("token") != null) {
			TokenCommand token = new TokenCommand(this);
			getCommand("token").setExecutor(token);
			getCommand("token").setTabCompleter(token);
		} else {
			getLogger().severe("Command token missing from plugin.yml");
		}
		if (getCommand("warning") != null) {
			getCommand("warning").setExecutor(new WarningCommand(this, linkCache));
		} else {
			getLogger().severe("Command warning missing from plugin.yml");
		}

		Bukkit.getPluginManager().registerEvents(
			new PlayerJoinListener(this, gateService),
			this
		);
		new EssentialsBanListener(this, linkCache).register();

		getLogger().info(
			"TFMCWeb enabled (api="
				+ (Cache.apiBaseUrl.isEmpty() ? "(unset)" : Cache.apiBaseUrl)
				+ ", rpc="
				+ gateService.isRpcAvailable()
				+ ")"
		);
	}

	@Override
	public void onDisable() {
		if (noticePoller != null) {
			noticePoller.stop();
		}
	}

	public LinkCache getLinkCache() {
		return linkCache;
	}

	public DiscordGateService getGateService() {
		return gateService;
	}

	public void reloadLocalConfig() {
		configLoader.load(new File(getDataFolder(), "config.yml"));
		PlayerMetaSyncService.pushAllOnlineAsync();
	}

	private void saveDefaultConfigFile() {
		File configFile = new File(getDataFolder(), "config.yml");
		if (!configFile.exists()) {
			saveResource("config.yml", false);
		}
	}

	/** True when another plugin should yield Discord link ownership to TFMCWeb. */
	public static boolean isPresent() {
		Plugin p = Bukkit.getPluginManager().getPlugin("TFMCWeb");
		return p != null && p.isEnabled();
	}

	/**
	 * Realm id for this box (from config {@code realm.id}).
	 * Soft-depend callers: use {@link #isPresent()} then this; if TFMCWeb is
	 * absent, fall back to {@code "main"} locally.
	 * Prefer {@link net.tfminecraft.TFMCWeb.api.ProvinceSystemGateway} for HTTP —
	 * it injects realm_id on allowlisted routes.
	 */
	public static String getRealmId() {
		String realm = Cache.realmId;
		if (realm == null || realm.isBlank()) {
			return "main";
		}
		return realm.trim().toLowerCase();
	}
}
