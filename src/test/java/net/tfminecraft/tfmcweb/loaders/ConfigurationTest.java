package net.tfminecraft.tfmcweb.loaders;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.nio.file.*;
import java.util.*;
import net.tfminecraft.tfmcweb.*;
import org.bukkit.configuration.file.YamlConfiguration;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;

class ConfigurationTest {
    @TempDir Path temp;
    TestState state;
    @BeforeEach void setup() throws Exception { state=new TestState(); }
    @AfterEach void cleanup() throws Exception { state.close(); }
    void load(String yaml) throws Exception {
        Path file=temp.resolve("config.yml");Files.writeString(file,yaml);new ConfigLoader().load(file.toFile());
    }
    @Test void defaultsAndMissingOrInvalidFiles() throws Exception {
        load("");assertEquals("",Cache.apiBaseUrl);assertEquals("",Cache.pluginKey);assertEquals("main",Cache.realmId);
        assertFalse(Cache.patreonEnabled);assertFalse(Cache.patreonApplyRanks);assertEquals(60,Cache.patreonPollSeconds);
        assertEquals(30,Cache.patreonReconcileMinutes);assertEquals(Map.of("noble","noble","gilded","gilded","ascended","ascended"),Cache.patreonGroups);
        assertEquals(List.of("skin","drink","profile","skin_staff"),Cache.tokenEnabledScopes);
        assertEquals(List.of("skin","drink"),Cache.tokenCooldownSharedScopes);assertEquals(-1,Cache.tokenCooldownDefaultDays);
        assertEquals(3,Cache.rpcMetaDefaults.get("max-alive-characters"));assertTrue(Cache.rpcMetaGroups.isEmpty());
        assertTrue(Cache.banMirrorEnabled);assertEquals(30,Cache.banMirrorPollSeconds);
        load("ban-mirror:\n  enabled: false\n  poll-seconds: 0\n");assertFalse(Cache.banMirrorEnabled);assertEquals(30,Cache.banMirrorPollSeconds);
        load("ban-mirror:\n  poll-seconds: 5\n");assertTrue(Cache.banMirrorEnabled);assertEquals(5,Cache.banMirrorPollSeconds);
        Cache.apiBaseUrl="preserved";Cache.patreonEnabled=true;new ConfigLoader().load(temp.resolve("missing.yml").toFile());
        assertEquals("preserved",Cache.apiBaseUrl);assertTrue(Cache.patreonEnabled);
        load("bad: [");assertEquals("preserved",Cache.apiBaseUrl);assertTrue(Cache.patreonEnabled);
        load("realm:\n  id: '  '\ntokens:\n  enabled-scopes: []\n");assertEquals("main",Cache.realmId);assertTrue(Cache.tokenEnabledScopes.isEmpty());
    }
    @Test void normalizesApiTokensAndCooldownRows() throws Exception {
        load("""
            api:
              base-url: ' http://localhost/// '
              plugin-key: ' key '
            realm:
              id: ' DEV '
            tokens:
              enabled-scopes: [null, ' ', SKIN, skin, drink, profile, skin_staff, bogus]
            token-cooldowns:
              shared-scopes: [null, ' ', ' SKIN ']
              defaults:
                cooldown-days: 3
              groups:
                - nonsense
                - {permission: ' '}
                - {permission: one, cooldown-days: 5}
                - {permission: two, cooldown-days: '7'}
                - {permission: three, cooldown-days: bad}
            """);
        assertEquals("http://localhost",Cache.apiBaseUrl);assertEquals("key",Cache.pluginKey);assertEquals("dev",Cache.realmId);
        assertEquals(4,Cache.tokenEnabledScopes.size());assertEquals(List.of("skin"),Cache.tokenCooldownSharedScopes);
        assertEquals(3,Cache.tokenCooldownDefaultDays);assertEquals(3,Cache.tokenCooldownGroups.size());
        assertEquals(List.of(5,7,-1),Cache.tokenCooldownGroups.stream().map(g->g.cooldownDays).toList());
        assertFalse(Cache.isTokenScopeEnabled(null));assertFalse(Cache.isTokenScopeEnabled(" "));assertTrue(Cache.isTokenScopeEnabled(" SKIN "));assertFalse(Cache.isTokenScopeEnabled("no"));
        Cache.tokenEnabledScopes=Arrays.asList(null," DRINK ");assertTrue(Cache.isTokenScopeEnabled("drink"));
        assertFalse(Cache.isSharedMintScope(null));assertFalse(Cache.isSharedMintScope(" "));assertFalse(Cache.isSharedMintScope("profile"));assertTrue(Cache.isSharedMintScope("SKIN"));
        Cache.tokenCooldownSharedScopes=Arrays.asList(null," DRINK ");assertTrue(Cache.isSharedMintScope("drink"));
        assertEquals("",new Cache.TokenCooldownGroup(null,0).permission);assertTrue(Cache.newIntMap().isEmpty());
    }
    @Test void mapsAndConfigurationSectionsLoadAllLadders() {
        YamlConfiguration config=new YamlConfiguration();
        config.set("player-meta.sync-permissions",Arrays.asList(null," "," node ",123));
        var row=new HashMap<String,Object>();row.put("permission","rank");row.put("tier","2");
        row.put("name-colour-stops",3);row.put("max-alive-characters","bad");row.put("wardrobe-skin-slots",null);
        row.put("max-3d-pair-bytes","40000");row.put("skin-token-cooldown-days",2);
        row.put("skin-kinds",Arrays.asList(null," "," BOOK "));row.put("allow-armor-3d-helmet","yes");
        row.put("allow-drink-texture",1);row.put("allow-drink-message",false);
        var section=new YamlConfiguration();row.forEach(section::set);section.set("tier",1);
        section.set("name-colour-stops",7);section.set("allow-armor-3d-helmet",true);section.set("allow-drink-texture",true);section.set("allow-drink-message",true);
        for(String ladder:List.of("rpc","skins","drinks")){
            config.set("player-meta."+ladder+".groups",Arrays.asList(null,"bad",Map.of(),row,section));
            config.set("player-meta."+ladder+".defaults.name-colour-stops",2);
        }
        config.set("player-meta.skins.defaults.skin-kinds",List.of(" ITEM "));
        config.set("player-meta.skins.defaults.allow-armor-3d-helmet",true);
        config.set("player-meta.drinks.defaults.allow-drink-texture",true);
        config.set("player-meta.drinks.defaults.allow-drink-message",true);
        PlayerMetaConfigLoader.load(config);
        assertEquals(List.of("node","123"),Cache.playerMetaSyncPermissions);
        assertEquals(List.of(1,2),Cache.rpcMetaGroups.stream().map(g->g.getTier()).toList());
        assertEquals(List.of("book"),Cache.skinsMetaGroups.get(1).getSkinKinds());assertTrue(Cache.skinsMetaGroups.get(1).getAllowArmor3dHelmet(false));
        assertTrue(Cache.drinksMetaGroups.get(1).getAllowDrinkTexture(false));assertFalse(Cache.drinksMetaGroups.get(1).getAllowDrinkMessage(true));
        assertEquals(0,Cache.rpcMetaGroups.get(1).getIntPerk("max-alive-characters",9));
    }
    @Test void booleanVariantsAndNonListKindsFallBackSafely() {
        for(Object value:Arrays.asList(null,true,false,1,0,"true","yes","on","1","false","no","off","0","bad")) {
            YamlConfiguration config=new YamlConfiguration();var row=new HashMap<String,Object>();row.put("permission","rank");row.put("tier","bad");
            row.put("skin-kinds","not-list");row.put("allow-armor-3d-helmet",value);row.put("allow-drink-texture",value);row.put("allow-drink-message",value);
            config.set("player-meta.skins.groups",List.of(row));config.set("player-meta.drinks.groups",List.of(row));PlayerMetaConfigLoader.load(config);
            boolean expected=Arrays.asList(true,1,"true","yes","on","1").contains(value);
            assertEquals(expected,Cache.skinsMetaGroups.getFirst().getAllowArmor3dHelmet(false));assertEquals(expected,Cache.drinksMetaGroups.getFirst().getAllowDrinkTexture(false));
            assertTrue(Cache.skinsMetaGroups.getFirst().getSkinKinds().isEmpty());assertEquals(0,Cache.skinsMetaGroups.getFirst().getTier());
        }
    }
    @Test void realmOverlaysDefaultsAndReplacesGroupLists() {
        for(String realm:Arrays.asList(null," "," MAIN ")){
            Cache.realmId=realm;YamlConfiguration config=new YamlConfiguration();
            for(String ladder:List.of("rpc","skins","drinks")){
                config.set("player-meta."+ladder+".defaults.name-colour-stops",1);
                config.set("player-meta.by-realm.main."+ladder+".defaults.name-colour-stops",4);
                config.set("player-meta.by-realm.main."+ladder+".groups",List.of(Map.of("permission","override")));
            }
            config.set("player-meta.by-realm.main.skins.defaults.skin-kinds",List.of("book"));
            config.set("player-meta.by-realm.main.skins.defaults.allow-armor-3d-helmet",true);
            config.set("player-meta.by-realm.main.drinks.defaults.allow-drink-texture",true);
            config.set("player-meta.by-realm.main.drinks.defaults.allow-drink-message",true);
            PlayerMetaConfigLoader.load(config);assertEquals(4,Cache.rpcMetaDefaults.get("name-colour-stops"));assertEquals(4,Cache.skinsMetaDefaults.get("name-colour-stops"));
            assertEquals(4,Cache.drinksMetaDefaults.get("name-colour-stops"));assertEquals("override",Cache.rpcMetaGroups.getFirst().getPermission());
            assertEquals(List.of("book"),Cache.skinsMetaDefaultKinds);assertTrue(Cache.skinsMetaDefaultAllowArmor3dHelmet&&Cache.drinksMetaDefaultAllowTexture&&Cache.drinksMetaDefaultAllowMessage);
        }
    }
    @Test void partialRealmSkinDefaultsPreserveInheritedKinds() {
        Cache.realmId="dev";YamlConfiguration config=new YamlConfiguration();
        config.set("player-meta.skins.defaults.skin-kinds",List.of("item","book"));
        config.set("player-meta.by-realm.dev.skins.defaults.name-colour-stops",3);
        PlayerMetaConfigLoader.load(config);assertEquals(List.of("item","book"),Cache.skinsMetaDefaultKinds);
    }
    @Test void patreonGroupsIntervalsAndLocale() throws Exception {
        Locale.setDefault(Locale.forLanguageTag("tr-TR"));
        load("""
            patreon:
              enabled: true
              apply-ranks: true
              poll-seconds: 0
              reconcile-minutes: -4
              groups:
                NOBLE: ""
                gilded: " "
                ascended: "  High "
                legacy: legacy
                VIP: vip
            """);
        assertTrue(Cache.patreonEnabled && Cache.patreonApplyRanks);
        assertEquals(60, Cache.patreonPollSeconds); assertEquals(30, Cache.patreonReconcileMinutes);
        assertEquals(Map.of("ascended", "High"), Cache.patreonGroups);
        load("""
            patreon:
              poll-seconds: 15
              reconcile-minutes: 2
              groups:
                noble: " donator "
            """);
        assertEquals(15, Cache.patreonPollSeconds); assertEquals(2, Cache.patreonReconcileMinutes);
        assertEquals("donator", Cache.patreonGroups.get("noble"));
        assertEquals("gilded", Cache.patreonGroups.get("gilded"));
        assertEquals("ascended", Cache.patreonGroups.get("ascended"));
    }
    @Test void cooldownConfigurationSectionsAreSupported() throws Exception {
        YamlConfiguration source=new YamlConfiguration();var row=new YamlConfiguration();row.set("permission","rank");row.set("cooldown-days",4);
        source.set("token-cooldowns.groups",List.of(row));
        try(var construction=mockConstruction(YamlConfiguration.class,(mock,context)->{
            when(mock.getString(anyString(),anyString())).thenAnswer(call->source.getString(call.getArgument(0),call.getArgument(1)));
            when(mock.getList(anyString())).thenAnswer(call->source.getList(call.getArgument(0)));
            when(mock.getInt(anyString(),anyInt())).thenAnswer(call->source.getInt(call.getArgument(0),call.getArgument(1)));
        })){
            new ConfigLoader().load(temp.resolve("unused.yml").toFile());assertEquals(4,Cache.tokenCooldownGroups.getFirst().cooldownDays);
        }
    }
}
