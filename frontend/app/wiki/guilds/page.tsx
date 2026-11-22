import Link from "next/link";
import { CommandTable, DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { guildsCommands, installations } from "../data/factions";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";
const subheading = "mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--tfmc-mist)]";

export default function GuildsPage() {
  return (
    <WikiPage
      lastModified="2026-11-21"
      title="Guilds & Trade"
      intro={
        <>
          Guilds are the trading houses inside a{" "}
          <Link href="/wiki/factions" className={link}>
            faction
          </Link>
          . They earn its trade income, own its resource nodes and use its{" "}
          <a href="#installations" className={link}>
            installations
          </a>
          .
        </>
      }
    >
      <WikiSectionHeading id="guilds" intro="Every faction member belongs to exactly 1 guild.">
        Guilds
      </WikiSectionHeading>
      <p className={body}>
        Every faction has a main guild, run by the faction leader. You are in it until you found or join another.
      </p>
      <p className={`mt-3 ${body}`}>
        A guild has its own leader, banner, capital and bank. Any member of the main guild except the faction leader can
        found one, and it is free. If you are in another guild, leave it first with{" "}
        <code className={code}>/guild leave</code>. To found one:
      </p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Run <code className={code}>/guild create &lt;name&gt;</code>. You become the guild&apos;s leader.
        </li>
        <li>
          Set its capital with <code className={code}>/guild setcapital [name]</code>.
        </li>
        <li>
          Set its bank inside the capital with <code className={code}>/guild setbank</code>.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Any member can pay into the guild bank. Only the guild leader can take money out.
      </p>
      <p className={`mt-3 ${body}`}>
        A guild can run 1{" "}
        <Link href="/wiki/dowsing" className={link}>
          resource node
        </Link>
        , paid for from the guild bank.
      </p>
      <p className={`mt-3 ${body}`}>
        Branches are a guild&apos;s buildings. They are bought level by level in{" "}
        <code className={code}>/guild menu</code> and paid from the guild bank.
      </p>
      <DataTable
        columns={[{ header: "Branch" }, { header: "Who builds it" }, { header: "What it does" }]}
        rows={[
          [
            "Guild Hall",
            "Every guild except the main guild",
            "Gives the guild its trade power, the trading strength that decides its trade income",
          ],
          [
            "Bureaucracy",
            "The main guild, in place of Guild Halls",
            <>
              Gives{" "}
              <Link href="/wiki/factions" className={link}>
                administrative power and diplomatic capacity
              </Link>{" "}
              and a little trade power and production
            </>,
          ],
          ["Workshop", "Every guild", "Raises production"],
          ["Storehouse", "Every guild", "Carries trade further"],
          ["Counting House", "Every guild", "Lowers trade upkeep"],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        A guild&apos;s branch levels are all its levels added together. The{" "}
        <Link href="/wiki/factions#government" className={link}>
          Weak State
        </Link>{" "}
        penalty uses this number.
      </p>

      <WikiSectionHeading id="money">Guild money and upgrades</WikiSectionHeading>
      <p className={body}>
        In <code className={code}>/guild menu</code> the guild leader sets dividends, the percentage of the guild&apos;s
        income paid out to its members. Only members who were already in the guild at the previous day&apos;s payout get
        a share. The main guild can&apos;t pay dividends.
      </p>
      <p className={`mt-3 ${body}`}>
        Daily donations to your faction are set in the same menu and cost an extra 10% fee.
      </p>
      <p className={`mt-3 ${body}`}>
        Branch prices start at 100 d and each level costs more than the last. Removing a level gives back part of its
        price. Check the price in the menu before you buy or remove one.
      </p>
      <p className={`mt-3 ${body}`}>
        Every guild has 1{" "}
        <Link href="/wiki/card-games#blackjack" className={link}>
          Blackjack
        </Link>{" "}
        table. Each level of the Auto Dealer Tables upgrade adds another.
      </p>
      <p className={`mt-3 ${body}`}>
        The main guild can also upgrade Max Administrative Power, Max Diplomatic Capacity and Administrative Power Gain.
      </p>

      <h3 className={subheading}>Loans</h3>
      <p className={`mt-3 ${body}`}>If you lead a guild, you can lend money to another guild:</p>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Hold a Book and Quill, open <code className={code}>/guild menu</code>, then Loans, and click{" "}
          <strong>Issue New Loan</strong>. The book becomes a loan form.
        </li>
        <li>
          Fill in Amount, Duration (1 to 365 days), Interest (% per week), Daily Payments (Yes or No) and Overdue Fee
          (%), then sign the book. The signed book shows the estimated cost. Sign it again to make the{" "}
          <strong>Loan Agreement</strong>.
        </li>
        <li>
          Give the Loan Agreement to the borrowing guild&apos;s leader, who signs it. The money then moves from your
          guild bank to theirs.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Only a guild leader can sign. Both guilds need a bank, and yours must hold the amount. Each stage of the book
        expires after 1 day, and an agreement that is out of date or has been edited is refused.
      </p>
      <p className={`mt-3 ${body}`}>Once the loan is running:</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Interest is charged every day, at a seventh of the weekly rate.</li>
        <li>
          With Daily Payments on, a daily share of the debt plus interest is paid automatically from the borrower&apos;s
          bank. With it off, unpaid interest is added to the debt.
        </li>
        <li>The borrower can pay back part or all of the debt at any time, and can turn Daily Payments on or off.</li>
        <li>
          After the due date, the whole remaining debt is due at once. The agreed Overdue Fee percentage of it is added
          every day until it is paid.
        </li>
        <li>
          The borrower can click <strong>Default Loan</strong> to say the guild will not pay. That stops the automatic
          payments. <strong>Resume Payments</strong> undoes it, but the credit score that was lost does not come back.
        </li>
        <li>
          Each guild has a credit score, shown in its loans menu and on loan details. Paying off a loan raises it.
          Overdue days and <strong>Default Loan</strong> lower it.
        </li>
        <li>
          The lender can pause interest or click <strong>Forgive Loan</strong>. Once the loan is fully repaid, that
          button reads <strong>Settle Loan</strong>.
        </li>
      </ul>

      <WikiSectionHeading id="leader-actions">Leader actions</WikiSectionHeading>
      <p className={body}>
        These buttons are in <code className={code}>/guild menu</code>:
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Relocate</strong> (guild leader) moves the guild capital. It costs at least 100 d from the guild bank.
          Moving into another faction&apos;s land needs that faction&apos;s leader to accept, and the guild then joins
          that faction.
        </li>
        <li>
          <strong>Elevate</strong> (faction leader) turns a guild into a subject faction, an{" "}
          <Link href="/wiki/factions#diplomacy" className={link}>
            Integrated Subject
          </Link>
          , that holds the guild&apos;s capital province. It costs administrative power.
        </li>
        <li>
          <strong>Evict</strong> (faction leader) turns a guild into a faction with no land. It costs more
          administrative power than Elevate and lowers your faction&apos;s stability for a while.
        </li>
        <li>
          <strong>Favour</strong> and <strong>Repress</strong> raise or lower a guild&apos;s trade power. They appear
          when the faction&apos;s{" "}
          <Link href="/wiki/factions#government" className={link}>
            laws
          </Link>{" "}
          allow them.
        </li>
      </ul>

      <WikiSectionHeading
        id="installations"
        intro="Forts, ports, airports and train stations, built by the faction leader in a land province the faction owns."
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
          nothing to start.
        </li>
        <li>Only 1 build can run at a time, and each province takes 1 of each type.</li>
        <li>A port must be within 20 blocks of the sea or a river.</li>
        <li>
          Upkeep comes from the faction bank. If it can&apos;t be paid, the installation loses a level. An installation
          at level 1 is removed.
        </li>
        <li>
          Train stations can be upgraded. Level 2 costs 35 d a day, takes 3 days to build and holds 3 fixed guns. Level
          3 costs 100 d a day, takes 5 days and holds 4.
        </li>
        <li>
          Trains can&apos;t be berthed (parked at an installation as a faction vehicle), because no installation has a
          train slot. Put a train in the faction pool with <code className={code}>/faction vehicle transfer pool</code>{" "}
          (see{" "}
          <Link href="/wiki/vehicles#faction-vehicles" className={link}>
            faction vehicles
          </Link>
          ).
        </li>
      </ul>

      <WikiSectionHeading
        id="trade"
        intro="A realm is a faction with its subjects and their subjects, all under the same top overlord."
      >
        Trade between realms
      </WikiSectionHeading>
      <p className={body}>
        Trade can join a sea lane or railway at any province along it, and is strongest when it gets on and off at an
        installation.
      </p>
      <p className={`mt-3 ${body}`}>
        Guilds have full use of every installation in their own realm. Abroad, a guild gets whichever is better: what a
        trade agreement or unequal treaty gives, or what the two realms&apos; economy laws allow.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          A{" "}
          <Link href="/wiki/factions#diplomacy" className={link}>
            trade agreement
          </Link>{" "}
          gives full use both ways.
        </li>
        <li>An unequal treaty gives the stronger side full use and the weaker side half.</li>
        <li>An embargo from either side, or war, closes the installations completely.</li>
      </ul>
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
        &quot;Open to foreign guilds&quot; is how open a faction&apos;s installations are to foreign guilds. &quot;Own
        guilds abroad&quot; is added to that figure, or taken from it, when your own guilds use installations abroad, up
        to 100% in all. A guild from a Mercantilism faction visiting a Free Trade faction gets 50% plus 20%, so 70%.
      </p>
      <p className={`mt-3 ${body}`}>
        An Isolationism faction stays closed whatever the visitor&apos;s law. Only a trade agreement opens it. A subject
        uses its overlord&apos;s economy law.
      </p>
      <p className={`mt-3 ${body}`}>
        Through a tax proposal in{" "}
        <Link href="/wiki/factions#government" className={link}>
          Government
        </Link>
        , a faction can set tariffs: up to 25% under Mercantilism, 50% under Protectionism and 75% under Isolationism.
        Free Trade and Decentralized allow none.
      </p>

      <WikiSectionHeading id="vehicles" intro="Vehicles cost upkeep every day.">
        Vehicles and upkeep
      </WikiSectionHeading>
      <p className={body}>
        A personal vehicle&apos;s upkeep comes from its owner&apos;s{" "}
        <Link href="/wiki/economy#accounts" className={link}>
          personal bank
        </Link>
        . You get a warning beforehand if the bank is short.
      </p>
      <p className={`mt-3 ${body}`}>
        You can own 3 personal vehicles per account, counted across all your characters, and only 1 of most types. Train
        parts don&apos;t count. The full limits are on{" "}
        <Link href="/wiki/vehicles#limits" className={link}>
          Vehicles
        </Link>
        .
      </p>
      <p className={`mt-3 ${body}`}>
        An unpaid vehicle loses condition every hour until it is nearly wrecked, and it can&apos;t be repaired until the
        upkeep is paid. Anyone can pay 1 day of an unpaid vehicle&apos;s upkeep from their own bank: run{" "}
        <code className={code}>/faction vehicle maintenance pay bank</code>, then right-click the vehicle. Faction
        leaders can leave out <code className={code}>bank</code> to pay from their pouch.
      </p>
      <p className={`mt-3 ${body}`}>
        A faction can pay a member&apos;s vehicle upkeep from the main guild bank, and a guild can pay it from its own
        bank. That makes it an{" "}
        <Link href="/wiki/vehicles#upkeep-only" className={link}>
          upkeep-only
        </Link>{" "}
        vehicle, which can&apos;t be used in battles.
      </p>
      <p className={`mt-3 ${body}`}>
        Ownership, the faction pool and berthing are under{" "}
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
