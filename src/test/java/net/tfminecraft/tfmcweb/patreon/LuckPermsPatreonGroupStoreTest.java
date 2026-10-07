package net.tfminecraft.tfmcweb.patreon;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.logging.Level;
import java.util.logging.Logger;

import net.luckperms.api.LuckPerms;
import net.luckperms.api.LuckPermsProvider;
import net.luckperms.api.messaging.MessagingService;
import net.luckperms.api.model.data.DataMutateResult;
import net.luckperms.api.model.data.NodeMap;
import net.luckperms.api.model.user.User;
import net.luckperms.api.model.user.UserManager;
import net.luckperms.api.node.Node;
import net.luckperms.api.node.NodeBuilderRegistry;
import net.luckperms.api.node.types.InheritanceNode;
import net.luckperms.api.context.ImmutableContextSet;
import net.tfminecraft.tfmcweb.TestState;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

class LuckPermsPatreonGroupStoreTest {
	private TestState state;
	private final UUID id = UUID.randomUUID();
	private Logger logger;
	private UserManager users;
	private User user;
	private MessagingService messaging;
	private NodeMap data;
	private final List<Node> live = new ArrayList<>();
	private final List<Node> removed = new ArrayList<>();
	private MockedStatic<LuckPermsProvider> provider;
	private final String[] builtGroup = new String[1];

	@BeforeEach void setup() throws Exception {
		state = new TestState();
		logger = mock(Logger.class);
		users = mock(UserManager.class);
		messaging = mock(MessagingService.class);
		user = mock(User.class);
		data = mock(NodeMap.class);
		when(user.data()).thenReturn(data);
		when(users.isLoaded(id)).thenReturn(false);
		when(users.loadUser(id)).thenReturn(CompletableFuture.completedFuture(user));
		when(users.saveUser(user)).thenReturn(CompletableFuture.completedFuture(null));
		when(data.toCollection()).thenAnswer(call -> new ArrayList<>(live));
		when(data.remove(any())).thenAnswer(call -> {
			Node node = call.getArgument(0);
			removed.add(node);
			live.remove(node);
			return DataMutateResult.SUCCESS;
		});
		when(data.add(any())).thenAnswer(call -> {
			live.add(call.getArgument(0));
			return DataMutateResult.SUCCESS;
		});
		InheritanceNode.Builder builder = mock(InheritanceNode.Builder.class);
		when(builder.group(anyString())).thenAnswer(call -> {
			builtGroup[0] = call.getArgument(0);
			return builder;
		});
		when(builder.build()).thenAnswer(call -> node(builtGroup[0], true, false, true));
		LuckPerms api = mock(LuckPerms.class);
		NodeBuilderRegistry registry = mock(NodeBuilderRegistry.class);
		when(api.getNodeBuilderRegistry()).thenReturn(registry);
		when(registry.forInheritance()).thenReturn(builder);
		provider = mockStatic(LuckPermsProvider.class);
		provider.when(LuckPermsProvider::get).thenReturn(api);
	}

	@AfterEach void cleanup() throws Exception { provider.close(); state.close(); }

	LuckPermsPatreonGroupStore store() { return new LuckPermsPatreonGroupStore(users, messaging, logger); }

	InheritanceNode node(String group, boolean value, boolean expired, boolean global) {
		InheritanceNode node = mock(InheritanceNode.class);
		when(node.getGroupName()).thenReturn(group);
		when(node.getValue()).thenReturn(value);
		when(node.hasExpired()).thenReturn(expired);
		if (global) {
			when(node.getContexts()).thenReturn(null);
		} else {
			ImmutableContextSet contexts = mock(ImmutableContextSet.class);
			when(contexts.isEmpty()).thenReturn(false);
			when(node.getContexts()).thenReturn(contexts);
		}
		return node;
	}

	@Test void openReadsTheProvider() {
		LuckPerms api = mock(LuckPerms.class);
		when(api.getUserManager()).thenReturn(users);
		when(api.getMessagingService()).thenReturn(java.util.Optional.of(messaging));
		provider.when(LuckPermsProvider::get).thenReturn(api);
		assertNotNull(LuckPermsPatreonGroupStore.open());
	}

	@Test void emptyAndNullRequestsDoNotTouchLuckPerms() {
		assertFalse(store().setGroups(null, "noble", Set.of()));
		assertTrue(store().setGroups(id, null, null));
		assertTrue(store().setGroups(id, " ", Set.of()));
		assertTrue(store().setGroups(id, null, Set.of(" ", "")));
		verify(users, never()).loadUser(any());
	}

