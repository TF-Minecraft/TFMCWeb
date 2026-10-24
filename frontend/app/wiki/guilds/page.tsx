import Link from "next/link";
import { CommandTable, DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { guildsCommands, installations } from "../data/factions";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function GuildsPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
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
          <code className={code}>/guild setcapital &lt;name&gt;</code>, then the bank inside it with{" "}
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

      <WikiSectionHeading id="money">Guild money and upgrades</WikiSectionHeading>
      <p className={body}>
        Open <code className={code}>/guild menu</code> to set dividends and daily donations. The leader chooses the
        percentage of income paid as dividends. Only members who belonged to the guild at the previous daily tick
        receive a share. The main guild cannot pay dividends. Daily donations to the realm cost an extra 10% fee.
      </p>
      <p className={`mt-3 ${body}`}>
        To issue a loan to another guild, hold a Book and Quill and use the loans menu. Fill in the amount, interest and
        repayment terms, then arrange the other leader&apos;s signature. Borrowers can make partial or full payments and
        toggle daily payments. Unpaid interest adds to the debt, and overdue fees may apply. Defaulting affects the
        guild&apos;s credit score. The lender can pause interest or forgive the loan.
      </p>
      <p className={`mt-3 ${body}`}>
        Branch upgrades are paid from the guild bank, starting at 100 d, and each level costs more than the last.
        Downgrading gives back part of the price. Check the menu&apos;s price before buying or removing a level. Every
        guild has one Blackjack table, and each level of Auto Dealer Tables adds another. The main guild can also
        upgrade its maximum administrative power, maximum diplomatic capacity and administrative power gain.
      </p>
      <WikiSectionHeading id="leader-actions">Leader actions</WikiSectionHeading>
      <p className={body}>
        In <code className={code}>/guild menu</code>, Relocate moves the guild capital for at least 100 d from its bank.
        Moving into another faction&apos;s land needs that faction leader&apos;s acceptance and moves the guild into
        that faction. The faction leader can Elevate a guild into a subject faction with its capital province, or Evict
        it into a landless faction. These actions cost administrative power. Favour and Repress are available when the
        faction&apos;s laws allow them.
      </p>

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

      <p className={`mt-3 ${body}`}>
        Through a tax proposal in Government, a faction can set tariffs under Mercantilism up to 25%, Protectionism up
        to 50%, or Isolationism up to 75%.
      </p>

      <WikiSectionHeading id="vehicles" intro="Vehicles cost a little upkeep every day.">
        Vehicles and upkeep
      </WikiSectionHeading>
      <p className={body}>
        Personal vehicles have limits per type and per account. Unpaid vehicles lose health every hour until nearly
        wrecked. Anyone can pay a day of an unpaid vehicle&apos;s upkeep from their own bank; faction leaders can use
        their pouch too. For ownership, faction pools and berthing, see{" "}
        <Link href="/wiki/vehicles#faction-vehicles" className={link}>
          faction vehicles
        </Link>
        .
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={guildsCommands.commands} />

      <SeeAlso hrefs={["/wiki/factions", "/wiki/war", "/wiki/dowsing", "/wiki/vehicles", "/wiki/commands"]} />
    </WikiPage>
  );
}
