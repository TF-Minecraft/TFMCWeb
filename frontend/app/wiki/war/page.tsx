import Link from "next/link";
import { Callout, CommandTable, DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { regiments, warCommands } from "../data/factions";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function WarPage() {
  return (
    <WikiPage
      lastModified="2026-11-12"
      title="War & Mercenaries"
      intro={
        <>
          Wars between{" "}
          <Link href="/wiki/factions" className={link}>
            factions
          </Link>{" "}
          are fought as scheduled battles, one evening at a time. You don&apos;t need to lead anything to take part:
          mark the days you can fight, then sign up for your side&apos;s warband on a battle day.
        </>
      }
    >
      <WikiSectionHeading id="declaring" intro="Only a faction leader can declare war, from the Diplomacy menu.">
        Declaring war
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Your faction&apos;s opinion of the target must be -50 or lower. Nobody from the target faction needs to be
          online.
        </li>
        <li>No truce can stand between you. A truce lasts 10 days after a war ends.</li>
        <li>You need regiments that can attack, and a war code that staff create for you in Discord.</li>
        <li>
          Choose what you are fighting for in the Declare War menu, such as taking land, making them your subject, or
          pillaging. Confirming asks you to type the war code in chat. Defenders can set a counter-demand.
        </li>
      </ul>

      <WikiSectionHeading id="calls" intro="Once war is declared, each side can call its allies to arms.">
        Calls to arms
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Only factions that were allies of a side when the war was declared can be called, and they must still be
          allies when they accept.
        </li>
        <li>A call never runs out. It waits on the war until the leader answers, even if they are offline.</li>
        <li>
          The leader of the called faction answers with <code className={code}>/war call accept &lt;war id&gt;</code> or{" "}
          <code className={code}>/war call decline &lt;war id&gt;</code>. <code className={code}>/war calls</code> lists
          your open calls. With only one call open, <code className={code}>/faction accept</code> and{" "}
          <code className={code}>/faction decline</code> work too.
        </li>
        <li>Declining costs your faction stability.</li>
        <li>An ally can only join between battles.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        If you were offline, the war news waits for you at your next login: declarations, calls to arms and the battle
        days that were chosen.
      </p>

      <WikiSectionHeading id="buildup" intro="Every new war starts with a buildup.">
        The buildup
      </WikiSectionHeading>
      <p className={body}>
        The first battle day is at least a week after the declaration, so you mark your days a week ahead. Until the
        war&apos;s first battle or raid starts, every faction in the war is frozen, and so is any ally that joins later:
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Timers already running for regiments, installations, war-related guild upgrades, mercenary companies and
          vehicle construction pause.
        </li>
        <li>Nothing new of those can be started.</li>
        <li>No vehicle can be added to the faction pool or berthed.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Gear, trade and the rest of the economy carry on. You still get the slots your laws give, upkeep and wages are
        still paid, and you can still hire mercenaries.
      </p>

      <WikiSectionHeading id="availability" intro="All times on this page are Paris time (CET/CEST).">
        Picking battle days
      </WikiSectionHeading>
      <p className={body}>
        Battle days are picked from the days players say they can fight. Everyone on both sides marks each date and
        start time they can make. Open the grid in game with <code className={code}>/war vote &lt;war id&gt;</code>,
        from a reminder or from the war&apos;s campaign menu, or on the war&apos;s page under{" "}
        <Link href="/wars" className={link}>
          Wars
        </Link>{" "}
        on this website. It shows 7 dates, with start times at 21:00, 22:00, 23:00, 00:00 and 01:00.
      </p>
      <DataTable
        columns={[{ header: "When", nowrap: true }, { header: "What happens" }]}
        rows={[
          [
            "21:00, two days before",
            "The date becomes a battle day if at least 3 players of each side can come at the same start time. If a side has fewer than 3 active players, all of them must be able to come. If not, that date has no battle.",
          ],
          ["21:00, the day before", "The start time is fixed to the hour most of both sides can make."],
        ]}
      />
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Battles can fall on back-to-back days.</li>
        <li>
          After three dates in a row without a battle, the third becomes a battle day anyway. If one side marked nothing
          for it, the battle is decided automatically.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Until you mark something, you get reminders in game, and as Discord DMs if your Discord is linked. Choose{" "}
        <strong>None of these days work for me</strong> to stop being asked until new dates appear.
      </p>

      <WikiSectionHeading id="battles">Battle days</WikiSectionHeading>
      <p className={body}>Battles are fought along the route toward the enemy. A battle day goes like this:</p>
      <DataTable
        columns={[{ header: "Time", nowrap: true }, { header: "What happens" }]}
        rows={[
          ["16:00", "The battle is set on its province. Installations must be committed by then."],
          [
            "19:00 to 21:00",
            <span key="raids">
              <a href="#raids" className={link}>
                Raids
              </a>{" "}
              can be launched.
            </span>,
          ],
          [
            "From 20:00",
            <span key="signup">
              Sign up for your side&apos;s war warband with <code className={code}>/warband list</code> and{" "}
              <code className={code}>/warband join</code>.
            </span>,
          ],
          ["21:00 to 01:00", "The battle starts at the start time fixed the day before."],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        After 20 minutes, a warband leader can <code className={code}>/warband retreat</code>, which ends the battle as
        a loss for that side.
      </p>
      <p className={`mt-3 ${body}`}>
        The faction that loses the war, and its subjects, pay the winner a quarter of their guilds&apos; trade income
        for 10 days.
      </p>

      <WikiSectionHeading id="campaign">Managing the campaign</WikiSectionHeading>
      <p className={body}>
        Open <code className={code}>/war list</code> and select the war to see its campaign menu. Leaders commit
        installations to the next battle from this menu. In a naval battle slot, the attacking side loses automatically
        if it has no ship berthed at a committed port. After winning a battle, choose Push to advance or Hold to stay
        put. Leaders can offer white peace or surrender to end the war, concede a battle slot, or ask for an automatic
        result instead of fighting it. For an agreed automatic result, the other leader must answer with{" "}
        <code className={code}>/faction accept</code> within 60 seconds.
      </p>

      <WikiSectionHeading id="in-battle">In battle</WikiSectionHeading>
      <p className={body}>
        You keep your inventory when you die, and your gear wears much more slowly. Friendly fire is on, so take care
        around your own side. Field battles use capture points and shared lives. Sieges use a contest timer.
      </p>
      <p className={`mt-3 ${body}`}>
        A field battle is lost by running out of lives or retreating, and it can also be won by control. While your side
        holds more capture points than the enemy, it gains control, faster the more points it holds. Holding every point
        is four times faster again. The first side to 1000 control wins. A point counts once it is at least half
        captured. Your side&apos;s control and the enemy&apos;s show on the capture point scoreboard.
      </p>
      <p className={`mt-3 ${body}`}>
        In a campaign battle, you can only use faction pool vehicles from your side, or vehicles berthed at an
        installation on your side that was committed to that battle. Signed-up players cannot use vehicles before the
        battle starts. You cannot join a warband while mounted.
      </p>

      <WikiSectionHeading id="raids" intro="A short attack launched from a port or airport.">
        Raids
      </WikiSectionHeading>
      <p className={body}>
        Once the war has its first battle day set and the buildup week is over, raids can be launched every evening
        between 19:00 and 21:00. A faction leader at war launches a raid from one of their own ports or airports. A port
        can raid an enemy port, an airport an enemy airport, and either one an enemy fort. Each side can launch one raid
        a day, and none while a battle of the war is being fought. The attackers have 60 seconds to join with{" "}
        <code className={code}>/raid join &lt;raid&gt;</code>, and the raid then lasts 10 minutes. You cannot join while
        mounted. A raided installation cannot berth or unberth vehicles for 48 hours.
      </p>

      <WikiSectionHeading id="stats">Battle stats</WikiSectionHeading>
      <p className={body}>
        When a battle ends, every fighter still online gets a line in chat. Click it to see how you did.{" "}
        <code className={code}>/battle stats</code> opens a menu with:
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Your record over every battle: battles won and lost, kills, assists, deaths, damage, healing and crowd
          control.
        </li>
        <li>
          Your battles. Click one for its report, with each side&apos;s totals, your own numbers and where you ranked
          among everyone who fought.
        </li>
        <li>Your wars, each with a war report.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Every kind of battle counts: field, siege, naval, raid and staff-run. Battles fought before battle stats were
        added are not listed.
      </p>

      <WikiSectionHeading
        id="regiments"
        intro="The leader keeps regiments from the Military menu, paid each day from the faction bank."
      >
        Regiments
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Regiment" }, { header: "Upkeep per slot", align: "right" }, { header: "Notes" }]}
        rows={regiments.map((r) => [r.unit, r.upkeep, r.note])}
      />
      <p className={`mt-3 ${body}`}>
        New slots take hours to fill. The Military law changes which slots you get for free. If the faction bank
        can&apos;t pay, regiments shrink.
      </p>
      <p className={`mt-3 ${body}`}>
        Each side&apos;s lives in a battle come from its regiments, plus the levies of its subjects and the hired
        mercenaries on its roster. A subject defending its own province brings its whole militia.
      </p>
      <p className={`mt-3 ${body}`}>
        Deaths in a field battle or siege don&apos;t shrink your regiments. They become wounds on the forces that
        fought, split by the lives each one brought. Slots your Military law gives you for free are full again after
        every battle. Wounded paid slots can&apos;t fight and cost no upkeep, and you lose them when the war ends.
      </p>

      <WikiSectionHeading id="mercenaries" intro="Guilds can run a mercenary company and fight for other factions.">
        Mercenaries
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          A guild leader whose character has the Mercenary trait founds a company with{" "}
          <code className={code}>/company found &lt;name&gt;</code>. It costs 100 d from the guild bank and is ready a
          day later. Every mercenary needs the Mercenary trait. Each place in the company costs the guild 8 d a day,
          filled or not.
        </li>
        <li>
          The company leader writes a contract with <code className={code}>/company draft</code>, signs it, and sends it
          to a faction with <code className={code}>/company offer &lt;faction&gt;</code>.
        </li>
        <li>
          Factions browse companies with <code className={code}>/mercenaries</code>. To hire, their leader or a council
          member goes to the province of the company&apos;s guild capital and signs the contract there.
        </li>
      </ol>

      <p className={`mt-3 ${body}`}>
        Contracts charge a day price and a battle price for each place hired. Battle days cost both. The minimum prices
        are 10 d per day and 50 d per battle, and a contract lasts at most 14 days. Read the absence and breach refund
        terms before signing. Missing mercenaries trigger absence refunds. Dropping below the number of places promised
        triggers the breach refund. Absences and breaches harm the company&apos;s reputation. Days already served still
        have to be paid.
      </p>
      <p className={`mt-3 ${body}`}>
        While a contract runs, hired mercenaries mark the{" "}
        <a href="#availability" className={link}>
          days they can fight
        </a>{" "}
        for the faction that hired them, and their marks count for that side. A company never loses places in battle,
        and its wounds heal over time.
      </p>
      <p className={`mt-3 ${body}`}>
        Company upgrades are Hardened Bodies for health, Warding Sigils for mana and Steady Focus for mana recovery.
        Each costs 10 d per day per level from the host guild and goes up to level 10. Their benefits apply only while
        fighting as hired mercenaries.
      </p>

      <Callout variant="note">
        Staff sometimes run battles outside wars. For those, make your own warband with{" "}
        <code className={code}>/warband create</code>, and its leader enters it with{" "}
        <code className={code}>/battle join</code>.
      </Callout>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={warCommands.commands} />

      <SeeAlso hrefs={["/wiki/factions", "/wiki/guilds", "/wiki/vehicles", "/wiki/commands"]} />
    </WikiPage>
  );
}
