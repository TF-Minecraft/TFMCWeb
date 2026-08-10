package net.tfminecraft.TFMCWeb.managers;

import java.util.ArrayList;
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

import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient;
import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient.FeatureCodeResult;
import net.tfminecraft.TFMCWeb.utils.ChatMessages;
import net.tfminecraft.TFMCWeb.utils.ExpiryFormat;

/**
 * /token create skin|character|skin staff — scoped feature codes.
 */
public final class TokenCommand implements CommandExecutor, TabCompleter {

	private static final String PERM_CREATE = "tfmcweb.token.create";
	private static final String PERM_CREATE_STAFF = "tfmcweb.token.create.staff";
	private static final String USAGE = "/token create <skin|character|skin staff>";

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
		boolean canCreate = player.hasPermission(PERM_CREATE);
		boolean canStaff = player.hasPermission(PERM_CREATE_STAFF);
		if (!canCreate && !canStaff) {
			ChatMessages.error(player, "You do not have permission to create a token.");
			return true;
		}
		if (args.length == 0) {
			ChatMessages.info(player, "Usage: " + ChatColor.AQUA + USAGE);
			return true;
		}
		if (!"create".equalsIgnoreCase(args[0])) {
			ChatMessages.error(player, "Usage: " + USAGE);
			return true;
		}
		if (args.length < 2) {
			ChatMessages.error(player, "Usage: " + USAGE);
			return true;
		}

		String kind = args[1].trim().toLowerCase(Locale.ROOT);
		String apiScope;
		boolean staffMint = false;

		if ("character".equals(kind)) {
			if (args.length != 2) {
				ChatMessages.error(player, "Usage: " + USAGE);
				return true;
			}
			if (!canCreate) {
				ChatMessages.error(player, "You do not have permission to create a token.");
				return true;
			}
			apiScope = "character";
		} else if ("skin".equals(kind)) {
			if (args.length == 2) {
				if (!canCreate) {
					ChatMessages.error(player, "You do not have permission to create a token.");
					return true;
				}
				apiScope = "skin";
			} else if (args.length == 3
				&& "staff".equalsIgnoreCase(args[2].trim())) {
				if (!canStaff) {
					ChatMessages.error(
						player,
						"You do not have permission to create a staff skins token."
					);
					return true;
				}
				apiScope = "skin_staff";
				staffMint = true;
			} else {
				ChatMessages.error(player, "Usage: " + USAGE);
				return true;
			}
		} else {
			ChatMessages.error(player, "Usage: " + USAGE);
			return true;
		}

		String uuid = player.getUniqueId().toString();
		final boolean staff = staffMint;
		final String scope = apiScope;
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
				if (staff) {
					ChatMessages.sendCopyableCode(
						player,
						"Your staff skins code (click to copy):",
						result.code
					);
					ChatMessages.info(
						player,
						"Redeem on the skins website — choose category and scroll; "
							+ "applies to the curated pack (no Discord review)."
					);
				} else if ("character".equals(scope)) {
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
		boolean canCreate = sender.hasPermission(PERM_CREATE);
		boolean canStaff = sender.hasPermission(PERM_CREATE_STAFF);
		if (!canCreate && !canStaff) {
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
			List<String> out = new ArrayList<>();
			if (canCreate) {
				if ("skin".startsWith(p)) {
					out.add("skin");
				}
				if ("character".startsWith(p)) {
					out.add("character");
				}
			} else if (canStaff && "skin".startsWith(p)) {
				out.add("skin");
			}
			return out;
		}
		if (args.length == 3
			&& "create".equalsIgnoreCase(args[0])
			&& "skin".equalsIgnoreCase(args[1])
			&& canStaff) {
			String p = args[2].toLowerCase(Locale.ROOT);
			if ("staff".startsWith(p)) {
				return Collections.singletonList("staff");
			}
		}
		return Collections.emptyList();
	}
}
