package net.tfminecraft.TFMCWeb.api;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import net.tfminecraft.TFMCWeb.Cache;
import net.tfminecraft.TFMCWeb.TFMCWeb;

/**
 * Shared ProvinceSystem HTTP transport for domain plugins.
 * Holds api.base-url / plugin-key and injects realm_id on allowlisted routes.
 */
public final class ProvinceSystemGateway {

	private static final int TIMEOUT_MS = 8000;
	private static final int DOWNLOAD_TIMEOUT_MS = 30000;
	private static final Pattern REALM_IN_BODY = Pattern.compile(
		"\"realm_id\"\\s*:"
	);

	private ProvinceSystemGateway() {}

	/** Result for JSON (and string-body) requests. */
	public static final class GatewayResult {
		public final boolean ok;
		public final int status;
		public final String body;
		public final String error;

		private GatewayResult(boolean ok, int status, String body, String error) {
			this.ok = ok;
			this.status = status;
			this.body = body;
			this.error = error;
		}

		public static GatewayResult success(int status, String body) {
			return new GatewayResult(true, status, body == null ? "" : body, null);
		}

		public static GatewayResult fail(String error) {
			return new GatewayResult(false, 0, null, error);
		}

		public static GatewayResult fail(int status, String error) {
			return new GatewayResult(false, status, null, error);
		}
	}

	/** Result for binary downloads. */
	public static final class BytesResult {
		public final boolean ok;
		public final byte[] data;
		public final String error;

		private BytesResult(boolean ok, byte[] data, String error) {
			this.ok = ok;
			this.data = data;
			this.error = error;
		}

		public static BytesResult success(byte[] data) {
			return new BytesResult(true, data, null);
		}

		public static BytesResult fail(String error) {
			return new BytesResult(false, null, error);
		}
	}

	/**
	 * JSON/text request. {@code jsonBody} may be null for GET/DELETE.
	 * Auto-injects realm_id for allowlisted paths.
	 */
	public static GatewayResult request(String method, String path, String jsonBody) {
		String m = method == null ? "GET" : method.trim().toUpperCase(Locale.ROOT);
		String p = injectRealmPath(m, path);
		String body = injectRealmBody(m, p, jsonBody);
		byte[] bytes = body == null ? null : body.getBytes(StandardCharsets.UTF_8);
		String contentType = body == null ? null : "application/json";
		return execute(m, p, bytes, contentType, TIMEOUT_MS);
	}

	/**
	 * Binary upload (PNG assets, kit skins). Path may still get realm query
	 * injection when allowlisted; body is left untouched.
	 */
	public static GatewayResult requestBytes(
		String method,
		String path,
		byte[] body,
		String contentType
	) {
		String m = method == null ? "PUT" : method.trim().toUpperCase(Locale.ROOT);
		String p = injectRealmPath(m, path);
		return execute(
			m,
			p,
			body,
			contentType == null || contentType.isBlank()
				? "application/octet-stream"
				: contentType,
			DOWNLOAD_TIMEOUT_MS
		);
	}

	/** Binary download (GET). */
	public static BytesResult download(String path) {
		String base = Cache.apiBaseUrl;
		String key = Cache.pluginKey;
		if (base == null || base.isEmpty() || key == null || key.isEmpty()) {
			return BytesResult.fail(notConfiguredMessage());
		}
		String p = injectRealmPath("GET", path);
		HttpURLConnection connection = null;
		try {
			String root = trimSlash(base);
			@SuppressWarnings("deprecation")
			URL url = new URL(root + p);
			connection = (HttpURLConnection) url.openConnection();
			connection.setRequestMethod("GET");
			connection.setConnectTimeout(TIMEOUT_MS);
			connection.setReadTimeout(DOWNLOAD_TIMEOUT_MS);
			connection.setRequestProperty("X-Plugin-Key", key);

			int status = connection.getResponseCode();
			if (status == 200) {
				byte[] data = readBytes(connection.getInputStream());
				if (data == null || data.length == 0) {
					return BytesResult.fail("Empty file download");
				}
				return BytesResult.success(data);
			}
			String response = readBody(connection.getErrorStream());
			return BytesResult.fail(detailOrHttp(response, status));
		} catch (Exception e) {
			return BytesResult.fail("Could not download: " + e.getMessage());
		} finally {
			if (connection != null) {
				connection.disconnect();
			}
		}
	}

