import Link from "next/link";
import {
  Callout,
  CommandTable,
  DataTable,
  SeeAlso,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { regiments, warCommands } from "../data/factions";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";
const subheading = "mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--tfmc-mist)]";

export default function WarPage() {
  return (
    <WikiPage
      lastModified="2026-11-23"
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
        <li>Choose your goal in the Declare War menu. Confirming asks you to type the war code in chat.</li>
        <li>
          You can&apos;t declare war on an ally, a faction you have a non-aggression pact with, or your own realm.
        </li>
      </ul>
      <h3 className={subheading}>What you can fight for</h3>
      <p className={`mt-3 ${body}`}>Each war has one goal. Staff make your war code for that goal.</p>
      <DataTable
        className="mt-3"
        columns={[{ header: "Goal", nowrap: true }, { header: "If you win" }]}
        rows={[
          [
            "Subjugate",
            <>
              The defender becomes your{" "}
              <Link href="/wiki/factions#diplomacy" className={link}>
                subject
              </Link>
              .
            </>,
          ],
          ["Tributary", "The defender becomes your tributary and pays you tribute."],
          ["Transfer Subject", "One of the defender's subjects becomes yours. The route leads to that subject."],
          [
            "De Jure Annex",
            <>
              You take the defender&apos;s provinces that belong to a{" "}
              <Link href="/wiki/factions#titles" className={link}>
                title
              </Link>{" "}
              you hold, or an unowned title you already have a province in. It can&apos;t be above your rank, and you
              need enough prestige for the new provinces. The holders keep their settlements, their capital and the road
              between them.
            </>,
          ],
          ["Usurp", "You take the defender's highest title and its subjects, and the defender becomes your subject."],
          [
            "Open Market",
            <>
              The defender is forced to Free Trade and loses{" "}
              <Link href="/wiki/factions#stability" className={link}>
                stability
              </Link>
              . You can&apos;t use it on a faction already under Free Trade, or while your own faction is under
              Isolationism.
            </>,
          ],
          [
            "Change Government",
            "The defender is forced to change its Government law, its Leadership law or both, and loses a lot of stability.",
          ],
          [
            "Pillage",
            "One battle at the target's settlement. Win it and you loot 10 days of trade income from the guilds there. Their trade stops, then recovers over the next 10 days. The target must be within 3 provinces or reachable by sea.",
          ],
        ]}
      />
      <p className={`mt-3 ${body}`}>
        The defenders can set one counter-demand. Each side&apos;s leader can also add a second demand, for their own
        faction or an ally. Demands lock when the first battle or raid starts.
      </p>

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
        <li>
          No vehicle can be added to the faction pool or{" "}
          <Link href="/wiki/vehicles#faction-vehicles" className={link}>
            berthed
          </Link>{" "}
          (parked at one of your faction&apos;s installations).
        </li>
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
            "21:00, 2 days before",
            "The date becomes a battle day if at least 3 players of each side can come at the same start time. If a side has fewer than 3 active players, all of them must be able to come. If not, that date has no battle.",
          ],
          ["21:00, the day before", "The start time is fixed to the hour most of both sides can make."],
        ]}
      />
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Battles can fall on back-to-back days.</li>
        <li>
          After 3 dates in a row without a battle, the third becomes a battle day anyway. If one side marked nothing for
          it, the battle is decided automatically.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        Until you mark something, you get reminders in game, and as Discord DMs if your Discord is linked. Choose{" "}
        <strong>None of these days work for me</strong> to stop being asked until new dates appear.
      </p>

      <WikiSectionHeading id="battles">Battle days</WikiSectionHeading>
      <p className={body}>Battles are fought along the route towards the enemy. A battle day goes like this:</p>
      <DataTable
        columns={[{ header: "Time", nowrap: true }, { header: "What happens" }]}
        rows={[
          [
            "16:00",
            "The battle is set on its province. Leaders must have committed their installations by then (chosen which of their ports, airports and train stations support the battle, which decides the vehicles their side can use). Only installations in provinces their side still controls can be chosen. The choices lock at this time, and leaders get warnings in game beforehand.",
          ],
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

      <WikiSectionHeading id="winning" intro="A war moves along a route, one battle at a time.">
        How a war is won
      </WikiSectionHeading>
      <p className={body}>
        Open <code className={code}>/war list</code> and select the war to see its campaign menu. The buttons below are
        in that menu.
      </p>
      <h3 className={subheading}>The route</h3>
      <p className={`mt-3 ${body}`}>
        The war follows a route of provinces from the attacker&apos;s land to an objective: the defender&apos;s capital,
        or a regional objective if that is closer. The first battle is at the border, then about one every 3 provinces.
        An enemy fort on the route means a{" "}
        <a href="#in-battle" className={link}>
          siege
        </a>
        , and crossing sea near enemy ports means a naval battle.
      </p>
      <p className={`mt-3 ${body}`}>Winning a battle occupies that province and the enemy provinces next to it.</p>
      <h3 className={subheading}>Initiative</h3>
      <p className={`mt-3 ${body}`}>Each side has Initiative, shown in the campaign menu.</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Every attack costs the attacking side 1 Initiative.</li>
        <li>Each side starts with a bit more than the battles its route needs.</li>
        <li>The side that holds the initiative is the one that attacks next.</li>
        <li>
          A side that can no longer reach its target with the Initiative it has left offers white peace automatically.
        </li>
      </ul>
      <h3 className={subheading}>Push or Hold</h3>
      <p className={`mt-3 ${body}`}>After a battle, the winner chooses:</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Push</strong> advances towards the target.
        </li>
        <li>
          <strong>Hold</strong> keeps the front and offers white peace. The side that lost the battle then picks{" "}
          <strong>Attack</strong>, which takes the initiative, or <strong>Accept white peace</strong>, which ends the
          war.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        If nobody chooses, it is decided at 12:00 the next day: Push if that&apos;s possible, Hold if not.
      </p>
      <h3 className={subheading}>How the war ends</h3>
      <DataTable
        className="mt-3"
        columns={[{ header: "Ending", nowrap: true }, { header: "How it happens" }]}
        rows={[
          [
            "The attacker wins",
            "It wins a battle at the defender's capital, or it takes the objective and then wins the next battle there.",
          ],
          ["The defender wins", "It pushes back and wins a battle at the attacker's capital."],
          ["White peace", "Both sides have offered it, or neither side can attack."],
          [
            "Surrender",
            <>
              A leader clicks <strong>Surrender</strong>, and that side loses the war.
            </>,
          ],
        ]}
      />
      <p className={`mt-3 ${body}`}>A Pillage war is a single battle at the settlement. Its result decides the war.</p>
      <p className={`mt-3 ${body}`}>
        You offer white peace by choosing Hold. A side also offers it when it runs short of Initiative, or through a{" "}
        <Link href="/wiki/factions#movements" className={link}>
          White Peace movement
        </Link>
        . Once the other side has offered it, <strong>Accept white peace</strong> shows in your campaign menu.
      </p>
      <p className={`mt-3 ${body}`}>When the war is over:</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>After a white peace, no goal is applied and no reparations are paid.</li>
        <li>
          If a side wins, the losing side and its subjects pay the winner 25% of their guilds&apos; trade income for 10
          days.
        </li>
        <li>A 10-day truce follows.</li>
      </ul>
      <h3 className={subheading}>Battles without a fight</h3>
      <p className={`mt-3 ${body}`}>Leaders can skip a battle in two ways:</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          <strong>Retreat</strong> lets the leader of the side being attacked give up the coming battle, until 16:00 on
          the battle day. The enemy advances without a fight, and no Initiative is spent.
        </li>
        <li>
          The two leaders can agree on an automatic result. One asks for it, and the other answers with{" "}
          <code className={code}>/faction accept</code> within 60 seconds.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>
        A battle is also lost automatically when a side can&apos;t fight it. The side on the offensive is the one
        attacking in that battle, which isn&apos;t always the side that declared the war.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>If the side on the offensive has no forces able to attack when the battle is due, it loses that battle.</li>
        <li>If the defenders have no forces able to defend, the attackers win it without a fight.</li>
        <li>In a naval battle, the side on the offensive loses if it has no ship berthed at a committed port.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        <a href="#regiments" className={link}>
          Wounded regiments
        </a>{" "}
        can leave you with no forces able to fight.
      </p>
      <h3 className={subheading}>Installations in war</h3>
      <p className={`mt-3 ${body}`}>
        Leaders commit installations to the next battle from the campaign menu. Committing one lets your side use its
        vehicles, but it also puts it at risk.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          While that battle is being fought, the installation has no protection. Enemies can dig, build and blow up
          blocks there, and damage the vehicles berthed at it.
        </li>
        <li>
          The same goes for both installations in a{" "}
          <a href="#raids" className={link}>
            raid
          </a>
          : the one it was launched from and the one it targets.
        </li>
        <li>When a province is occupied, its installations go to the occupier until the war ends.</li>
      </ul>

      <WikiSectionHeading id="in-battle">In battle</WikiSectionHeading>
      <p className={body}>
        You keep your inventory when you die, and your gear wears much more slowly. Friendly fire is on, so take care
        around your own side.
      </p>
      <p className={`mt-3 ${body}`}>
        In a field battle, each side has a shared pool of lives and fights over capture points. The battle is lost by
        running out of lives or retreating, and it can also be won by control. While your side holds more capture points
        than the enemy, it gains control, faster the more points it holds. Holding every point is 4 times faster again.
        The first side to 1000 control wins. A point counts once it is at least half captured. Your side&apos;s control
        and the enemy&apos;s show on the capture point scoreboard.
      </p>
      <p className={`mt-3 ${body}`}>
        A siege is fought at an enemy fort on the route, around a marked contest area. A siege timer decides it:
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          The timer starts at 3 minutes. It runs down while at least 3 attackers stand in the area and outnumber the
          defenders there. It runs back up, but never above 3 minutes, while at least 3 defenders stand in the area and
          the attackers don&apos;t outnumber them. Otherwise it stays where it is.
        </li>
        <li>Players in vehicles don&apos;t count. Everyone inside the area sees the timer and who is holding.</li>
        <li>The attackers win when the timer reaches zero. Either side wins if the other runs out of lives.</li>
        <li>A siege has no time limit, but a side with nobody online for a while loses.</li>
      </ul>
      <p className={`mt-3 ${body}`}>
        In a campaign battle, you can only use faction pool vehicles from your side, or vehicles berthed at an
        installation on your side that was committed to that battle. Signed-up players cannot use vehicles before the
        battle starts. You cannot join a warband while mounted.
      </p>

      <WikiSectionHeading id="spoils">Battle spoils</WikiSectionHeading>
      <p className={body}>
        When a battle ends, every fighter still in it gets spoils, win, lose or draw. You get{" "}
        <WikiItemLink name="Ignitium" />, Iron Ingots and coins, and sometimes <WikiItemLink name="Tin" /> or{" "}
        <WikiItemLink name="Abyssalite Fragment">Abyssalite Fragments</WikiItemLink> too. The longer the battle lasted,
        the more you get. A Battle spoils line in chat lists what you got, and anything that doesn&apos;t fit in your
        inventory drops at your feet.
      </p>

      <WikiSectionHeading id="raids" intro="A short attack launched from a port or airport.">
        Raids
      </WikiSectionHeading>
      <p className={body}>
        A raid is a 10-minute attack on one enemy installation. While it runs, that installation and the one the raid
        was launched from{" "}
        <a href="#winning" className={link}>
          lose their protection
        </a>
        . Afterwards the raided installation can&apos;t berth or take out vehicles for 48 hours.
      </p>
      <p className={`mt-3 ${body}`}>Launching a raid:</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          A war&apos;s first raid needs its first battle day set and the buildup week over. Once the first battle or
          raid has started, raids no longer wait for a battle day.
        </li>
        <li>They can be launched every evening between 19:00 and 21:00.</li>
        <li>
          A faction leader at war launches a raid from one of their own ports or airports. A port can raid an enemy
          port, an airport an enemy airport, and either one an enemy fort.
        </li>
        <li>Each side can launch one raid a day, and none while a battle of the war is being fought.</li>
      </ul>
      <p className={`mt-3 ${body}`}>Fighting in one:</p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          The attackers have 60 seconds to join with <code className={code}>/raid join &lt;raid&gt;</code>. You
          can&apos;t join while mounted.
        </li>
        <li>Defenders who are online are signed up automatically.</li>
        <li>Each attacker has one life. Defenders respawn as often as they like.</li>
        <li>The defenders win if every attacker is out. If not, the raid ends in a draw when the 10 minutes are up.</li>
        <li>
          Players from the raiding side who aren&apos;t fighting in the raid, or are already out, take damage while they
          stay in the raided province.
        </li>
      </ul>
      <p className={`mt-3 ${body}`}>Raids give no spoils.</p>

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
        Each side&apos;s lives in a battle come from its regiments, its levies (soldiers its subjects send to its
        battles, with no upkeep) and the hired mercenaries on its roster. A subject defending its own province brings
        its whole militia.
      </p>
      <p className={`mt-3 ${body}`}>
        Deaths in a field battle or siege wound your forces instead of shrinking them. The wounds are shared between
        your regiments, levies and mercenaries according to how many lives each brought. Slots your Military law gives
        you for free are full again after every battle. Wounded paid slots can&apos;t fight and cost no upkeep, and you
        lose them when the war ends.
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
        are 10 d per day and 50 d per battle, and a contract lasts at most 14 days. Before signing, read the
        contract&apos;s two refund terms. The absence refund is paid back when hired mercenaries miss a battle. The
        breach refund is paid back if the company drops below the number of places it promised. Both also hurt the
        company&apos;s reputation. Days already served still have to be paid.
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
        Each costs 10 d per day per level from the company&apos;s guild and goes up to level 10. Their benefits apply
        only while fighting as hired mercenaries.
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
