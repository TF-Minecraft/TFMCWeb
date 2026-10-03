package net.tfminecraft.tfmcweb.api;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;

import net.tfminecraft.tfmcweb.api.ProvinceSystemGateway.GatewayResult;

/**
 * ProvinceSystem Patreon routes. HTTP goes through {@link ProvinceSystemGateway}.
 */
public final class PatreonClient {

	private PatreonClient() {}

	public static final class StatusResult {
		public final boolean ok;
		public final boolean linked;
		public final String tierKey;
		public final String tierName;
		public final String graceUntil;
		public final String patreonName;
		public final String error;

		private StatusResult(
			boolean ok,
			boolean linked,
			String tierKey,
			String tierName,
			String graceUntil,
			String patreonName,
			String error
		) {
			this.ok = ok;
			this.linked = linked;
			this.tierKey = tierKey;
			this.tierName = tierName;
			this.graceUntil = graceUntil;
			this.patreonName = patreonName;
			this.error = error;
		}

		public static StatusResult success(
			boolean linked,
			String tierKey,
			String tierName,
			String graceUntil,
			String patreonName
		) {
			return new StatusResult(true, linked, tierKey, tierName, graceUntil, patreonName, null);
		}

		public static StatusResult fail(String error) {
			return new StatusResult(false, false, null, null, null, null, error);
		}
	}

	public static final class LinkStartResult {
		public final boolean ok;
		public final String authorizeUrl;
		public final String expiresAt;
		public final String error;

		private LinkStartResult(boolean ok, String authorizeUrl, String expiresAt, String error) {
			this.ok = ok;
			this.authorizeUrl = authorizeUrl;
			this.expiresAt = expiresAt;
			this.error = error;
		}

		public static LinkStartResult success(String authorizeUrl, String expiresAt) {
			return new LinkStartResult(true, authorizeUrl, expiresAt, null);
		}

		public static LinkStartResult fail(String error) {
			return new LinkStartResult(false, null, null, error);
		}
	}

	public static final class UnlinkResult {
		public final boolean ok;
		public final boolean unlinked;
		public final String error;

		private UnlinkResult(boolean ok, boolean unlinked, String error) {
			this.ok = ok;
			this.unlinked = unlinked;
			this.error = error;
		}

		public static UnlinkResult success(boolean unlinked) {
			return new UnlinkResult(true, unlinked, null);
		}

		public static UnlinkResult fail(String error) {
			return new UnlinkResult(false, false, error);
		}
	}

	public static final class RankChange {
		public final int id;
		public final String playerUuid;
		public final String addTier;
		public final List<String> removeTiers;

		public RankChange(int id, String playerUuid, String addTier, List<String> removeTiers) {
			this.id = id;
			this.playerUuid = playerUuid;
			this.addTier = addTier;
			this.removeTiers = removeTiers == null ? List.of() : List.copyOf(removeTiers);
		}
	}

	public static final class RankChangesResult {
		public final boolean ok;
		public final List<RankChange> changes;
		public final String error;

		private RankChangesResult(boolean ok, List<RankChange> changes, String error) {
			this.ok = ok;
			this.changes = changes == null ? List.of() : List.copyOf(changes);
			this.error = error;
		}

		public static RankChangesResult success(List<RankChange> changes) {
			return new RankChangesResult(true, changes, null);
		}

		public static RankChangesResult fail(String error) {
			return new RankChangesResult(false, null, error);
		}
	}

	public static final class RosterMember {
		public final String playerUuid;
		public final String tierKey;

		public RosterMember(String playerUuid, String tierKey) {
			this.playerUuid = playerUuid;
			this.tierKey = tierKey;
		}
	}

	public static final class RosterResult {
		public final boolean ok;
		public final List<RosterMember> members;
		public final String error;

		private RosterResult(boolean ok, List<RosterMember> members, String error) {
			this.ok = ok;
			this.members = members == null ? List.of() : List.copyOf(members);
			this.error = error;
		}

		public static RosterResult success(List<RosterMember> members) {
			return new RosterResult(true, members, null);
		}

		public static RosterResult fail(String error) {
			return new RosterResult(false, null, error);
		}
	}

