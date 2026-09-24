package net.tfminecraft.tfmcweb.gate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import java.util.UUID;
import java.util.logging.Logger;

import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.entity.Player;
import org.bukkit.plugin.PluginManager;
import org.bukkit.plugin.java.JavaPlugin;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import net.tfminecraft.tfmcweb.cache.LinkCache;

class DiscordGateServiceTest {

	private MockedStatic<Bukkit> bukkit;
	private PluginManager plugins;
	private RpcPlugin rpc;
	private Player player;
	private UUID uuid;
	private LinkCache cache;
	private DiscordGateService gate;

	@BeforeEach
	void setUp() {
		bukkit = mockStatic(Bukkit.class);
		plugins = mock(PluginManager.class);
		bukkit.when(Bukkit::getPluginManager).thenReturn(plugins);
		rpc = mock(RpcPlugin.class);
		when(plugins.getPlugin("RPCharacters")).thenReturn(rpc);
		JavaPlugin web = mock(JavaPlugin.class);
		when(web.getLogger()).thenReturn(Logger.getAnonymousLogger());
		player = mock(Player.class);
		uuid = UUID.randomUUID();
		when(player.getUniqueId()).thenReturn(uuid);
		when(player.isOnline()).thenReturn(true);
		when(player.getGameMode()).thenReturn(GameMode.SURVIVAL);
		cache = new LinkCache();
		RpcPlugin.lastUuid = null;
		RpcPlugin.lastRequired = null;
		// TFMCWeb starts while its dependent RPCharacters is still disabled.
		gate = new DiscordGateService(web, cache);
	}

	@AfterEach
	void tearDown() {
		bukkit.close();
	}

	@Test
	void freezesUnlinkedSurvivalPlayerAfterRpcEnablesLater() {
		assertFalse(gate.isRpcAvailable());
		gate.applyGate(player);
		assertNull(RpcPlugin.lastRequired);

		when(rpc.isEnabled()).thenReturn(true);
		gate.applyGate(player);

		assertEquals(uuid, RpcPlugin.lastUuid);
		assertEquals(Boolean.TRUE, RpcPlugin.lastRequired);
		assertTrue(gate.isRpcAvailable());
	}

	@Test
	void staffBypassSkipsSurvivalGateWhenUnlinked() {
		when(rpc.isEnabled()).thenReturn(true);
		when(player.hasPermission(DiscordGateService.BYPASS_PERMISSION)).thenReturn(true);
		cache.putUnlinked(uuid);

		gate.applyGate(player);

		assertEquals(Boolean.FALSE, RpcPlugin.lastRequired);
		assertFalse(DiscordGateService.requiresGate(GameMode.SURVIVAL, false, true));
		assertTrue(DiscordGateService.requiresGate(GameMode.SURVIVAL, false, false));
	}

	@Test
	void releasesEligiblePlayersAndDoesNotFreezeOtherGameModes() {
		when(rpc.isEnabled()).thenReturn(true);
		cache.putLinked(uuid, "discord-id", "player");
		gate.applyGate(player);
		assertEquals(Boolean.FALSE, RpcPlugin.lastRequired);

		cache.putUnlinked(uuid);
		for (GameMode mode : GameMode.values()) {
			when(player.getGameMode()).thenReturn(mode);
			gate.applyGate(player);
			assertEquals(mode == GameMode.SURVIVAL, RpcPlugin.lastRequired);
		}
	}

	@Test
	void appliesAndClearsOfflineGateAfterRpcEnablesLater() {
		assertFalse(gate.isRpcAvailable());
		when(rpc.isEnabled()).thenReturn(true);
		gate.applyGate(uuid, false);
		assertEquals(uuid, RpcPlugin.lastUuid);
		assertEquals(Boolean.TRUE, RpcPlugin.lastRequired);

		gate.clearGate(uuid);
		assertEquals(Boolean.FALSE, RpcPlugin.lastRequired);
	}

	@Test
	void clearGateAlsoResolvesRpcAfterLateEnable() {
		when(rpc.isEnabled()).thenReturn(true);
		gate.clearGate(uuid);
		assertEquals(uuid, RpcPlugin.lastUuid);
		assertEquals(Boolean.FALSE, RpcPlugin.lastRequired);
	}

	@Test
	void toleratesMissingRpcAndStopsCallingDisabledRpc() {
		when(plugins.getPlugin("RPCharacters")).thenReturn(null);
		gate.applyGate(player);
		assertFalse(gate.isRpcAvailable());
		assertNull(RpcPlugin.lastRequired);

		when(plugins.getPlugin("RPCharacters")).thenReturn(rpc);
		when(rpc.isEnabled()).thenReturn(true);
		assertTrue(gate.isRpcAvailable());
		when(rpc.isEnabled()).thenReturn(false);
		gate.applyGate(player);
		gate.applyGate(uuid, false);
		gate.clearGate(uuid);
		assertFalse(gate.isRpcAvailable());
		assertNull(RpcPlugin.lastRequired);

		when(rpc.isEnabled()).thenReturn(true);
		gate.applyGate(player);
		assertEquals(Boolean.TRUE, RpcPlugin.lastRequired);
	}

	public static class RpcPlugin extends JavaPlugin {
		static UUID lastUuid;
		static Boolean lastRequired;

		public static void setDiscordGate(UUID uuid, boolean required) {
			lastUuid = uuid;
			lastRequired = required;
		}

		public static void setDiscordGate(Player player, boolean required) {
			setDiscordGate(player.getUniqueId(), required);
		}
	}
}
