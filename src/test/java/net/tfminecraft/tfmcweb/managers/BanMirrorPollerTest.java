package net.tfminecraft.tfmcweb.managers;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.destroystokyo.paper.profile.PlayerProfile;
import io.papermc.paper.ban.BanListType;
import java.nio.file.*;
import java.util.*;
import java.util.logging.Logger;
import net.tfminecraft.tfmcweb.Cache;
import net.tfminecraft.tfmcweb.TestState;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient.*;
import net.tfminecraft.tfmcweb.cache.LinkCache;
import org.bukkit.BanEntry;
import org.bukkit.Bukkit;
import org.bukkit.ban.ProfileBanList;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitScheduler;
import org.bukkit.scheduler.BukkitTask;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.*;

class BanMirrorPollerTest {
    static final UUID ADA = UUID.randomUUID(), BOB = UUID.randomUUID();
    static final long HOUR = 3_600_000L;
    @TempDir Path temp;
    TestState state; JavaPlugin plugin; Logger logger; BukkitScheduler scheduler; BukkitTask timer; ProfileBanList banList;
    MockedStatic<Bukkit> bukkit; MockedStatic<ProvinceSystemClient> api; LinkCache cache;
    Set<BanEntry<PlayerProfile>> entries = new HashSet<>();
    List<Runnable> deferred; Runnable tick;

    @BeforeEach void setup() throws Exception {
        state = new TestState();
        plugin = mock(JavaPlugin.class); logger = mock(Logger.class);
        when(plugin.getLogger()).thenReturn(logger); when(plugin.getDataFolder()).thenReturn(temp.toFile());
        scheduler = mock(BukkitScheduler.class); timer = mock(BukkitTask.class); banList = mock(ProfileBanList.class);
        when(banList.getEntries()).thenAnswer(c -> new HashSet<>(entries));
        bukkit = mockStatic(Bukkit.class);
        bukkit.when(Bukkit::getScheduler).thenReturn(scheduler);
        bukkit.when(() -> Bukkit.getBanList(BanListType.PROFILE)).thenReturn(banList);
        when(scheduler.runTaskTimer(eq(plugin), any(Runnable.class), eq(600L), eq(600L))).thenAnswer(c -> { tick = c.getArgument(1); return timer; });
        doAnswer(c -> { Runnable r = c.getArgument(1); if (deferred != null) deferred.add(r); else r.run(); return null; })
            .when(scheduler).runTaskAsynchronously(eq(plugin), any(Runnable.class));
        api = mockStatic(ProvinceSystemClient.class, call -> call.getMethod().getName().equals("jsonString") ? call.callRealMethod() : Answers.RETURNS_DEFAULTS.answer(call));
        api.when(() -> ProvinceSystemClient.getIdentityStatus(anyString())).thenReturn(IdentityStatus.fail("none"));
        postReturns(MirrorResult.success(true));
        cache = new LinkCache();
    }
    @AfterEach void cleanup() throws Exception { api.close(); bukkit.close(); state.close(); }

    void postReturns(MirrorResult result) {
        api.when(() -> ProvinceSystemClient.postBanEvent(anyString(), anyString(), nullable(String.class), nullable(String.class),
            nullable(String.class), nullable(String.class), nullable(String.class))).thenReturn(result);
    }
    @SuppressWarnings("unchecked")
    BanEntry<PlayerProfile> ban(UUID id, String name, long created, Long expires, String reason, String source) {
        PlayerProfile profile = mock(PlayerProfile.class);
        when(profile.getId()).thenReturn(id); when(profile.getName()).thenReturn(name);
        BanEntry<PlayerProfile> entry = mock(BanEntry.class);
        when(entry.getBanTarget()).thenReturn(profile); when(entry.getCreated()).thenReturn(new Date(created));
        when(entry.getExpiration()).thenReturn(expires == null ? null : new Date(expires));
        when(entry.getReason()).thenReturn(reason); when(entry.getSource()).thenReturn(source);
        entries.add(entry);
        return entry;
    }
    BanMirrorPoller started() { BanMirrorPoller poller = new BanMirrorPoller(plugin, cache); poller.start(); return poller; }
    void verifyPost(String type, UUID id, String discord, String name, String reason, String duration, String staff) {
        String uuid = id.toString();
        api.verify(() -> ProvinceSystemClient.postBanEvent(type, uuid, discord, name, reason, duration, staff));
    }
    void verifyNoPosts() {
        api.verify(() -> ProvinceSystemClient.postBanEvent(anyString(), anyString(), nullable(String.class), nullable(String.class),
            nullable(String.class), nullable(String.class), nullable(String.class)), never());
    }