	public static final class AckResult {
		public final boolean ok;
		public final String error;

		private AckResult(boolean ok, String error) {
			this.ok = ok;
			this.error = error;
		}

		public static AckResult success() {
			return new AckResult(true, null);
		}

		public static AckResult fail(String error) {
			return new AckResult(false, error);
		}
	}

	public static StatusResult status(String playerUuid) {
		String uuid = trim(playerUuid);
		if (uuid.isEmpty()) {
			return StatusResult.fail("player_uuid is required");
		}
		String path = "/patreon/status?player_uuid="
			+ URLEncoder.encode(uuid, StandardCharsets.UTF_8);
		GatewayResult raw = ProvinceSystemGateway.request("GET", path, null);
		if (!raw.ok) {
			return StatusResult.fail(raw.error);
		}
		JsonObject root = object(raw.body);
		if (root == null) {
			return StatusResult.fail("Malformed Patreon status");
		}
		return StatusResult.success(
			isTrue(root.get("linked")),
			jsonText(root, "tier_key"),
			jsonText(root, "tier_name"),
			jsonText(root, "grace_until"),
			jsonText(root, "patreon_name")
		);
	}

	public static LinkStartResult startLink(String playerUuid, String minecraftName) {
		String uuid = trim(playerUuid);
		if (uuid.isEmpty()) {
			return LinkStartResult.fail("player_uuid is required");
		}
		JsonObject body = new JsonObject();
		body.addProperty("player_uuid", uuid);
		body.addProperty("minecraft_name", minecraftName == null ? "" : minecraftName);
		GatewayResult raw = ProvinceSystemGateway.request(
			"POST",
			"/patreon/link/start",
			body.toString()
		);
		if (!raw.ok) {
			return LinkStartResult.fail(raw.error);
		}
		JsonObject root = object(raw.body);
		if (root == null) {
			return LinkStartResult.fail("Malformed Patreon link response");
		}
		String url = jsonText(root, "authorize_url");
		if (url == null) {
			return LinkStartResult.fail("API returned OK but no authorize URL.");
		}
		return LinkStartResult.success(url, jsonText(root, "expires_at"));
	}

	public static UnlinkResult unlink(String playerUuid) {
		String uuid = trim(playerUuid);
		if (uuid.isEmpty()) {
			return UnlinkResult.fail("player_uuid is required");
		}
		JsonObject body = new JsonObject();
		body.addProperty("player_uuid", uuid);
		GatewayResult raw = ProvinceSystemGateway.request(
			"POST",
			"/patreon/link/unlink",
			body.toString()
		);
		if (!raw.ok) {
			return UnlinkResult.fail(raw.error);
		}
		JsonObject root = object(raw.body);
		if (root == null) {
			return UnlinkResult.fail("Malformed Patreon unlink response");
		}
		return UnlinkResult.success(isTrue(root.get("unlinked")));
	}

	public static RankChangesResult listRankChanges() {
		GatewayResult raw = ProvinceSystemGateway.request(
			"GET",
			"/patreon/plugin/rank-changes",
			null
		);
		if (!raw.ok) {
			return RankChangesResult.fail(raw.error);
		}
		JsonObject root = object(raw.body);
		if (root == null) {
			return RankChangesResult.fail("Malformed rank-changes response");
		}
		JsonElement changes = root.get("changes");
		if (changes == null || changes.isJsonNull()) {
			return RankChangesResult.success(List.of());
		}
		if (!changes.isJsonArray()) {
			return RankChangesResult.fail("Malformed rank-changes response");
		}
		List<RankChange> parsed = new ArrayList<>();
		for (JsonElement element : changes.getAsJsonArray()) {
			RankChange change = parseChange(element);
			if (change != null) {
				parsed.add(change);
			}
		}
		return RankChangesResult.success(parsed);
	}

	public static AckResult ackRankChanges(List<Integer> ids) {
		if (ids == null || ids.isEmpty()) {
			return AckResult.success();
		}
		StringBuilder sb = new StringBuilder("{\"ids\":[");
		for (int i = 0; i < ids.size(); i++) {
			if (i > 0) {
				sb.append(',');
			}
			sb.append(ids.get(i).intValue());
		}
		sb.append("]}");
		GatewayResult raw = ProvinceSystemGateway.request(
			"POST",
			"/patreon/plugin/rank-changes/ack",
			sb.toString()
		);
		if (!raw.ok) {
			return AckResult.fail(raw.error);
		}
		return AckResult.success();
	}

