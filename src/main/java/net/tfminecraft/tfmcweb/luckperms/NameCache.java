package net.tfminecraft.tfmcweb.luckperms;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.LongSupplier;

import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;

/**
 * Player names for snapshots. A snapshot covers every LuckPerms user, so names,
 * including unknown ones, are remembered rather than looked up every time.
 */
final class NameCache {

	static final long HIT_TTL_MILLIS = 6L * 60 * 60 * 1000;
	static final long MISS_TTL_MILLIS = 30L * 60 * 1000;

	private record Entry(String name, long at) {}

	private final Map<UUID, Entry> entries = new HashMap<>();
	private final Function<UUID, String> primary;
	private final Function<UUID, String> fallback;
	private final LongSupplier clock;

	NameCache(Function<UUID, String> primary, Function<UUID, String> fallback, LongSupplier clock) {
		this.primary = primary;
		this.fallback = fallback;
		this.clock = clock;
	}

	/** @return the player's name, or null when neither source knows it */
	String name(UUID uuid) {
		long now = clock.getAsLong();
		Entry entry = entries.get(uuid);
		if (entry != null && now - entry.at() < (entry.name() == null ? MISS_TTL_MILLIS : HIT_TTL_MILLIS)) {
			return entry.name();
		}
		String name = lookup(primary, uuid);
		if (name == null) {
			name = lookup(fallback, uuid);
		}
		entries.put(uuid, new Entry(name, now));
		return name;
	}

	private static String lookup(Function<UUID, String> source, UUID uuid) {
		try {
			String name = source.apply(uuid);
			return name == null || name.isBlank() ? null : name;
		} catch (RuntimeException e) {
			return null;
		}
	}

	/** The server's own record of the player, from its user cache. */
	static String bukkitName(UUID uuid) {
		OfflinePlayer player = Bukkit.getOfflinePlayer(uuid);
		return player == null ? null : player.getName();
	}
}
