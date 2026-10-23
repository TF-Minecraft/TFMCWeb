import Link from "next/link";
import { CommandTable, DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { guildsCommands, installations } from "../data/factions";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function GuildsPage() {
  return (
    <WikiPage
      lastModified="2026-10-23"
      title="Guilds & Trade"
      intro={
        <>
          Guilds are the trading houses inside a{" "}
          <Link href="/wiki/factions" className={link}>
            faction
          </Link>
          . They earn its trade income, own its resource nodes and use its installations.
        </>
      }
    >
      <WikiSectionHeading id="guilds" intro="Every faction member belongs to exactly one guild.">
        Guilds
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Every faction has a main guild, run by the faction leader. You are in it until you found or join another.
        </li>
        <li>
          Any member except the faction leader can found a guild with{" "}
          <code className={code}>/guild create &lt;name&gt;</code>. It is free, and you become its leader.
        </li>
        <li>
          A guild has its own leader, banner, capital and bank. Set the capital with{" "}
          <code className={code}>/guild setcapital</code>, then the bank inside it with{" "}
          <code className={code}>/guild setbank</code>. Any member can pay in; only the guild leader can take money out.
        </li>
        <li>
          From <code className={code}>/guild menu</code>, a guild builds up branches. Guild Halls make its trade power
          and only other guilds have them; the main guild has a Bureaucracy instead. Workshops raise production,
          Storehouses carry trade further, and Counting Houses lower trade upkeep.
        </li>
        <li>
          A guild can run one{" "}
          <Link href="/wiki/dowsing" className={link}>
            resource node
          </Link>
          , paid for from the guild bank.
        </li>
      </ul>

      <WikiSectionHeading
        id="installations"
        intro="Forts, ports, airports and train stations, built by the faction leader in an owned land province."
      >
        Installations
      </WikiSectionHeading>
      <DataTable
        columns={[
          { header: "Type" },
          { header: "Upkeep / day", align: "right" },
          { header: "Build time", align: "right" },
          { header: "Vehicle slots" },
        ]}
        rows={installations.map((i) => [i.type, i.upkeepPerDay, i.buildTime, i.slots])}
      />
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <code className={code}>/faction construct</code> starts building at once, with no confirmation, and costs
          nothing to start. Only one build can run at a time, and each province takes one of each type. A port must be
          within 20 blocks of the sea or a river.
        </li>
        <li>
          Upkeep comes from the faction bank. If it can&apos;t be paid, the installation loses a level, and one at level
          1 is removed.
        </li>
        <li>
          Train stations can be upgraded: level 2 costs 35 d a day (3-day build, 3 emplacements) and level 3 costs 100 d
          a day (5-day build, 4 emplacements). Trains can&apos;t be berthed anywhere.
        </li>
      </ul>

      <WikiSectionHeading
        id="trade"
        intro="Installations, and the sea lanes and railways between them, carry trade further."
      >
        Trade between realms
      </WikiSectionHeading>
      <p className={body}>
        Trade can join a sea lane or railway at any province along it, and is strongest getting on and off at an
        installation. Guilds can use every installation in their own realm. Abroad, they get the better of two things:
        what a trade agreement gives, or what the two realms&apos; economy laws allow. A trade agreement gives full use
        both ways. An unequal treaty gives the stronger side full use and the weaker side half. Embargo or war closes
        them completely.
      </p>
      <DataTable
        columns={[
          { header: "Economy law" },
          { header: "Open to foreign guilds", align: "right" },
          { header: "Own guilds abroad", align: "right" },
        ]}
        rows={[
          ["Free Trade", "50%", "+10%"],
          ["Decentralized", "35%", "None"],
          ["Mercantilism", "15%", "+20%"],
          ["Protectionism", "10%", "None"],
          ["Isolationism", "Closed", "-25%"],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        The host&apos;s law sets how open it is, and the guest&apos;s law adds to or takes from that, up to 100%. A
        closed host stays closed to the guest&apos;s law, but not to a trade agreement.
      </p>

      <WikiSectionHeading id="vehicles" intro="Vehicles cost a little upkeep every day.">
        Vehicles and upkeep
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Each account can own 3{" "}
          <Link href="/wiki/vehicles" className={link}>
            vehicles
          </Link>
          ; train cars don&apos;t count. Each one&apos;s daily upkeep comes from its owner&apos;s bank, not the pouch.
        </li>
        <li>
          An unpaid vehicle slowly loses health, though it never sinks or falls, and it can&apos;t be repaired. Pay a
          day with <code className={code}>/faction vehicle maintenance pay bank</code>, then right-click the vehicle.
        </li>
        <li>
          The faction leader can berth a vehicle at an installation or put it in the faction&apos;s pool, with its owner
          close by to accept. The faction bank then pays its upkeep.
        </li>
      </ul>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={guildsCommands.commands} />

      <SeeAlso hrefs={["/wiki/factions", "/wiki/war", "/wiki/dowsing", "/wiki/vehicles", "/wiki/commands"]} />
    </WikiPage>
  );
}