	public static RosterResult listRoster() {
		GatewayResult raw = ProvinceSystemGateway.request("GET", "/patreon/plugin/roster", null);
		if (!raw.ok) {
			return RosterResult.fail(raw.error);
		}
		JsonObject root = object(raw.body);
		if (root == null) {
			return RosterResult.fail("Malformed roster response");
		}
		JsonElement members = root.get("members");
		if (members == null || members.isJsonNull()) {
			return RosterResult.success(List.of());
		}
		if (!members.isJsonArray()) {
			return RosterResult.fail("Malformed roster response");
		}
		List<RosterMember> parsed = new ArrayList<>();
		for (JsonElement element : members.getAsJsonArray()) {
			RosterMember member = parseMember(element);
			if (member != null) {
				parsed.add(member);
			}
		}
		return RosterResult.success(parsed);
	}

	private static RankChange parseChange(JsonElement element) {
		if (element == null || !element.isJsonObject()) {
			return null;
		}
		JsonObject obj = element.getAsJsonObject();
		Integer id = jsonId(obj);
		String uuid = jsonText(obj, "player_uuid");
		if (id == null || uuid == null) {
			return null;
		}
		return new RankChange(id.intValue(), uuid, jsonText(obj, "add_tier"), jsonStrings(obj.get("remove_tiers")));
	}

	private static RosterMember parseMember(JsonElement element) {
		if (element == null || !element.isJsonObject()) {
			return null;
		}
		JsonObject obj = element.getAsJsonObject();
		String uuid = jsonText(obj, "player_uuid");
		if (uuid == null) {
			return null;
		}
		return new RosterMember(uuid, jsonText(obj, "tier_key"));
	}

	private static List<String> jsonStrings(JsonElement element) {
		if (element == null || element.isJsonNull() || !element.isJsonArray()) {
			return List.of();
		}
		List<String> values = new ArrayList<>();
		JsonArray array = element.getAsJsonArray();
		for (JsonElement item : array) {
			if (item == null || !item.isJsonPrimitive()) {
				continue;
			}
			String text = item.getAsString().trim();
			if (!text.isEmpty()) {
				values.add(text);
			}
		}
		return values;
	}

	private static Integer jsonId(JsonObject obj) {
		JsonElement element = obj.get("id");
		if (element == null || element.isJsonNull() || !element.isJsonPrimitive()) {
			return null;
		}
		try {
			JsonPrimitive primitive = element.getAsJsonPrimitive();
			if (primitive.isNumber()) {
				long value = primitive.getAsLong();
				if (value < Integer.MIN_VALUE || value > Integer.MAX_VALUE) {
					return null;
				}
				return Integer.valueOf((int) value);
			}
			return Integer.valueOf(primitive.getAsString().trim());
		} catch (NumberFormatException e) {
			return null;
		}
	}

	private static String jsonText(JsonObject obj, String key) {
		JsonElement element = obj.get(key);
		if (element == null || element.isJsonNull() || !element.isJsonPrimitive()) {
			return null;
		}
		String text = element.getAsString().trim();
		return text.isEmpty() ? null : text;
	}

	private static boolean isTrue(JsonElement element) {
		if (element == null || element.isJsonNull() || !element.isJsonPrimitive()) {
			return false;
		}
		JsonPrimitive primitive = element.getAsJsonPrimitive();
		if (primitive.isBoolean()) {
			return primitive.getAsBoolean();
		}
		return "true".equalsIgnoreCase(primitive.getAsString());
	}

	private static JsonObject object(String body) {
		if (body == null || body.isBlank()) {
			return null;
		}
		try {
			JsonElement element = JsonParser.parseString(body);
			if (!element.isJsonObject()) {
				return null;
			}
			return element.getAsJsonObject();
		} catch (JsonParseException e) {
			return null;
		}
	}

	private static String trim(String value) {
		return value == null ? "" : value.trim();
	}
}
