package net.tfminecraft.tfmcweb.managers;

import java.util.Collections;
import java.util.List;
import java.util.Locale;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

import net.tfminecraft.tfmcweb.api.PatreonClient;
import net.tfminecraft.tfmcweb.api.PatreonClient.LinkStartResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.StatusResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.UnlinkResult;
import net.tfminecraft.tfmcweb.utils.ChatMessages;
import net.tfminecraft.tfmcweb.utils.ExpiryFormat;

/**
 * /patreon — supporter status and unlink. HTTP stays off the main thread.
 */
public final class PatreonCommand implements CommandExecutor, TabCompleter {

	private final JavaPlugin plugin;

	public PatreonCommand(JavaPlugin plugin) {
		this.plugin = plugin;
	}

	@SuppressWarnings("deprecation")
	@Override
	public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
		if (!(sender instanceof Player player)) {
			sender.sendMessage(ChatColor.RED + "Players only.");
			return true;
		}
		if (args.length == 1 && "unlink".equals(args[0].toLowerCase(Locale.ROOT))) {
			unlink(player);
			return true;
		}
		if (args.length != 0) {
			ChatMessages.error(player, "Usage: /patreon [unlink]");
			return true;
		}
		status(player);
		return true;
	}

	private void status(Player player) {
		String uuid = player.getUniqueId().toString();
		String name = player.getName();
		Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
			StatusResult result = PatreonClient.status(uuid);
			LinkStartResult link = null;
			if (result.ok && !result.linked) {
				link = PatreonClient.startLink(uuid, name);
			}
			LinkStartResult started = link;
			Bukkit.getScheduler().runTask(plugin, () -> deliverStatus(player, result, started));
		});
	}

	@SuppressWarnings("deprecation")
	private void deliverStatus(Player player, StatusResult result, LinkStartResult link) {
		if (!player.isOnline()) {
			return;
		}
		if (!result.ok) {
			ChatMessages.error(
				player,
				result.error != null ? result.error : "Could not check Patreon status."
			);
			return;
		}
		if (!result.linked) {
			ChatMessages.info(player, "Patreon: " + ChatColor.YELLOW + "not linked");
			if (link == null || !link.ok) {
				String error = link == null || link.error == null
					? "Could not start Patreon link."
					: link.error;
				ChatMessages.error(player, error);
				return;
			}
			ChatMessages.sendOpenUrl(player, "Link your Patreon account:", link.authorizeUrl);
			String expiry = ExpiryFormat.relativeLabel(link.expiresAt);
			if (expiry != null) {
				ChatMessages.info(player, expiry);
			}
			return;
		}
		ChatMessages.info(player, "Patreon: " + ChatColor.GREEN + "linked");
		if (result.patreonName != null) {
			ChatMessages.info(player, "Patreon name: " + ChatColor.AQUA + result.patreonName);
		}
		ChatMessages.info(player, "Tier: " + ChatColor.AQUA + tierLabel(result));
		if (result.graceUntil != null) {
			ChatMessages.info(player, "Grace until: " + ChatColor.AQUA + result.graceUntil);
		}
	}

	private static String tierLabel(StatusResult result) {
		if (result.tierName != null && result.tierKey != null) {
			return result.tierName + " (" + result.tierKey + ")";
		}
		if (result.tierName != null) {
			return result.tierName;
		}
		if (result.tierKey != null) {
			return result.tierKey;
		}
		return "none";
	}

	private void unlink(Player player) {
		String uuid = player.getUniqueId().toString();
		Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
			UnlinkResult result = PatreonClient.unlink(uuid);
			Bukkit.getScheduler().runTask(plugin, () -> deliverUnlink(player, result));
		});
	}

	private void deliverUnlink(Player player, UnlinkResult result) {
		if (!player.isOnline()) {
			return;
		}
		if (!result.ok) {
			ChatMessages.error(player, result.error != null ? result.error : "Unlink failed.");
			return;
		}
		if (!result.unlinked) {
			ChatMessages.info(player, "No Patreon link on this account.");
			return;
		}
		ChatMessages.info(player, "Patreon unlinked.");
	}

	@Override
	public List<String> onTabComplete(
		CommandSender sender,
		Command command,
		String alias,
		String[] args
	) {
		if (args.length == 1 && "unlink".startsWith(args[0].toLowerCase(Locale.ROOT))) {
			return List.of("unlink");
		}
		return Collections.emptyList();
	}
}
