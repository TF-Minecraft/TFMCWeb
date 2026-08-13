package net.tfminecraft.TFMCWeb.entitlements;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * One permission-group row from player-meta.*.groups (web sync ladders).
 */
public final class MetaGroupDefinition {

	private final String permission;
	private final int tier;
	private final Map<String, Integer> intPerks;
	private final List<String> skinKinds;
	private final Boolean allowArmor3dHelmet;
	private final Boolean allowDrinkTexture;

	public MetaGroupDefinition(
		String permission,
		int tier,
		Map<String, Integer> intPerks,
		List<String> skinKinds,
		Boolean allowArmor3dHelmet,
		Boolean allowDrinkTexture
	) {
		this.permission = permission == null ? "" : permission.trim();
		this.tier = tier;
		this.intPerks = intPerks == null ? Map.of() : Map.copyOf(intPerks);
		if (skinKinds == null || skinKinds.isEmpty()) {
			this.skinKinds = List.of();
		} else {
			LinkedHashSet<String> kinds = new LinkedHashSet<>();
			for (String kind : skinKinds) {
				if (kind == null || kind.isBlank()) {
					continue;
				}
				kinds.add(kind.trim().toLowerCase(Locale.ROOT));
			}
			this.skinKinds = List.copyOf(kinds);
		}
		this.allowArmor3dHelmet = allowArmor3dHelmet;
		this.allowDrinkTexture = allowDrinkTexture;
	}

	public String getPermission() {
		return permission;
	}

	public int getTier() {
		return tier;
	}

	public boolean hasIntPerk(String key) {
		return intPerks.containsKey(key);
	}

	public int getIntPerk(String key, int fallback) {
		Integer value = intPerks.get(key);
		return value == null ? fallback : value.intValue();
	}

	public List<String> getSkinKinds() {
		return skinKinds;
	}

	public boolean hasAllowArmor3dHelmet() {
		return allowArmor3dHelmet != null;
	}

	public boolean getAllowArmor3dHelmet(boolean fallback) {
		return allowArmor3dHelmet == null ? fallback : allowArmor3dHelmet.booleanValue();
	}

	public boolean hasAllowDrinkTexture() {
		return allowDrinkTexture != null;
	}

	public boolean getAllowDrinkTexture(boolean fallback) {
		return allowDrinkTexture == null ? fallback : allowDrinkTexture.booleanValue();
	}

	public static List<MetaGroupDefinition> copyList(List<MetaGroupDefinition> in) {
		if (in == null || in.isEmpty()) {
			return List.of();
		}
		return List.copyOf(new ArrayList<>(in));
	}

	public static List<MetaGroupDefinition> emptyList() {
		return Collections.emptyList();
	}
}
