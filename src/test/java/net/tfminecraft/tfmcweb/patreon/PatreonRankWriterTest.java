package net.tfminecraft.tfmcweb.patreon;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.logging.Logger;

import net.luckperms.api.LuckPerms;
import net.luckperms.api.LuckPermsProvider;
import net.luckperms.api.messaging.MessagingService;
import net.luckperms.api.model.user.UserManager;
import net.tfminecraft.tfmcweb.Cache;
import net.tfminecraft.tfmcweb.TestState;
import net.tfminecraft.tfmcweb.api.PatreonClient;
import net.tfminecraft.tfmcweb.api.PatreonClient.AckResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.RankChange;
import net.tfminecraft.tfmcweb.api.PatreonClient.RankChangesResult;
import net.tfminecraft.tfmcweb.api.PatreonClient.RosterMember;
import net.tfminecraft.tfmcweb.api.PatreonClient.RosterResult;
import net.tfminecraft.tfmcweb.managers.WebCommand;
import net.tfminecraft.tfmcweb.cache.LinkCache;
import net.tfminecraft.tfmcweb.gate.DiscordGateService;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.PluginManager;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitScheduler;
import org.bukkit.scheduler.BukkitTask;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

class PatreonRankWriterTest {
	TestState state;
	JavaPlugin plugin;
	Logger logger;
	BukkitScheduler scheduler;
	PluginManager plugins;
	Plugin luckPerms;
	BukkitTask task;
	MockedStatic<Bukkit> bukkit;
	MockedStatic<PatreonClient> api;
	RecordingStore store;
	AtomicLong clock;
	List<Runnable> ticks;
	PatreonRankWriter writer;

	static final class RecordingStore implements PatreonGroupStore {
		final List<Call> calls = new ArrayList<>();
		final Set<UUID> failed = new java.util.HashSet<>();
		final Set<UUID> boom = new java.util.HashSet<>();
		record Call(UUID player, String ensure, Set<String> remove) {}
		@Override public boolean setGroups(UUID player, String ensure, Set<String> remove) {
			if (boom.contains(player)) {
				throw new IllegalStateException("boom");
			}
			calls.add(new Call(player, ensure, remove == null ? Set.of() : Set.copyOf(remove)));
			return !failed.contains(player);
		}
	}

	@BeforeEach void setup() throws Exception {
		state = new TestState();
		plugin = mock(JavaPlugin.class);
		logger = mock(Logger.class);
		when(plugin.getLogger()).thenReturn(logger);
		scheduler = mock(BukkitScheduler.class);
		plugins = mock(PluginManager.class);
		luckPerms = mock(Plugin.class);
		when(luckPerms.isEnabled()).thenReturn(true);
		when(plugins.getPlugin("LuckPerms")).thenReturn(luckPerms);
		task = mock(BukkitTask.class);
		ticks = new ArrayList<>();
		when(scheduler.runTaskTimerAsynchronously(eq(plugin), any(Runnable.class), anyLong(), anyLong()))
			.thenAnswer(call -> {
				ticks.add(call.getArgument(1));
				return task;
			});
		bukkit = mockStatic(Bukkit.class);
		bukkit.when(Bukkit::getScheduler).thenReturn(scheduler);
		bukkit.when(Bukkit::getPluginManager).thenReturn(plugins);
		api = mockStatic(PatreonClient.class);
		api.when(PatreonClient::listRankChanges).thenReturn(RankChangesResult.success(List.of()));
		api.when(PatreonClient::listRoster).thenReturn(RosterResult.success(List.of()));
		api.when(() -> PatreonClient.ackRankChanges(anyList())).thenReturn(AckResult.success());
		store = new RecordingStore();
		clock = new AtomicLong(1_000_000L);
		writer = new PatreonRankWriter(plugin, () -> store, clock::get);
		Cache.patreonEnabled = true;
		Cache.patreonApplyRanks = true;
		Cache.patreonPollSeconds = 15;
		Cache.patreonReconcileMinutes = 30;
		Cache.patreonGroups = Map.of("noble", "noble", "gilded", "gilded", "ascended", "ascended");
	}

