package net.tfminecraft.TFMCWeb.managers;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

import org.bukkit.entity.Player;

import net.tfminecraft.TFMCWeb.Cache;
import net.tfminecraft.TFMCWeb.Cache.TokenCooldownGroup;
import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient;
import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient.CosmeticMintStatus;

/**
 * Shared skin+drink mint cooldown (TFMCWeb-owned).
 */
public final class TokenCooldownService {

	private TokenCooldownService() {}

	/**
	 * Days between shared cosmetic mints for this player.
	 * {@code -1} means mint disallowed; {@code 0} means no wait.
	 * Highest matching configured LP permission wins (list order low→high).
	 */
	public static int resolveCooldownDays(Player player) {
		int days = Cache.tokenCooldownDefaultDays;
		if (player == null) {
			return days;
		}
		for (TokenCooldownGroup group : Cache.tokenCooldownGroups) {
			if (group == null || group.permission.isEmpty()) {
				continue;
			}
			if (player.hasPermission(group.permission)) {
				days = group.cooldownDays;
			}
		}
		return days;
	}

	/**
	 * Check shared mint eligibility. Returns null if OK to mint, else player-facing error.
	 * Call only for scopes in {@link Cache#isSharedMintScope(String)}.
	 */
	public static String checkSharedMint(Player player, String scope) {
		String sc = scope == null ? "" : scope.trim().toLowerCase(Locale.ROOT);
		int days = resolveCooldownDays(player);
		if (days < 0) {
			if ("drink".equals(sc)) {
				return "Your rank cannot create drink tokens";
			}
			return "Your rank cannot create skin tokens";
		}
		if (days == 0) {
			return null;
		}

		String uuid = player.getUniqueId().toString();
		CosmeticMintStatus status = ProvinceSystemClient.getCosmeticMintStatus(uuid);
		if (!status.ok) {
			return status.error != null ? status.error : "Could not check mint cooldown.";
		}
		if (status.lastMintAt == null || status.lastMintAt.isBlank()) {
			return null;
		}

		Instant last;
		try {
			last = Instant.parse(normalizeIso(status.lastMintAt));
		} catch (Exception e) {
			return null;
		}

		Instant unlock = last.plus(days, ChronoUnit.DAYS);
		Instant now = Instant.now();
		if (!unlock.isAfter(now)) {
			return null;
		}
		return "Token cooldown: try again in " + formatRemaining(now, unlock);
	}

	private static String normalizeIso(String raw) {
		String value = raw.trim();
		if (value.length() >= 19 && value.charAt(10) == ' ') {
			value = value.substring(0, 10) + "T" + value.substring(11);
		}
		if (value.length() == 19 && value.charAt(10) == 'T') {
			return value + "Z";
		}
		return value;
	}

	private static String formatRemaining(Instant now, Instant unlock) {
		long totalHours = ChronoUnit.HOURS.between(now, unlock);
		if (totalHours < 1) {
			return "1h";
		}
		long daysLeft = totalHours / 24;
		long hoursLeft = totalHours % 24;
		if (daysLeft > 0) {
			return daysLeft + "d " + hoursLeft + "h";
		}
		return hoursLeft + "h";
	}
}
