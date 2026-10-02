package net.tfminecraft.tfmcweb.managers;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import net.tfminecraft.tfmcweb.TFMCWeb;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient.*;
import net.tfminecraft.tfmcweb.entitlements.PlayerMetaSyncService;
import net.tfminecraft.tfmcweb.listeners.PlayerJoinListener;
import net.tfminecraft.tfmcweb.mail.BirdMailGateway;
import org.bukkit.Bukkit;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.scheduler.BukkitTask;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;

class NoticeAndJoinTest {
    CommandFixture f;
    @BeforeEach void setup() throws Exception {f=new CommandFixture();}
    @AfterEach void cleanup() throws Exception {f.close();}
    PluginNotice notice(int id,String type,String uuid,String name){return new PluginNotice(id,type,uuid,name,"discord","soon","now");}
    @Test void pollerLifecycleFailuresAndEmptyResponses() {
        BukkitTask task=mock(BukkitTask.class);when(f.scheduler.runTaskTimerAsynchronously(eq(f.plugin),any(Runnable.class),eq(20L),eq(20L))).thenReturn(task);
        var poller=new PluginNoticePoller(f.plugin,f.cache,f.gate);poller.stop();poller.start();poller.start();
        ArgumentCaptor<Runnable> ticks=ArgumentCaptor.forClass(Runnable.class);verify(f.scheduler).runTaskTimerAsynchronously(eq(f.plugin),ticks.capture(),eq(20L),eq(20L));
        f.api.when(ProvinceSystemClient::listPluginNotices).thenThrow(new IllegalStateException("offline"));ticks.getValue().run();verify(f.logger).log(eq(java.util.logging.Level.WARNING),contains("poll failed"),any(Exception.class));
        f.api.when(ProvinceSystemClient::listPluginNotices).thenReturn(PluginNoticesResult.fail("down"));ticks.getValue().run();verify(f.logger).fine(contains("down"));
        f.api.when(ProvinceSystemClient::listPluginNotices).thenReturn(PluginNoticesResult.success(List.of()));ticks.getValue().run();
        poller.stop();poller.stop();verify(task).cancel();
    }
    @Test void noticeDeliveryUpdatesCacheAndAcknowledgesOnlyOwnedDeliverableNotices() {
        List<Runnable> ticks=new ArrayList<>();when(f.scheduler.runTaskTimerAsynchronously(eq(f.plugin),any(Runnable.class),eq(20L),eq(20L))).thenAnswer(c->{ticks.add(c.getArgument(1));return mock(BukkitTask.class);});
        var poller=new PluginNoticePoller(f.plugin,f.cache,f.gate);poller.start();Runnable tick=ticks.getFirst();
        f.api.when(()->ProvinceSystemClient.ackPluginNotices(anyList())).thenReturn(SimpleResult.success());
        int id=0;
        for(String type:Arrays.asList("link_success","guild_left_grace","guild_rejoined","grace_expired","unknown",null)){
            f.api.when(ProvinceSystemClient::listPluginNotices).thenReturn(PluginNoticesResult.success(List.of(notice(++id,type,f.id.toString()," AdaDiscord "))));tick.run();
        }
        assertFalse(f.cache.isEligible(f.id));verify(f.gate).applyGate(f.player,false);assertTrue(f.contains("AdaDiscord"));
        f.api.when(ProvinceSystemClient::listPluginNotices).thenReturn(PluginNoticesResult.success(List.of(notice(20,"link_success",f.id.toString()," "),notice(21,"unknown","invalid",null))));
        f.api.when(()->ProvinceSystemClient.ackPluginNotices(anyList())).thenReturn(SimpleResult.fail("down"));tick.run();assertTrue(f.contains("Discord linked successfully."));verify(f.logger).warning(contains("ack failed"));
        f.bukkit.when(()->Bukkit.getPlayer(f.id)).thenReturn(null);
        for(String type:List.of("link_success","guild_left_grace","guild_rejoined","grace_expired")){
            f.api.when(ProvinceSystemClient::listPluginNotices).thenReturn(PluginNoticesResult.success(List.of(notice(++id,type,f.id.toString(),null))));tick.run();
        }
        verify(f.gate).applyGate(f.id,false);
        f.api.verify(()->ProvinceSystemClient.ackPluginNotices(List.of(1)));
        f.api.verify(()->ProvinceSystemClient.ackPluginNotices(List.of(7)),never());
    }
    @Test void joinFetchAppliesGateAndHandlesOfflineFailuresOrExceptions() {
        var listener=new PlayerJoinListener(f.plugin,f.gate);var event=mock(PlayerJoinEvent.class);when(event.getPlayer()).thenReturn(f.player);
        try(var sync=mockStatic(PlayerMetaSyncService.class)){
        var expectedIdentity0=IdentityStatus.fromJson("{\"eligible\":true}");
            when(f.gate.fetchAndCache(f.id)).thenReturn(expectedIdentity0);listener.onJoin(event);verify(f.gate).applyGate(f.player,true);sync.verify(()->PlayerMetaSyncService.pushForPlayer(f.player));
            when(f.gate.fetchAndCache(f.id)).thenReturn(IdentityStatus.fail("down"));listener.onJoin(event);verify(f.gate).applyGate(f.player);verify(f.logger).fine(contains("down"));
            when(f.player.isOnline()).thenReturn(false);listener.onJoin(event);verify(f.gate,times(1)).applyGate(f.player);
            when(f.gate.fetchAndCache(f.id)).thenThrow(new IllegalStateException("bad"));listener.onJoin(event);verify(f.logger).log(eq(java.util.logging.Level.WARNING),contains("identity sync failed"),any(Exception.class));
        }
    }
    @Test void birdGatewayValidatesPluginAndUsesCachedOrFetchedIdentity() {
        assertFalse(BirdMailGateway.enqueueArrival(null,"Char",null,null));assertFalse(BirdMailGateway.enqueueArrival(f.id,null,null,null));assertFalse(BirdMailGateway.enqueueArrival(f.id," ",null,null));
        TFMCWeb.plugin=null;assertFalse(BirdMailGateway.enqueueArrival(f.id,"Char",null,null));TFMCWeb plugin=mock(TFMCWeb.class);TFMCWeb.plugin=plugin;
        assertFalse(BirdMailGateway.enqueueArrival(f.id,"Char",null,null));when(plugin.isEnabled()).thenReturn(true);when(plugin.getLinkCache()).thenReturn(f.cache);when(plugin.getLogger()).thenReturn(f.logger);
        f.api.when(()->ProvinceSystemClient.getIdentityStatus(f.id.toString())).thenReturn(IdentityStatus.fail("down"));assertFalse(BirdMailGateway.enqueueArrival(f.id,"Char",null,null));
        var expectedIdentity1=IdentityStatus.fromJson("{\"discord_user_id\":\"d\"}");
        f.api.when(()->ProvinceSystemClient.getIdentityStatus(f.id.toString())).thenReturn(expectedIdentity1);
        f.api.when(()->ProvinceSystemClient.postBirdMail(f.id.toString(),"d","Char",null,null)).thenReturn(MirrorResult.success(true));
        assertTrue(BirdMailGateway.enqueueArrival(f.id,"Char",null,null));assertEquals("d",f.cache.get(f.id).discordUserId);
        assertTrue(BirdMailGateway.enqueueArrival(f.id,"Char",null,null));
        f.api.when(()->ProvinceSystemClient.postBirdMail(f.id.toString(),"d","Char",null,null)).thenReturn(MirrorResult.fail("down"));assertFalse(BirdMailGateway.enqueueArrival(f.id,"Char",null,null));
        when(plugin.getLinkCache()).thenReturn(null);assertFalse(BirdMailGateway.enqueueArrival(f.id,"Char",null,null));
    }
}
