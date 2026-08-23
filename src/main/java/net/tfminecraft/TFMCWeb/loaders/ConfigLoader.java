package net.tfminecraft.TFMCWeb.loaders;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Locale;

import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.InvalidConfigurationException;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;

import net.tfminecraft.TFMCWeb.Cache;
import net.tfminecraft.TFMCWeb.Cache.TokenCooldownGroup;

public final class ConfigLoader {

	public void load(File configFile) {
		FileConfiguration config = new YamlConfiguration();
		try {
			config.load(configFile);
		} catch (IOException | InvalidConfigurationException e) {
			e.printStackTrace();
			return;
		}

		String base = config.getString("api.base-url", "");
		if (base == null) {
			base = "";
		}
		base = base.trim();
		while (base.endsWith("/")) {
			base = base.substring(0, base.length() - 1);
		}
		Cache.apiBaseUrl = base;

		String key = config.getString("api.plugin-key", "");
		Cache.pluginKey = key == null ? "" : key.trim();

		loadRealmAndTokens(config);
		loadTokenCooldowns(config);
		PlayerMetaConfigLoader.load(config);
	}

	private void loadRealmAndTokens(FileConfiguration config) {
		String realm = config.getString("realm.id", "main");
		if (realm == null || realm.isBlank()) {
			realm = "main";
		} else {
			realm = realm.trim().toLowerCase(Locale.ROOT);
		}
		Cache.realmId = realm;

		List<String> enabled = Cache.newStringList();
		List<?> rawEnabled = config.getList("tokens.enabled-scopes");
		if (rawEnabled != null) {
			for (Object item : rawEnabled) {
				if (item == null) {
					continue;
				}
				String scope = String.valueOf(item).trim().toLowerCase(Locale.ROOT);
				if (scope.isEmpty()) {
					continue;
				}
				if (!scope.equals("skin")
					&& !scope.equals("drink")
					&& !scope.equals("profile")
					&& !scope.equals("skin_staff")) {
					continue;
				}
				if (!enabled.contains(scope)) {
					enabled.add(scope);
				}
			}
		} else {
			// Missing key → keep full default (backward compatible).
			enabled.add("skin");
			enabled.add("drink");
			enabled.add("profile");
			enabled.add("skin_staff");
		}
		Cache.tokenEnabledScopes = List.copyOf(enabled);
	}

	private void loadTokenCooldowns(FileConfiguration config) {
		List<String> shared = Cache.newSharedScopeList();
		List<?> rawShared = config.getList("token-cooldowns.shared-scopes");
		if (rawShared != null) {
			for (Object item : rawShared) {
				if (item == null) {
					continue;
				}
				String scope = String.valueOf(item).trim().toLowerCase(Locale.ROOT);
				if (!scope.isEmpty()) {
					shared.add(scope);
				}
			}
		}
		if (shared.isEmpty()) {
			shared.add("skin");
			shared.add("drink");
		}
		Cache.tokenCooldownSharedScopes = List.copyOf(shared);

		Cache.tokenCooldownDefaultDays = config.getInt(
			"token-cooldowns.defaults.cooldown-days",
			-1
		);

		List<TokenCooldownGroup> groups = Cache.newGroupList();
		List<?> rawGroups = config.getList("token-cooldowns.groups");
		if (rawGroups != null) {
			for (Object item : rawGroups) {
				if (!(item instanceof ConfigurationSection)
					&& !(item instanceof java.util.Map)) {
					continue;
				}
				String permission;
				int days;
				if (item instanceof ConfigurationSection section) {
					permission = section.getString("permission", "");
					days = section.getInt("cooldown-days", -1);
				} else {
					@SuppressWarnings("unchecked")
					java.util.Map<String, Object> map = (java.util.Map<String, Object>) item;
					Object permObj = map.get("permission");
					permission = permObj == null ? "" : String.valueOf(permObj);
					Object daysObj = map.get("cooldown-days");
					if (daysObj instanceof Number) {
						days = ((Number) daysObj).intValue();
					} else {
						try {
							days = Integer.parseInt(String.valueOf(daysObj));
						} catch (NumberFormatException e) {
							days = -1;
						}
					}
				}
				if (permission == null || permission.isBlank()) {
					continue;
				}
				groups.add(new TokenCooldownGroup(permission.trim(), days));
			}
		}
		Cache.tokenCooldownGroups = List.copyOf(groups);
	}
}
