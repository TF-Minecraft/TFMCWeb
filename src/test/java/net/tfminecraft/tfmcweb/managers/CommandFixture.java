package net.tfminecraft.tfmcweb.managers;

import static org.mockito.Mockito.*;
import java.util.*;
import java.util.logging.Logger;
import net.tfminecraft.tfmcweb.*;
import net.tfminecraft.tfmcweb.api.ProvinceSystemClient;
import net.tfminecraft.tfmcweb.cache.LinkCache;
import net.tfminecraft.tfmcweb.gate.DiscordGateService;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitScheduler;
import org.mockito.MockedStatic;

final class CommandFixture implements AutoCloseable {
    final TestState state=new TestState();
    final JavaPlugin plugin=mock(JavaPlugin.class);
    final Player player=mock(Player.class);
    final CommandSender console=mock(CommandSender.class);
    final UUID id=UUID.randomUUID();
    final LinkCache cache=new LinkCache();
    final DiscordGateService gate=mock(DiscordGateService.class);
    final BukkitScheduler scheduler=mock(BukkitScheduler.class);
    final Logger logger=mock(Logger.class);
    final MockedStatic<Bukkit> bukkit=mockStatic(Bukkit.class);
    final MockedStatic<ProvinceSystemClient> api=mockStatic(ProvinceSystemClient.class, call -> call.getMethod().getName().equals("jsonString") ? call.callRealMethod() : org.mockito.Answers.RETURNS_DEFAULTS.answer(call));
    final List<String> messages=new ArrayList<>();
    CommandFixture() throws Exception {
        when(plugin.getLogger()).thenReturn(logger);when(player.getUniqueId()).thenReturn(id);when(player.getName()).thenReturn("Ada");
        when(player.getPlayer()).thenReturn(player);when(player.isOnline()).thenReturn(true);when(player.hasPlayedBefore()).thenReturn(true);when(console.getName()).thenReturn("Console");
        doAnswer(c->{messages.add(c.getArgument(0));return null;}).when(player).sendMessage(anyString());
        doAnswer(c->{messages.add(c.getArgument(0));return null;}).when(console).sendMessage(anyString());
        bukkit.when(Bukkit::getScheduler).thenReturn(scheduler);bukkit.when(()->Bukkit.getPlayerExact("Ada")).thenReturn(player);
        bukkit.when(()->Bukkit.getPlayer(id)).thenReturn(player);bukkit.when(Bukkit::getOnlinePlayers).thenReturn(List.of(player));
        doAnswer(c->{c.getArgument(1,Runnable.class).run();return null;}).when(scheduler).runTask(eq(plugin),any(Runnable.class));
        doAnswer(c->{c.getArgument(1,Runnable.class).run();return null;}).when(scheduler).runTaskAsynchronously(eq(plugin),any(Runnable.class));
    }
    void permissions(CommandSender sender,boolean allowed){when(sender.hasPermission(anyString())).thenReturn(allowed);}
    boolean contains(String text){return messages.stream().anyMatch(s->s.contains(text));}
    @Override public void close() throws Exception {api.close();bukkit.close();state.close();}
}
