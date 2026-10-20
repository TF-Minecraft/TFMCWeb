import { Callout, CommandTable, DataTable, WikiSectionHeading } from "@/app/components/wiki";
import { factionInstallationCommands, factionInstallations, factionVehicleUpkeep } from "@/app/wiki/data";

import { Bullets, Cmd, FactionsGuidePage, P } from "../FactionsGuide";

export default function FactionsInstallationsPage() {
  return (
    <FactionsGuidePage
      href="/wiki/factions/installations"
      intro="Installations are the forts, ports, airports and train stations of your faction. They store vehicles, carry trade and matter in war."
    >
      <WikiSectionHeading id="types" intro="Every installation covers an 80-block radius. Upkeep is in denars per day.">
        Types
      </WikiSectionHeading>
      <DataTable
        columns={[
          { header: "Type" },
          { header: "Upkeep", align: "right" },
          { header: "Build time", align: "right" },
          { header: "Holds" },
        ]}
        rows={factionInstallations.map((i) => [i.type, i.upkeep, i.build, i.holds])}
      />
      <Bullets>
        <li>Forts protect nearby land in war and turn battles there into sieges.</li>
        <li>Ports, airports and train stations carry your guilds&apos; trade. Forts do not.</li>
      </Bullets>

      <WikiSectionHeading id="building" intro="Only the leader builds, and building costs time, not money.">
        Building
      </WikiSectionHeading>
      <Bullets>
        <li>
          Stand in your province and run <Cmd>/faction construct &lt;type&gt; &lt;name&gt;</Cmd>. It starts straight
          away, with no confirmation.
        </li>
        <li>One of each type per province, and one build at a time.</li>
        <li>Ports must be within 20 blocks of sea or a river.</li>
        <li>
          Train stations can be upgraded with <Cmd>/faction upgrade &lt;id&gt;</Cmd>.
        </li>
        <li>
          Faction menu, then Installations, lists them all. <Cmd>/faction deconstruct &lt;id&gt;</Cmd> demolishes one or
          cancels a build.
        </li>
      </Bullets>
      <Callout variant="warning">
        Upkeep comes out of the faction bank every day. Each day it cannot be paid, the installation loses a level. A
        level 1 installation is destroyed.
      </Callout>
      <P>
        Outsiders cannot build or break blocks inside your installations, explosions do no damage there, and berthed
        vehicles are safe. That protection is lifted while the installation is part of a battle or raid.
      </P>

      <WikiSectionHeading id="berthing" intro="Faction vehicles are kept at installations or in the faction pool.">
        Faction vehicles
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Vehicle" }, { header: "Kept at" }]}
        rows={[
          ["Ships", "Port"],
          ["Aircraft", "Airport"],
          ["Land vehicles", "Fort"],
          ["Static guns", "Fort or train station"],
          ["Field artillery and trains", "Faction pool"],
        ]}
      />
      <Bullets>
        <li>
          The leader runs <Cmd>/faction vehicle transfer &lt;id|pool&gt;</Cmd> and right-clicks the vehicle within 60
          seconds. It must be inside the installation&apos;s radius.
        </li>
        <li>
          If the vehicle belongs to someone else, its owner must be online, within 20 blocks of it, and accept with{" "}
          <Cmd>/faction accept</Cmd>.
        </li>
        <li>Big vehicles take more than one slot: cruisers, bombers and gyrobombers take 2, behemoths 4.</li>
        <li>Field artillery in the pool needs a Field Artillery regiment slot for each gun.</li>
        <li>Only faction vehicles can be used in war battles.</li>
      </Bullets>

      <WikiSectionHeading id="upkeep" intro="Denars per day.">
        Vehicle upkeep
      </WikiSectionHeading>
      <DataTable
        columns={[{ header: "Group" }, { header: "Upkeep per vehicle" }]}
        rows={factionVehicleUpkeep.map((v) => [v.group, v.vehicles])}
      />
      <Bullets>
        <li>Your own vehicles are paid from your personal bank. Faction vehicles are paid from the faction bank.</li>
        <li>
          An unpaid vehicle loses 20% of its health every hour (never below 3%) and cannot be repaired. Ships stay
          afloat and balloons stay up.
        </li>
        <li>
          To pay a day by hand, run <Cmd>/faction vehicle maintenance pay bank</Cmd> and right-click the vehicle.
        </li>
        <li>You can own 3 vehicles yourself. Train cars do not count.</li>
      </Bullets>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={factionInstallationCommands} />
    </FactionsGuidePage>
  );
}
