package net.tfminecraft.TFMCWeb.loaders;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;

import net.tfminecraft.TFMCWeb.Cache;
import net.tfminecraft.TFMCWeb.entitlements.MetaGroupDefinition;

/**
 * Parse player-meta section (duplicated ladders + sync-permissions).
 */
public final class PlayerMetaConfigLoader {

	private PlayerMetaConfigLoader() {}

	public static void load(FileConfiguration config) {
		List<String> syncPerms = Cache.newStringList();
		List<?> rawSync = config.getList("player-meta.sync-permissions");
		if (rawSync != null) {
			for (Object item : rawSync) {
				if (item == null) {
					continue;
				}
				String node = String.valueOf(item).trim();
				if (!node.isEmpty()) {
					syncPerms.add(node);
				}
			}
		}
		Cache.playerMetaSyncPermissions = List.copyOf(syncPerms);

		Cache.rpcMetaDefaults = loadIntDefaults(
			config.getConfigurationSection("player-meta.rpc.defaults"),
			Map.of(
				"name-colour-stops", 0,
				"max-alive-characters", 3,
				"wardrobe-skin-slots", 1
			)
		);
		Cache.rpcMetaGroups = MetaGroupDefinition.copyList(
			loadGroups(config.getList("player-meta.rpc.groups"), false, false)
		);

		ConfigurationSection skinsDefaults = config.getConfigurationSection(
			"player-meta.skins.defaults"
		);
		Cache.skinsMetaDefaults = loadIntDefaults(
			skinsDefaults,
			Map.of(
				"name-colour-stops", 0,
				"max-3d-pair-bytes", 30720,
				"skin-token-cooldown-days", -1
			)
		);
		Cache.skinsMetaDefaultKinds = List.copyOf(
			readStringList(skinsDefaults == null ? null : skinsDefaults.getList("skin-kinds"))
		);
		Cache.skinsMetaDefaultAllowArmor3dHelmet = skinsDefaults != null
			&& skinsDefaults.getBoolean("allow-armor-3d-helmet", false);
		Cache.skinsMetaGroups = MetaGroupDefinition.copyList(
			loadGroups(config.getList("player-meta.skins.groups"), true, false)
		);

		ConfigurationSection drinksDefaults = config.getConfigurationSection(
			"player-meta.drinks.defaults"
		);
		Cache.drinksMetaDefaults = loadIntDefaults(
			drinksDefaults,
			Map.of("name-colour-stops", 0)
		);
		Cache.drinksMetaDefaultAllowTexture = drinksDefaults != null
			&& drinksDefaults.getBoolean("allow-drink-texture", false);
		Cache.drinksMetaDefaultAllowMessage = drinksDefaults != null
			&& drinksDefaults.getBoolean("allow-drink-message", false);
		Cache.drinksMetaGroups = MetaGroupDefinition.copyList(
			loadGroups(config.getList("player-meta.drinks.groups"), false, true)
		);

		// Optional per-realm overrides (player-meta.by-realm.<id>).
		String realm = Cache.realmId == null || Cache.realmId.isBlank()
			? "main"
			: Cache.realmId.trim().toLowerCase(Locale.ROOT);
		ConfigurationSection byRealm = config.getConfigurationSection(
			"player-meta.by-realm." + realm
		);
		if (byRealm != null) {
			applyLadderSection(byRealm);
		}
	}

