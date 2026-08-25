package net.tfminecraft.TFMCWeb.mail;

import java.util.UUID;
import java.util.logging.Level;

import net.tfminecraft.TFMCWeb.TFMCWeb;
import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient;
import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient.IdentityStatus;
import net.tfminecraft.TFMCWeb.api.ProvinceSystemClient.MirrorResult;
import net.tfminecraft.TFMCWeb.cache.LinkCache;

/**
 * Entry point for BirdMessenger (reflective). Resolves Discord link and enqueues bird_mail.
 */
public final class BirdMailGateway {

	private BirdMailGateway() {}

	public static void enqueueArrival(
		UUID ownerUuid,
		String addresseeCharacter,
		String senderMinecraftName,
		String contentsPreview
	) {
		if (ownerUuid == null || addresseeCharacter == null || addresseeCharacter.isBlank()) {
			return;
		}
		TFMCWeb plugin = TFMCWeb.plugin;
		if (plugin == null || !plugin.isEnabled()) {
			return;
		}
		String discordId = resolveDiscordId(plugin, ownerUuid);
		if (discordId == null || discordId.isBlank()) {
			return;
		}
		MirrorResult result = ProvinceSystemClient.postBirdMail(
			ownerUuid.toString(),
			discordId,
			addresseeCharacter,
			senderMinecraftName,
			contentsPreview
		);
		if (!result.ok) {
			plugin.getLogger().log(
				Level.FINE,
				"Bird mail enqueue failed for " + ownerUuid + ": " + result.error
			);
		}
	}

	private static String resolveDiscordId(TFMCWeb plugin, UUID uuid) {
		LinkCache cache = plugin.getLinkCache();
		if (cache != null) {
			LinkCache.Entry cached = cache.get(uuid);
			if (cached != null && cached.discordUserId != null && !cached.discordUserId.isBlank()) {
				return cached.discordUserId;
			}
		}
		IdentityStatus status = ProvinceSystemClient.getIdentityStatus(uuid.toString());
		if (status.ok && status.discordUserId != null && !status.discordUserId.isBlank()) {
			if (cache != null) {
				cache.putFromStatus(uuid, status);
			}
			return status.discordUserId;
		}
		return null;
	}
}
