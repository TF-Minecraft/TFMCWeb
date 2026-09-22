package net.tfminecraft.tfmcweb.managers;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

import net.tfminecraft.tfmcweb.Cache;
import net.tfminecraft.tfmcweb.TFMCWeb;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient.IdentityStatus;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient.SimpleResult;
import net.tfminecraft.tfmcweb.cache.LinkCache;
import net.tfminecraft.tfmcweb.entitlements.PlayerMetaSyncService;
import net.tfminecraft.tfmcweb.gate.DiscordGateService;

/**
 * Admin /web status|reload|lookup|unlink|reconcile|syncmeta.
 */
public final class WebCommand implements CommandExecutor, TabCompleter {

	private static final List<String> SUBS = Arrays.asList(
		"status", "reload", "lookup", "unlink", "reconcile", "syncmeta"
	);

	private final JavaPlugin plugin;
	private final LinkCache linkCache;
	private final DiscordGateService gateService;

	public WebCommand(JavaPlugin plugin, LinkCache linkCache, DiscordGateService gateService) {
		this.plugin = plugin;
		this.linkCache = linkCache;
		this.gateService = gateService;
	}

	// Keep the existing legacy text representation, formatting, and exact-string comparisons.
	@SuppressWarnings("deprecation")
	@Override
	public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
		if (!sender.hasPermission("tfmcweb.admin")) {
			sender.sendMessage(ChatColor.RED + "No permission.");
			return true;
		}
		if (args.length == 0) {
			sender.sendMessage(ChatColor.YELLOW
				+ "Usage: /web <status|reload|lookup|unlink|reconcile|syncmeta>");
			return true;
		}
		String sub = args[0].toLowerCase(Locale.ROOT);
		switch (sub) {
			case "status":
				return cmdStatus(sender);
			case "reload":
				return cmdReload(sender);
			case "lookup":
				return cmdLookup(sender, args);
			case "unlink":
				return cmdUnlink(sender, args);
			case "reconcile":
				return cmdReconcile(sender);
			case "syncmeta":
				return cmdSyncMeta(sender, args);
			default:
				sender.sendMessage(ChatColor.RED
					+ "Unknown subcommand. Use status|reload|lookup|unlink|reconcile|syncmeta");
				return true;
		}
	}

	// Keep the existing legacy text representation, formatting, and exact-string comparisons.
	@SuppressWarnings("deprecation")
	private boolean cmdStatus(CommandSender sender) {
		sender.sendMessage(ChatColor.GREEN + "[TFMCWeb] Checking API…");
		Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
			SimpleResult ping = ProvinceSystemClient.ping();
			Bukkit.getScheduler().runTask(plugin, () -> {
				sender.sendMessage(ChatColor.GRAY + "api.base-url: "
					+ (Cache.apiBaseUrl.isEmpty() ? "(unset)" : Cache.apiBaseUrl));
				sender.sendMessage(ChatColor.GRAY + "plugin-key: "
					+ (Cache.pluginKey.isEmpty() ? "(unset)" : "(set)"));
				sender.sendMessage(ChatColor.GRAY + "link cache entries: " + linkCache.size());
				sender.sendMessage(ChatColor.GRAY + "RPCharacters gate: "
					+ (gateService.isRpcAvailable() ? "yes" : "no"));
				if (ping.ok) {
					sender.sendMessage(ChatColor.GREEN + "API reachable.");
				} else {
					sender.sendMessage(ChatColor.RED + "API: "
						+ (ping.error != null ? ping.error : "unreachable"));
				}
			});
		});
		return true;
	}

	// Keep the existing legacy text representation, formatting, and exact-string comparisons.
	@SuppressWarnings("deprecation")
	private boolean cmdReload(CommandSender sender) {
		if (plugin instanceof TFMCWeb) {
			((TFMCWeb) plugin).reloadLocalConfig();
		} else {
			plugin.reloadConfig();
		}
		sender.sendMessage(ChatColor.GREEN + "[TFMCWeb] Config reloaded.");
		sender.sendMessage(ChatColor.GRAY + "api.base-url="
			+ (Cache.apiBaseUrl.isEmpty() ? "(unset)" : Cache.apiBaseUrl));
		sender.sendMessage(ChatColor.GRAY + "Pushing player-meta for online players…");
		return true;
	}

	// Keep the existing legacy text representation, formatting, and exact-string comparisons.
	@SuppressWarnings("deprecation")
	private boolean cmdSyncMeta(CommandSender sender, String[] args) {
		if (args.length >= 2) {
			OfflinePlayer target = resolvePlayer(args[1]);
			if (target == null || target.getUniqueId() == null) {
				sender.sendMessage(ChatColor.RED + "Unknown player.");
				return true;
			}
			Player online = Bukkit.getPlayer(target.getUniqueId());
			if (online == null || !online.isOnline()) {
				sender.sendMessage(ChatColor.RED + "Player must be online to sync meta.");
				return true;
			}
			PlayerMetaSyncService.pushForPlayer(online);
			sender.sendMessage(ChatColor.GREEN + "[TFMCWeb] Queued player-meta sync for "
				+ online.getName() + ".");
			return true;
		}
		PlayerMetaSyncService.pushAllOnlineAsync();
		sender.sendMessage(ChatColor.GREEN + "[TFMCWeb] Queued player-meta sync for all online players.");
		return true;
	}

	// Keep the existing legacy text representation, formatting, and exact-string comparisons.
	@SuppressWarnings("deprecation")
	private boolean cmdLookup(CommandSender sender, String[] args) {
		if (args.length < 2) {
			sender.sendMessage(ChatColor.YELLOW + "Usage: /web lookup <player>");
			return true;
		}
		OfflinePlayer target = resolvePlayer(args[1]);
		if (target == null || target.getUniqueId() == null) {
			sender.sendMessage(ChatColor.RED + "Unknown player.");
			return true;
		}
		UUID uuid = target.getUniqueId();
		LinkCache.Entry cached = linkCache.get(uuid);
		sender.sendMessage(ChatColor.GREEN + "[TFMCWeb] Lookup " + args[1]
			+ " (" + uuid + ")");
		if (cached != null) {
			sender.sendMessage(ChatColor.GRAY + "cache: linked=" + cached.linked
				+ " eligible=" + cached.eligible
				+ " in_grace=" + cached.inGrace
				+ " discord=" + nullSafe(cached.discordUsername)
				+ " grace_until=" + nullSafe(cached.graceUntil));
		} else {
			sender.sendMessage(ChatColor.GRAY + "cache: (miss)");
		}

		Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
			IdentityStatus status = ProvinceSystemClient.getIdentityStatus(uuid.toString());
			Bukkit.getScheduler().runTask(plugin, () -> {
				if (!status.ok) {
					sender.sendMessage(ChatColor.RED + "live status: " + status.error);
					return;
				}
				linkCache.putFromStatus(uuid, status);
				sender.sendMessage(ChatColor.GRAY + "live: linked=" + status.linked
					+ " eligible=" + status.eligible
					+ " in_grace=" + status.inGrace
					+ " discord=" + nullSafe(status.discordUsername)
					+ " grace_until=" + nullSafe(status.graceUntil));
				Player online = Bukkit.getPlayer(uuid);
				if (online != null && online.isOnline()) {
					gateService.applyGate(online, status.eligible);
				}
			});
		});
		return true;
	}

	// Keep the existing legacy text representation, formatting, and exact-string comparisons.
	@SuppressWarnings("deprecation")
	private boolean cmdUnlink(CommandSender sender, String[] args) {
		if (args.length < 2) {
			sender.sendMessage(ChatColor.YELLOW + "Usage: /web unlink <player>");
			return true;
		}
		OfflinePlayer target = resolvePlayer(args[1]);
		if (target == null || target.getUniqueId() == null) {
			sender.sendMessage(ChatColor.RED + "Unknown player.");
			return true;
		}
		UUID uuid = target.getUniqueId();
		sender.sendMessage(ChatColor.GREEN + "[TFMCWeb] Unlinking " + args[1] + "…");
		Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
			SimpleResult result = ProvinceSystemClient.unlinkDiscord(uuid.toString());
			Bukkit.getScheduler().runTask(plugin, () -> {
				if (!result.ok) {
					sender.sendMessage(ChatColor.RED + "Unlink failed: " + result.error);
					return;
				}
				linkCache.putUnlinked(uuid);
				Player online = Bukkit.getPlayer(uuid);
				if (online != null && online.isOnline()) {
					gateService.applyGate(online, false);
				} else {
					gateService.applyGate(uuid, false);
				}
				sender.sendMessage(ChatColor.GREEN + "Unlinked " + args[1] + ".");
			});
		});
		return true;
	}

	// Keep the existing legacy text representation, formatting, and exact-string comparisons.
	@SuppressWarnings("deprecation")
	private boolean cmdReconcile(CommandSender sender) {
		List<Player> online = new ArrayList<>(Bukkit.getOnlinePlayers());
		sender.sendMessage(ChatColor.GREEN + "[TFMCWeb] Reconciling "
			+ online.size() + " online player(s)…");
		Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
			int ok = 0;
			int fail = 0;
			List<Runnable> applies = new ArrayList<>();
			for (Player player : online) {
				IdentityStatus status = ProvinceSystemClient.getIdentityStatus(
					player.getUniqueId().toString()
				);
				if (!status.ok) {
					fail++;
					continue;
				}
				ok++;
				UUID uuid = player.getUniqueId();
				boolean eligible = status.eligible;
				applies.add(() -> {
					linkCache.putFromStatus(uuid, status);
					Player p = Bukkit.getPlayer(uuid);
					if (p != null && p.isOnline()) {
						gateService.applyGate(p, eligible);
					}
				});
			}
			final int okFinal = ok;
			final int failFinal = fail;
			Bukkit.getScheduler().runTask(plugin, () -> {
				for (Runnable r : applies) {
					r.run();
				}
				sender.sendMessage(ChatColor.GREEN + "Reconcile done: ok="
					+ okFinal + " fail=" + failFinal);
			});
		});
		return true;
	}

	private static OfflinePlayer resolvePlayer(String name) {
		if (name == null || name.isBlank()) {
			return null;
		}
		Player online = Bukkit.getPlayerExact(name);
		if (online != null) {
			return online;
		}
		@SuppressWarnings("deprecation")
		OfflinePlayer offline = Bukkit.getOfflinePlayer(name);
		return offline;
	}

	private static String nullSafe(String s) {
		return s == null || s.isBlank() ? "-" : s;
	}

	@Override
	public List<String> onTabComplete(
		CommandSender sender,
		Command command,
		String alias,
		String[] args
	) {
		if (!sender.hasPermission("tfmcweb.admin")) {
			return Collections.emptyList();
		}
		if (args.length == 1) {
			String p = args[0].toLowerCase(Locale.ROOT);
			return SUBS.stream().filter(s -> s.startsWith(p)).collect(Collectors.toList());
		}
		if (args.length == 2
			&& ("lookup".equalsIgnoreCase(args[0])
				|| "unlink".equalsIgnoreCase(args[0])
				|| "syncmeta".equalsIgnoreCase(args[0]))) {
			String p = args[1].toLowerCase(Locale.ROOT);
			return Bukkit.getOnlinePlayers().stream()
				.map(Player::getName)
				.filter(n -> n.toLowerCase(Locale.ROOT).startsWith(p))
				.collect(Collectors.toList());
		}
		return Collections.emptyList();
	}
}
