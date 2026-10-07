# TFMC Web

> Connecting TF-Minecraft gameplay, website features, and Discord identity.

TFMC Web is the Minecraft-side bridge to the TF-Minecraft website services. It helps players connect their Discord account, obtain access codes for website features, and receive account updates in-game.

The same bridge connects selected moderation and roleplay events to the wider community services, keeping account identity and supported player benefits aligned across them.

## Features

- **Discord account linking** — players can request a linking code or unlink their Minecraft account.
- **Website feature codes** — issues scoped codes for skins, drinks, and player profiles, subject to access rules and cooldowns.
- **Account status updates** — processes website notices about linking and eligibility, including RPCharacters survival access checks.
- **Moderation connections** — sends player warnings, and bans, unbans and expired timed bans from the server ban list, to the linked services so the Discord Banned role follows the in-game ban.
- **Player benefit synchronization** — shares resolved player metadata and entitlements with ProvinceSystem.
- **Bird-mail notifications** — provides the connection for BirdMessenger arrival notifications to linked Discord accounts.
- **Staff-panel LuckPerms bridge** — publishes LuckPerms groups, tracks and player permissions to the website's staff panel, and applies the rank and permission changes staff queue there through LuckPerms.

These features rely on the corresponding TF-Minecraft services and gameplay integrations being available.

## LuckPerms bridge

The bridge is off by default and needs LuckPerms on the server:

```yaml
luckperms-bridge:
  publish: false        # send LuckPerms snapshots to this server's site
  apply: false          # also apply staff-queued changes (implies publish)
  poll-seconds: 3       # how often to fetch queued changes when applying
  snapshot-seconds: 30  # how often to publish a snapshot
```

LuckPerms storage is shared between servers, so set `apply: true` on exactly one
of them. A server that only publishes makes its site's panel read-only. Changes
are checked against live LuckPerms data, saved together or not at all, logged in
`/lp log`, and followed by a fresh snapshot. `/web status` shows the bridge state
and the age of the last snapshot.

## Documentation

[Project documentation](https://github.com/TF-Minecraft/Docs/blob/main/projects/TFMCWeb/README.md)

Technical documentation is maintained in [TF-Minecraft/Docs](https://github.com/TF-Minecraft/Docs).

## Tests and coverage

Run `mvn clean verify` with Java 21. The build runs the unit tests and enforces
100% executable runtime **line coverage** with JaCoCo, without production-class
exclusions. Instruction and branch coverage are reported separately.

The HTML report is `target/site/jacoco/index.html`; the machine-readable report is
`target/site/jacoco/jacoco.xml`. CI uploads these reports alongside test results.

## License

Copyright (c) 2026 TF-Minecraft contributors.

TF-Minecraft-authored material in this repository is licensed under the
[Artistic License 2.0](LICENSE). Third-party dependencies and bundled material
retain their own licenses.
