package net.tfminecraft.TFMCWeb;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import net.tfminecraft.TFMCWeb.entitlements.MetaGroupDefinition;

/**
 * Runtime settings loaded from config.yml.
 */
public final class Cache {

	/** ProvinceSystem base URL without trailing slash. */
	public static String apiBaseUrl = "";
	/** X-Plugin-Key for ProvinceSystem plugin routes. */
	public static String pluginKey = "";

	/** Realm stamped on minted feature codes (lobby+main share main). */
	public static String realmId = "main";
	/**
	 * Scopes allowed by /token create on this server.
	 * Empty = tokens disabled. Known: skin, drink, character, skin_staff.
	 */
	public static List<String> tokenEnabledScopes = List.of(
		"skin", "drink", "character", "skin_staff"
	);

	/** Scopes that share one mint clock (skin + drink). */
	public static List<String> tokenCooldownSharedScopes = List.of("skin", "drink");
	/** Default cooldown days when no rank group matches (-1 = cannot mint). */
	public static int tokenCooldownDefaultDays = -1;
	/** Rank ladder low→high; highest matching permission wins. */
	public static List<TokenCooldownGroup> tokenCooldownGroups = Collections.emptyList();

	/** LP nodes snapshotted into permission_flags on join. */
	public static List<String> playerMetaSyncPermissions = Collections.emptyList();

	public static Map<String, Integer> rpcMetaDefaults = Map.of(
		"name-colour-stops", 0,
		"max-alive-characters", 3,
		"wardrobe-skin-slots", 1
	);
	public static List<MetaGroupDefinition> rpcMetaGroups = MetaGroupDefinition.emptyList();

	public static Map<String, Integer> skinsMetaDefaults = Map.of(
		"name-colour-stops", 0,
		"max-3d-pair-bytes", 30720,
		"skin-token-cooldown-days", -1
	);
	public static List<String> skinsMetaDefaultKinds = List.of();
	public static boolean skinsMetaDefaultAllowArmor3dHelmet = false;
	public static List<MetaGroupDefinition> skinsMetaGroups = MetaGroupDefinition.emptyList();

	public static Map<String, Integer> drinksMetaDefaults = Map.of(
		"name-colour-stops", 0
	);
	public static boolean drinksMetaDefaultAllowTexture = false;
	public static List<MetaGroupDefinition> drinksMetaGroups = MetaGroupDefinition.emptyList();

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

	/** True when /token create may mint this API scope on this server. */
	public static boolean isTokenScopeEnabled(String scope) {
		if (scope == null || scope.isBlank()) {
			return false;
		}
		String sc = scope.trim().toLowerCase(Locale.ROOT);
		for (String enabled : tokenEnabledScopes) {
			if (enabled != null && sc.equals(enabled.trim().toLowerCase(Locale.ROOT))) {
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

	public static Map<String, Integer> newIntMap() {
		return new HashMap<>();
	}

	public static List<String> newStringList() {
		return new ArrayList<>();
	}

	public static List<MetaGroupDefinition> newMetaGroupList() {
		return new ArrayList<>();
	}
}
