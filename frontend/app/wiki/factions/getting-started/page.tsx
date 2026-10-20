import { Callout, CommandTable, DataTable, WikiSectionHeading } from "@/app/components/wiki";
import { factionStartCommands } from "@/app/wiki/data";

import { Bullets, Cmd, FactionsGuidePage, P, Steps } from "../FactionsGuide";

export default function FactionsGettingStartedPage() {
  return (
    <FactionsGuidePage
      href="/wiki/factions/getting-started"
      intro="Found a faction, give it a home and a bank, and bring in your first members."
    >
      <WikiSectionHeading id="found" intro="You need to be playing a character to use faction commands.">
        Founding your faction
      </WikiSectionHeading>
      <Steps>
        <li>
          <Cmd>/faction create &lt;name&gt;</Cmd>. The name is one word: use <Cmd>_</Cmd> for spaces. You become the
          leader.
        </li>
        <li>
          Go where you want to live and run <Cmd>/faction setcapital &lt;name&gt;</Cmd>. This claims the province for
          free and founds your capital settlement. It cannot be water or someone else&apos;s land.
        </li>
        <li>
          In your capital province, stand in a chunk and run <Cmd>/faction setbank</Cmd>. Deposits, withdrawals and the
          daily payout all happen here.
        </li>
        <li>
          Invite players with <Cmd>/faction invite &lt;player&gt;</Cmd>. They get Accept and Decline buttons in chat, or
          can type <Cmd>/faction join</Cmd>.
        </li>
      </Steps>
      <Callout variant="note">
        A new faction starts small. Each member adds prestige, so recruiting is the fastest way to claim more land.
      </Callout>

      <WikiSectionHeading id="menu" intro="/faction menu opens everything your faction can do.">
        The faction menu
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Button" }, { header: "What it is for" }]}
        rows={[
          ["Government", "Laws, council, proposals, stability and movements."],
          ["Wealth, Prestige, Members", "Where your faction stands, with a breakdown of its prestige."],
          ["Ledger", "Today's income and costs."],
          ["Modifiers", "Every bonus and penalty currently affecting your faction."],
          ["Positions", "Offices, such as the Spymaster."],
          ["Guilds", "The guilds inside your faction."],
          ["Tax", "Your current tax rates."],
          ["Laws", "Your current laws."],
          ["Military", "Your regiments. The leader recruits here."],
          ["Diplomacy", "Every other faction, and your relations with them."],
          ["Installations", "Your forts, ports, airports and train stations."],
          ["Tier and Titles", "Your title tier, and forming or claiming titles (leader)."],
          ["Banner", "Take a copy of your banner, or roll a random new one (leader)."],
        ]}
      />
      <P>
        <Cmd>/faction list</Cmd> shows every faction, ranked by prestige, wealth or members. Click one to look at it.
        Exact military details of other factions are hidden unless your Spymaster finds them out.
      </P>

      <WikiSectionHeading id="leaving">Leaving, leadership and disbanding</WikiSectionHeading>
      <Bullets>
        <li>
          <Cmd>/faction leave</Cmd> leaves your faction. If you are in a guild inside the faction, use{" "}
          <Cmd>/guild leave</Cmd> first.
        </li>
        <li>
          The leader cannot leave. Hand over with <Cmd>/faction setleader &lt;player&gt;</Cmd>, or disband.
        </li>
        <li>
          If your faction elects its leader, <Cmd>/faction setleader</Cmd> does not work. The next election decides.
        </li>
        <li>
          <Cmd>/faction delete &lt;faction&gt;</Cmd> disbands the faction. The bank must be empty, not in debt, and you
          must have no loans.
        </li>
        <li>
          If the leader&apos;s character dies, the next living member takes over. With elected leadership, an election
          starts instead.
        </li>
        <li>
          If the last member dies, the faction is held for 7 days. It keeps its land but nobody can join or attack it.
          If nobody returns, it closes.
        </li>
      </Bullets>

      <WikiSectionHeading id="inactive" intro="Factions nobody plays slowly fade away.">
        Inactivity
      </WikiSectionHeading>
      <Bullets>
        <li>A character who has been offline for 21 days counts as inactive.</li>
        <li>
          When every member is inactive, the faction loses 1% of its prestige every 4 hours, and its outer provinces
          start to drop off.
        </li>
        <li>As soon as any member logs in again, the penalty is gone.</li>
      </Bullets>

      <WikiSectionHeading id="identity" intro="These only change how your faction looks.">
        Name, banner and colours
      </WikiSectionHeading>
      <P>
        The leader can set the banner (hold it and run <Cmd>/faction setbanner</Cmd>), the map colour, the ruler&apos;s
        title, and culture, religion and ruling system labels. The ruling system is only a label: your real government
        is set by law (see Government and stability).
      </P>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionStartCommands} />
    </FactionsGuidePage>
  );
}
