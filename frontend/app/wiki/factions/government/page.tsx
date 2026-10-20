import { Callout, CommandTable, DataTable, WikiItemLink, WikiSectionHeading } from "@/app/components/wiki";
import {
  factionGovernmentCommands,
  factionGovernments,
  factionLawGroups,
  factionStabilityBands,
} from "@/app/wiki/data";

import { Bullets, Cmd, FactionsGuidePage, P, Steps } from "../FactionsGuide";

export default function FactionsGovernmentPage() {
  return (
    <FactionsGuidePage
      href="/wiki/factions/government"
      intro="Laws decide how your faction is run. Stability decides how well it works. Members who disagree can organise and, in the end, rebel."
    >
      <WikiSectionHeading id="where" intro="Everything here is in Faction menu, then Government.">
        Where to find it
      </WikiSectionHeading>
      <P>
        The Government screen shows your leader, Administrative Power, stability, legitimacy, the council, elections,
        proposals and movements. The Laws button only shows your laws: you change them through a proposal.
      </P>

      <WikiSectionHeading id="governments" intro="Every faction starts as a Community.">
        Government types
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Government" }, { header: "Council" }, { header: "Legitimacy" }]}
        rows={factionGovernments.map((g) => [g.name, g.council, g.legitimacy])}
      />
      <Bullets>
        <li>
          A <strong>Community</strong> is simple and stable, but its economy and military laws stay Decentralized, and
          each province past 10 costs 2 stability.
        </li>
        <li>
          The <strong>Leadership</strong> law is separate: with Elected leadership, the leader is chosen by election
          under any government. Democracy only elects the council.
        </li>
      </Bullets>

      <WikiSectionHeading id="laws" intro="Changing a law costs Administrative Power.">
        Laws
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Law" }, { header: "Options" }, { header: "What it controls" }]}
        rows={factionLawGroups.map((l) => [l.group, l.options, l.controls])}
      />
      <Bullets>
        <li>
          <strong>Administrative Power</strong> refills every hour. Every law has an upkeep that lowers your maximum.
        </li>
        <li>Bigger jumps cost more: going from Autocracy to Democracy costs more than a small step.</li>
        <li>After a law changes, that law cannot change again for 3 days.</li>
        <li>Tax rates are set inside the range your tax law allows, and changing a rate is free.</li>
      </Bullets>

      <WikiSectionHeading id="council" intro="Oligarchies, plutocracies and democracies decide things in council.">
        Council and proposals
      </WikiSectionHeading>
      <P>
        Without a council (Community or Autocracy), the leader&apos;s changes apply at once. With a council, the leader
        and councillors make proposals and vote on them.
      </P>
      <Steps>
        <li>Government, then New Proposal. Pick a law, a tax rate, or (during a war) white peace or surrender.</li>
        <li>The leader clicks Start Council Meeting. At least 75% of the council and leader must be online.</li>
        <li>The leader right-clicks a Lantern within 60 seconds. That is the meeting table.</li>
        <li>
          Voters stand within 10 blocks and type <Cmd>yay</Cmd>, <Cmd>nay</Cmd> or <Cmd>abstain</Cmd> in chat.
        </li>
        <li>A proposal passes with more yays than nays. Results apply when the meeting ends.</li>
      </Steps>
      <Callout variant="note">
        The Administrative Power for a law is paid when the proposal is made, even if the vote fails. Each councillor
        can have 2 proposals open.
      </Callout>

      <WikiSectionHeading id="elections" intro="With Elected leadership or a Democracy, voting happens at booths.">
        Elections
      </WikiSectionHeading>
      <Bullets>
        <li>
          The leader places a <WikiItemLink name="Voting Booth">voting booth</WikiItemLink>. Right-click it to sign up
          as a candidate or to vote.
        </li>
        <li>
          Elections start on a Monday, at least 21 days after the last one, if someone has signed up. They last 7 days.
        </li>
        <li>Each guild can put forward one candidate per race. Every member gets one vote per race.</li>
        <li>If an elected leader dies, a new election starts straight away.</li>
      </Bullets>

      <WikiSectionHeading id="stability" intro="Stability runs from 0 to 100.">
        Stability
      </WikiSectionHeading>
      <P>
        Stability mostly comes from <strong>legitimacy</strong>: how much your government type and your guilds and
        vassals accept your rule. Each guild leader sets their guild&apos;s stance to Support, Neutral or Oppose in the
        Government screen. More support means more legitimacy.
      </P>
      <DataTable
        columns={[
          { header: "Stability" },
          { header: "Status" },
          { header: "Tax collected", align: "right" },
          { header: "Effect" },
        ]}
        rows={factionStabilityBands.map((b) => [b.range, b.status, b.tax, b.note])}
      />
      <P>Low stability also lowers your Administrative Power, diplomatic capacity, prestige and capital income.</P>
      <DataTable
        columns={[{ header: "Event" }, { header: "Stability", align: "right" }]}
        rows={[
          ["Declining a call to arms", "-30"],
          ["Losing a war that changed your government", "-50"],
          ["Losing a war that opened your market", "-25"],
          ["Rebels winning a civil war", "-75"],
          ["No Spymaster appointed", "-10"],
          ["Faction bank in debt", "Drops to 0"],
        ]}
      />
      <P>Most of these fade by 1 point per hour.</P>

      <WikiSectionHeading id="movements" intro="Members who are not on the council can still push for change.">
        Movements
      </WikiSectionHeading>
      <Steps>
        <li>Government, then New Movement. Pick up to 3 demands: a law, a tax, a new leader, independence and more.</li>
        <li>
          Others join from Active Movements. Guild and vassal leaders bring their whole group. Guilds that Support the
          government cannot join.
        </li>
        <li>
          The movement grows stronger with more people and more trade behind it. It moves through four phases:
          Gathering, Pressuring, Agitated and Rebellious.
        </li>
        <li>At full strength, the movement sends its demands to the leader.</li>
      </Steps>
      <Callout variant="warning" title="Civil war">
        If the leader declines the demands, or the movement refuses an order to disband, a civil war starts. The rebels
        split off with their share of the land and army. If they win, their demands apply. There is a 10-day break
        between civil wars, and civil wars never cost reparations.
      </Callout>
      <Callout variant="note" title="Usurping your overlord">
        A vassal cannot declare war on its overlord. Instead, the vassal&apos;s leader starts a movement in the
        overlord&apos;s faction with the <strong>Usurp</strong> demand. If the overlord gives in, or the vassal wins the
        civil war that follows, the vassal takes the overlord&apos;s highest title and its vassals, and the old overlord
        becomes its vassal.
      </Callout>
      <P>
        The Assembly law decides when the leader can order a movement to disband: from the Agitated phase, only when
        Rebellious, or at any time.
      </P>

      <WikiSectionHeading id="spymaster" intro="The Spymaster is your faction's only office.">
        Spymaster
      </WikiSectionHeading>
      <Bullets>
        <li>The Spymaster gathers reports on other factions&apos; armies and vehicles every day.</li>
        <li>Everything else about a faction (laws, government, stability) is public.</li>
        <li>
          Appoint one with <Cmd>/faction spymaster &lt;player&gt;</Cmd>. A new Spymaster takes 7 days to reach full
          skill, and you must wait 2 days between appointments.
        </li>
      </Bullets>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionGovernmentCommands} />
    </FactionsGuidePage>
  );
}