	@AfterEach void cleanup() throws Exception {
		api.close();
		bukkit.close();
		state.close();
	}

	void start() {
		writer.refresh();
		assertTrue(writer.isRunning());
	}

	void tick() { ticks.getLast().run(); }

	@Test void staysIdleUntilBothFlagsAndLuckPermsAreAvailable() {
		Cache.patreonEnabled = false;
		writer.refresh();
		Cache.patreonEnabled = true;
		Cache.patreonApplyRanks = false;
		writer.refresh();
		verify(scheduler, never()).runTaskTimerAsynchronously(any(), any(Runnable.class), anyLong(), anyLong());
		assertFalse(writer.isRunning());
		assertTrue(writer.statusDetail().contains("writer=off"));
		assertFalse(writer.statusDetail().contains("LuckPerms"));
		Cache.patreonApplyRanks = true;
		when(plugins.getPlugin("LuckPerms")).thenReturn(null);
		writer.refresh();
		writer.refresh();
		verify(logger, times(1)).warning(contains("not installed"));
		when(plugins.getPlugin("LuckPerms")).thenReturn(luckPerms);
		when(luckPerms.isEnabled()).thenReturn(false);
		writer.refresh();
		verify(logger, times(1)).warning(contains("not installed"));
		bukkit.when(Bukkit::getPluginManager).thenReturn(null);
		new PatreonRankWriter(plugin, () -> store, clock::get).refresh();
		verify(scheduler, never()).runTaskTimerAsynchronously(any(), any(Runnable.class), anyLong(), anyLong());
	}

	@Test void schedulesPollsAndStopsCleanly() {
		start();
		verify(scheduler).runTaskTimerAsynchronously(plugin, ticks.getFirst(), 300L, 300L);
		assertTrue(writer.statusDetail().endsWith("writer=on"));
		assertTrue(PatreonRankWriter.statusText(true).endsWith("writer=on"));
		writer.refresh();
		verify(task).cancel();
		writer.stop();
		writer.stop();
		verify(task, times(2)).cancel();
		assertFalse(writer.isRunning());
		tick();
		api.verify(PatreonClient::listRankChanges, never());
	}

	@Test void missingStoreOrSchedulerDisablesTheWriter() {
		writer = new PatreonRankWriter(plugin, () -> null, clock::get);
		writer.refresh();
		assertFalse(writer.isRunning());
		verify(logger).warning(contains("unavailable"));
		when(scheduler.runTaskTimerAsynchronously(eq(plugin), any(Runnable.class), anyLong(), anyLong())).thenReturn(null);
		writer = new PatreonRankWriter(plugin, () -> store, clock::get);
		writer.refresh();
		assertFalse(writer.isRunning());
		verify(logger).warning(contains("Could not schedule"));
		assertThrows(IllegalStateException.class, PatreonRankWriter::openLuckPerms);
		LuckPerms luckPermsApi = mock(LuckPerms.class);
		when(luckPermsApi.getUserManager()).thenReturn(mock(UserManager.class));
		when(luckPermsApi.getMessagingService()).thenReturn(java.util.Optional.of(mock(MessagingService.class)));
		try (MockedStatic<LuckPermsProvider> provider = mockStatic(LuckPermsProvider.class)) {
			provider.when(LuckPermsProvider::get).thenReturn(luckPermsApi);
			assertNotNull(PatreonRankWriter.openLuckPerms());
		}
		PatreonRankWriter hooked = new PatreonRankWriter(plugin);
		hooked.refresh();
		assertFalse(hooked.isRunning());
		verify(logger).log(eq(Level.WARNING), contains("unavailable"), any(Throwable.class));
	}

