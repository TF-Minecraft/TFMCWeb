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
      lastModified="2026-11-21"
      title="Vehicles & Construction"
      width="lg"
      intro="Build a cart, crew a ship or fly an airship. Choose a vehicle below for its materials, build time, fuel and 3D preview."
    >
      <StatGrid
        stats={[
          { label: "Vehicles", value: vehicles.length },
          { label: "Construction", value: "5 minutes to 3 days" },
          { label: "Armed aircraft unlock", value: "6 Crafter points total" },
        ]}
      />
      <WikiSectionHeading id="catalogue">Choose a vehicle</WikiSectionHeading>
      <VehicleGallery vehicles={vehicles} />
      <WikiSectionHeading id="construction">Build your first vehicle</WikiSectionHeading>
      <ol className="list-decimal space-y-3 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          Open <code className="text-[var(--tfmc-accent)]">/profession</code> and buy the Engineer perk your vehicle
          needs in the{" "}
          <Link href="/wiki/classes#professions" className={linkClass}>
            Crafter profession
          </Link>
          . The Small Car, Wooden Cart, Scout, Windrider and Karve need no perk, so skip this step for those 5.
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Engineer I costs 1 point. It unlocks land vehicles, trains and fixed guns: the Horse Cart, Simple
              Locomotive, Coal Car, Flat Car, Passenger Car, Anti-Air Turret, Anti-Air, Field Artillery and Fixed
              Artillery.
            </li>
            <li>Engineer II needs Engineer I and costs 2 more points. It unlocks ships.</li>
            <li>
              Engineer III needs Engineer II and costs 3 more points. It unlocks planes and airships. That is 6 points
              in all.
            </li>
          </ul>
        </li>
        <li>
          Craft and place a station with one of the recipes below. A <StationLink name="Dockyard" /> builds ships, under
          the categories Wooden Ships and Iron Ships. An <StationLink name="Engineering Table" /> builds everything
          else, under Cars, Carts, Train, Fixed Guns, Planes and Airships.
        </li>
        <li>
          Right-click the station, pick a category and then a blueprint your perk unlocks. You need the blueprint&apos;s
          materials in your inventory.
        </li>
        <li>
          Stand where you want the vehicle, within 12 blocks of the station, and left-click within 30 seconds of
          choosing the blueprint. The materials are taken from your inventory on that click.
        </li>
        <li>
          If{" "}
          <Link href="/wiki/factions#government" className={linkClass}>
            your faction
          </Link>{" "}
          charges a Registration Fee, the first left-click shows the fee. Left-click again to pay it from your{" "}
          <Link href="/wiki/economy#accounts" className={linkClass}>
            personal bank
          </Link>{" "}
          and start the build. Faction leaders and players with no faction pay no fee.
        </li>
        <li>
          Right-click the station during the build to see its progress. As the builder, you can cancel from that menu.
          The materials come back to your inventory and any that don&apos;t fit drop at your feet. The fee goes back to
          your bank.
        </li>
        <li>
          Wait for the build to finish. The vehicle appears in the world, not in your inventory, once a player is within
          96 blocks. Right-click it to pick a seat.
        </li>
      </ol>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        A build stops counting down while your faction or mercenary company is in a{" "}
        <Link href="/wiki/war#buildup" className={linkClass}>
          war buildup
        </Link>{" "}
        or has a postponed battle. The station shows why.
      </p>
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
        costs 16 Oak Logs, 8 Iron Ingots and 8 Sticks. It takes 5 minutes to build and has 54 cargo slots.
      </Callout>
      <Callout variant="warning">
        Breaking the station during a build cancels it and drops the materials at the station. Collect them before they
        disappear.
      </Callout>
      <WikiSectionHeading id="operation">Enter, drive, refuel and tow</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        <strong>Enter:</strong> right-click a vehicle and choose a seat. Only the captain steers. The Flat Car has no
        seats, so riders stand on its deck. While aboard, sneak to open the seat menu again. In a plane or airship,
        sneak and left-click instead. Sneak alone makes a flying airship go down, and in a plane you hold sneak to steer
        and set the throttle.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        <strong>Drive:</strong> run <code className="text-[var(--tfmc-accent)]">/vf keybinds</code> in your seat to see
        the keys for what the vehicle is doing right now. W and S usually set the throttle and A and D steer. Some
        vehicles differ:
      </p>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>Carts: W and S move forwards and backwards.</li>
        <li>Simple Locomotive: A and D pick the branch at a junction.</li>
        <li>
          Planes: hold sneak and press W or S for the throttle, A or D to turn. In flight, W and S on their own tilt the
          nose and A and D roll.
        </li>
        <li>Airships: Space goes up and sneak goes down.</li>
      </ul>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        <strong>Refuel:</strong> hold the fuel listed on the vehicle&apos;s page and right-click the vehicle once per
        item. Each Coal Block or <WikiItemLink name="Arcane Fuel" /> adds 100 fuel. Coal Blocks can go in while the
        engine runs, but stop an Arcane Fuel engine first. Planes and airships refuel on the ground only, except the
        Behemoth, which also refuels and reloads in flight.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        <strong>Carry cargo:</strong> to open a hold, sit in the seat that belongs to it and right-click. The Flat
        Car&apos;s hold has no seat: right-click the car and click the chest in its menu. Each vehicle&apos;s page lists
        the hold&apos;s seat and how many slots it has.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        <strong>Tow:</strong> Field Artillery is the only vehicle that can be towed. Sneak and right-click it, then
        sneak and right-click a Horse Cart or Wooden Cart to hitch it. Keep the artillery within 4 blocks of the
        cart&apos;s hitch. Sneak and right-click the cart again to unhitch.
      </p>
      <Callout title="Going slowly doesn't save fuel">
        A running engine burns fuel at the same rate at any throttle, forwards or backwards. At zero throttle it burns
        none, so bring the throttle to zero while you wait. Pushing the Simple Locomotive above 100% throttle
        (overdrive) burns more.
      </Callout>
      <WikiSectionHeading id="ownership">Ownership and passengers</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Every vehicle has a whitelist, a list of the characters allowed aboard. The owner switches it on or off. With it
        on, only the owner, the characters on the list and members of the groups the owner has switched on can board.
        Anyone else can take a passenger seat only with a ticket for that vehicle, and only while tickets are on. With
        it off, anyone can board.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        A vehicle you build starts with the whitelist on. One you claim, are given, take out of the faction or inherit
        starts with it off and the list emptied. When a vehicle becomes a{" "}
        <Link href="#faction-vehicles" className={linkClass}>
          faction vehicle
        </Link>{" "}
        or{" "}
        <Link href="#upkeep-only" className={linkClass}>
          upkeep-only
        </Link>
        , the list is emptied and the groups are switched off, but the whitelist stays on or off as it was.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">The owner opens Ownership Settings from the seat menu.</p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Setting" }, { header: "What it does" }]}
        rows={[
          ["Whitelisting", "Switches the whitelist on or off."],
          [
            "Add to Whitelist",
            "Pick a player who is aboard or within 16 blocks, or type a character's name in chat. The list holds characters, not accounts.",
          ],
          ["View Whitelist", "Shows the list. Click a name to remove it."],
          [
            "Tickets",
            "Switches tickets on or off. While they are on, hold Paper and right-click your vehicle to make a ticket. 1 Paper makes 1 ticket.",
          ],
          [
            "Faction, Guild, Allies, Vassals",
            "Each switch lets that whole group board. Vassals are your faction's subjects. Groups count only while the whitelist is on.",
          ],
          ["Remove Ownership", "Releases the vehicle. The next player to right-click it claims it."],
        ]}
      />
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Claiming a vehicle that someone else last owned can cost your faction&apos;s Transfer Fee. Right-click the
        vehicle again to confirm. When an owner hands a vehicle over, the giver pays the Transfer Fee once the other
        player accepts.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        To throw a passenger out, the owner clicks their seat in the seat menu. Occupied seats are yellow. That
        passenger can&apos;t get back in for 60 seconds.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        <code className="text-[var(--tfmc-accent)]">/vf findvehicles</code> lists your vehicles and where they are. A
        vehicle with no player within 160 blocks is put into storage, not destroyed. The list shows it as &quot;location
        unknown (stored)&quot;, and it comes back when a player comes near. A train on a{" "}
        <Link href="#routes" className={linkClass}>
          recorded route
        </Link>{" "}
        keeps running instead.
      </p>
      <WikiSectionHeading id="limits">Personal limits and upkeep</WikiSectionHeading>
      <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          You can own 3 personal vehicles per account, counted across all its characters. The Simple Locomotive, Coal
          Car, Passenger Car and Flat Car don&apos;t count towards the 3.
        </li>
        <li>
          You can own 1 of each type, or 3 each of the Horse Cart, Wooden Cart, Small Car, Coal Car, Passenger Car and
          Flat Car.
        </li>
        <li>
          <Link href="#faction-vehicles" className={linkClass}>
            Faction vehicles
          </Link>{" "}
          and{" "}
          <Link href="#upkeep-only" className={linkClass}>
            upkeep-only vehicles
          </Link>{" "}
          don&apos;t count.
        </li>
        <li>
          The station refuses a build that would put you over a limit. The same limits apply when you claim a vehicle,
          take one out of the faction or are given one.
        </li>
      </ul>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Most vehicles cost daily upkeep, taken from the owner&apos;s{" "}
        <Link href="/wiki/economy#accounts" className={linkClass}>
          personal bank
        </Link>{" "}
        when the new day starts. Bigger and armed vehicles cost more, and each vehicle&apos;s page lists its upkeep. If
        your bank is short, you get a warning before the charge. Your faction can add a Vehicle Tax, a share of the
        upkeep that is charged with it.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        While upkeep is unpaid, the vehicle&apos;s parts wear down every hour and it can&apos;t be repaired. A floating
        ship never sinks from this and a balloon never loses lift. To pay 1 day, run{" "}
        <code className="text-[var(--tfmc-accent)]">/faction vehicle maintenance pay bank</code>, then right-click the
        vehicle. Upkeep isn&apos;t charged while a dead owner&apos;s estate is pending.
      </p>
      <WikiSectionHeading id="faction-vehicles">Faction vehicles</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        A faction vehicle is either berthed or in the faction pool. Berthed means parked at one of the faction&apos;s{" "}
        <Link href="/wiki/guilds#installations" className={linkClass}>
          installations
        </Link>
        , where it uses that installation&apos;s slots. The pool isn&apos;t tied to a place.
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          The faction leader runs{" "}
          <code className="text-[var(--tfmc-accent)]">/faction vehicle transfer &lt;installation id|pool&gt;</code>.
        </li>
        <li>
          The leader right-clicks the vehicle within 60 seconds. To berth it, the vehicle must be within 80 blocks of
          the installation.
        </li>
        <li>
          The leader&apos;s own vehicle moves at once. Another player&apos;s vehicle moves when its owner runs{" "}
          <code className="text-[var(--tfmc-accent)]">/faction accept</code> within 60 seconds. That owner must be
          online and within 20 blocks.
        </li>
      </ol>
      <DataTable
        className="mt-4"
        columns={[{ header: "Place" }, { header: "Takes" }]}
        rows={[
          ["Port", "Ships"],
          ["Airport", "Planes and airships"],
          ["Fort", "Fixed guns and land vehicles"],
          ["Train station", "Fixed guns"],
          ["Faction pool", "Trains and Field Artillery only"],
        ]}
      />
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        The{" "}
        <Link href="/wiki/guilds#installations" className={linkClass}>
          installations table
        </Link>{" "}
        lists how many slots each installation has. A vehicle uses 1 slot, except the Cruiser, Bomber and Gyrobomber,
        which use 2, and the Behemoth, which uses 4. Each Field Artillery in the pool needs a Field Artillery regiment
        slot, and factions start with none. Upkeep for faction vehicles comes from the main guild bank.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Nobody can claim a berthed or pool vehicle. The faction leader becomes its owner. Its Faction switch is always
        on, so faction members can board while the whitelist is on. With the whitelist off, anyone can board. The leader
        can also switch on Allies and Vassals in Ownership Settings.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        To find vehicles, anyone can run{" "}
        <code className="text-[var(--tfmc-accent)]">/faction findvehicles personal</code>. Only the leader can run it
        with <code className="text-[var(--tfmc-accent)]">pool</code> or an installation id instead of{" "}
        <code className="text-[var(--tfmc-accent)]">personal</code>.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        To make a faction vehicle personal again, the leader runs{" "}
        <code className="text-[var(--tfmc-accent)]">/faction vehicle take</code>, then right-clicks it. To give it to
        another player, the leader runs{" "}
        <code className="text-[var(--tfmc-accent)]">/faction vehicle give &lt;player&gt;</code>, then right-clicks it.
        That player must be online and accept with <code className="text-[var(--tfmc-accent)]">/faction accept</code>.
        Either way, the new owner needs room under their{" "}
        <Link href="#limits" className={linkClass}>
          personal limits
        </Link>
        .
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Neither command works during a{" "}
        <Link href="/wiki/war#in-battle" className={linkClass}>
          campaign battle
        </Link>
        . A vehicle can&apos;t be berthed or taken out at an installation that is under a battle or raid embargo.
      </p>
      <WikiSectionHeading id="upkeep-only">Upkeep-only vehicles</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        A faction or guild can pay the daily upkeep of a vehicle that one of its members owns. That makes it an
        upkeep-only vehicle. A faction pays from its main guild bank and a guild from its own bank. The vehicle must be
        personal: not berthed, not in the pool and not already upkeep-only.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">There are two ways to move a vehicle in:</p>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>
          The leader runs <code className="text-[var(--tfmc-accent)]">/faction vehicle transfer upkeep</code>, then
          right-clicks the vehicle. This works like a{" "}
          <Link href="#faction-vehicles" className={linkClass}>
            faction transfer
          </Link>
          , so another owner&apos;s vehicle still needs its owner to accept.
        </li>
        <li>
          The owner runs <code className="text-[var(--tfmc-accent)]">/faction vehicle upkeep request</code>, then
          right-clicks their own vehicle. The leader gets Approve and Deny buttons, or answers with{" "}
          <code className="text-[var(--tfmc-accent)]">/faction vehicle upkeep approve &lt;id&gt;</code> or{" "}
          <code className="text-[var(--tfmc-accent)]">/faction vehicle upkeep deny &lt;id&gt;</code>. A request with no
          answer lapses after 10 minutes.
        </li>
      </ul>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">Once a vehicle is in:</p>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>It is the leader&apos;s to manage. The old owner can&apos;t take it back and nobody can claim it.</li>
        <li>
          It can&apos;t be used in battles. To fight with it, the faction leader takes it out and berths it or moves it
          to the pool, so a guild leader has to ask them.
        </li>
        <li>If the bank can&apos;t pay, the vehicle goes unpaid like any other and the leader is told.</li>
        <li>No upkeep is charged while the realm or guild is waiting for a new leader.</li>
      </ul>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        A faction can hold 3 upkeep-only vehicles for each member of its realm, and a guild 3 for each of its members.
        Leaders count as members. If members leave and the limit drops, the vehicles already in stay.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        To hand one to a member, the leader runs{" "}
        <code className="text-[var(--tfmc-accent)]">/faction vehicle upkeep give &lt;member&gt;</code>, then
        right-clicks it. The member accepts with <code className="text-[var(--tfmc-accent)]">/faction accept</code>. It
        becomes their personal vehicle, so they need room under their personal limits.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        <code className="text-[var(--tfmc-accent)]">/faction vehicle upkeep</code> lists the upkeep-only vehicles with
        their upkeep, any that are unpaid, the room left and the requests waiting. A guild leader uses the same commands
        under <code className="text-[var(--tfmc-accent)]">/guild vehicle</code>. A member given a guild vehicle still
        accepts with <code className="text-[var(--tfmc-accent)]">/faction accept</code>.
      </p>
      <WikiSectionHeading id="repair">Repair and repaint</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Hold Vehicle Repair and right-click a vehicle that is on the ground and not moving. Aboard, repair from a
        mechanic seat instead. In the menu, the Repair Tool fixes parts and the Water Bucket puts out fires. Keep the
        menu open and stay near the vehicle until the repair finishes.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Hold <WikiItemLink name="Vehicle Paint" /> and right-click a vehicle to open Select Skin. The paint is not used
        up. To rename a vehicle, right-click it with a Name Tag and type the name in chat.
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
          ["Vehicle Repair", "4 Iron Ingots", "5 seconds", "Vehicle Mechanic perk"],
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
        Vehicle Mechanic is a Crafter perk. It costs 2 points and needs no other perk first.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Keep a ship&apos;s pumps repaired to hold back flooding. Repair engines and wings to get performance back. A
        damaged engine limits your throttle and can fail to start.
      </p>
      <WikiSectionHeading id="skins">Preview skins</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Choose a vehicle above, then select one of its available skins beside the preview. In game, use{" "}
        <WikiItemLink name="Vehicle Paint" /> to choose from the skins available to you.
      </p>
      <WikiSectionHeading id="weapons">Mounted weapons and ammunition</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Sit in the weapon&apos;s seat. Hold its ammunition and right-click to reload, then press Space to fire.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        The Mounted Rifle aims where you look. The front rifles on the Monoplane and Biplane fire straight ahead. On
        every other gun, W and S tilt the gun and A and D turn it. Which of W and S tilts it up depends on the gun, so
        check <code className="text-[var(--tfmc-accent)]">/vf keybinds</code> from the seat.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Weapon" }, { header: "Ammunition" }, { header: "Aiming" }]}
        rows={vehicleWeapons.map((row) => [row[1], ammoName(row[2]), row[3]])}
      />
      <DataTable
        className="mt-4"
        columns={[{ header: "Ammunition" }, { header: "Rounds per item" }]}
        rows={vehicleAmmunition.map((row) => [ammunitionName(row[0]), row[3]])}
      />
      <Callout>
        A weapon only reloads when it is empty. Each barrel takes 1 ammunition item, so the Biplane&apos;s 2-barrel
        front rifles need 2 Bullet Boxes for 200 rounds. A <WikiItemLink name="Small Bomb Rack" /> holds 8 bombs per
        load. Bomb bays and the Monoplane&apos;s and Biplane&apos;s front rifles reload on the ground only. Other
        mounted guns can reload in flight. Ammunition for mounted weapons is made at the{" "}
        <StationLink name="Engineer Station" />.
      </Callout>
      <Callout variant="warning">
        <WikiItemLink name="Cannonball">Cannonballs</WikiItemLink> and bombs can damage terrain. Cannonballs can also
        start fires and apply Poison.
      </Callout>
      <WikiSectionHeading id="tracks">Train tracks</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Build your train on <WikiItemLink name="Train Track" />, which you craft 64 at a time at the{" "}
        <StationLink name="Block Station" />. Leave room for wide bends and gentle slopes. Track turns up to 35 degrees
        and slopes up to 10.
      </p>
      <DataTable
        className="mt-4"
        columns={[{ header: "Track item" }, { header: "Use" }]}
        rows={vehicleTrackItems.map((row) => [<WikiItemLink key={row[0]} name={row[0]} />, row[2]])}
      />
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        Craft these tools at the <StationLink name="Engineer Station" />.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        To couple two cars, sneak and right-click one train car, then the next. Couple a Coal Car behind the Simple
        Locomotive and fill its Coal Bunker with Coal Blocks. It then feeds the engine along the way.
      </p>
      <WikiSectionHeading id="routes">Teach a train a route</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        The Simple Locomotive&apos;s owner can teach it a route on any track: one lap of a loop, or a run out along a
        line and back. Only the owner can record a route, load a tape or take it out.
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--tfmc-mist)]">
        <li>Stop the train where the route should start.</li>
        <li>
          Right-click the Locomotive with a <WikiItemLink name="Train Track Recorder" /> to start recording. This erases
          any tape already on that Recorder. A message tells you to drive one lap or out and back.
        </li>
        <li>
          Switch to another item before you board. Right-clicking the Locomotive with the Recorder again cancels the
          recording. Once aboard, hold the Recorder again if you want the finished tape on it.
        </li>
        <li>Drive the route. Stop for 2 seconds or more wherever the train should stop.</li>
        <li>
          On a loop, the recording ends after one lap. On a line, drive to the far end, stop, reverse back to where you
          started, then set off again the way you first went. The recording ends there.
        </li>
      </ol>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        An out-and-back route must run at least 32 blocks and end within 2 blocks of where it started.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        <strong>Where the tape goes:</strong> when the recording ends, the tape goes onto the Recorder if you are
        holding it. If you aren&apos;t, it goes straight into the Locomotive and replaces any tape loaded there.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        <strong>Loading a tape:</strong> take out any tape already loaded. Then sneak and right-click the Locomotive
        with the recorded Recorder, which goes into the Locomotive. A tape only fits the track it was recorded on. If
        you see &quot;That tape does not match this track&quot;, record the route again.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        <strong>Taking it out:</strong> sneak and right-click the Locomotive with an empty hand. The tape comes back to
        you on a Recorder. While a tape is loaded, hold an ordinary block when you sneak and right-click the Locomotive
        to couple it, because an empty hand takes the tape out.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        With a tape loaded and nobody in the driver&apos;s seat, the train drives the route by itself, stops where you
        stopped and sets the junctions the way you went. Anyone who takes the driver&apos;s seat drives it by hand until
        they leave. With no fuel, the train stops following the tape.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        A train on its route keeps running when nobody is near, as long as it has fuel and nobody is aboard, and it uses
        less fuel while it does. It appears where it has got to when a player comes close. While nobody is near, it
        keeps its distance from other trains and waits behind them. Two trains that meet head-on on one line both stop
        and wait. With players close by, trains on the same track can still collide. Give each line one train, or run
        several trains the same way round a loop with room between them.
      </p>
      <WikiSectionHeading id="cargo-docks">Cargo docks</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Craft a <WikiItemLink name="Train Track Dock" /> at the <StationLink name="Engineer Station" />. Without
        sneaking, right-click a chest, barrel, shulker box, hopper, dispenser or dropper that you can open. The first
        click makes it a load dock, the second an unload dock and the third removes the dock. Breaking the block removes
        it too.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        When your train stops at a recorded stop, each car with storage uses the docks within 4 blocks of it. It takes
        items from a load dock and leaves its cargo in an unload dock. A train moves up to 9 stacks at each stop. A car
        only takes the items it accepts, and Coal Cars are skipped. A dock only works with cars owned by the character
        who marked it. Docks keep working while the train runs with nobody near.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        The{" "}
        <Link href="/wiki/vehicles/flat-car" className={linkClass}>
          Flat Car
        </Link>{" "}
        has a 54-slot hold that takes any item. Its owner can always open it, and so can the faction of a faction-owned
        car. While the whitelist is on, characters on the list and members of the switched-on groups can open it too. A
        ticket doesn&apos;t open it.
      </p>
      <WikiSectionHeading id="horses">Hitch horses to a cart</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        Lead a horse, donkey or mule, then right-click the cart to hitch it. Each cart has 2 harness spots, and each
        animal adds speed. Right-click the cart with a Lead to unhitch. Carts and the Small Car stop in water.
      </p>
      <WikiSectionHeading id="destruction">Losing a vehicle</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        A vehicle is destroyed when its hull reaches 0 HP, a fire burns it out or a ship reaches 100% flooding. Planes
        and airships can explode when they hit a block at speed or land badly. A locomotive that runs into another train
        at speed explodes, along with what it hits. At low speed the moving train just stops.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        The cargo drops on the ground. A destroyed vehicle is gone for good and no longer counts towards your personal
        limits.
      </p>
      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={vehicleCommands.commands} />
      <SeeAlso hrefs={["/wiki/characters", "/wiki/materials", "/wiki/stations", "/wiki/commands"]} />
    </WikiPage>
  );
}