    @Test void startHonoursConfigAndStopsOnce() {
        Cache.banMirrorEnabled = false;
        BanMirrorPoller poller = started();
        verify(logger).info(contains("disabled")); verify(scheduler, never()).runTaskTimer(any(JavaPlugin.class), any(Runnable.class), anyLong(), anyLong());
        poller.stop();
        Cache.banMirrorEnabled = true;
        poller.start(); poller.start();
        verify(scheduler, times(1)).runTaskTimer(eq(plugin), any(Runnable.class), eq(600L), eq(600L));
        poller.stop(); poller.stop();
        verify(timer, times(1)).cancel();
    }

    @Test void firstRunAdoptsBansSilentlyThenMirrorsChangesAcrossRestarts() throws Exception {
        long now = System.currentTimeMillis();
        var ada = ban(ADA, "Ada", now - HOUR, null, "Xray", "Mod");
        started(); tick.run();
        verifyNoPosts();
        assertTrue(Files.readString(temp.resolve(BanMirrorPoller.STATE_FILE)).contains(ADA.toString()));

        // Restart: state comes back from disk, so Ada stays quiet.
        started(); tick.run();
        verifyNoPosts();

        ban(BOB, "Bob", now, System.currentTimeMillis() + 1000, "Griefing | (3.1)", "Staffer");
        cache.putLinked(BOB, "42", "bob");
        tick.run();
        verifyPost("ban", BOB, "42", "Bob", "Griefing (3.1)", "1m", "Staffer");
        verify(logger).info(contains("ban for Bob sent to Discord"));

        entries.remove(ada); postReturns(MirrorResult.success(false));
        tick.run();
        verifyPost("unban", ADA, null, "Ada", null, null, null);
        verify(logger).info(contains("unban for Ada (no Discord link)"));

        // Bob's timed ban lapses; the entry lingers in the list but counts as expired.
        postReturns(MirrorResult.success(true));
        Thread.sleep(1100);
        tick.run();
        verifyPost("unban", BOB, "42", "Bob", null, null, "Ban expired");
        tick.run();
        api.verify(() -> ProvinceSystemClient.postBanEvent(anyString(), anyString(), nullable(String.class), nullable(String.class),
            nullable(String.class), nullable(String.class), nullable(String.class)), times(3));
    }

    @Test void rebansFailuresAndIdentityLookups() {
        long now = System.currentTimeMillis();
        started(); tick.run();
        var first = ban(ADA, "Ada", now, now + 2 * HOUR, "first", "Mod");
        ban(BOB, "Bob", now, now + 26 * HOUR, "long", "Mod");
        var identity = IdentityStatus.fromJson("{\"discord_user_id\":\"fetched\"}");
        api.when(() -> ProvinceSystemClient.getIdentityStatus(ADA.toString())).thenReturn(identity);
        tick.run();
        verifyPost("ban", ADA, "fetched", "Ada", "first", "1h", "Mod");
        verifyPost("ban", BOB, null, "Bob", "long", "1 day", "Mod");
        assertEquals("fetched", cache.get(ADA).discordUserId);

        entries.remove(first); ban(ADA, "Ada", now + 1, now + 3 * HOUR, "second", "Mod");
        postReturns(MirrorResult.fail("down"));
        tick.run(); tick.run();
        verify(logger, times(1)).warning(contains("API failed for ban Ada: down"));
        postReturns(MirrorResult.success(true));
        tick.run();
        api.verify(() -> ProvinceSystemClient.postBanEvent("ban", ADA.toString(), "fetched", "Ada", "second", "2h", "Mod"), times(3));
    }

