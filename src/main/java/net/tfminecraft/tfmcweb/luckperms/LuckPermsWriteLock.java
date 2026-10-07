package net.tfminecraft.tfmcweb.luckperms;

import java.util.concurrent.locks.ReentrantLock;

/**
 * One lock for every LuckPerms write TFMCWeb makes. The staff-panel bridge and the
 * Patreon rank writer run on different threads and load, change, save and clean up
 * the same users; without the lock one could reload a user from storage mid-way and
 * drop the other's change. Writes are rare, so a single global lock is enough.
 */
public final class LuckPermsWriteLock {

	public static final ReentrantLock LOCK = new ReentrantLock();

	private LuckPermsWriteLock() {}
}
