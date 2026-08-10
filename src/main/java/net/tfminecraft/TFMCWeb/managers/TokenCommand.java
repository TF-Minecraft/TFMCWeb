package net.tfminecraft.TFMCWeb.managers;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient;
import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient.FeatureCodeResult;
import net.tfminecraft.TFMCWeb.utils.ChatMessages;
import net.tfminecraft.TFMCWeb.utils.ExpiryFormat;

/**
 * /token create skin|character — scoped feature codes.
 */
public final class TokenCommand implements CommandExecutor, TabCompleter {

	private static final List<String> SCOPES = Arrays.asList("skin", "character");

	private final JavaPlugin plugin;

	public TokenCommand(JavaPlugin plugin) {
		this.plugin = plugin;
	}

	@Override
	public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
		if (!(sender instanceof Player)) {
			sender.sendMessage(ChatColor.RED + "Players only.");
			return true;
		}
		Player player = (Player) sender;
		if (!player.hasPermission("tfmcweb.token.create")) {
			ChatMessages.error(player, "You do not have permission to create a token.");
			return true;
		}
		if (args.length == 0) {
			ChatMessages.info(
				player,
				"Usage: " + ChatColor.AQUA + "/token create <skin|character>"
			);
			return true;
		}
		if (!"create".equalsIgnoreCase(args[0])) {
			ChatMessages.error(player, "Usage: /token create <skin|character>");
			return true;
		}
		if (args.length < 2) {
			ChatMessages.error(player, "Usage: /token create <skin|character>");
			return true;
		}
		String scope = args[1].trim().toLowerCase(Locale.ROOT);
		if (!"skin".equals(scope) && !"character".equals(scope)) {
			ChatMessages.error(player, "Scope must be skin or character.");
			return true;
		}

		String uuid = player.getUniqueId().toString();
		Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
			FeatureCodeResult result = ProvinceSystemClient.issueFeatureCode(uuid, scope);
			Bukkit.getScheduler().runTask(plugin, () -> {
				if (!player.isOnline()) {
					return;
				}
				if (!result.ok) {
					ChatMessages.error(
						player,
						result.error != null ? result.error : "Could not create token."
					);
					return;
				}
				if ("character".equals(scope)) {
					ChatMessages.sendCopyableCode(
						player,
						"Your character code (click to copy):",
						result.code
					);
					ChatMessages.info(
						player,
						"Character creator redeem is not available yet — keep this code."
					);
				} else {
					ChatMessages.sendCopyableCode(
						player,
						"Your skins upload code (click to copy):",
						result.code
					);
					ChatMessages.info(player, "Redeem on the skins website.");
				}
				String expiry = ExpiryFormat.relativeLabel(result.expiresAt);
				if (expiry != null) {
					ChatMessages.info(player, expiry);
				}
			});
		});
		return true;
	}

	@Override
	public List<String> onTabComplete(
		CommandSender sender,
		Command command,
		String alias,
		String[] args
	) {
		if (!sender.hasPermission("tfmcweb.token.create")) {
			return Collections.emptyList();
		}
		if (args.length == 1) {
			String p = args[0].toLowerCase(Locale.ROOT);
			List<String> out = new ArrayList<>();
			if ("create".startsWith(p)) {
				out.add("create");
			}
			return out;
		}
		if (args.length == 2 && "create".equalsIgnoreCase(args[0])) {
			String p = args[1].toLowerCase(Locale.ROOT);
			return SCOPES.stream().filter(s -> s.startsWith(p)).collect(Collectors.toList());
		}
		return Collections.emptyList();
	}
}
