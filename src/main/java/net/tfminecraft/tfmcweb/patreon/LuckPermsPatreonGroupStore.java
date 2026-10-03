package net.tfminecraft.tfmcweb.patreon;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
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
import net.luckperms.api.node.NodeType;
import net.luckperms.api.node.types.InheritanceNode;

/**
 * Applies supporter inheritance nodes through the LuckPerms API, including offline players.
 * It never changes a user's primary group and only removes global permanent nodes.
 * A failed save is reported as false so the caller can leave the outbox row unacked.
 * The same request applied twice does not duplicate nodes.
 */
public final class LuckPermsPatreonGroupStore implements PatreonGroupStore {

	private final UserManager users;
	private final MessagingService messaging;
	private final Logger logger;

	public LuckPermsPatreonGroupStore(UserManager users, MessagingService messaging, Logger logger) {
		this.users = users;
		this.messaging = messaging;
		this.logger = logger;
	}

	public static PatreonGroupStore open() {
		LuckPerms luckPerms = LuckPermsProvider.get();
		return new LuckPermsPatreonGroupStore(
			luckPerms.getUserManager(),
			luckPerms.getMessagingService().orElse(null),
			Logger.getLogger("TFMCWeb")
		);
	}

	@Override
	public boolean setGroups(UUID player, String ensureGroup, Set<String> removeGroups) {
		if (player == null) {
			return false;
		}
		String ensure = normalize(ensureGroup);
		Set<String> remove = normalizeRemove(removeGroups, ensure);
		if (ensure == null && remove.isEmpty()) {
			return true;
		}
		boolean loaded = false;
		User user = null;
		try {
			loaded = users.isLoaded(player);
			user = users.loadUser(player).join();
			if (user == null) {
				return false;
			}
			NodeMap data = user.data();
			if (data == null) {
				return false;
			}
			mutate(data, ensure, remove);
			// Always save. A previous failed save can leave the loaded user already
			// edited in memory; skipping the write would ack a change storage never got.
			users.saveUser(user).join();
			pushUpdate(user, player);
			return true;
		} catch (RuntimeException e) {
			logger.log(Level.WARNING, "[patreon] LuckPerms update failed for " + player, e);
			return false;
		} finally {
			if (!loaded && user != null) {
				try {
					users.cleanupUser(user);
				} catch (RuntimeException e) {
					logger.log(Level.WARNING, "[patreon] LuckPerms cleanup failed for " + player, e);
				}
			}
		}
	}

	private void pushUpdate(User user, UUID player) {
		if (messaging == null) {
			return;
		}
		try {
			messaging.pushUserUpdate(user);
		} catch (RuntimeException e) {
			logger.log(Level.WARNING, "[patreon] LuckPerms messaging update failed for " + player, e);
		}
	}

	private static void mutate(NodeMap data, String ensure, Set<String> remove) {
		if (ensure != null && !hasGlobal(data, ensure)) {
			InheritanceNode created = InheritanceNode.builder(ensure).build();
			DataMutateResult added = data.add(created);
			if (added == DataMutateResult.FAIL) {
				throw new IllegalStateException("LuckPerms refused group " + ensure);
			}
		}
		for (InheritanceNode node : inheritance(data)) {
			if (node.getGroupName() == null || !node.getValue()) {
				continue;
			}
			if (!remove.contains(node.getGroupName().toLowerCase(Locale.ROOT))) {
				continue;
			}
			if (node.hasExpiry()) {
				continue;
			}
			if (node.getContexts() != null && !node.getContexts().isEmpty()) {
				continue;
			}
			data.remove(node);
		}
	}

	private static boolean hasGlobal(NodeMap data, String group) {
		String key = group.toLowerCase(Locale.ROOT);
		for (InheritanceNode node : inheritance(data)) {
			if (node.getGroupName() == null || !node.getValue() || node.hasExpired()) {
				continue;
			}
			if (!key.equals(node.getGroupName().toLowerCase(Locale.ROOT))) {
				continue;
			}
			if (node.getContexts() != null && !node.getContexts().isEmpty()) {
				continue;
			}
			return true;
		}
		return false;
	}

	private static List<InheritanceNode> inheritance(NodeMap data) {
		List<InheritanceNode> nodes = new ArrayList<>();
		Collection<Node> all = data.toCollection();
		if (all == null) {
			return nodes;
		}
		for (Node node : all) {
			if (node != null && NodeType.INHERITANCE.matches(node)) {
				nodes.add(NodeType.INHERITANCE.cast(node));
			}
		}
		return nodes;
	}

	private static boolean sameGroup(String left, String right) {
		if (left == null || right == null) {
			return false;
		}
		return left.toLowerCase(Locale.ROOT).equals(right.toLowerCase(Locale.ROOT));
	}

	private static String normalize(String group) {
		if (group == null) {
			return null;
		}
		String trimmed = group.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private static Set<String> normalizeRemove(Set<String> groups, String ensure) {
		Set<String> remove = new LinkedHashSet<>();
		if (groups == null) {
			return remove;
		}
		for (String group : groups) {
			String normalized = normalize(group);
			if (normalized == null) {
				continue;
			}
			if (sameGroup(ensure, normalized)) {
				continue;
			}
			remove.add(normalized.toLowerCase(Locale.ROOT));
		}
		return remove;
	}
}