	@Test void addsAGlobalNodeOnceAndSkipsUnchangedSave() {
		Locale.setDefault(Locale.forLanguageTag("tr-TR"));
		assertTrue(store().setGroups(id, " Gilded ", Set.of("gilded", "noble")));
		assertEquals("Gilded", builtGroup[0]);
		assertEquals(1, live.size());
		assertTrue(store().setGroups(id, "Gilded", Set.of("GILDED")));
		assertEquals(1, live.size());
		verify(data, times(1)).add(any());
		verify(users, times(1)).saveUser(user);
		verify(users, times(2)).cleanupUser(user);
		verify(messaging, times(1)).pushUserUpdate(user);
		verify(user, never()).setPrimaryGroup(anyString());
	}

	@Test void removesOnlyPositiveGlobalPermanentMappedGroupsAndLeavesPrimaryGroupAlone() {
		InheritanceNode noble = node("Noble", true, false, true);
		InheritanceNode negated = node("noble", false, false, true);
		InheritanceNode temporary = node("noble", true, false, true);
		when(temporary.hasExpiry()).thenReturn(true);
		InheritanceNode contextual = node("gilded", true, false, false);
		InheritanceNode legacy = node("legacy", true, false, true);
		InheritanceNode unnamed = node(null, true, false, true);
		Node permission = mock(Node.class);
		live.addAll(Arrays.asList(null, permission, noble, negated, temporary, contextual, legacy, unnamed));
		when(user.getPrimaryGroup()).thenReturn("Noble");
		Set<String> remove = new LinkedHashSet<>();
		remove.add("noble");
		remove.add(" ");
		remove.add(null);
		assertTrue(store().setGroups(id, null, remove));
		assertEquals(List.of(noble), removed);
		assertFalse(live.contains(noble));
		assertTrue(live.contains(negated));
		assertTrue(live.contains(legacy));
		assertTrue(live.contains(contextual));
		assertTrue(live.contains(temporary));
		verify(user, never()).setPrimaryGroup(anyString());
		verify(users).cleanupUser(user);
	}

	@Test void grantAndRemovalNeverChangeThePrimaryGroup() {
		live.add(node("noble", true, false, true));
		when(user.getPrimaryGroup()).thenReturn("noble");
		assertTrue(store().setGroups(id, "gilded", Set.of("noble")));
		verify(user, never()).setPrimaryGroup(anyString());
		verify(data, times(1)).add(any());
	}

	@Test void writesHoldTheLockSharedWithTheStaffPanelBridge() {
		List<Boolean> held = new ArrayList<>();
		when(users.loadUser(id)).thenAnswer(call -> {
			held.add(net.tfminecraft.tfmcweb.luckperms.LuckPermsWriteLock.LOCK.isHeldByCurrentThread());
			return CompletableFuture.completedFuture(user);
		});
		doAnswer(call -> {
			held.add(net.tfminecraft.tfmcweb.luckperms.LuckPermsWriteLock.LOCK.isHeldByCurrentThread());
			return null;
		}).when(users).cleanupUser(user);
		assertTrue(store().setGroups(id, "noble", Set.of()));
		assertEquals(List.of(true, true), held);
		assertFalse(net.tfminecraft.tfmcweb.luckperms.LuckPermsWriteLock.LOCK.isLocked());
	}

	@Test void pushesSuccessfulSavesThroughLuckPermsMessaging() {
		assertTrue(store().setGroups(id, "noble", Set.of()));
		verify(users).saveUser(user);
		verify(messaging).pushUserUpdate(user);
	}

	@Test void missingOrFailingMessagingDoesNotFailSavedChange() {
		assertTrue(new LuckPermsPatreonGroupStore(users, null, logger).setGroups(id, "noble", Set.of()));
		doThrow(new IllegalStateException("messaging down")).when(messaging).pushUserUpdate(user);
		assertTrue(store().setGroups(id, null, Set.of("noble")));
		verify(logger).log(eq(Level.WARNING), contains("messaging update failed"), any(RuntimeException.class));
	}

	@Test void staffPrimaryGroupAndLoadedUsersAreLeftAlone() {
		when(users.isLoaded(id)).thenReturn(true);
		when(user.getPrimaryGroup()).thenReturn("legacy");
		live.add(node("noble", true, false, false));
		ImmutableContextSet empty = mock(ImmutableContextSet.class);
		when(empty.isEmpty()).thenReturn(true);
		InheritanceNode global = node("gilded", true, false, true);
		when(global.getContexts()).thenReturn(empty);
		live.add(global);
		assertTrue(store().setGroups(id, "gilded", Set.of("noble")));
		verify(user, never()).setPrimaryGroup(anyString());
		verify(data, never()).add(any());
		verify(users, never()).cleanupUser(any());
		verify(users).saveUser(user);
	}

	@Test void blankPrimaryGroupIsNotReadOrRewritten() {
		when(user.getPrimaryGroup()).thenReturn(" ");
		assertTrue(store().setGroups(id, null, Set.of("noble")));
		verify(user, never()).setPrimaryGroup(anyString());
		verify(user, never()).getPrimaryGroup();
	}

