import { Callout, CommandTable, DataTable, WikiSectionHeading } from "@/app/components/wiki";
import { factionCoalitionCommands } from "@/app/wiki/data";

import { Bullets, Cmd, FactionsGuidePage, P, Steps } from "../FactionsGuide";

export default function FactionsCoalitionsPage() {
  return (
    <FactionsGuidePage
      href="/wiki/factions/coalitions"
      intro="A coalition is a group of independent factions that stand together against one dominant realm, its target. It costs much less than a web of alliances."
    >
      <WikiSectionHeading id="what" intro="Built for small and medium factions facing a much bigger neighbour.">
        What a coalition does
      </WikiSectionHeading>
      <Bullets>
        <li>
          A coalition has a name, a banner, a leader faction, members and <strong>one target</strong>.
        </li>
        <li>When a member is at war with the target, it can call the other members into that war, one at a time.</li>
        <li>
          The target must be at least as strong as the coalition&apos;s strongest member, so a coalition cannot be used
          to gang up on a weaker faction.
        </li>
        <li>Coalitions are defensive by default. Attacking the target together needs approval from staff.</li>
      </Bullets>

      <WikiSectionHeading id="who" intro="Only faction leaders act for their faction.">
        Who can join
      </WikiSectionHeading>
      <Bullets>
        <li>Only independent factions (factions without an overlord) can be members.</li>
        <li>
          A faction can be in one coalition at a time. Your vassals are not members, but they still follow you into
          wars.
        </li>
        <li>
          The target must be independent, and cannot be your ally, your overlord or vassal, a faction you have a
          Non-Aggression Pact with, or a faction you have a truce with.
        </li>
        <li>You cannot join while you are at war with a member.</li>
        <li>A faction can be targeted by several coalitions, and can be in a coalition itself.</li>
      </Bullets>

      <WikiSectionHeading
        id="strength"
        intro="Strength here means realm prestige: your prestige plus all your vassals'."
      >
        The strength rule
      </WikiSectionHeading>
      <P>
        The target&apos;s realm prestige must be at least as high as that of the strongest member. This is checked when
        the coalition is created, when a faction joins, and when the target changes. If a member later outgrows the
        target, the coalition carries on.
      </P>

      <WikiSectionHeading id="start" intro="Faction leaders run these commands.">
        Starting and joining
      </WikiSectionHeading>
      <Steps>
        <li>
          <Cmd>/coalition create &lt;target&gt; &lt;name&gt;</Cmd> creates the coalition with you as leader.
        </li>
        <li>
          <Cmd>/coalition invite &lt;faction&gt;</Cmd> invites other factions. Invites last 7 days, so the other leader
          does not need to be online.
        </li>
        <li>
          They accept with <Cmd>/coalition join &lt;coalition&gt;</Cmd>.
        </li>
        <li>
          <Cmd>/coalition</Cmd> opens the coalition menu: members, their cost, the target and any coalition wars.
        </li>
      </Steps>
      <P>
        <Cmd>/coalition list</Cmd> shows every coalition. Members show &quot;Part of (name) (Coalition)&quot; in{" "}
        <Cmd>/faction list</Cmd>, and targets show &quot;Targeted by (name) (Coalition)&quot;.
      </P>

      <WikiSectionHeading id="cost" intro="Membership uses diplomatic capacity, like any other deal.">
        What it costs
      </WikiSectionHeading>
      <Bullets>
        <li>Each member pays its own cost. It does not depend on who else is in the coalition.</li>
        <li>
          Small factions pay very little. The cost rises quickly for factions far above the average, so for large realms
          vassals stay the better tool.
        </li>
        <li>You need enough free capacity to join. Leaving always frees it.</li>
      </Bullets>
      <DataTable
        columns={[
          { header: "Example member" },
          { header: "Coalition cost", align: "right" },
          { header: "Compare with" },
        ]}
        rows={[
          ["A small faction", "About 5", "N/A"],
          ["A medium faction", "About 12 to 20", "One alliance with a big faction can cost over 100"],
          ["A large faction", "About 75", "Allying with four smaller factions can cost almost 300"],
        ]}
      />
      <P>The menu shows your exact cost and your free capacity.</P>

      <WikiSectionHeading id="war" intro="The heart of a coalition: calling members into a war with the target.">
        Coalitions in war
      </WikiSectionHeading>
      <P>A member can call other members into a war when all of these are true:</P>
      <Bullets>
        <li>The member is one of the main factions in the war (it declared the war or was declared on).</li>
        <li>The target is fighting on the other side, either as a main faction or because it was called in.</li>
        <li>
          In a <strong>defensive</strong> coalition, the member is defending. In an <strong>offensive</strong>{" "}
          coalition, either side counts.
        </li>
      </Bullets>
      <DataTable
        columns={[
          { header: "You are", nowrap: true },
          { header: "The target is" },
          { header: "Defensive", align: "center" },
          { header: "Offensive", align: "center" },
        ]}
        rows={[
          ["Defending", "Attacking you, or called in to attack you", "Yes", "Yes"],
          ["Attacking", "Defending, or called in to defend", "No", "Yes"],
          ["Called in by someone else", "Anything", "No", "No"],
          ["Anything", "Not in the war (only its vassal or ally is)", "No", "No"],
        ]}
      />
      <Steps>
        <li>
          Members you can call appear in the war&apos;s call to arms list next to your allies, marked with the coalition
          name.
        </li>
        <li>
          Call them one at a time. Each member&apos;s leader answers with <Cmd>/faction accept</Cmd> or{" "}
          <Cmd>/faction decline</Cmd>.
        </li>
        <li>Members who accept join your side, just like a called ally.</li>
      </Steps>
      <Callout variant="warning" title="Saying no costs more">
        Declining a coalition call costs 45 stability, more than declining an ally (30). The coalition leader is told
        too. A call that runs out without an answer does not count as declining.
      </Callout>
      <Bullets>
        <li>
          Both sides are warned before they commit. The target sees a warning when it declares war on a member, and a
          faction that calls the target in against a member is warned that the coalition can then join.
        </li>
        <li>
          When you are the attacker, only members who were already in the coalition when the war started can be called,
          and you must have been a member then too. Factions that join during a war can only help defend.
        </li>
        <li>If the target leaves the war, no more members can be called. Members who already joined stay.</li>
        <li>A war against only one of the target&apos;s vassals does not count.</li>
        <li>A coalition never gives you a reason to declare war. Every declaration still needs its own war code.</li>
        <li>Members cannot declare war on each other, or join a war against another member.</li>
        <li>Civil wars never count as coalition wars.</li>
      </Bullets>

      <WikiSectionHeading id="offensive" intro="Going on the attack needs staff approval.">
        Offensive coalitions
      </WikiSectionHeading>
      <Bullets>
        <li>
          Staff give the coalition leader a one-time coalition code. The leader enters it with{" "}
          <Cmd>/coalition offensive</Cmd> or from the menu.
        </li>
        <li>An offensive coalition can call members whichever side of the war they are on.</li>
        <li>It stays offensive until the coalition disbands or changes its target. A new leader keeps it.</li>
      </Bullets>

      <WikiSectionHeading id="leaving">Leaving, losing the target and disbanding</WikiSectionHeading>
      <Bullets>
        <li>
          <Cmd>/coalition leave</Cmd> leaves. You cannot leave while you are in a war you joined through a coalition
          call.
        </li>
        <li>
          After leaving, being kicked, or disbanding, your faction waits <strong>7 days</strong> before it can create or
          join another coalition.
        </li>
        <li>A member that becomes a vassal, disbands or is annexed is removed automatically, with no waiting time.</li>
        <li>If the leader leaves, the remaining member with the highest realm prestige takes over.</li>
        <li>A coalition left with one member for 7 days disbands.</li>
      </Bullets>
      <Callout variant="note" title="If the target falls">
        If the target becomes a vassal, disbands or is annexed, the coalition has 7 days to pick a new target with{" "}
        <Cmd>/coalition target &lt;faction&gt;</Cmd>, or it disbands. The countdown waits while a coalition war is still
        running. A new target makes the coalition defensive again.
      </Callout>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionCoalitionCommands} />
    </FactionsGuidePage>
  );
}
