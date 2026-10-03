package net.tfminecraft.tfmcweb.managers;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.tfminecraft.tfmcweb.api.PatreonClient;
import net.tfminecraft.tfmcweb.api.PatreonClient.LinkStartResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.StatusResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.UnlinkResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;

class PatreonCommandTest {
	CommandFixture f;
	MockedStatic<PatreonClient> api;
	PatreonCommand command;

	@BeforeEach void setup() throws Exception {
		f = new CommandFixture();
		api = mockStatic(PatreonClient.class);
		command = new PatreonCommand(f.plugin);
	}

	@AfterEach void cleanup() throws Exception {
		api.close();
		f.close();
	}

	void run(org.bukkit.command.CommandSender sender, String... args) {
		assertTrue(command.onCommand(sender, null, "patreon", args));
	}

	@Test void playersCanReadStatusLinkAndUnlink() {
		run(f.console);
		assertTrue(f.contains("Players only"));
		api.when(() -> PatreonClient.status(f.id.toString())).thenReturn(StatusResult.fail(null));
		run(f.player);
		assertTrue(f.contains("Could not check Patreon status."));
		api.when(() -> PatreonClient.status(f.id.toString())).thenReturn(StatusResult.fail("down"));
		run(f.player);
		assertTrue(f.contains("down"));
		api.verify(() -> PatreonClient.startLink(anyString(), anyString()), never());

		api.when(() -> PatreonClient.status(f.id.toString())).thenReturn(
			StatusResult.success(true, "ascended", "Ascended", "2026-10-10T00:00:00Z", "Ada Patron")
		);
		run(f.player);
		assertTrue(f.contains("linked"));
		assertTrue(f.contains("Ada Patron"));
		assertTrue(f.contains("Ascended (ascended)"));
		assertTrue(f.contains("Grace until:"));
		assertTrue(f.contains("2026-10-10T00:00:00Z"));

		api.when(() -> PatreonClient.status(f.id.toString())).thenReturn(StatusResult.success(true, "noble", null, null, null));
		run(f.player);
		assertTrue(f.contains("noble"));
		api.when(() -> PatreonClient.status(f.id.toString())).thenReturn(StatusResult.success(true, null, "Knight", null, null));
		run(f.player);
		assertTrue(f.contains("Knight"));
		api.when(() -> PatreonClient.status(f.id.toString())).thenReturn(StatusResult.success(true, null, null, null, null));
		run(f.player);
		assertTrue(f.contains("Tier:"));
		assertTrue(f.contains("none"));

		api.when(() -> PatreonClient.status(f.id.toString())).thenReturn(StatusResult.success(false, null, null, null, null));
		api.when(() -> PatreonClient.startLink(f.id.toString(), "Ada")).thenReturn(LinkStartResult.fail(null));
		run(f.player);
		assertTrue(f.contains("not linked"));
		assertTrue(f.contains("Could not start Patreon link."));
		api.when(() -> PatreonClient.startLink(f.id.toString(), "Ada")).thenReturn(LinkStartResult.fail("denied"));
		run(f.player);
		assertTrue(f.contains("denied"));

		String url = "https://www.patreon.com/oauth2/authorize?x=1";
		api.when(() -> PatreonClient.startLink(f.id.toString(), "Ada")).thenReturn(
			LinkStartResult.success(url, Instant.now().plusSeconds(3700).toString())
		);
		run(f.player);
		assertTrue(f.contains("Link your Patreon account:"));
		assertTrue(f.contains("Expires in ~"));
		ArgumentCaptor<Component> link = ArgumentCaptor.forClass(Component.class);
		verify(f.player, atLeastOnce()).sendMessage(link.capture());
		assertTrue(link.getAllValues().stream().anyMatch(component -> ClickEvent.openUrl(url).equals(component.clickEvent())));

		api.when(() -> PatreonClient.startLink(f.id.toString(), "Ada")).thenReturn(LinkStartResult.success(url, null));
		f.messages.clear();
		run(f.player);
		assertTrue(f.messages.stream().noneMatch(message -> message.contains("Expires")));

		api.when(() -> PatreonClient.status(f.id.toString())).thenReturn(StatusResult.success(false, null, null, null, null));
		when(f.player.isOnline()).thenReturn(false);
		f.messages.clear();
		run(f.player);
		assertTrue(f.messages.isEmpty());
		when(f.player.isOnline()).thenReturn(true);

		run(f.player, "nope");
		assertTrue(f.contains("Usage:"));
		Locale.setDefault(Locale.forLanguageTag("tr-TR"));
		api.when(() -> PatreonClient.unlink(f.id.toString())).thenReturn(UnlinkResult.fail(null));
		run(f.player, "UNLINK");
		assertTrue(f.contains("Unlink failed."));
		api.when(() -> PatreonClient.unlink(f.id.toString())).thenReturn(UnlinkResult.fail("down"));
		run(f.player, "unlink");
		assertTrue(f.contains("down"));
		api.when(() -> PatreonClient.unlink(f.id.toString())).thenReturn(UnlinkResult.success(false));
		run(f.player, "unlink");
		assertTrue(f.contains("No Patreon link"));
		api.when(() -> PatreonClient.unlink(f.id.toString())).thenReturn(UnlinkResult.success(true));
		run(f.player, "unlink");
		assertTrue(f.contains("Patreon unlinked."));
		when(f.player.isOnline()).thenReturn(false);
		f.messages.clear();
		run(f.player, "unlink");
		assertTrue(f.messages.isEmpty());

		assertEquals(List.of("unlink"), command.onTabComplete(f.player, null, "patreon", new String[] { "" }));
		assertEquals(List.of("unlink"), command.onTabComplete(f.player, null, "patreon", new String[] { "UN" }));
		assertTrue(command.onTabComplete(f.player, null, "patreon", new String[] { "x" }).isEmpty());
		assertTrue(command.onTabComplete(f.player, null, "patreon", new String[] { "unlink", "" }).isEmpty());
		assertTrue(command.onTabComplete(f.player, null, "patreon", new String[0]).isEmpty());
	}
}
