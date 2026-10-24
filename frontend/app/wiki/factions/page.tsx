import Link from "next/link";
import { CommandTable, DataTable, SeeAlso, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { factionRanks, factionTitles, factionsCommands } from "../data/factions";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function FactionsPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Factions"
      intro={
        <>
          A faction is a realm on the map: its members, the provinces it claims, its money and its government. The
          leader runs most of it from <code className={code}>/faction menu</code>. Everything belongs to your current
          character.
        </>
      }
    >
      <WikiSectionHeading id="joining" intro="The easiest start is to join a faction that already exists.">
        Joining a faction
      </WikiSectionHeading>
      <p className={body}>
        Ask a faction&apos;s leader to invite you. Click Accept on the invite, or type{" "}
        <code className={code}>/faction join</code>. <code className={code}>/faction list</code> shows every faction.
        Each faction is split into{" "}
        <Link href="/wiki/guilds" className={link}>
          guilds
        </Link>
        : you start in the main guild, which the faction leader runs. The main guild holds up to 64 members.
      </p>

      <WikiSectionHeading id="founding" intro="You become the leader of a faction of one.">
        Founding a faction
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          <code className={code}>/faction create &lt;name&gt;</code> founds the faction.
        </li>
        <li>
          Stand in an unclaimed province and run <code className={code}>/faction setcapital &lt;name&gt;</code> to claim
          it as your capital.
        </li>
        <li>
          Stand in a chunk of your capital province and run <code className={code}>/faction setbank</code>. This is
          where members pay in and where everyone banks their own{" "}
          <Link href="/wiki/economy" className={link}>
            money
          </Link>
          .
        </li>
        <li>
          Invite players with <code className={code}>/faction invite &lt;player&gt;</code>.
        </li>
      </ol>

      <WikiSectionHeading
        id="land"
        intro="Land is claimed one province at a time, and prestige decides how much you can hold."
      >
        Land and prestige
      </WikiSectionHeading>
      <p className={body}>
        Stand in a province and run <code className={code}>/faction claim</code>. It must border your land, or lie
        across a single stretch of water from it. Sea provinces can&apos;t be claimed.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Each claim needs prestige: 50 for your second province, 100 for your third, and so on. Prestige isn&apos;t
          spent.
        </li>
        <li>
          Prestige comes mostly from members and the time they play, plus your wealth, trade, land, titles and subjects.
          Low stability and long inactivity lower it.
        </li>
        <li>If your prestige drops too low for the land you hold, other factions can claim your provinces from you.</li>
        <li>You can hold at most 5 provinces outside a title. Form a County to grow further.</li>
      </ul>

      <WikiSectionHeading id="titles" intro="The leader forms titles from the Tier menu.">
        Titles and ranks
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Title" }, { header: "Formed from" }, { header: "Prestige", align: "right" }]}
        rows={factionTitles.map((t) => [t.title, t.formedFrom, t.prestige])}
      />
      <p className={`mt-3 ${body}`}>
        Only your highest title adds prestige, on top of 10 for each province. You can&apos;t hold more Counties than
        you have members. Titles that already exist on the map can be claimed from the Titles menu once you hold enough
        of their provinces. How much depends on your faction&apos;s rank:
      </p>
      <DataTable
        columns={[
          { header: "Rank" },
          { header: "Prestige", align: "right" },
          { header: "Provinces needed to claim a title", align: "right" },
        ]}
        rows={factionRanks.map((r) => [r.rank, r.prestige, r.share])}
      />
      <p className={`mt-3 ${body}`}>
        The higher ranks also need a share of the strongest faction&apos;s prestige, so they get harder as the top
        factions grow.
      </p>

      <WikiSectionHeading id="government" intro="Government, laws, council and elections are all in /faction menu.">
        Government and taxes
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Laws set the government type, how the leader is chosen, the council, taxes, the military, vassals, the economy
          and the borders. Changing a law costs administrative power and locks that law for a few days.
        </li>
        <li>
          When the leader is elected, members vote at a <WikiItemLink name="Voting Booth" /> during an election. Only
          the faction leader can set up a booth.
        </li>
        <li>
          Taxes take a share of what members and guilds earn. Money is settled once a day, and{" "}
          <code className={code}>/ledger</code> shows your own daily earnings, taxes and upkeep.
        </li>
      </ul>

      <p className={body}>
        To hold a council session, the leader picks a Lantern. At least 75% of the council must be online. When
        elections are allowed, sign up in the Government menu before voting begins. Each guild may put forward one
        candidate for leader and one for council. Leaders of other guilds cannot stand for faction leader. An election
        starts on a Monday, at least 21 days after the previous election ended, and only if someone has signed up.
        Voting lasts 7 days. Council elections follow the same cycle when the laws allow them.
      </p>
      <p className={`mt-3 ${body}`}>
        Government shows whether the ruler is Legitimate, Contested or Illegitimate. Weak support and an unbalanced
        economy lower stability. Low stability reduces administrative power, tax income and prestige, raises upkeep, and
        makes titles harder to claim. A collapsing state cannot wage war or form titles. The Weak State penalty applies
        when the main guild has too few branch levels compared with the largest other guild, depending on the government
        law. Repression and Favouring laws let the government penalise or support chosen guilds and subjects, changing
        their trade and their support for the government.
      </p>

      <WikiSectionHeading id="diplomacy" intro="The leader sets relations with other factions from the Diplomacy menu.">
        Diplomacy
      </WikiSectionHeading>
      <p className={body}>
        Each faction has an opinion of every other, which slowly moves toward what your relations call for. An alliance
        needs both sides at 40 or more, a rivalry -10 or less, and declaring war needs -50 or less and a Hostile
        attitude. You can also sign trade agreements and non-aggression pacts, place embargoes, and take smaller
        factions as subjects. Agreements that need both sides are answered by the other leader with{" "}
        <code className={code}>/faction accept</code> while online.
      </p>

      <p className={`mt-3 ${body}`}>
        Choose Friendly, Neutral, Unfriendly or Hostile to move opinion over time. Diplomatic capacity limits the
        relations you can maintain. An ally can call you to war. Declining costs stability; an unanswered call expires
        after 5 minutes without counting as a decline.
      </p>
      <DataTable
        columns={[{ header: "Relation" }, { header: "What it means" }]}
        rows={[
          ["Subject", "A realm under an overlord, contributing taxes and levies."],
          [
            "Integrated Subject",
            "A closer subject with heavier taxes and more levies, using less diplomatic capacity.",
          ],
          ["March", "A military subject with lighter taxes and cheaper troops. At most one."],
          ["Mercantile", "A trading subject with heavier taxes, faster resource work and fewer levies."],
          ["Palatinate", "A privileged subject that helps diplomacy, prestige and title claims. At most one."],
          ["Tributary / Suzerain", "The tributary pays tribute to its suzerain."],
          ["Unequal Treaty", "A trade agreement that gives one side better trade access than the other."],
        ]}
      />

      <WikiSectionHeading id="movements" intro="Open Government in /faction menu to choose a cause and rally support.">
        Movements and civil war
      </WikiSectionHeading>
      <p className={body}>
        Main-guild members, other guild leaders and subject leaders can start movements when they cannot put the
        proposal through government. A guild in a faction with only one province cannot start or join one. Causes
        include Change Leader, Nationhood for guilds, Independence for guilds or subjects, Snap Elections, Dissolve,
        White Peace and Surrender. A qualifying subject can choose Usurp to take its overlord&apos;s highest title and
        become the overlord instead. Choose a cause that applies to your group, then invite support. Foreign factions
        can back a movement too.
      </p>
      <p className={`mt-3 ${body}`}>
        Once ready, the movement leader sends its demands to the faction leader. Accepting applies them. Refusing starts
        a civil war, with the movement and its backers fighting the government.
      </p>

      <WikiSectionHeading id="inactivity">Inactivity</WikiSectionHeading>
      <p className={body}>
        If every member stays offline for 3 weeks, the faction slowly loses prestige. As it loses the prestige needed to
        hold its land, it loses provinces too, with the capital last. Inactive guilds keep their upgrade levels, but the
        output from those upgrades fades while they remain inactive.
      </p>

      <WikiSectionHeading
        id="spymaster"
        intro="Each faction has a Spymaster, who hides its army and spies on everyone else's."
      >
        Spymaster
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          The leader appoints one with <code className={code}>/faction spymaster &lt;player&gt;</code>. While nobody is
          appointed, the leader holds the office. A new Spymaster starts out weak and reaches full strength after a
          week, and the leader must wait 2 days before appointing someone else, unless the Spymaster&apos;s character
          dies.
        </li>
        <li>
          Your Spymaster hides your military from other factions: your regiments, your faction&apos;s vehicles and the
          military lines of your accounts. Everything else, such as members, money, laws, government, installations and
          offices, is open to everyone.
        </li>
        <li>
          Each day your Spymaster gathers a report on every other faction&apos;s military. It can be a botched report,
          rumours, or broad, reliable or detailed estimates, and the better it is, the closer its numbers. How good it
          is depends on both factions&apos; Spymasters. Overlords find it easier to spy on their subjects.
        </li>
        <li>
          The Spymaster can open up your own military to your overlord, your subjects or your allies, so they see it
          exactly up to the report quality you choose. Set it with{" "}
          <code className={code}>/faction spymaster share</code> or in the Spymaster&apos;s office in{" "}
          <code className={code}>/faction espionage</code>.
        </li>
      </ul>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionsCommands.commands} />

      <SeeAlso hrefs={["/wiki/guilds", "/wiki/war", "/wiki/economy", "/wiki/commands"]} />
    </WikiPage>
  );
}
