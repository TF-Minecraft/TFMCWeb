package net.tfminecraft.TFMCWeb.loaders;

import java.io.File;
import java.io.IOException;

import org.bukkit.configuration.InvalidConfigurationException;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;

import net.tfminecraft.TFMCWeb.Cache;

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
	}
}
