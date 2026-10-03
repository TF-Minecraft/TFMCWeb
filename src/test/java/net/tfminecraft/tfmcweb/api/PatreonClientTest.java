package net.tfminecraft.tfmcweb.api;

import static org.junit.jupiter.api.Assertions.*;

import com.google.gson.JsonParser;
import java.util.ArrayList;
import java.util.List;
import net.tfminecraft.tfmcweb.Cache;
import net.tfminecraft.tfmcweb.TestState;
import net.tfminecraft.tfmcweb.api.PatreonClient.AckResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.LinkStartResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.RankChange;
import net.tfminecraft.tfmcweb.api.PatreonClient.RankChangesResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.RosterResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.StatusResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.UnlinkResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PatreonClientTest {
	TestState state;
	HttpFixture http;

	@BeforeEach void setup() throws Exception { state = new TestState(); http = new HttpFixture(); }
	@AfterEach void cleanup() throws Exception { http.close(); state.close(); }

	@Test void statusLinkAndUnlinkUseTheGateway() throws Exception {
		assertEquals("player_uuid is required", PatreonClient.status(null).error);
		assertEquals("player_uuid is required", PatreonClient.status(" ").error);
		assertEquals("player_uuid is required", PatreonClient.startLink(null, "Ada").error);
		assertEquals("player_uuid is required", PatreonClient.unlink(" ").error);
		http.reply(200, "{\"linked\":true,\"tier_key\":\"ascended\",\"tier_name\":\"Ascended\",\"grace_until\":\"2026-10-10T00:00:00Z\",\"patreon_name\":\"Ada\",\"method\":\"oauth\"}");
		StatusResult status = PatreonClient.status(" id ");
		assertTrue(status.ok && status.linked);
		assertEquals("ascended", status.tierKey); assertEquals("Ascended", status.tierName);
		assertEquals("2026-10-10T00:00:00Z", status.graceUntil); assertEquals("Ada", status.patreonName);
		assertEquals("/patreon/status?player_uuid=id", http.request().path());
		http.reply(200, "{\"linked\":false,\"tier_key\":null,\"tier_name\":\"\",\"grace_until\":null,\"patreon_name\":null}");
		status = PatreonClient.status("id");
		assertTrue(status.ok); assertFalse(status.linked);
		assertNull(status.tierKey); assertNull(status.tierName); assertNull(status.graceUntil); assertNull(status.patreonName);
		http.request();
		http.reply(200, "{\"linked\":\"TRUE\",\"tier_key\":1}");
		status = PatreonClient.status("id");
		assertTrue(status.linked); assertEquals("1", status.tierKey); http.request();
		for (String body : List.of("{\"linked\":false}", "{\"linked\":null}", "{\"linked\":{\"x\":1}}", "{\"linked\":\"no\"}")) {
			http.reply(200, body);
			assertFalse(PatreonClient.status("id").linked);
			http.request();
		}
		http.reply(200, "[]"); assertEquals("Malformed Patreon status", PatreonClient.status("id").error); http.request();
		http.reply(200, ""); assertEquals("Malformed Patreon status", PatreonClient.status("id").error); http.request();
		http.reply(200, "{bad"); assertEquals("Malformed Patreon status", PatreonClient.status("id").error); http.request();
		http.reply(401, "{\"detail\":\"denied\"}");
		assertTrue(PatreonClient.status("id").error.contains("denied")); http.request();

		http.reply(200, "{\"authorize_url\":\"https://www.patreon.com/oauth2/authorize?x=1\",\"expires_at\":\"soon\"}");
		LinkStartResult link = PatreonClient.startLink("id", null);
		assertTrue(link.ok); assertEquals("https://www.patreon.com/oauth2/authorize?x=1", link.authorizeUrl); assertEquals("soon", link.expiresAt);
		var body = JsonParser.parseString(http.request().body()).getAsJsonObject();
		assertEquals("id", body.get("player_uuid").getAsString()); assertEquals("", body.get("minecraft_name").getAsString());
		http.reply(200, "{\"authorize_url\":\" https://example.test/link \",\"expires_at\":\"\"}");
		link = PatreonClient.startLink("id", "Ada");
		assertEquals("https://example.test/link", link.authorizeUrl); assertNull(link.expiresAt);
		assertEquals("Ada", JsonParser.parseString(http.request().body()).getAsJsonObject().get("minecraft_name").getAsString());
		http.reply(200, "{}"); assertEquals("API returned OK but no authorize URL.", PatreonClient.startLink("id", "Ada").error); http.request();
		http.reply(200, "nope"); assertEquals("Malformed Patreon link response", PatreonClient.startLink("id", "Ada").error); http.request();
		http.reply(503, "{\"detail\":\"patreon_disabled\"}");
		assertEquals("patreon_disabled", PatreonClient.startLink("id", "Ada").error); http.request();

		http.reply(200, "{\"unlinked\":true}");
		UnlinkResult unlink = PatreonClient.unlink(" id ");
		assertTrue(unlink.ok && unlink.unlinked);
		var unlinkRequest = http.request();
		assertEquals("{\"player_uuid\":\"id\"}", unlinkRequest.body());
		assertEquals("/patreon/link/unlink", unlinkRequest.path());
		http.reply(200, "{\"unlinked\":false}");
		unlink = PatreonClient.unlink("id");
		assertTrue(unlink.ok); assertFalse(unlink.unlinked); http.request();
		http.reply(200, "{\"unlinked\":\"false\"}"); assertFalse(PatreonClient.unlink("id").unlinked); http.request();
		http.reply(200, "[]"); assertEquals("Malformed Patreon unlink response", PatreonClient.unlink("id").error); http.request();
		http.reply(400, "{\"detail\":\"nope\"}"); assertEquals("nope", PatreonClient.unlink("id").error); http.request();
		Cache.pluginKey = "";
		assertTrue(PatreonClient.status("id").error.contains("not configured"));
		assertTrue(PatreonClient.startLink("id", "Ada").error.contains("not configured"));
		assertTrue(PatreonClient.unlink("id").error.contains("not configured"));
	}

	@Test void rankChangesRosterAndAckParseTheOutbox() throws Exception {
		assertTrue(PatreonClient.ackRankChanges(null).ok);
		assertTrue(PatreonClient.ackRankChanges(List.of()).ok);
		http.reply(200, "{}");
		assertTrue(PatreonClient.ackRankChanges(List.of(7, 8)).ok);
		var ack = http.request();
		assertEquals("POST", ack.method());
		assertEquals("/patreon/plugin/rank-changes/ack", ack.path());
		assertEquals("{\"ids\":[7,8]}", ack.body());
		assertEquals("unit-test-key", ack.key());
		http.reply(500, ""); assertEquals("HTTP 500", PatreonClient.ackRankChanges(List.of(1)).error); http.request();

		String change = "{\"id\":7,\"player_uuid\":\"uuid-1\",\"add_tier\":\"gilded\",\"remove_tiers\":[\"noble\",\" \",\"\",null,{\"x\":1},1]}";
		http.reply(200, "{\"changes\":[" + change + ",null,\"bad\",{\"id\":\"bad\"},{\"id\":1},{\"player_uuid\":\"x\"},{\"id\":\" 12 \",\"player_uuid\":\"uuid-2\",\"add_tier\":\"\",\"remove_tiers\":null},{\"id\":false,\"player_uuid\":\"uuid-3\"},{\"id\":3000000000,\"player_uuid\":\"uuid-4\"},{\"id\":{\"n\":1},\"player_uuid\":\"uuid-5\"}]}");
		RankChangesResult changes = PatreonClient.listRankChanges();
		assertTrue(changes.ok); assertEquals(2, changes.changes.size());
		RankChange first = changes.changes.getFirst();
		assertEquals(7, first.id); assertEquals("uuid-1", first.playerUuid); assertEquals("gilded", first.addTier);
		assertEquals(List.of("noble", "1"), first.removeTiers);
		assertThrows(UnsupportedOperationException.class, () -> changes.changes.clear());
		RankChange second = changes.changes.get(1);
		assertEquals(12, second.id); assertNull(second.addTier); assertTrue(second.removeTiers.isEmpty());
		assertEquals("GET", http.request().method());
		List<String> tiers = new ArrayList<>();
		tiers.add("noble");
		RankChange copied = new RankChange(1, "u", "noble", tiers);
		tiers.clear();
		assertEquals(List.of("noble"), copied.removeTiers);
		assertTrue(new RankChange(3, "u", null, null).removeTiers.isEmpty());
		assertTrue(RankChangesResult.success(null).changes.isEmpty());
		assertTrue(RankChangesResult.fail("x").changes.isEmpty());
		http.reply(200, "{}"); assertTrue(PatreonClient.listRankChanges().changes.isEmpty()); http.request();
		http.reply(200, "{\"changes\":null}"); assertTrue(PatreonClient.listRankChanges().changes.isEmpty()); http.request();
		http.reply(200, "{\"changes\":{}}"); assertEquals("Malformed rank-changes response", PatreonClient.listRankChanges().error); http.request();
		http.reply(200, "nope"); assertEquals("Malformed rank-changes response", PatreonClient.listRankChanges().error); http.request();
		http.reply(401, "{\"detail\":\"denied\"}"); assertTrue(PatreonClient.listRankChanges().error.contains("Unauthorized")); http.request();

		http.reply(200, "{\"tier_keys\":[\"noble\"],\"members\":[{\"player_uuid\":\"uuid-1\",\"tier_key\":\"ascended\"},{\"player_uuid\":\"uuid-2\",\"tier_key\":null},{\"player_uuid\":\"uuid-3\",\"tier_key\":\"\"},null,\"x\",{\"tier_key\":\"noble\"}]}");
		RosterResult roster = PatreonClient.listRoster();
		assertTrue(roster.ok); assertEquals(3, roster.members.size());
		assertEquals("ascended", roster.members.getFirst().tierKey); assertNull(roster.members.get(1).tierKey); assertNull(roster.members.get(2).tierKey);
		assertEquals("/patreon/plugin/roster", http.request().path());
		assertThrows(UnsupportedOperationException.class, () -> roster.members.clear());
		assertTrue(RosterResult.success(null).members.isEmpty());
		http.reply(200, "{}"); assertTrue(PatreonClient.listRoster().members.isEmpty()); http.request();
		http.reply(200, "{\"members\":null}"); assertTrue(PatreonClient.listRoster().members.isEmpty()); http.request();
		http.reply(200, "{\"members\":{}}"); assertEquals("Malformed roster response", PatreonClient.listRoster().error); http.request();
		http.reply(200, ""); assertEquals("Malformed roster response", PatreonClient.listRoster().error); http.request();
		http.reply(400, "{\"detail\":\"nope\"}"); assertEquals("nope", PatreonClient.listRoster().error); http.request();
		Cache.apiBaseUrl = null;
		assertTrue(PatreonClient.listRankChanges().error.contains("not configured"));
		assertTrue(PatreonClient.listRoster().error.contains("not configured"));
		assertTrue(PatreonClient.ackRankChanges(List.of(1)).error.contains("not configured"));
		AckResult failed = AckResult.fail(null);
		assertFalse(failed.ok); assertNull(failed.error);
	}
}