	/** Overlay rpc/skins/drinks ladders from a by-realm (or equivalent) section. */
	private static void applyLadderSection(ConfigurationSection root) {
		ConfigurationSection rpcDefaults = root.getConfigurationSection("rpc.defaults");
		if (rpcDefaults != null || root.getList("rpc.groups") != null) {
			if (rpcDefaults != null) {
				Cache.rpcMetaDefaults = loadIntDefaults(
					rpcDefaults,
					Cache.rpcMetaDefaults
				);
			}
			if (root.getList("rpc.groups") != null) {
				Cache.rpcMetaGroups = MetaGroupDefinition.copyList(
					loadGroups(root.getList("rpc.groups"), false, false)
				);
			}
		}

		ConfigurationSection skinsDefaults = root.getConfigurationSection("skins.defaults");
		if (skinsDefaults != null || root.getList("skins.groups") != null) {
			if (skinsDefaults != null) {
				Cache.skinsMetaDefaults = loadIntDefaults(
					skinsDefaults,
					Cache.skinsMetaDefaults
				);
				Cache.skinsMetaDefaultKinds = List.copyOf(
					readStringList(skinsDefaults.getList("skin-kinds"))
				);
				Cache.skinsMetaDefaultAllowArmor3dHelmet = skinsDefaults.getBoolean(
					"allow-armor-3d-helmet",
					Cache.skinsMetaDefaultAllowArmor3dHelmet
				);
			}
			if (root.getList("skins.groups") != null) {
				Cache.skinsMetaGroups = MetaGroupDefinition.copyList(
					loadGroups(root.getList("skins.groups"), true, false)
				);
			}
		}

		ConfigurationSection drinksDefaults = root.getConfigurationSection("drinks.defaults");
		if (drinksDefaults != null || root.getList("drinks.groups") != null) {
			if (drinksDefaults != null) {
				Cache.drinksMetaDefaults = loadIntDefaults(
					drinksDefaults,
					Cache.drinksMetaDefaults
				);
				Cache.drinksMetaDefaultAllowTexture = drinksDefaults.getBoolean(
					"allow-drink-texture",
					Cache.drinksMetaDefaultAllowTexture
				);
				Cache.drinksMetaDefaultAllowMessage = drinksDefaults.getBoolean(
					"allow-drink-message",
					Cache.drinksMetaDefaultAllowMessage
				);
			}
			if (root.getList("drinks.groups") != null) {
				Cache.drinksMetaGroups = MetaGroupDefinition.copyList(
					loadGroups(root.getList("drinks.groups"), false, true)
				);
			}
		}
	}

	private static Map<String, Integer> loadIntDefaults(
		ConfigurationSection section,
		Map<String, Integer> fallback
	) {
		Map<String, Integer> out = new HashMap<>(fallback);
		if (section == null) {
			return Map.copyOf(out);
		}
		for (String key : section.getKeys(false)) {
			if ("skin-kinds".equals(key)
				|| "allow-armor-3d-helmet".equals(key)
				|| "allow-drink-texture".equals(key)
				|| "allow-drink-message".equals(key)) {
				continue;
			}
			out.put(key, Integer.valueOf(section.getInt(key, out.getOrDefault(key, 0))));
		}
		return Map.copyOf(out);
	}

	private static List<MetaGroupDefinition> loadGroups(
		List<?> rawGroups,
		boolean parseSkinFields,
		boolean parseDrinkFields
	) {
		List<MetaGroupDefinition> groups = Cache.newMetaGroupList();
		if (rawGroups == null) {
			return groups;
		}
		for (Object item : rawGroups) {
			MetaGroupDefinition group = parseGroup(item, parseSkinFields, parseDrinkFields);
			if (group != null && !group.getPermission().isEmpty()) {
				groups.add(group);
			}
		}
		groups.sort((a, b) -> Integer.compare(a.getTier(), b.getTier()));
		return groups;
	}

