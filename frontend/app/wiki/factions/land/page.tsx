import { Callout, CommandTable, DataTable, WikiSectionHeading } from "@/app/components/wiki";
import { factionLandCommands, factionRanks, factionTiers } from "@/app/wiki/data";

import { Bullets, Cmd, FactionsGuidePage, P, Steps } from "../FactionsGuide";

export default function FactionsLandPage() {
  return (
    <FactionsGuidePage
      href="/wiki/factions/land"
      intro="Land is counted in provinces. Prestige decides how many you can hold, and titles let you grow from a county to an empire."
    >
      <WikiSectionHeading id="claiming" intro="Only the leader can claim, and you need a capital first.">
        Claiming provinces
      </WikiSectionHeading>
      <Bullets>
        <li>
          Stand in the province and run <Cmd>/faction claim</Cmd>.
        </li>
        <li>
          It must border your land. You can also claim across one water province, or across one sea province from land
          that connects to your capital.
        </li>
        <li>
          <strong>You need 50 prestige for every province you already own.</strong> Your 2nd province needs 50, your 3rd
          needs 100, and so on. Prestige is not spent.
        </li>
        <li>
          You can hold at most <strong>5 provinces that are not part of a county</strong>. To grow past that, form or
          claim a county.
        </li>
        <li>
          <Cmd>/faction unclaim</Cmd> gives a province up. You cannot unclaim your capital, and any land that is cut off
          from your capital goes with it.
        </li>
      </Bullets>
      <Callout variant="warning" title="Do not overextend">
        If your prestige falls below 50 for each province you hold (not counting one), any neighbour can take your
        provinces with <Cmd>/faction claim</Cmd>, along with the installations on them.
      </Callout>

      <WikiSectionHeading id="capital">Capital and settlements</WikiSectionHeading>
      <Bullets>
        <li>Your capital is your first settlement. Guilds found more settlements when they set their own capitals.</li>
        <li>
          To move or rename your capital, stand in the new spot and run <Cmd>/faction setcapital &lt;name&gt;</Cmd>. A
          screen shows the cost and any provinces you would lose.
        </li>
        <li>The first move or rename is free. After that it costs 100 denars from the faction bank.</li>
      </Bullets>

      <WikiSectionHeading
        id="titles"
        intro="Titles are named areas on the map: counties, duchies, kingdoms and empires."
      >
        Titles
      </WikiSectionHeading>
      <P>
        Your highest title sets your tier and adds prestige. Only the highest one counts. Titles also let you hold more
        land, because provinces inside a county do not count against the limit of 5.
      </P>
      <DataTable
        columns={[{ header: "Tier" }, { header: "Prestige it gives", align: "right" }, { header: "To form a new one" }]}
        rows={factionTiers.map((t) => [t.tier, t.prestige, t.form])}
      />
      <P>There are two ways to get a title, both from Faction menu, then Titles.</P>
      <Steps>
        <li>
          <strong>Claim an existing title.</strong> Own enough of its provinces (your rank sets how many, see below) and
          click it. For duchies and above you also need enough of the titles inside it.
        </li>
        <li>
          <strong>Form a new title.</strong> Pick the tier, click Create, and type a name. It takes all the land that is
          not yet part of a title. You can only hold as many counties as you have members.
        </li>
      </Steps>
      <Bullets>
        <li>Vassals&apos; land counts towards your titles.</li>
        <li>You cannot form titles while your stability is Collapsing or Failed.</li>
        <li>You keep a title as long as you hold at least one of its provinces.</li>
        <li>
          The Tier button lets you pick a different name for your tier, for example a City or a Petty Kingdom instead of
          a County or Duchy.
        </li>
      </Bullets>

      <WikiSectionHeading id="prestige" intro="Faction menu, then Prestige, shows exactly where yours comes from.">
        Prestige
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Source" }, { header: "How it works" }]}
        rows={[
          ["Members", "The biggest source early on. More members and more playtime give more."],
          ["Provinces", "+10 for every province."],
          ["Titles", "Your highest title's prestige."],
          ["Wealth", "Your share of all the money on the server, up to 800."],
          ["Trade", "Grows with your guilds' trade power, more slowly the bigger you get."],
          ["Guild branches", "+5 for every branch level your guilds build."],
          ["Vassals", "A share of each vassal's prestige."],
          ["Stability", "Low stability takes up to 25% off."],
        ]}
      />

      <WikiSectionHeading id="ranks" intro="Your rank depends on your prestige compared with the top factions.">
        Prestige ranks
      </WikiSectionHeading>
      <P>
        To reach a rank you need its minimum prestige <strong>and</strong> a share of the prestige of the strongest
        faction already holding it. Your rank also sets how much of a title&apos;s land you need to claim it.
      </P>
      <DataTable
        columns={[
          { header: "Rank" },
          { header: "Min prestige", align: "right" },
          { header: "Of the top holder", align: "right" },
          { header: "Land needed for a title", align: "right" },
          { header: "Effect" },
        ]}
        rows={factionRanks.map((r) => [r.rank, r.prestige, r.ofTop, r.deJure, r.effect])}
      />
      <P>Low stability raises the land you need for a title by up to 30 points.</P>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionLandCommands} />
    </FactionsGuidePage>
  );
}
