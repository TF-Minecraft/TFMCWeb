package net.tfminecraft.tfmcweb.listeners;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.*;
import java.util.logging.Logger;
import net.ess3.api.events.BanStatusChangeEvent;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient.*;
import net.tfminecraft.tfmcweb.cache.LinkCache;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.event.*;
import org.bukkit.plugin.*;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitScheduler;
import org.junit.jupiter.api.*;
import org.mockito.*;

class EssentialsBanListenerTest {
    public static class Affected {
        public UUID uuid;public Object base;public String name;
        public UUID getUUID(){return uuid;}public Object getBase(){return base;}public String getName(){return name;}
    }
    public static class Base {public UUID getUniqueId(){return ID;}}
    public static class Entry {
        public Object timeout,expiration;public String reason;
        public Object getTimeout(){return timeout;}public Object getExpiration(){return expiration;}public String getReason(){return reason;}
    }
    public static class Controller {public String getName(){return "Staff";}}
    static final UUID ID=UUID.randomUUID();
    JavaPlugin plugin;Plugin essentials;PluginManager manager;BukkitScheduler scheduler;Logger logger;LinkCache cache;
    MockedStatic<Bukkit> bukkit;MockedStatic<ProvinceSystemClient> api;EssentialsBanListener listener;
    @BeforeEach void setup(){
        plugin=mock(JavaPlugin.class);logger=mock(Logger.class);when(plugin.getLogger()).thenReturn(logger);essentials=mock(Plugin.class);when(essentials.isEnabled()).thenReturn(true);
        manager=mock(PluginManager.class);when(manager.getPlugin("Essentials")).thenReturn(essentials);scheduler=mock(BukkitScheduler.class);
        bukkit=mockStatic(Bukkit.class);bukkit.when(Bukkit::getPluginManager).thenReturn(manager);bukkit.when(Bukkit::getScheduler).thenReturn(scheduler);
        doAnswer(c->{c.getArgument(1,Runnable.class).run();return null;}).when(scheduler).runTaskAsynchronously(eq(plugin),any(Runnable.class));
        api=mockStatic(ProvinceSystemClient.class, call -> call.getMethod().getName().equals("jsonString") ? call.callRealMethod() : org.mockito.Answers.RETURNS_DEFAULTS.answer(call));api.when(()->ProvinceSystemClient.getIdentityStatus(anyString())).thenReturn(IdentityStatus.fail("none"));
        api.when(()->ProvinceSystemClient.postBanEvent(anyString(),anyString(),nullable(String.class),nullable(String.class),nullable(String.class),nullable(String.class),nullable(String.class))).thenReturn(MirrorResult.success(true));
        cache=new LinkCache();listener=new EssentialsBanListener(plugin,cache);
    }
    @AfterEach void cleanup(){api.close();bukkit.close();}
    EventExecutor register(){assertTrue(listener.register());var executor=ArgumentCaptor.forClass(EventExecutor.class);verify(manager).registerEvent(eq(BanStatusChangeEvent.class),any(Listener.class),eq(EventPriority.MONITOR),executor.capture(),eq(plugin),eq(true));assertTrue(listener.isRegistered());return executor.getValue();}
    BanStatusChangeEvent event(){var e=new BanStatusChangeEvent();var a=new Affected();a.uuid=ID;a.name="Ada";e.affected=a;e.value=true;return e;}
    @Test void registrationHandlesMissingDisabledAndBrokenPluginManager() {
        assertFalse(listener.isRegistered());when(manager.getPlugin("Essentials")).thenReturn(null);assertFalse(listener.register());
        when(manager.getPlugin("Essentials")).thenReturn(essentials);when(essentials.isEnabled()).thenReturn(false);assertFalse(listener.register());
        when(essentials.isEnabled()).thenReturn(true);doThrow(new IllegalStateException("bad")).when(manager).registerEvent(any(),any(),any(),any(),any(),anyBoolean());assertFalse(listener.register());
    }
    @Test void registrationHandlesMissingOptionalEventClass() throws Exception {
        String name=EssentialsBanListener.class.getName();ClassLoader parent=getClass().getClassLoader();
        ClassLoader isolated=new ClassLoader(parent){@Override protected Class<?> loadClass(String candidate,boolean resolve)throws ClassNotFoundException{
            if(candidate.equals("net.ess3.api.events.BanStatusChangeEvent"))throw new ClassNotFoundException(candidate);
            if(candidate.startsWith(name)){Class<?> found=findLoadedClass(candidate);if(found!=null)return found;
                try(var bytes=parent.getResourceAsStream(candidate.replace('.','/')+".class")){byte[] data=bytes.readAllBytes();Class<?> cls=defineClass(candidate,data,0,data.length,EssentialsBanListener.class.getProtectionDomain());if(resolve)resolveClass(cls);return cls;}catch(java.io.IOException ex){throw new ClassNotFoundException(candidate,ex);}}
            return super.loadClass(candidate,resolve);
        }};
        Class<?> type=isolated.loadClass(name);Object copy=type.getConstructor(JavaPlugin.class,LinkCache.class).newInstance(plugin,cache);
        assertEquals(false,type.getMethod("register").invoke(copy));verify(logger).warning(contains("BanStatusChangeEvent missing"));
    }
    @Test void mirrorsBansUnbansAndIdentityFallbacks() throws Exception {
        EventExecutor executor=register();var e=event();cache.putLinked(ID,"cached","user");e.controller=new Controller();executor.execute(null,e);
        api.verify(()->ProvinceSystemClient.postBanEvent("ban",ID.toString(),"cached","Ada",null,"Permanent","Staff"));
        e.value=false;executor.execute(null,e);api.verify(()->ProvinceSystemClient.postBanEvent("unban",ID.toString(),"cached","Ada",null,null,"Staff"));
        e.value=null;e.banned=false;e.controller=new Object();((Affected)e.affected).uuid=null;((Affected)e.affected).base=new Base();cache.clear(ID);
        var expectedIdentity0=IdentityStatus.fromJson("{\"discord_user_id\":\"fetched\"}");
        api.when(()->ProvinceSystemClient.getIdentityStatus(ID.toString())).thenReturn(expectedIdentity0);executor.execute(null,e);assertEquals("fetched",cache.get(ID).discordUserId);
        e.banned=null;e.affected=null;e.name="Ada";OfflinePlayer offline=mock(OfflinePlayer.class);when(offline.getUniqueId()).thenReturn(ID);bukkit.when(()->Bukkit.getOfflinePlayer("Ada")).thenReturn(offline);
        api.when(()->ProvinceSystemClient.postBanEvent(anyString(),anyString(),nullable(String.class),nullable(String.class),nullable(String.class),nullable(String.class),nullable(String.class))).thenReturn(MirrorResult.success(false));executor.execute(null,e);verify(logger).info(contains("no Discord link"));
        api.when(()->ProvinceSystemClient.postBanEvent(anyString(),anyString(),nullable(String.class),nullable(String.class),nullable(String.class),nullable(String.class),nullable(String.class))).thenReturn(MirrorResult.fail("down"));executor.execute(null,e);verify(logger).warning(contains("API failed"));
        when(offline.getUniqueId()).thenReturn(null);executor.execute(null,e);verify(logger).warning(contains("could not resolve UUID"));
        e.name=" ";executor.execute(null,e);verify(logger).fine(contains("missing player identity"));
        e.name=null;e.affected=new Affected();executor.execute(null,e);
    }
    @Test void durationsHandlePermanentPastAndDifferentTimeRepresentations() throws Exception {
        EventExecutor executor=register();var e=event();var entry=new Entry();e.banEntry=entry;entry.reason="reason";
        for(Object time:Arrays.asList(null,"unsupported",0L,Instant.now().minusSeconds(5),Instant.now().plusSeconds(60),Instant.now().plusSeconds(3700),Instant.now().plusSeconds(87000),Instant.now().plusSeconds(173000))){
            entry.expiration=time;executor.execute(null,e);
        }
        entry.timeout=Instant.now().plusSeconds(60).toEpochMilli();executor.execute(null,e);
        api.verify(()->ProvinceSystemClient.postBanEvent(eq("ban"),eq(ID.toString()),isNull(),eq("Ada"),eq("reason"),eq("1m"),isNull()),atLeastOnce());
        api.verify(()->ProvinceSystemClient.postBanEvent(eq("ban"),eq(ID.toString()),isNull(),eq("Ada"),eq("reason"),eq("1h"),isNull()));
        api.verify(()->ProvinceSystemClient.postBanEvent(eq("ban"),eq(ID.toString()),isNull(),eq("Ada"),eq("reason"),eq("1 day"),isNull()));
        api.verify(()->ProvinceSystemClient.postBanEvent(eq("ban"),eq(ID.toString()),isNull(),eq("Ada"),eq("reason"),eq("2 days"),isNull()));
        e.entry=new Object();executor.execute(null,e);
    }
    @Test void handlerLogsUnexpectedReflectionFailures() throws Exception {
        EventExecutor executor=register();var e=mock(BanStatusChangeEvent.class);when(e.getValue()).thenThrow(new IllegalStateException("bad"));executor.execute(null,e);
        verify(logger).log(eq(java.util.logging.Level.WARNING),contains("handler failed"),any(Exception.class));
    }
}