	@SuppressWarnings("unchecked")
	private static MetaGroupDefinition parseGroup(
		Object item,
		boolean parseSkinFields,
		boolean parseDrinkFields
	) {
		if (item instanceof ConfigurationSection section) {
			String permission = section.getString("permission", "");
			int tier = section.getInt("tier", 0);
			Map<String, Integer> perks = new HashMap<>();
			putIntIfPresent(section, perks, "name-colour-stops");
			putIntIfPresent(section, perks, "max-alive-characters");
			putIntIfPresent(section, perks, "wardrobe-skin-slots");
			putIntIfPresent(section, perks, "max-3d-pair-bytes");
			putIntIfPresent(section, perks, "skin-token-cooldown-days");
			List<String> kinds = parseSkinFields
				? readStringList(section.getList("skin-kinds"))
				: List.of();
			Boolean helmet = null;
			if (parseSkinFields && section.contains("allow-armor-3d-helmet")) {
				helmet = Boolean.valueOf(section.getBoolean("allow-armor-3d-helmet"));
			}
			Boolean drinkTex = null;
			if (parseDrinkFields && section.contains("allow-drink-texture")) {
				drinkTex = Boolean.valueOf(section.getBoolean("allow-drink-texture"));
			}
			Boolean drinkMsg = null;
			if (parseDrinkFields && section.contains("allow-drink-message")) {
				drinkMsg = Boolean.valueOf(section.getBoolean("allow-drink-message"));
			}
			return new MetaGroupDefinition(
				permission, tier, perks, kinds, helmet, drinkTex, drinkMsg
			);
		}
		if (item instanceof Map<?, ?> mapRaw) {
			Map<String, Object> map = (Map<String, Object>) mapRaw;
			Object permObj = map.get("permission");
			String permission = permObj == null ? "" : String.valueOf(permObj);
			int tier = asInt(map.get("tier"), 0);
			Map<String, Integer> perks = new HashMap<>();
			putIntFromMap(map, perks, "name-colour-stops");
			putIntFromMap(map, perks, "max-alive-characters");
			putIntFromMap(map, perks, "wardrobe-skin-slots");
			putIntFromMap(map, perks, "max-3d-pair-bytes");
			putIntFromMap(map, perks, "skin-token-cooldown-days");
			List<String> kinds = parseSkinFields
				? readStringList(asList(map.get("skin-kinds")))
				: List.of();
			Boolean helmet = null;
			if (parseSkinFields && map.containsKey("allow-armor-3d-helmet")) {
				helmet = Boolean.valueOf(asBool(map.get("allow-armor-3d-helmet"), false));
			}
			Boolean drinkTex = null;
			if (parseDrinkFields && map.containsKey("allow-drink-texture")) {
				drinkTex = Boolean.valueOf(asBool(map.get("allow-drink-texture"), false));
			}
			Boolean drinkMsg = null;
			if (parseDrinkFields && map.containsKey("allow-drink-message")) {
				drinkMsg = Boolean.valueOf(asBool(map.get("allow-drink-message"), false));
			}
			return new MetaGroupDefinition(
				permission, tier, perks, kinds, helmet, drinkTex, drinkMsg
			);
		}
		return null;
	}

	private static void putIntIfPresent(
		ConfigurationSection section,
		Map<String, Integer> perks,
		String key
	) {
		if (section.contains(key)) {
			perks.put(key, Integer.valueOf(section.getInt(key)));
		}
	}

	private static void putIntFromMap(
		Map<String, Object> map,
		Map<String, Integer> perks,
		String key
	) {
		if (map.containsKey(key)) {
			perks.put(key, Integer.valueOf(asInt(map.get(key), 0)));
		}
	}

	private static List<String> readStringList(List<?> raw) {
		List<String> out = Cache.newStringList();
		if (raw == null) {
			return out;
		}
		for (Object item : raw) {
			if (item == null) {
				continue;
			}
			String s = String.valueOf(item).trim().toLowerCase(Locale.ROOT);
			if (!s.isEmpty()) {
				out.add(s);
			}
		}
		return out;
	}

	private static List<?> asList(Object raw) {
		if (raw instanceof List<?> list) {
			return list;
		}
		return null;
	}

	private static int asInt(Object raw, int fallback) {
		if (raw instanceof Number number) {
			return number.intValue();
		}
		if (raw == null) {
			return fallback;
		}
		try {
			return Integer.parseInt(String.valueOf(raw).trim());
		} catch (NumberFormatException e) {
			return fallback;
		}
	}

	private static boolean asBool(Object raw, boolean fallback) {
		if (raw instanceof Boolean bool) {
			return bool.booleanValue();
		}
		if (raw instanceof Number number) {
			return number.intValue() != 0;
		}
		if (raw == null) {
			return fallback;
		}
		String text = String.valueOf(raw).trim().toLowerCase(Locale.ROOT);
		if (text.equals("true") || text.equals("yes") || text.equals("on") || text.equals("1")) {
			return true;
		}
		if (text.equals("false") || text.equals("no") || text.equals("off") || text.equals("0")) {
			return false;
		}
		return fallback;
	}
}