	@Test void appliesMappedChangesAndAcksOnlySavedRows() {
		Locale.setDefault(Locale.forLanguageTag("tr-TR"));
		Map<String, String> groups = new LinkedHashMap<>();
		groups.put("noble", " donator ");
		groups.put("gilded", "gilded");
		groups.put("ascended", " ");
		Cache.patreonGroups = groups;
		UUID saved = UUID.randomUUID();
		UUID failed = UUID.randomUUID();
		UUID exploded = UUID.randomUUID();
		store.failed.add(failed);
		store.boom.add(exploded);
		api.when(PatreonClient::listRankChanges).thenReturn(RankChangesResult.success(List.of(
			new RankChange(7, saved.toString(), " GILDED ", List.of("noble", "gilded", "legacy", " ")),
			new RankChange(8, failed.toString(), "gilded", List.of()),
			new RankChange(9, "not-a-uuid", "gilded", List.of()),
			new RankChange(10, saved.toString(), "ascended", List.of()),
			new RankChange(11, exploded.toString(), null, List.of("noble")),
			new RankChange(12, saved.toString(), null, List.of("noble"))
		)));
		start();
		tick();
		assertEquals("gilded", store.calls.getFirst().ensure());
		assertEquals(Set.of("donator"), store.calls.getFirst().remove());
		assertTrue(store.calls.stream().noneMatch(call -> call.remove().contains("legacy") || call.remove().contains("ascended")));
		assertEquals(Set.of("donator"), store.calls.get(2).remove());
		assertNull(store.calls.get(2).ensure());
		api.verify(() -> PatreonClient.ackRankChanges(List.of(7, 12)));
		verify(logger).info(contains("applied 2"));
		verify(logger).warning(contains("was not saved"));
		verify(logger).warning(contains("no player UUID"));
		verify(logger).warning(contains("unmapped tier"));
		verify(logger).warning(contains("skipped unmapped removal"));
		verify(logger).log(eq(Level.WARNING), contains("rank change 11"), any(RuntimeException.class));
	}

	@Test void ackFailureDoesNotClaimTheChangeWasApplied() {
		UUID player = UUID.randomUUID();
		api.when(PatreonClient::listRankChanges).thenReturn(RankChangesResult.success(List.of(
			new RankChange(4, player.toString(), "noble", List.of())
		)));
		api.when(() -> PatreonClient.ackRankChanges(anyList())).thenReturn(AckResult.fail("down"));
		start();
		tick();
		verify(logger).warning(contains("ack failed"));
		verify(logger, never()).info(contains("applied"));
	}

	@Test void emptyOrFailedPollsDoNotAck() {
		start();
		tick();
		api.verify(() -> PatreonClient.ackRankChanges(anyList()), never());
		api.when(PatreonClient::listRankChanges).thenReturn(RankChangesResult.fail("down"));
		tick();
		verify(logger).warning(contains("rank-changes: down"));
		api.when(PatreonClient::listRankChanges).thenThrow(new IllegalStateException("boom"));
		api.when(PatreonClient::listRoster).thenReturn(RosterResult.success(List.of()));
		tick();
		verify(logger).log(eq(Level.WARNING), contains("rank poll failed"), any(Exception.class));
	}

	@Test void blankPlayerUuidAndTierAreRejectedWithoutAckingTheBatch() {
		api.when(PatreonClient::listRankChanges).thenReturn(RankChangesResult.success(List.of(
			new RankChange(20, null, "noble", List.of()),
			new RankChange(21, UUID.randomUUID().toString(), "  ", List.of())
		)));
		start();
		tick();
		assertTrue(store.calls.isEmpty());
		api.verify(() -> PatreonClient.ackRankChanges(anyList()), never());
		verify(logger).warning(contains("no player UUID"));
		verify(logger).warning(contains("unmapped tier"));
	}

