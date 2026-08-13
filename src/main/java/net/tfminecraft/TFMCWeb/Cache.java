package net.tfminecraft.TFMCWeb;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * Runtime settings loaded from config.yml.
 */
public final class Cache {

	/** ProvinceSystem base URL without trailing slash. */
	public static String apiBaseUrl = "";
	/** X-Plugin-Key for ProvinceSystem plugin routes. */
	public static String pluginKey = "";

	/** Scopes that share one mint clock (skin + drink). */
	public static List<String> tokenCooldownSharedScopes = List.of("skin", "drink");
	/** Default cooldown days when no rank group matches (-1 = cannot mint). */
	public static int tokenCooldownDefaultDays = -1;
	/** Rank ladder low→high; highest matching permission wins. */
	public static List<TokenCooldownGroup> tokenCooldownGroups = Collections.emptyList();

	private Cache() {}

	/** One LP-gated cooldown row from token-cooldowns.groups. */
	public static final class TokenCooldownGroup {
		public final String permission;
		public final int cooldownDays;

		public TokenCooldownGroup(String permission, int cooldownDays) {
			this.permission = permission == null ? "" : permission.trim();
			this.cooldownDays = cooldownDays;
		}
	}

	public static boolean isSharedMintScope(String scope) {
		if (scope == null || scope.isBlank()) {
			return false;
		}
		String sc = scope.trim().toLowerCase(Locale.ROOT);
		for (String shared : tokenCooldownSharedScopes) {
			if (shared != null && sc.equals(shared.trim().toLowerCase(Locale.ROOT))) {
				return true;
			}
		}
		return false;
	}

	/** Mutable copy helper for ConfigLoader. */
	public static List<String> newSharedScopeList() {
		return new ArrayList<>();
	}

	/** Mutable copy helper for ConfigLoader. */
	public static List<TokenCooldownGroup> newGroupList() {
		return new ArrayList<>();
	}
}
