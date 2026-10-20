import { Callout, DataTable, WikiSectionHeading } from "@/app/components/wiki";
import { factionRelations, factionVassalTypes } from "@/app/wiki/data";

import { Bullets, Cmd, FactionsGuidePage, P, Steps } from "../FactionsGuide";

export default function FactionsDiplomacyPage() {
  return (
    <FactionsGuidePage
      href="/wiki/factions/diplomacy"
      intro="Every pair of factions has an opinion of each other and can sign deals. Each deal uses up diplomatic capacity."
    >
      <WikiSectionHeading id="how" intro="Faction menu, then Diplomacy, then click a faction.">
        How it works
      </WikiSectionHeading>
      <Steps>
        <li>Pick a relation, a trade deal or a treaty for that faction.</li>
        <li>
          One-sided choices, like Rival or Embargo, apply at once. Deals both sides must agree to send a request to the
          other leader.
        </li>
        <li>
          The other leader must be online and has 60 seconds to answer with <Cmd>/faction accept</Cmd> or{" "}
          <Cmd>/faction decline</Cmd>.
        </li>
      </Steps>
      <P>
        Each pair can have one relation, one trade deal and one treaty at the same time, for example Ally plus Trade
        Agreement plus Non-Aggression Pact.
      </P>

      <WikiSectionHeading id="opinion" intro="Opinion moves slowly, so plan ahead.">
        Opinion and attitude
      </WikiSectionHeading>
      <Bullets>
        <li>
          Your <strong>attitude</strong> towards a faction (Friendly, Neutral, Unfriendly or Hostile) sets where your
          opinion of them is heading. Relations and deals push it too.
        </li>
        <li>Opinion moves 1 point per hour towards that target.</li>
        <li>
          An alliance needs an opinion of 40 or more on both sides. Set Friendly early: from 0 it takes about 40 hours.
        </li>
        <li>Declaring war needs your opinion of the target to be -50 or lower.</li>
      </Bullets>

      <WikiSectionHeading id="relations">Relations, deals and treaties</WikiSectionHeading>
      <DataTable
        columns={[
          { header: "Type", nowrap: true },
          { header: "What it does" },
          { header: "Who agrees" },
          { header: "How it ends" },
        ]}
        rows={factionRelations.map((r) => [r.name, r.what, r.agree, r.ends])}
      />
      <P>New alliances cannot be made while either side is at war.</P>

      <WikiSectionHeading id="capacity" intro="Diplomatic capacity is how many deals your faction can keep up.">
        Diplomatic capacity
      </WikiSectionHeading>
      <Bullets>
        <li>Faction menu, then Diplomacy, shows capacity used and your maximum. It turns red when you are over.</li>
        <li>
          Your maximum comes from your Bureaucracy branch, then goes up or down with your rank, laws, rivals and
          stability.
        </li>
        <li>
          Every deal costs capacity, and <strong>the cost grows with the other faction&apos;s prestige</strong>. A deal
          with a small faction is cheap. An alliance between two big factions is very expensive.
        </li>
        <li>Vassals cost a third of the normal price. Both sides of a deal must be able to afford it.</li>
        <li>
          If you end up over capacity (for example when a partner grows), you cannot take on new deals and you pay a
          daily penalty from your bank until you are back under. Ending deals is always allowed.
        </li>
      </Bullets>

      <WikiSectionHeading id="vassals" intro="A vassal is a faction that serves another faction, its liege.">
        Vassals
      </WikiSectionHeading>
      <Bullets>
        <li>
          To take vassals you need a Vassalage law other than None, a tier at least as high as theirs, and they must not
          be at war.
        </li>
        <li>
          Vassals pay the liege&apos;s vassal tax, send part of their army as <strong>levies</strong>, give a share of
          their prestige, and fight in the liege&apos;s wars automatically.
        </li>
        <li>A vassal cannot leave on its own. Only the liege can release it.</li>
        <li>A vassal that reaches a higher tier than its liege breaks free.</li>
      </Bullets>
      <DataTable
        columns={[{ header: "Vassal type" }, { header: "Levy", align: "right" }, { header: "What is different" }]}
        rows={factionVassalTypes.map((v) => [v.type, v.levy, v.perk])}
      />

      <WikiSectionHeading id="calls" intro="Vassals join your wars on their own. Allies have to be asked.">
        Calls to arms
      </WikiSectionHeading>
      <Bullets>
        <li>
          During a war, the leader opens the war from <Cmd>/war list</Cmd> and clicks an ally who has not joined.
        </li>
        <li>
          The ally&apos;s leader must be online and has 5 minutes to answer with <Cmd>/faction accept</Cmd> or{" "}
          <Cmd>/faction decline</Cmd>.
        </li>
        <li>If nobody answers in time, the call simply expires and you can send it again.</li>
        <li>An ally with a truce against a defender cannot be called into an attack. Defending is always allowed.</li>
      </Bullets>
      <Callout variant="warning">
        Declining a call to arms with <Cmd>/faction decline</Cmd> costs your faction 30 stability. Letting it expire
        costs nothing.
      </Callout>

      <WikiSectionHeading id="truces">Truces</WikiSectionHeading>
      <Bullets>
        <li>When a war ends, every faction on one side gets a 10-day truce with every faction on the other.</li>
        <li>During a truce they cannot declare war on each other or join an attack against each other.</li>
        <li>The Declare War button shows how long a truce has left.</li>
      </Bullets>
    </FactionsGuidePage>
  );
}
