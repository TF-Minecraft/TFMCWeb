package net.tfminecraft.tfmcweb;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.*;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient;
import net.tfminecraft.tfmcweb.cache.LinkCache;
import net.tfminecraft.tfmcweb.managers.TokenCooldownService;
import net.tfminecraft.tfmcweb.utils.*;
import org.bukkit.entity.Player;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;

class RuntimeUtilitiesTest {
    TestState state;
    @BeforeEach void setup() throws Exception {state=new TestState();}
    @AfterEach void cleanup() throws Exception {state.close();}
    @Test void cacheTracksIdentityGraceAndEligibility() {
        LinkCache cache=new LinkCache();UUID id=UUID.randomUUID();
        assertNull(cache.get(null));assertNull(cache.get(id));assertFalse(cache.isEligible(id));
        cache.put(null,LinkCache.Entry.unlinked());cache.put(id,null);assertEquals(0,cache.size());
        cache.putFromStatus(id,null);assertFalse(cache.get(id).linked);
        cache.putFromStatus(id,ProvinceSystemClient.IdentityStatus.fail("bad"));assertFalse(cache.isEligible(id));
        cache.putFromStatus(id,ProvinceSystemClient.IdentityStatus.fromJson("{\"linked\":true,\"eligible\":true,\"in_grace\":true,\"discord_user_id\":\"d\",\"discord_username\":\"Ada\",\"grace_until\":\"soon\"}"));
        assertTrue(cache.isEligible(id));assertEquals("soon",cache.get(id).graceUntil);
        cache.putGrace(id,null,"later");assertEquals("d",cache.get(id).discordUserId);assertEquals("Ada",cache.get(id).discordUsername);assertTrue(cache.get(id).inGrace);
        cache.clearGrace(id);assertFalse(cache.get(id).inGrace);assertEquals("Ada",cache.get(id).discordUsername);
        cache.clear(null);cache.clear(id);cache.clearGrace(id);assertTrue(cache.get(id).linked);assertNull(cache.get(id).discordUserId);
        cache.clear(id);cache.putGrace(id,null,"until");assertNull(cache.get(id).discordUserId);
        cache.putGrace(id,"new","until");assertEquals("new",cache.get(id).discordUserId);
        cache.putLinked(id,"discord","name");assertEquals("name",cache.get(id).discordUsername);assertEquals(1,cache.snapshot().size());
        cache.putUnlinked(id);assertFalse(cache.isEligible(id));cache.clear(id);assertEquals(0,cache.size());
    }
    @Test void expiryLabelsHandlePastFutureAndMalformedDates() {
        assertNull(ExpiryFormat.relativeLabel(null));assertNull(ExpiryFormat.relativeLabel(""));assertNull(ExpiryFormat.relativeLabel("bad"));
        Instant now=Instant.now();assertEquals("Expired",ExpiryFormat.relativeLabel(now.minusSeconds(1).toString()));
        assertEquals("Expires in ~2h",ExpiryFormat.relativeLabel(now.plusSeconds(7500).toString()));
        assertEquals("Expires in ~30m",ExpiryFormat.relativeLabel(now.plusSeconds(1830).toString()));
        assertEquals("Expires in ~1m",ExpiryFormat.relativeLabel(now.plusSeconds(5).toString()));
    }
    @Test void messagesIncludeInteractiveCopyCode() {
        Player player=mock(Player.class);ChatMessages.info(player,"info");ChatMessages.error(player,"error");
        verify(player).sendMessage(ChatMessages.PREFIX+"info");verify(player).sendMessage(ChatMessages.PREFIX+"§cerror");
        ChatMessages.sendCopyableCode(player,"intro","ABC");verify(player).sendMessage(ChatMessages.PREFIX+"intro");
        ArgumentCaptor<Component> message=ArgumentCaptor.forClass(Component.class);verify(player).sendMessage(message.capture());
        assertEquals(ClickEvent.copyToClipboard("ABC"),message.getValue().children().get(1).clickEvent());
        ChatMessages.sendCopyableCode(player,null,null);ChatMessages.sendCopyableCode(player,"","");verify(player,times(1)).sendMessage(any(Component.class));
        ChatMessages.sendOpenUrl(null,"label","https://example.test");ChatMessages.sendOpenUrl(player,null," ");ChatMessages.sendOpenUrl(player,""," ");
        ChatMessages.sendOpenUrl(player,null,"https://example.test/link");ChatMessages.sendOpenUrl(player,"","https://example.test/link");
        ChatMessages.sendOpenUrl(player,"Link your Patreon account:","https://example.test/link");
        verify(player).sendMessage(ChatMessages.PREFIX+"Link your Patreon account:");
        ArgumentCaptor<Component> link=ArgumentCaptor.forClass(Component.class);verify(player,atLeastOnce()).sendMessage(link.capture());
        assertTrue(link.getAllValues().stream().anyMatch(component->ClickEvent.openUrl("https://example.test/link").equals(component.clickEvent())));
        ChatMessages.sendOpenUrl(player,"broken","not a url");verify(player).sendMessage(ChatMessages.PREFIX+"not a url");
        ChatMessages.sendOpenUrl(player,"plain","not-a-url");verify(player).sendMessage(ChatMessages.PREFIX+"not-a-url");
        ChatMessages.sendOpenUrl(player,"mail","mailto:a@b.test");verify(player).sendMessage(ChatMessages.PREFIX+"mailto:a@b.test");
    }
    @Test void cooldownPermissionOrderAndStatuses() {
        Player player=mock(Player.class);UUID id=UUID.randomUUID();when(player.getUniqueId()).thenReturn(id);
        Cache.tokenCooldownDefaultDays=-1;Cache.tokenCooldownGroups=Arrays.asList(null,new Cache.TokenCooldownGroup(null,1),new Cache.TokenCooldownGroup("rank.low",3),new Cache.TokenCooldownGroup("rank.high",1));
        assertEquals(-1,TokenCooldownService.resolveCooldownDays(null));assertEquals(-1,TokenCooldownService.resolveCooldownDays(player));
        assertEquals("Your rank cannot create drink tokens",TokenCooldownService.checkSharedMint(player,"DRINK"));
        assertEquals("Your rank cannot create skin tokens",TokenCooldownService.checkSharedMint(player,null));
        when(player.hasPermission("rank.low")).thenReturn(true);when(player.hasPermission("rank.high")).thenReturn(true);assertEquals(1,TokenCooldownService.resolveCooldownDays(player));
        Cache.tokenCooldownGroups=List.of();Cache.tokenCooldownDefaultDays=0;assertNull(TokenCooldownService.checkSharedMint(player,"skin"));Cache.tokenCooldownDefaultDays=3;
        try(var api=mockStatic(ProvinceSystemClient.class)){
            for(String value:Arrays.asList(null," ","bad","2000-01-01 00:00:00","2000-01-01T00:00:00")){
                api.when(()->ProvinceSystemClient.getCosmeticMintStatus(id.toString())).thenReturn(ProvinceSystemClient.CosmeticMintStatus.success(value));assertNull(TokenCooldownService.checkSharedMint(player,"skin"));
            }
            api.when(()->ProvinceSystemClient.getCosmeticMintStatus(id.toString())).thenReturn(ProvinceSystemClient.CosmeticMintStatus.fail("down"));assertEquals("down",TokenCooldownService.checkSharedMint(player,"skin"));
            api.when(()->ProvinceSystemClient.getCosmeticMintStatus(id.toString())).thenReturn(ProvinceSystemClient.CosmeticMintStatus.fail(null));assertEquals("Could not check mint cooldown.",TokenCooldownService.checkSharedMint(player,"skin"));
            for(long remaining:new long[]{1800,7200,180000}){
                api.when(()->ProvinceSystemClient.getCosmeticMintStatus(id.toString())).thenReturn(ProvinceSystemClient.CosmeticMintStatus.success(Instant.now().minusSeconds(3*86400-remaining).toString()));
                String label=TokenCooldownService.checkSharedMint(player,"skin");assertTrue(label.startsWith("Token cooldown: try again in "));
                if(remaining==1800)assertTrue(label.endsWith("1h"));if(remaining==180000)assertTrue(label.contains("d "));
            }
        }
    }
}
