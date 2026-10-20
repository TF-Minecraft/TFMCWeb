import { Callout, SeeAlso, StatGrid, WikiPage, WikiSectionHeading } from "@/app/components/wiki";

import { Bullets, Cmd, FACTIONS_GUIDE_UPDATED, FactionsGuideCards, P, Steps } from "./FactionsGuide";

export default function FactionsPage() {
  return (
    <WikiPage
      lastModified={FACTIONS_GUIDE_UPDATED}
      title="Factions"
      intro="Factions are the player nations of the server. They claim land on the map, set their own laws, trade, make allies and go to war."
      width="lg"
    >
      <WikiSectionHeading id="what" intro="Everything political on the server runs through factions.">
        What a faction is
      </WikiSectionHeading>
      <Bullets>
        <li>
          A <strong>faction</strong> has a leader, members, a capital, land made of <strong>provinces</strong>, and a
          bank.
        </li>
        <li>
          <strong>Guilds</strong> are groups inside a faction that run their own trade and bank.
        </li>
        <li>
          <strong>Prestige</strong> measures how strong a faction is. It decides how much land you can hold and your
          rank among other factions.
        </li>
        <li>
          <strong>Stability</strong> measures how well your government holds together. Low stability costs you money and
          power.
        </li>
        <li>Factions deal with each other through diplomacy, coalitions and scheduled wars.</li>
      </Bullets>

      <WikiSectionHeading id="first-hour" intro="The short version. Each step is covered in detail in the guide below.">
        Your first faction in five steps
      </WikiSectionHeading>
      <Steps>
        <li>
          <Cmd>/faction create &lt;name&gt;</Cmd> founds your faction.
        </li>
        <li>
          Stand where you want your home and run <Cmd>/faction setcapital &lt;name&gt;</Cmd>. This claims the province
          for free.
        </li>
        <li>
          Stand in that province and run <Cmd>/faction setbank</Cmd>. Your faction&apos;s money lives here.
        </li>
        <li>
          Invite friends with <Cmd>/faction invite &lt;player&gt;</Cmd>. More members means more prestige.
        </li>
        <li>
          Claim neighbouring provinces with <Cmd>/faction claim</Cmd> once you have enough prestige.
        </li>
      </Steps>
      <P>
        Everything else lives in <Cmd>/faction menu</Cmd>: government, laws, diplomacy, military, titles and more.
      </P>

      <WikiSectionHeading id="guide">The Factions guide</WikiSectionHeading>
      <FactionsGuideCards />

      <WikiSectionHeading id="numbers">Numbers worth remembering</WikiSectionHeading>
      <StatGrid
        stats={[
          { label: "Members per faction", value: "64" },
          { label: "Prestige per province", value: "50", note: "needed for each province you already own" },
          { label: "Provinces outside a county", value: "5 at most", note: "form a county to grow further" },
          { label: "The faction day", value: "24 hours", note: "taxes, upkeep and wages are paid once a day" },
          { label: "Truce after a war", value: "10 days" },
          { label: "Requests", value: "60 seconds", note: "to answer with /faction accept" },
        ]}
      />

      <Callout variant="note">
        Only the faction leader can claim land, change diplomacy, declare war and spend from the bank. Most other
        members help by being active: every member adds prestige, and wars are won by the players who turn up.
      </Callout>

      <SeeAlso hrefs={["/wiki/economy", "/wiki/characters", "/wiki/commands"]} />
    </WikiPage>
  );
}