	static String injectRealmPath(String method, String path) {
		if (path == null || path.isBlank()) {
			return path;
		}
		String realm = TFMCWeb.getRealmId();
		String bare = path;
		int q = path.indexOf('?');
		String query = q >= 0 ? path.substring(q + 1) : "";
		if (q >= 0) {
			bare = path.substring(0, q);
		}
		if (!needsRealmQuery(method, bare)) {
			return path;
		}
		if (queryContainsRealm(query)) {
			return path;
		}
		try {
			String enc = URLEncoder.encode(realm, StandardCharsets.UTF_8);
			if (q >= 0) {
				return path + (query.isEmpty() ? "" : "&") + "realm_id=" + enc;
			}
			return path + "?realm_id=" + enc;
		} catch (Exception e) {
			return path + (q >= 0 ? "&" : "?") + "realm_id=" + realm;
		}
	}

	static String injectRealmBody(String method, String path, String jsonBody) {
		if (!"PUT".equals(method) || jsonBody == null || jsonBody.isBlank()) {
			return jsonBody;
		}
		String bare = path;
		int q = path.indexOf('?');
		if (q >= 0) {
			bare = path.substring(0, q);
		}
		if (!needsRealmBody(bare)) {
			return jsonBody;
		}
		if (REALM_IN_BODY.matcher(jsonBody).find()) {
			return jsonBody;
		}
		String realm = TFMCWeb.getRealmId();
		String trimmed = jsonBody.trim();
		if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
			return jsonBody;
		}
		String inner = trimmed.substring(1, trimmed.length() - 1).trim();
		if (inner.isEmpty()) {
			return "{\"realm_id\":\"" + escapeJson(realm) + "\"}";
		}
		return "{\"realm_id\":\"" + escapeJson(realm) + "\"," + inner + "}";
	}

	private static boolean needsRealmQuery(String method, String barePath) {
		if (!"GET".equals(method)) {
			return false;
		}
		return equalsPath(barePath, "/characters/plugin/pending")
			|| equalsPath(barePath, "/skins/plugin/approved")
			|| equalsPath(barePath, "/drinks/plugin/pending-apply")
			|| equalsPath(barePath, "/characters/plugin/lore-items/pending");
	}

	private static boolean needsRealmBody(String barePath) {
		return equalsPath(barePath, "/characters/plugin/roster")
			|| equalsPath(barePath, "/characters/plugin/rpc-player-meta");
	}

	private static boolean equalsPath(String bare, String expected) {
		if (bare == null) {
			return false;
		}
		String p = bare.trim();
		if (p.endsWith("/") && p.length() > 1) {
			p = p.substring(0, p.length() - 1);
		}
		return expected.equals(p);
	}

	private static boolean queryContainsRealm(String query) {
		if (query == null || query.isEmpty()) {
			return false;
		}
		for (String part : query.split("&")) {
			String key = part;
			int eq = part.indexOf('=');
			if (eq >= 0) {
				key = part.substring(0, eq);
			}
			if ("realm_id".equalsIgnoreCase(key.trim())) {
				return true;
			}
		}
		return false;
	}

	private static GatewayResult execute(
		String method,
		String path,
		byte[] body,
		String contentType,
		int readTimeoutMs
	) {
		String base = Cache.apiBaseUrl;
		String key = Cache.pluginKey;
		if (base == null || base.isEmpty() || key == null || key.isEmpty()) {
			return GatewayResult.fail(notConfiguredMessage());
		}

		HttpURLConnection connection = null;
		try {
			String root = trimSlash(base);
			@SuppressWarnings("deprecation")
			URL url = new URL(root + path);
			connection = (HttpURLConnection) url.openConnection();
			connection.setRequestMethod(method);
			connection.setConnectTimeout(TIMEOUT_MS);
			connection.setReadTimeout(readTimeoutMs);
			connection.setRequestProperty("X-Plugin-Key", key);
			connection.setRequestProperty("Accept", "application/json");

			if (body != null) {
				connection.setDoOutput(true);
				if (contentType != null && !contentType.isEmpty()) {
					connection.setRequestProperty("Content-Type", contentType);
				}
				connection.setFixedLengthStreamingMode(body.length);
				try (OutputStream out = connection.getOutputStream()) {
					out.write(body);
				}
			}

			int status = connection.getResponseCode();
			String response = readBody(
				status >= 200 && status < 300
					? connection.getInputStream()
					: connection.getErrorStream()
			);

			if (status >= 200 && status < 300) {
				return GatewayResult.success(status, response);
			}
			return GatewayResult.fail(status, detailOrHttp(response, status));
		} catch (Exception e) {
			return GatewayResult.fail("Could not reach API: " + e.getMessage());
		} finally {
			if (connection != null) {
				connection.disconnect();
			}
		}
	}

	private static String trimSlash(String base) {
		if (base == null) {
			return "";
		}
		return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
	}

	private static String notConfiguredMessage() {
		return "API is not configured (api.base-url / api.plugin-key in TFMCWeb config.yml).";
	}

	private static String detailOrHttp(String response, int status) {
		String detail = extractJsonString(response, "detail");
		if (detail == null || detail.isEmpty()) {
			detail = response == null || response.isEmpty()
				? ("HTTP " + status)
				: response;
		}
		if (status == 401) {
			return "Unauthorized (check api.plugin-key). " + detail;
		}
		return detail;
	}

	private static String extractJsonString(String json, String key) {
		if (json == null || key == null) {
			return null;
		}
		Matcher m = Pattern.compile(
			"\"" + Pattern.quote(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\""
		).matcher(json);
		if (!m.find()) {
			return null;
		}
		return unescape(m.group(1));
	}

	private static String unescape(String raw) {
		if (raw == null) {
			return null;
		}
		StringBuilder out = new StringBuilder(raw.length());
		for (int i = 0; i < raw.length(); i++) {
			char c = raw.charAt(i);
			if (c == '\\' && i + 1 < raw.length()) {
				char n = raw.charAt(++i);
				out.append(n == 'n' ? '\n' : n == 't' ? '\t' : n == 'r' ? '\r' : n);
			} else {
				out.append(c);
			}
		}
		return out.toString();
	}

	private static String escapeJson(String raw) {
		if (raw == null) {
			return "";
		}
		StringBuilder out = new StringBuilder(raw.length() + 8);
		for (int i = 0; i < raw.length(); i++) {
			char c = raw.charAt(i);
			switch (c) {
				case '\\' -> out.append("\\\\");
				case '"' -> out.append("\\\"");
				default -> out.append(c);
			}
		}
		return out.toString();
	}

	private static String readBody(InputStream stream) throws Exception {
		if (stream == null) {
			return "";
		}
		StringBuilder sb = new StringBuilder();
		try (BufferedReader reader = new BufferedReader(
			new InputStreamReader(stream, StandardCharsets.UTF_8)
		)) {
			String line;
			while ((line = reader.readLine()) != null) {
				if (sb.length() > 0) {
					sb.append('\n');
				}
				sb.append(line);
			}
		}
		return sb.toString();
	}

	private static byte[] readBytes(InputStream stream) throws Exception {
		if (stream == null) {
			return new byte[0];
		}
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		byte[] buf = new byte[8192];
		int n;
		while ((n = stream.read(buf)) >= 0) {
			out.write(buf, 0, n);
		}
		return out.toByteArray();
	}
}