    @Test void skipsOverlappingTicksAndSurvivesBanListFailures() {
        deferred = new ArrayList<>();
        started(); tick.run(); tick.run();
        assertEquals(1, deferred.size());
        deferred.getFirst().run(); deferred = null;
        bukkit.when(() -> Bukkit.getBanList(BanListType.PROFILE)).thenThrow(new IllegalStateException("boom"));
        tick.run();
        verify(logger).warning(contains("could not read the ban list"));
        bukkit.when(() -> Bukkit.getBanList(BanListType.PROFILE)).thenReturn(banList);
        ban(ADA, "Ada", 1L, null, null, null);
        tick.run();
        verifyPost("ban", ADA, null, "Ada", null, "Permanent", null);
    }

    @Test void readBanListSkipsEntriesWithoutAnId() {
        @SuppressWarnings("unchecked") BanEntry<PlayerProfile> noProfile = mock(BanEntry.class);
        entries.add(noProfile);
        ban(null, "ghost", 1L, null, null, null);
        assertTrue(BanMirrorPoller.readBanList(System.currentTimeMillis()).isEmpty());
    }

    @Test void stateFileWithoutBansOrWithBadKeysIsReadAndSaveErrorsAreLogged() throws Exception {
        Files.writeString(temp.resolve(BanMirrorPoller.STATE_FILE), "other: 1\n");
        ban(ADA, "Ada", 1L, null, "r", "s");
        started(); tick.run();
        verifyPost("ban", ADA, null, "Ada", "r", "Permanent", "s");

        Files.writeString(temp.resolve(BanMirrorPoller.STATE_FILE), "bans:\n  not-a-uuid:\n    name: x\n  " + ADA + ":\n    name: Ada\n    created: 1\n    expires: 0\n");
        started(); tick.run();
        api.verify(() -> ProvinceSystemClient.postBanEvent(eq("ban"), anyString(), any(), any(), any(), any(), any()), times(1));

        Files.delete(temp.resolve(BanMirrorPoller.STATE_FILE));
        Files.createDirectory(temp.resolve(BanMirrorPoller.STATE_FILE));
        new BanMirrorPoller(plugin, cache).tick();
        verify(logger).warning(contains("could not save"));
    }

    @Test void formatsDurations() {
        assertEquals("Permanent", BanMirrorPoller.formatDuration(0L, 5L));
        assertEquals("2 days", BanMirrorPoller.formatDuration(49 * HOUR, 0L));
        assertEquals("1 day", BanMirrorPoller.formatDuration(24 * HOUR, 0L));
        assertEquals("3h", BanMirrorPoller.formatDuration(3 * HOUR + 5, 0L));
        assertEquals("5m", BanMirrorPoller.formatDuration(5 * 60_000L, 0L));
        assertEquals("1m", BanMirrorPoller.formatDuration(10L, 20L));
    }

    @Test void cleansTextForTheApi() {
        assertNull(BanMirrorPoller.cleanReason(null));
        assertNull(BanMirrorPoller.cleanReason(" | $ "));
        assertEquals("Red text and more", BanMirrorPoller.cleanReason("§cRed &ltext\nand #ff00ffmore 😀"));
        assertEquals("(4.16) - Do not parkour, use magic/skills.", BanMirrorPoller.cleanReason("(4.16) - Do not parkour, use magic/skills."));
        assertEquals("José's ban", BanMirrorPoller.cleanReason("José's ban"));
        assertEquals(500, BanMirrorPoller.cleanReason("a".repeat(600)).length());
        assertNull(BanMirrorPoller.cleanDisplay(null, 16));
        assertNull(BanMirrorPoller.cleanDisplay("!!!", 16));
        assertEquals("Ryan's console", BanMirrorPoller.cleanDisplay("Ryan's console!", 32));
        assertEquals("Some_Long_Name_1", BanMirrorPoller.cleanDisplay("Some_Long_Name_1234", 16));
        assertEquals("abc", BanMirrorPoller.cleanDisplay("abc ".repeat(9), 3));
    }
}
