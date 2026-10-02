package net.tfminecraft.tfmcweb;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.nio.file.*;
import java.util.Comparator;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient;
import net.tfminecraft.tfmcweb.entitlements.PlayerMetaSyncService;
import net.tfminecraft.tfmcweb.gate.DiscordGateService;
import net.tfminecraft.tfmcweb.managers.PluginNoticePoller;
import org.bukkit.Bukkit;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.PluginManager;
import org.junit.jupiter.api.*;
import org.mockbukkit.mockbukkit.MockBukkit;
import org.mockbukkit.mockbukkit.ServerMock;

class TFMCWebLifecycleTest {
    TestState state;ServerMock server;
    @BeforeEach void setup() throws Exception {state=new TestState();server=MockBukkit.mock();}
    @AfterEach void cleanup() throws Exception {MockBukkit.unmock();state.close();}
    @Test void enableRegistersCommandsAndReloadsConfigurationAndDisableStopsPoller() throws Exception {
        try(var pollers=mockConstruction(PluginNoticePoller.class);var sync=mockStatic(PlayerMetaSyncService.class)){
            TFMCWeb plugin=MockBukkit.load(TFMCWeb.class);assertSame(plugin,TFMCWeb.plugin);assertNotNull(plugin.getLinkCache());assertNotNull(plugin.getGateService());
            for(String name:new String[]{"linkdiscord","unlinkdiscord","web","token","warning"})assertNotNull(plugin.getCommand(name).getExecutor());
            assertNotNull(plugin.getCommand("web").getTabCompleter());assertNotNull(plugin.getCommand("token").getTabCompleter());
            verify(pollers.constructed().getFirst()).start();assertTrue(TFMCWeb.isPresent());
            Files.writeString(plugin.getDataFolder().toPath().resolve("config.yml"),"realm:\n  id: dev\n");plugin.reloadLocalConfig();assertEquals("dev",TFMCWeb.getRealmId());
            plugin.onDisable();verify(pollers.constructed().getFirst()).stop();
        }
    }
    @Test void enableCreatesMissingDataDirectoryAndLogsMissingCommands() throws Exception {
        try(var pollers=mockConstruction(PluginNoticePoller.class);var sync=mockStatic(PlayerMetaSyncService.class);var gates=mockConstruction(DiscordGateService.class,(mock,context)->when(mock.isRpcAvailable()).thenReturn(true))){
            TFMCWeb plugin=MockBukkit.load(TFMCWeb.class);TFMCWeb spy=spy(plugin);
            for(String name:new String[]{"linkdiscord","unlinkdiscord","web","token","warning"})doReturn(null).when(spy).getCommand(name);
            try(var paths=Files.walk(plugin.getDataFolder().toPath())){for(Path path:paths.sorted(Comparator.reverseOrder()).toList())Files.delete(path);}
            spy.onEnable();assertTrue(Files.isDirectory(plugin.getDataFolder().toPath()));assertTrue(Files.exists(plugin.getDataFolder().toPath().resolve("config.yml")));
            spy.onDisable();verify(pollers.constructed().getLast()).stop();
        }
    }
    @Test void presenceAndRealmDefaultsTolerateUnavailablePlugin() {
        PluginManager plugins=mock(PluginManager.class);Plugin plugin=mock(Plugin.class);
        try(var bukkit=mockStatic(Bukkit.class)){
            bukkit.when(Bukkit::getPluginManager).thenReturn(plugins);assertFalse(TFMCWeb.isPresent());
            when(plugins.getPlugin("TFMCWeb")).thenReturn(plugin);assertFalse(TFMCWeb.isPresent());when(plugin.isEnabled()).thenReturn(true);assertTrue(TFMCWeb.isPresent());
            Cache.realmId=null;assertEquals("main",TFMCWeb.getRealmId());Cache.realmId=" ";assertEquals("main",TFMCWeb.getRealmId());
        }
        TFMCWeb uninitialized=mock(TFMCWeb.class);doCallRealMethod().when(uninitialized).onDisable();uninitialized.onDisable();
    }
}
