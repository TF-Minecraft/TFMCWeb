package net.tfminecraft.tfmcweb.managers;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

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
}
