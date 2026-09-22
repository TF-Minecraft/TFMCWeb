package net.tfminecraft.tfmcweb.utils;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;

/**
 * Friendly expiry strings from API UTC ISO (...Z).
 */
public final class ExpiryFormat {

	private ExpiryFormat() {}

	/**
	 * e.g. "Expires in ~2h", "Expires in ~45m", "Expired", or null if unparseable/blank.
	 */
	public static String relativeLabel(String expiresAtIso) {
		if (expiresAtIso == null || expiresAtIso.isEmpty()) {
			return null;
		}
		try {
			Instant end = Instant.parse(expiresAtIso);
			Duration d = Duration.between(Instant.now(), end);
			if (d.isNegative() || d.isZero()) {
				return "Expired";
			}
			long hours = d.toHours();
			if (hours >= 1) {
				return "Expires in ~" + hours + "h";
			}
			long minutes = Math.max(1, d.toMinutes());
			return "Expires in ~" + minutes + "m";
		} catch (DateTimeParseException e) {
			return null;
		}
	}
}
