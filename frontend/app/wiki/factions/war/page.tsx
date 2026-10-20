import { Callout, CommandTable, DataTable, WikiSectionHeading } from "@/app/components/wiki";
import { factionRegiments, factionWarCommands, factionWarDay, factionWarGoals } from "@/app/wiki/data";

import { Bullets, Cmd, FactionsGuidePage, P, Steps } from "../FactionsGuide";

export default function FactionsWarPage() {
  return (
    <FactionsGuidePage
      href="/wiki/factions/war"
      intro="Wars are campaigns of scheduled evening battles. Each battle moves the front towards one side's capital, until someone wins or both sides make peace."
    >
      <WikiSectionHeading id="overview" intro="All times are Paris time (CET or CEST).">
        A war at a glance
      </WikiSectionHeading>
      <Steps>
        <li>Look through the war goals you could pick, and what each would win you.</li>
        <li>Get a war code from staff in Discord.</li>
        <li>The leader declares war and picks the war goals.</li>
        <li>Both sides set their demands and call their allies.</li>
        <li>On each battle day, members vote on a start time and sign up through their warband.</li>
        <li>The winner of each battle pushes the front forward and occupies land.</li>
        <li>
          The war ends when one side takes the other&apos;s capital or objective, surrenders, or both agree to peace.
        </li>
        <li>The loser pays reparations and a 10-day truce begins.</li>
      </Steps>

      <WikiSectionHeading id="declare" intro="Only the faction leader can declare war.">
        Declaring war
      </WikiSectionHeading>
      <Steps>
        <li>
          Faction menu, then Diplomacy, then the target, then <strong>Declare War</strong>. You can open this at any
          time, without a code, to see every war goal you could pick against them and what it would win you, such as how
          much a pillage would loot. Use it to decide whether the war is worth it.
        </li>
        <li>
          Open a <strong>War Ticket</strong> in Discord. Staff give you a one-time war code that lets you attack that
          faction. It lasts 48 hours.
        </li>
        <li>Click Declare War again, type the code in chat, pick your goals and confirm.</li>
      </Steps>
      <P>You can only declare if:</P>
      <Bullets>
        <li>your opinion of the target is -50 or lower,</li>
        <li>at least one of their members is online,</li>
        <li>you have no truce, alliance or Non-Aggression Pact with them,</li>
        <li>your stability is not Collapsing or Failed,</li>
        <li>you have at least one regiment that can attack, and</li>
        <li>if the route crosses the sea, you have a working port.</li>
      </Bullets>
      <P>
        If the declaration fails, your code is not used up. You cannot declare war on your own overlord or vassals. A
        vassal that wants to take its overlord&apos;s place starts a Usurp movement instead (see Government and
        stability).
      </P>

      <WikiSectionHeading id="goals" intro="The goal is what the winner gets.">
        War goals and demands
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Goal", nowrap: true }, { header: "If you win" }]}
        rows={factionWarGoals.map((g) => [g.goal, g.win])}
      />
      <Bullets>
        <li>The defender can pick a counter-goal of its own in the war&apos;s War Demands screen.</li>
        <li>
          Each side&apos;s leader can add <strong>one second demand</strong>, which can benefit their vassals or allies.
        </li>
        <li>Demands lock when the first battle starts.</li>
      </Bullets>

      <WikiSectionHeading id="army" intro="Your regiments decide how many players can fight and how long you last.">
        Your army
      </WikiSectionHeading>
      <DataTable
        columns={[
          { header: "Regiment" },
          { header: "Upkeep per day", align: "right" },
          { header: "Recruit time", align: "right" },
          { header: "Role" },
        ]}
        rows={factionRegiments.map((r) => [r.type, r.upkeep, r.build, r.role])}
      />
      <Bullets>
        <li>The leader recruits in Faction menu, then Military. Your military law gives some regiments for free.</li>
        <li>Each regiment in a war gives your side 5 places in battle and 5 shared lives.</li>
        <li>Every 5 deaths on your side in a battle loses you 1 regiment for good. Militia goes first.</li>
      </Bullets>

      <WikiSectionHeading id="calls" intro="Vassals join automatically. Allies have to be called.">
        Allies
      </WikiSectionHeading>
      <P>
        Open the war from <Cmd>/war list</Cmd> and click an ally to call it. Its leader has 5 minutes to answer.
        Declining costs them 30 stability, but a call that expires costs nothing and can be sent again. Coalition
        members can be called the same way: see Coalitions.
      </P>

      <WikiSectionHeading id="campaign" intro="Open the war from /war list, then Campaign.">
        The campaign
      </WikiSectionHeading>
      <Bullets>
        <li>
          The game plots a route from the attacker&apos;s capital to the <strong>objective</strong>, usually the
          defender&apos;s capital. Battles happen along the route, about every 3 provinces.
        </li>
        <li>
          Enemy forts on the route turn the battle there into a <strong>siege</strong>. Win it and the fort is yours.
        </li>
        <li>
          Sea near an enemy port means a <strong>naval</strong> battle. The attackers need a ship berthed at a committed
          port, or they lose it automatically.
        </li>
        <li>
          Each side has a limited amount of <strong>initiative</strong>. Attacking uses it. A side that runs out cannot
          attack.
        </li>
        <li>
          After a battle, the winner chooses <strong>Push</strong> (advance) or <strong>Hold</strong> (offer peace).
          After a Hold, the loser can attack again or accept peace.
        </li>
        <li>The winner of a battle occupies that province and nearby enemy land.</li>
      </Bullets>

      <WikiSectionHeading id="battle-day" intro="A battle day runs on a fixed clock.">
        Battle day
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Time", nowrap: true }, { header: "What happens" }]}
        rows={factionWarDay.map((d) => [d.time, d.what])}
      />
      <Bullets>
        <li>
          Any member of a faction in the war can vote for a start time in the Campaign screen. The vote needs at least 4
          voters, or everyone on the smaller side.
        </li>
        <li>
          If too few vote, the battle moves one day and both sides&apos; build timers freeze for 24 hours. If it fails
          again, the battle is decided automatically.
        </li>
        <li>Before 16:00, leaders can commit ports, airports and train stations so their vehicles can join.</li>
        <li>The defending leader can also concede a battle before 16:00.</li>
      </Bullets>

      <WikiSectionHeading id="fighting" intro="Sign up through your faction's war warband.">
        Fighting a battle
      </WikiSectionHeading>
      <Steps>
        <li>
          From 20:00, run <Cmd>/warband list</Cmd> and join your side&apos;s warband (called &quot;The (leader)
          Host&quot;).
        </li>
        <li>You get reminders 30, 10, 5 and 1 minutes before the start.</li>
        <li>Fight until one side runs out of lives or loses the objective.</li>
      </Steps>
      <Bullets>
        <li>Members of the warring factions, their vassals, called allies and hired mercenaries can all fight.</li>
        <li>
          <strong>Field battles:</strong> hold capture points to respawn. A side with no lives left, or nobody online
          for 5 minutes, loses.
        </li>
        <li>
          <strong>Sieges:</strong> attackers need 3 or more players in the area, and more than the defenders, to run
          down the 3-minute timer.
        </li>
        <li>You keep your inventory, friendly fire is on, and gear wears out at a fifth of the normal rate.</li>
        <li>Everyone still in the battle when it ends gets 4 Ignitium, on both sides.</li>
      </Bullets>
      <Callout variant="warning" title="One side per war">
        Your first sign-up ties your whole account, every character, to that side until the war ends.
      </Callout>

      <WikiSectionHeading id="raids" intro="A quick strike on an enemy installation before the main battle.">
        Raids
      </WikiSectionHeading>
      <Bullets>
        <li>
          The attacking side&apos;s leader can launch one raid per battle day, between 19:00 and 21:00, from the
          Campaign screen.
        </li>
        <li>Raids go port to port, airport to airport, or from a port or airport to a fort.</li>
        <li>
          Attackers join with <Cmd>/raid join &lt;raid&gt;</Cmd> during a 60-second muster. They have one life each.
          Defenders who are online are added automatically and respawn freely.
        </li>
        <li>A raid lasts 10 minutes. Either way, the target cannot berth or move vehicles for 48 hours.</li>
      </Bullets>

      <WikiSectionHeading id="auto" intro="When nobody fights, the numbers decide.">
        Automatic results
      </WikiSectionHeading>
      <Bullets>
        <li>
          Both leaders can agree to <strong>autoresolve</strong> a battle. The side with more committed regiments
          usually wins, with some luck involved.
        </li>
        <li>
          If the defenders have no defending regiments in the war, the attackers take the province without a fight.
        </li>
        <li>If the attackers cannot field an army that can attack, they forfeit.</li>
      </Bullets>

      <WikiSectionHeading id="ending">How a war ends</WikiSectionHeading>
      <Bullets>
        <li>
          <strong>Victory:</strong> win a battle at the enemy capital, or at the objective. The winner gets its demands.
        </li>
        <li>
          <strong>Surrender:</strong> a main leader clicks Surrender in the Campaign screen.
        </li>
        <li>
          <strong>White peace:</strong> both sides propose peace, or one accepts the other&apos;s offer. Nobody gets
          anything.
        </li>
      </Bullets>
      <Callout variant="note" title="Reparations and truce">
        After a victory, every guild in the losing realm (vassals too) pays 25% of its trade income to the winner each
        day for 10 days. Then a 10-day truce stops everyone in the war from declaring on each other.
      </Callout>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionWarCommands} />
    </FactionsGuidePage>
  );
}