	@Test void expiredOrContextualGroupIsGrantedAgain() {
		InheritanceNode expired = node("noble", true, true, true);
		when(expired.hasExpiry()).thenReturn(true);
		live.add(expired);
		assertTrue(store().setGroups(id, "noble", Set.of()));
		verify(data).add(any());
		live.clear();
		live.add(node("noble", true, false, false));
		assertTrue(store().setGroups(id, "noble", Set.of()));
		verify(data, times(2)).add(any());
	}

	@Test void temporaryGlobalGroupDoesNotSatisfyPermanentGrant() {
		InheritanceNode temporary = node("noble", true, false, true);
		when(temporary.hasExpiry()).thenReturn(true);
		live.add(temporary);
		assertTrue(store().setGroups(id, "noble", Set.of()));
		verify(data).add(any());
		verify(users).saveUser(user);
	}

	@Test void unchangedUnloadedUserIsNotSavedOrPushed() {
		live.add(node("noble", true, false, true));
		assertTrue(store().setGroups(id, "noble", Set.of()));
		verify(users, never()).saveUser(any());
		verify(messaging, never()).pushUserUpdate(any());
		verify(users).cleanupUser(user);
	}

	@Test void unchangedLoadedUserIsSavedWithoutPushingUpdate() {
		when(users.isLoaded(id)).thenReturn(true);
		live.add(node("noble", true, false, true));
		assertTrue(store().setGroups(id, "noble", Set.of()));
		verify(users).saveUser(user);
		verify(messaging, never()).pushUserUpdate(any());
	}

	@Test void nullNodeCollectionStillSavesTheGrant() {
		when(data.toCollection()).thenReturn(null);
		assertTrue(store().setGroups(id, "noble", Set.of("gilded")));
		verify(data).add(any());
		verify(users).saveUser(user);
	}

	@Test void alreadyPresentAddDoesNotSaveUnchangedData() {
		when(data.add(any())).thenReturn(DataMutateResult.FAIL_ALREADY_HAS);
		assertTrue(store().setGroups(id, "noble", Set.of()));
		verify(users, never()).saveUser(any());
	}

	@Test void refusedNodeDoesNotSave() {
		when(data.add(any())).thenReturn(DataMutateResult.FAIL);
		assertFalse(store().setGroups(id, "noble", Set.of("gilded")));
		verify(users, never()).saveUser(any());
		verify(logger).log(eq(Level.WARNING), contains("update failed"), any(RuntimeException.class));
		verify(users).cleanupUser(user);
	}

	@Test void refusedRemovalDoesNotReportOrPushASavedChange() {
		InheritanceNode noble = node("noble", true, false, true);
		live.add(noble);
		doReturn(DataMutateResult.FAIL).when(data).remove(noble);

		assertFalse(store().setGroups(id, null, Set.of("noble")));

		assertTrue(live.contains(noble));
		verify(data).remove(noble);
		verify(users, never()).saveUser(any());
		verify(messaging, never()).pushUserUpdate(any());
		verify(logger).log(eq(Level.WARNING), contains("update failed"), any(RuntimeException.class));
		verify(users).cleanupUser(user);
	}

	@Test void failedSaveIsRetriedAndCleanupFailuresAreSwallowed() {
		LuckPermsPatreonGroupStore store = store();
		CompletableFuture<Void> failed = new CompletableFuture<>();
		failed.completeExceptionally(new IllegalStateException("db down"));
		when(users.saveUser(user)).thenReturn(failed);
		assertFalse(store.setGroups(id, "noble", Set.of()));
		assertEquals(1, live.size());
		when(users.saveUser(user)).thenReturn(CompletableFuture.completedFuture(null));
		doThrow(new IllegalStateException("cleanup")).when(users).cleanupUser(user);
		assertTrue(store.setGroups(id, "noble", Set.of()));
		verify(data, times(1)).add(any());
		verify(users, times(2)).saveUser(user);
		verify(messaging).pushUserUpdate(user);
		verify(logger).log(eq(Level.WARNING), contains("cleanup failed"), any(RuntimeException.class));
	}

	@Test void loadAndLookupFailuresLeaveTheChangeUnsaved() {
		when(users.loadUser(id)).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("down")));
		assertFalse(store().setGroups(id, "noble", Set.of()));
		verify(users, never()).saveUser(any());
		verify(users, never()).cleanupUser(any());
		when(users.loadUser(id)).thenReturn(CompletableFuture.completedFuture(null));
		assertFalse(store().setGroups(id, "noble", Set.of()));
		when(user.data()).thenReturn(null);
		when(users.loadUser(id)).thenReturn(CompletableFuture.completedFuture(user));
		assertFalse(store().setGroups(id, "noble", Set.of()));
		verify(users).cleanupUser(user);
		when(users.isLoaded(id)).thenThrow(new IllegalStateException("offline"));
		assertFalse(store().setGroups(id, "noble", Set.of()));
		verify(logger, atLeastOnce()).log(eq(Level.WARNING), contains("update failed"), any(RuntimeException.class));
	}
}
