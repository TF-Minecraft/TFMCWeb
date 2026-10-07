package net.tfminecraft.tfmcweb.luckperms;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.junit.jupiter.api.Test;

class NameCacheTest {
	final UUID ada = UUID.randomUUID();
	final UUID ghost = UUID.randomUUID();
	final AtomicLong clock = new AtomicLong(1_000L);
	final Map<UUID, String> server = new HashMap<>();
	final Map<UUID, String> stored = new HashMap<>();
	final List<UUID> serverCalls = new ArrayList<>();
	final List<UUID> storedCalls = new ArrayList<>();

	NameCache cache() {
		return new NameCache(
			uuid -> { serverCalls.add(uuid); return server.get(uuid); },
			uuid -> { storedCalls.add(uuid); return stored.get(uuid); },
			clock::get
		);
	}

	@Test void serverNameWinsAndIsRememberedForSixHours() {
		server.put(ada, "Ada");
		stored.put(ada, "OldAda");
		NameCache names = cache();
		assertEquals("Ada", names.name(ada));
		server.put(ada, "Renamed");
		clock.addAndGet(NameCache.HIT_TTL_MILLIS - 1);
		assertEquals("Ada", names.name(ada));
		assertEquals(1, serverCalls.size());
		assertTrue(storedCalls.isEmpty());
		clock.addAndGet(1);
		assertEquals("Renamed", names.name(ada));
		assertEquals(2, serverCalls.size());
	}

	@Test void storedNameFillsGapsAndMissesAreRetriedLater() {
		server.put(ada, " ");
		stored.put(ada, "Ada");
		NameCache names = cache();
		assertEquals("Ada", names.name(ada));
		assertNull(names.name(ghost));
		assertNull(names.name(ghost));
		assertEquals(List.of(ada, ghost), storedCalls);
		clock.addAndGet(NameCache.MISS_TTL_MILLIS);
		stored.put(ghost, "Ghost");
		assertEquals("Ghost", names.name(ghost));
	}

	@Test void failingSourcesCountAsUnknown() {
		NameCache names = new NameCache(
			uuid -> { throw new IllegalStateException("offline"); },
			uuid -> { throw new java.util.concurrent.CompletionException(new RuntimeException("db")); },
			clock::get
		);
		assertNull(names.name(ada));
	}

	@Test void serverNamesComeFromTheOfflinePlayer() {
		OfflinePlayer player = mock(OfflinePlayer.class);
		when(player.getName()).thenReturn("Ada");
		try (var bukkit = mockStatic(Bukkit.class)) {
			bukkit.when(() -> Bukkit.getOfflinePlayer(ada)).thenReturn(player);
			assertEquals("Ada", NameCache.bukkitName(ada));
			assertNull(NameCache.bukkitName(ghost));
		}
	}
}
