package net.tfminecraft.tfmcweb.managers;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitScheduler;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import net.tfminecraft.tfmcweb.api.ProvinceSystemClient;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient.IdentityStatus;
import net.tfminecraft.tfmcweb.cache.LinkCache;
import net.tfminecraft.tfmcweb.gate.DiscordGateService;

class WebCommandTest {

	@Test
	void lookupLineNamesTheDiscordUserForTheSender() {
		String line = WebCommand.discordUsernameLine("ada_stone");
		assertTrue(line.contains("Discord username:"));
		assertTrue(line.contains("ada_stone"));
	}

	@Test
	void lookupLineShowsABlankWhenTheUsernameIsMissing() {
		String line = WebCommand.discordUsernameLine("  ");
		assertTrue(line.contains("Discord username:"));
		assertTrue(line.endsWith("-"));
	}

	@Test
	void lookupTellsTheSenderTheCachedDiscordUsername() {
		UUID uuid = UUID.randomUUID();
		Player target = mock(Player.class);
		when(target.getUniqueId()).thenReturn(uuid);
		when(target.getName()).thenReturn("Ada");

		LinkCache cache = new LinkCache();
		cache.putLinked(uuid, "111", "ada_stone");

		CommandSender sender = mock(CommandSender.class);
		when(sender.hasPermission("tfmcweb.admin")).thenReturn(true);

		BukkitScheduler scheduler = mock(BukkitScheduler.class);
		try (MockedStatic<Bukkit> bukkit = mockStatic(Bukkit.class)) {
			bukkit.when(Bukkit::getScheduler).thenReturn(scheduler);
			bukkit.when(() -> Bukkit.getPlayerExact("Ada")).thenReturn(target);

			WebCommand command = new WebCommand(
				mock(JavaPlugin.class),
				cache,
				mock(DiscordGateService.class)
			);
			command.onCommand(sender, mock(Command.class), "web", new String[] { "lookup", "Ada" });
		}

		verify(sender).sendMessage(contains("Discord username:"));
		verify(sender).sendMessage(contains("ada_stone"));
	}

	@Test
	void lookupTellsTheSenderTheLiveDiscordUsername() {
		UUID uuid = UUID.randomUUID();
		Player target = mock(Player.class);
		when(target.getUniqueId()).thenReturn(uuid);
		when(target.getName()).thenReturn("Ada");
		when(target.isOnline()).thenReturn(true);

		CommandSender sender = mock(CommandSender.class);
		when(sender.hasPermission("tfmcweb.admin")).thenReturn(true);

		BukkitScheduler scheduler = mock(BukkitScheduler.class);
		when(scheduler.runTaskAsynchronously(any(Plugin.class), any(Runnable.class)))
			.thenAnswer(invocation -> {
				invocation.getArgument(1, Runnable.class).run();
				return null;
			});
		when(scheduler.runTask(any(Plugin.class), any(Runnable.class)))
			.thenAnswer(invocation -> {
				invocation.getArgument(1, Runnable.class).run();
				return null;
			});

		IdentityStatus status = IdentityStatus.fromJson(
			"{\"linked\":true,\"eligible\":true,\"in_grace\":false,"
				+ "\"discord_username\":\"ada_stone\"}"
		);

		try (
			MockedStatic<Bukkit> bukkit = mockStatic(Bukkit.class);
			MockedStatic<ProvinceSystemClient> client = mockStatic(ProvinceSystemClient.class)
		) {
			bukkit.when(Bukkit::getScheduler).thenReturn(scheduler);
			bukkit.when(() -> Bukkit.getPlayerExact("Ada")).thenReturn(target);
			bukkit.when(() -> Bukkit.getPlayer(uuid)).thenReturn(target);
			client.when(() -> ProvinceSystemClient.getIdentityStatus(uuid.toString()))
				.thenReturn(status);

			WebCommand command = new WebCommand(
				mock(JavaPlugin.class),
				new LinkCache(),
				mock(DiscordGateService.class)
			);
			command.onCommand(sender, mock(Command.class), "web", new String[] { "lookup", "Ada" });
		}

		verify(sender).sendMessage(contains("Discord username:"));
		verify(sender).sendMessage(contains("ada_stone"));
	}
}
