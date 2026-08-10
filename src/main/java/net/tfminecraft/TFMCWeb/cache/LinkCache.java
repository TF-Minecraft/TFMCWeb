package net.tfminecraft.TFMCWeb.cache;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient.IdentityStatus;

/**
 * In-memory UUID → Discord link / grace snapshot.
 */
public final class LinkCache {

	public static final class Entry {
		public final boolean linked;
		public final boolean eligible;
		public final boolean inGrace;
		public final String discordUserId;
		public final String discordUsername;
		public final String graceUntil;

		public Entry(
			boolean linked,
			boolean eligible,
			boolean inGrace,
			String discordUserId,
			String discordUsername,
			String graceUntil
		) {
			this.linked = linked;
			this.eligible = eligible;
			this.inGrace = inGrace;
			this.discordUserId = discordUserId;
			this.discordUsername = discordUsername;
			this.graceUntil = graceUntil;
		}

		public static Entry unlinked() {
			return new Entry(false, false, false, null, null, null);
		}

		public static Entry fromStatus(IdentityStatus status) {
			if (status == null || !status.ok) {
				return unlinked();
			}
			return new Entry(
				status.linked,
				status.eligible,
				status.inGrace,
				status.discordUserId,
				status.discordUsername,
				status.graceUntil
			);
		}
	}

	private final Map<UUID, Entry> entries = new ConcurrentHashMap<>();

	public Entry get(UUID uuid) {
		if (uuid == null) {
			return null;
		}
		return entries.get(uuid);
	}

	public void put(UUID uuid, Entry entry) {
		if (uuid == null || entry == null) {
			return;
		}
		entries.put(uuid, entry);
	}

	public void putFromStatus(UUID uuid, IdentityStatus status) {
		put(uuid, Entry.fromStatus(status));
	}

	public void clear(UUID uuid) {
		if (uuid != null) {
			entries.remove(uuid);
		}
	}

	public void putLinked(UUID uuid, String discordUserId, String discordUsername) {
		put(uuid, new Entry(true, true, false, discordUserId, discordUsername, null));
	}

	public void putGrace(UUID uuid, String discordUserId, String graceUntil) {
		Entry prev = get(uuid);
		String name = prev != null ? prev.discordUsername : null;
		String id = discordUserId != null
			? discordUserId
			: (prev != null ? prev.discordUserId : null);
		put(uuid, new Entry(true, true, true, id, name, graceUntil));
	}

	public void clearGrace(UUID uuid) {
		Entry prev = get(uuid);
		if (prev == null) {
			put(uuid, new Entry(true, true, false, null, null, null));
			return;
		}
		put(
			uuid,
			new Entry(
				true,
				true,
				false,
				prev.discordUserId,
				prev.discordUsername,
				null
			)
		);
	}

	public void putUnlinked(UUID uuid) {
		put(uuid, Entry.unlinked());
	}

	public int size() {
		return entries.size();
	}

	public Collection<Map.Entry<UUID, Entry>> snapshot() {
		return entries.entrySet();
	}

	/**
	 * Eligible if we have a cache hit saying so; missing cache → treat as not eligible
	 * until status sync (join / reconcile).
	 */
	public boolean isEligible(UUID uuid) {
		Entry e = get(uuid);
		return e != null && e.eligible;
	}
}