	@Test void reconcileCorrectsRosterDriftAndRetriesFailures() {
		UUID keep = UUID.randomUUID();
		UUID clear = UUID.randomUUID();
		UUID broken = UUID.randomUUID();
		store.failed.add(broken);
		api.when(PatreonClient::listRoster).thenReturn(RosterResult.success(List.of(
			new RosterMember(keep.toString(), "gilded"),
			new RosterMember(clear.toString(), null),
			new RosterMember("bad", "noble"),
			new RosterMember(keep.toString(), "knight"),
			new RosterMember(broken.toString(), "noble")
		)));
		Cache.patreonPollSeconds = 0;
		Cache.patreonReconcileMinutes = 0;
		start();
		verify(scheduler).runTaskTimerAsynchronously(plugin, ticks.getFirst(), 20L, 20L);
		tick();
		RecordingStore.Call granted = store.calls.getFirst();
		assertEquals(keep, granted.player());
		assertEquals("gilded", granted.ensure());
		assertEquals(Set.of("noble", "ascended"), granted.remove());
		assertFalse(granted.remove().contains("legacy"));
		RecordingStore.Call cleared = store.calls.get(1);
		assertNull(cleared.ensure());
		assertEquals(Set.of("noble", "gilded", "ascended"), cleared.remove());
		assertEquals(broken, store.calls.get(2).player());
		verify(logger).warning(contains("invalid player UUID"));
		verify(logger).warning(contains("unmapped tier"));
		verify(logger).warning(contains("roster save failed"));
		api.verify(PatreonClient::listRoster, times(1));
		tick();
		api.verify(PatreonClient::listRoster, times(2));
		store.failed.clear();
		tick();
		verify(logger).info(contains("reconciled"));
		api.verify(PatreonClient::listRoster, times(3));
		tick();
		api.verify(PatreonClient::listRoster, times(3));
		clock.addAndGet(30 * 60_000L);
		tick();
		api.verify(PatreonClient::listRoster, times(4));
	}

	@Test void rosterHttpAndUnexpectedFailuresStayDue() {
		api.when(PatreonClient::listRoster).thenReturn(RosterResult.fail("down"));
		start();
		tick();
		tick();
		verify(logger, atLeastOnce()).warning(contains("roster: down"));
		api.verify(PatreonClient::listRoster, times(2));
		UUID player = UUID.randomUUID();
		store.boom.add(player);
		api.when(PatreonClient::listRoster).thenReturn(RosterResult.success(List.of(new RosterMember(player.toString(), "noble"))));
		tick();
		verify(logger).log(eq(Level.WARNING), contains("roster reconcile failed"), any(Exception.class));
		Cache.patreonReconcileMinutes = 1;
		store.boom.clear();
		writer.refresh();
		tick();
		clock.addAndGet(59_999L);
		tick();
		api.verify(PatreonClient::listRoster, times(4));
		clock.addAndGet(1L);
		tick();
		api.verify(PatreonClient::listRoster, times(5));
	}

	@Test void stoppingDuringAPollSkipsThatReconcile() {
		api.when(PatreonClient::listRankChanges).thenAnswer(call -> {
			writer.stop();
			return RankChangesResult.success(List.of());
		});
		start();
		tick();
		api.verify(PatreonClient::listRoster, never());
	}

	@Test void webStatusUsesTheRunningWriter() {
		CommandSender sender = mock(CommandSender.class);
		when(sender.hasPermission(anyString())).thenReturn(true);
		List<String> messages = new ArrayList<>();
		doAnswer(call -> { messages.add(call.getArgument(0)); return null; }).when(sender).sendMessage(anyString());
		when(scheduler.runTaskAsynchronously(eq(plugin), any(Runnable.class))).thenAnswer(call -> {
			call.getArgument(1, Runnable.class).run();
			return null;
		});
		when(scheduler.runTask(eq(plugin), any(Runnable.class))).thenAnswer(call -> {
			call.getArgument(1, Runnable.class).run();
			return null;
		});
		try (var client = mockStatic(net.tfminecraft.tfmcweb.api.ProvinceSystemClient.class)) {
			client.when(net.tfminecraft.tfmcweb.api.ProvinceSystemClient::ping)
				.thenReturn(net.tfminecraft.tfmcweb.api.ProvinceSystemClient.SimpleResult.success());
			WebCommand idle = new WebCommand(plugin, new LinkCache(), mock(DiscordGateService.class), writer);
			assertTrue(idle.onCommand(sender, null, "web", new String[] { "status" }));
			start();
			WebCommand live = new WebCommand(plugin, new LinkCache(), mock(DiscordGateService.class), writer);
			assertTrue(live.onCommand(sender, null, "web", new String[] { "reload" }));
		}
		assertTrue(messages.stream().anyMatch(line -> line.contains("writer=off (LuckPerms unavailable)")));
		assertTrue(messages.stream().anyMatch(line -> line.contains("writer=on")));
	}
}
