package net.tfminecraft.tfmcweb.utils;

import org.bukkit.entity.Player;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;

/**
 * Prefixed chat helpers, including click-to-copy codes.
 */
public final class ChatMessages {

	public static final String PREFIX = "\u00A7a[TFMCWeb] \u00A7r";

	private ChatMessages() {}

	public static void info(Player player, String message) {
		player.sendMessage(PREFIX + message);
	}

	public static void error(Player player, String message) {
		player.sendMessage(PREFIX + "\u00A7c" + message);
	}

	public static void sendCopyableCode(Player player, String intro, String code) {
		if (intro != null && !intro.isEmpty()) {
			player.sendMessage(PREFIX + intro);
		}
		if (code == null || code.isEmpty()) {
			return;
		}

		Component label = Component.text("Code: ", NamedTextColor.GRAY);
		Component codeComp = Component.text(code, NamedTextColor.AQUA)
				.decorate(TextDecoration.BOLD)
				.clickEvent(ClickEvent.copyToClipboard(code))
				.hoverEvent(HoverEvent.showText(Component.text("Click to copy")));
		Component hint = Component.text(" (click to copy)", NamedTextColor.DARK_GRAY)
				.decorate(TextDecoration.ITALIC);

		player.sendMessage(Component.empty().append(label).append(codeComp).append(hint));
	}
}
