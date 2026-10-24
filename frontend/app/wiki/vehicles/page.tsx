import Link from "next/link";
import {
  Callout,
  CommandTable,
  DataTable,
  RankName,
  SeeAlso,
  StationLink,
  StatGrid,
  WikiItemLink,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { vehicleAmmunition, vehicleCommands, vehicleTrackItems, vehicles, vehicleWeapons } from "../data/vehicles";
import VehicleGallery from "./VehicleGallery";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import { constructionStations } from "../data/vehicle-construction";

const linkClass = "text-[var(--tfmc-accent)] underline";
const ammoName = (name: string) => {
  if (name.includes("cannonball") && name.includes("clusterbomb")) {
    return (
      <>
        <WikiItemLink name="Cannonball" /> (+ <WikiItemLink name="Clusterbomb" /> on some)
      </>
    );
  }
  const display = name
    .replaceAll("flak_bullet", "Flak Shells")
    .replaceAll("bullet", "Bullet Box")
    .replaceAll("cannonball", "Cannonball")
    .replaceAll("clusterbomb", "Clusterbomb");
  return <WikiItemLink name={display} />;
};

const ammunitionName = (name: string) => {
  const display = name === "Bullets" ? "Bullet Box" : name;
  const canonical = name === "Small Bomb (rack)" ? "Small Bomb Rack" : display;
  return <WikiItemLink name={canonical}>{display}</WikiItemLink>;
};

export default function VehiclesPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Vehicles & Construction"
      width="lg"
      intro="Build a cart, crew a ship or fly an airship. Choose a vehicle below for its materials, build time, fuel and 3D preview."
    >
      <StatGrid
        stats={[
          { label: "Vehicles", value: 21 },
          { label: "Construction", value: "2 hours to 3 days" },
          { label: "Air vehicle unlock", value: "6 Crafter points total" },
        ]}
      />
      <WikiSectionHeading id="catalogue">Choose a vehicle</WikiSectionHeading>
      <VehicleGallery vehicles={vehicles} />
      <WikiSectionHeading id="construction">Build your first vehicle</WikiSectionHeading>
      <ol className="list-decimal space-y-3 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          Open <code className="text-[var(--tfmc-accent)]">/professions</code> and buy Engineer ranks in the{" "}
          <Link href="/wiki/characters" className={linkClass}>
            Crafter profession
          </Link>
          . Engineer I costs 1 point for ground vehicles. Engineer II requires I and costs 2 more points for ships.
          Engineer III requires II and costs 3 more points for aircraft.
        </li>
        <li>
          Craft and place an <StationLink name="Engineering Table" /> for land vehicles, fixed guns and aircraft, or a{" "}
          <StationLink name="Dockyard" /> for ships. Use the crafting-table patterns below.
        </li>
        <li>
          Right-click the station, choose a category and select a blueprint that your Engineer rank unlocks. Gather its
          listed materials before selecting the building spot.
        </li>
        <li>
          Stand where you want the vehicle to appear, within 12 blocks of the station, and left-click. Do this within 30
          seconds of selecting the blueprint. The materials are consumed when you choose the spot.
        </li>
        <li>
          Wait for the build to finish. Stay within 96 blocks so the completed vehicle can appear, then right-click it
          to select a seat. It already belongs to you, with whitelisting on.
        </li>
      </ol>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {constructionStations.map((recipe) => (
          <CraftingGrid key={recipe.key} recipe={recipe} />
        ))}
      </div>
      <Callout title="A cargo cart to start with">
        The{" "}
        <Link href="/wiki/vehicles/wooden-cart" className={linkClass}>
          Wooden Cart
        </Link>{" "}
        needs Engineer I, 64 Oak Logs, 16 Iron Ingots and 16 Sticks. It takes two hours to build and carries 54 cargo
        slots.
      </Callout>
      <Callout variant="warning">
        Breaking the construction station during a build cancels construction and drops the materials at the station.
        Collect them before they despawn.
      </Callout>
      <WikiSectionHeading id="operation">Enter, drive, refuel and tow</WikiSectionHeading>
      <ol className="list-decimal space-y-3 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          <strong>Enter:</strong> right-click the vehicle and choose a seat. Shift reopens seat selection while aboard.
          In aircraft and airships, use Shift + left-click; in a flying airship, Shift alone descends. Only the captain
          steers.
        </li>
        <li>
          <strong>Drive:</strong> run <code className="text-[var(--tfmc-accent)]">/vf keybinds</code> while seated to
          see the controls for your vehicle. W/S commonly adjusts throttle and A/D steers. Controls can change between
          ground, flight and water.
        </li>
        <li>
          <strong>Refuel:</strong> hold the fuel listed on the vehicle page and right-click once per item. Each Coal
          Block or <WikiItemLink name="Arcane Fuel" /> adds 100 fuel units. Stop an <WikiItemLink name="Arcane Fuel" />{" "}
          engine before refuelling; Coal Blocks can be added while an engine runs. Aircraft and airships must be on the
          ground to refuel, except the Behemoth, which can also refuel in flight.
        </li>
        <li>
          <strong>Carry cargo:</strong> sit in the seat assigned to the hold, then right-click to open it. Each vehicle
          page lists its cargo seats and capacity.
        </li>
        <li>
          <strong>Tow:</strong> sneak-right-click Field Artillery, then sneak-right-click a Horse Cart or Wooden Cart to
          connect it. Keep the artillery within 4 blocks of the cart’s hitch. Sneak-right-click the cart again to
          detach. Only Field Artillery can be towed.
        </li>
      </ol>
      <Callout title="Save fuel by stopping the engine">
        Fuel burns at the same rate at any throttle above or below zero; zero throttle uses none. Locomotive overdrive
        above 100% burns more. A damaged engine also limits maximum throttle and can fail to start, so repair it to
        restore power.
      </Callout>
      <WikiSectionHeading id="ownership">Ownership and passengers</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        A finished build already belongs to its builder, with whitelisting on. Claiming an unowned vehicle, receiving a
        handover or receiving a faction vehicle starts with whitelisting off. Open Ownership Settings in Select Seat and
        turn it on to control who can board. Add players by name or enable passenger tickets. With tickets enabled, hold
        Paper and right-click your vehicle to make matching tickets. Remove Ownership releases the vehicle, and the next
        player to right-click it claims it. Clicking an occupied yellow seat ejects its passenger and prevents re-entry
        for 60 seconds.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Use <code className="text-[var(--tfmc-accent)]">/vf findvehicles</code> to locate your vehicles. Vehicles more
        than 160 blocks from players unload into storage; they are not destroyed.
      </p>
      <WikiSectionHeading id="limits">Personal limits and upkeep</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        You can own three personal vehicles in total. Trains do not count toward this total, including the Locomotive.
        Each type also has its own limit. You can own one of each type, except Horse Carts, Wooden Carts, Small Cars,
        Coal Cars and Passenger Cars, which allow three each. Construction is refused when you reach a limit. Each
        vehicle page lists its daily upkeep, paid from the owner&apos;s bank.
      </p>
      <WikiSectionHeading id="faction-vehicles">Faction vehicles</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        The faction leader runs <code>/faction vehicle transfer &lt;installation-id|pool&gt;</code>, then right-clicks
        the vehicle within 60 seconds. The leader’s own vehicle moves at once. For another owner’s vehicle, that owner
        must be online, within 20 blocks and confirm with <code>/faction accept</code> within 60 seconds. To berth at an
        installation, the vehicle must be within its 80-block radius.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Installation" }, { header: "Vehicles and slots" }]}
        rows={[
          ["Port", "Ships, 8 slots"],
          ["Airport", "Aircraft and airships, 10 slots"],
          [
            "Fort",
            "8 emplacement slots for Anti-Air Turret, Anti-Air and Fixed Artillery, plus 2 land-vehicle slots for carts and Small Cars",
          ],
          ["Train Station", "Emplacements only, 2 slots at level 1, 3 at level 2 and 4 at level 3"],
        ]}
      />
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Each vehicle uses one slot, except the Cruiser, Bomber and Gyrobomber, which use two, and the Behemoth, which
        uses four. The faction pool accepts only trains and Field Artillery. Vehicles that can berth at an installation
        cannot enter the pool. Each Field Artillery piece needs a Field Artillery regiment slot; factions start with
        none. Faction vehicle upkeep comes from the main guild bank.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Nobody can claim a berthed or pool vehicle. The faction leader becomes its owner, and faction members can always
        board. The leader can also allow Allies and Vassals in Ownership Settings. Use{" "}
        <code>/faction findvehicles &lt;installation id or name&gt;</code> to locate installation vehicles.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        The leader runs <code>/faction vehicle take</code>, then right-clicks the vehicle to make it personal again. To
        give it to someone else, run <code>/faction vehicle give &lt;player&gt;</code>, then right-click it. The
        recipient must be online and accept with <code>/faction accept</code>. Berthing and unberthing are blocked at
        installations under a battle or raid embargo. See{" "}
        <Link href="/wiki/war#in-battle" className={linkClass}>
          vehicle restrictions during campaign battles
        </Link>
        .
      </p>
      <WikiSectionHeading id="repair">Repair and repaint</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Hold Vehicle Repair and right-click a grounded, stationary vehicle, or use a mechanic seat to repair while
        aboard. Use the Repair Tool in the menu to fix components and the Water Bucket for fires. Keep the menu open and
        stay nearby until repair finishes. Hold <WikiItemLink name="Vehicle Paint" /> and right-click to open Select
        Skin. Vehicle Paint works on any vehicle and is not used up. To rename any vehicle, right-click it with a Name
        Tag and type the name in chat.
      </p>
      <DataTable
        className="mt-4"
        columns={[
          {
            header: (
              <>
                <StationLink name="Engineer Station" /> tool
              </>
            ),
          },
          { header: "Materials" },
          { header: "Time" },
          { header: "Requirement" },
        ]}
        rows={[
          ["Vehicle Repair", "4 Iron Ingots", "5 seconds", "Vehicle Mechanic profession"],
          [
            <WikiItemLink key="paint" name="Vehicle Paint" />,
            <>
              1 <WikiItemLink name="Common Item Skin Scroll" />
            </>,
            "5 seconds",
            <>
              Vehicle Mechanic and <RankName rank="Gilded" /> rank or higher
            </>,
          ],
        ]}
      />
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Vehicle Mechanic costs two Crafter profession points. Keep ship pumps repaired to control flooding. Repair
        damaged engines and wings to recover performance.
      </p>
      <WikiSectionHeading id="skins">Preview skins</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Choose a vehicle above, then select one of its available skins beside the preview. In game, use{" "}
        <WikiItemLink name="Vehicle Paint" /> to choose from the skins available to you.
      </p>
      <WikiSectionHeading id="weapons">Mounted weapons and ammunition</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Choose the seat assigned to a weapon. Hold its ammunition and right-click to reload, then use Space to fire. W/S
        adjusts elevation and A/D traverses; mounted rifles aim toward your cursor. Check{" "}
        <code className="text-[var(--tfmc-accent)]">/vf keybinds</code> for the controls of your current seat.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Weapon" }, { header: "Reload" }, { header: "Ammunition" }]}
        rows={vehicleWeapons.map((row) => [row[1], row[2], ammoName(row[4])])}
      />
      <DataTable
        className="mt-4"
        columns={[{ header: "Ammunition" }, { header: "Rounds per item" }]}
        rows={vehicleAmmunition.map((row) => [ammunitionName(row[0]), row[3]])}
      />
      <Callout>
        Reload only when the weapon is empty. Each barrel needs one ammunition item, so the Biplane’s two-barrel Front
        Rifles need two Bullet Boxes for 200 rounds. Land to reload bomb bays and the Monoplane's or Biplane's front
        rifles. Other mounted guns can reload in flight.{" "}
        <WikiItemLink name="Small Bomb Rack">Small Bomb Racks</WikiItemLink> supply eight bombs per load. Mounted
        weapons use vehicle ammunition from the <StationLink name="Engineer Station" />.
      </Callout>
      <Callout variant="warning">
        <WikiItemLink name="Cannonball">Cannonballs</WikiItemLink> and bombs can damage terrain.{" "}
        <WikiItemLink name="Cannonball">Cannonballs</WikiItemLink> can also start fires and apply Poison for ten
        seconds.
      </Callout>
      <WikiSectionHeading id="tracks">Train tracks</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Build trains on custom <WikiItemLink name="Train Track">train tracks</WikiItemLink>. Craft{" "}
        <WikiItemLink name="Train Track" /> in batches of 64 at the <StationLink name="Block Station" />. Leave room for
        wide bends and gentle slopes: turns have a 35-degree limit, and slopes have a 10-degree maximum.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Track item" }, { header: "Use" }]}
        rows={vehicleTrackItems.map((row) => [<WikiItemLink key={row[0]} name={row[0]} />, row[2]])}
      />
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Craft these tools at the <StationLink name="Engineer Station" />. Sneak-right-click a train car, then
        sneak-right-click the next vehicle to couple them. Use A/D as you approach a junction to choose the direction.
        Couple a Coal Car behind the Locomotive and fill its Coal Bunker with Coal Blocks to refuel the engine along the
        way.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        On a track that loops back on itself, the Locomotive&apos;s owner can teach it the route. Right-click the
        Locomotive with a Train Track Recorder and drive one full lap; right-click again to cancel. Then
        sneak-right-click the Locomotive with the recorded Recorder to load the tape, leave the driver&apos;s seat, and
        it drives that lap by itself. A tape only fits the track it was recorded on. Sneak-right-click with an empty
        hand to take the tape back out.
      </p>
      <WikiSectionHeading id="horses">Hitch horses to a cart</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Lead a horse, donkey or mule, then right-click the cart to hitch it. Each cart has two harness spots, and each
        animal adds speed. Right-click the cart with a Lead to unhitch. Carts and the Small Car stop in water.
      </p>
      <WikiSectionHeading id="destruction">Losing a vehicle</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        A vehicle is destroyed when its hull reaches 0 HP, a fire burns it out or a ship reaches 100% flooding. Aircraft
        can explode when they hit a block at speed or land badly. Cargo drops on the ground. A destroyed vehicle is gone
        for good and frees its personal limit slot.
      </p>
      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={vehicleCommands.commands} />
      <SeeAlso hrefs={["/wiki/characters", "/wiki/materials", "/wiki/stations", "/wiki/commands"]} />
    </WikiPage>
  );
}
