package net.tfminecraft.tfmcweb.patreon;

import java.util.Set;
import java.util.UUID;

/**
 * LuckPerms mutation used by the rank writer. Only the group named by
 * {@code ensureGroup} is added, and only groups in {@code removeGroups} are
 * removed. Every other group, including staff grants, stays.
 */
public interface PatreonGroupStore {

	/**
	 * @param ensureGroup LuckPerms group to grant, or null to grant nothing
	 * @param removeGroups LuckPerms groups whose positive, global, permanent inheritance nodes are removed
	 * @return false when the user could not be loaded or saved; true when the
	 *     stored nodes match the request, including when they already did
	 */
	boolean setGroups(UUID player, String ensureGroup, Set<String> removeGroups);
}
