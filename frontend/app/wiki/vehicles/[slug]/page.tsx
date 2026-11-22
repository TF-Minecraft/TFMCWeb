import Link from "next/link";
import { notFound } from "next/navigation";
import { Callout, DataTable, StationLink, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { getSeatCounts, getVehicleBySlug, vehicles } from "../../data/vehicles";
import VehiclePreview from "../VehiclePreview";

export function generateStaticParams() {
  return vehicles.map(({ slug }) => ({ slug }));
}

export default async function VehicleDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) notFound();
  const seats = getSeatCounts(vehicle);
  const seatless = seats.total === 0;
  return (
    <WikiPage lastModified="2026-11-21" title={vehicle.name}>
      <Link href="/wiki/vehicles" className="text-sm text-[var(--tfmc-accent)] underline">
        All vehicles and operating guide
      </Link>
      <VehiclePreview skins={vehicle.skins} />
      {vehicle.id === "passenger_car" ? (
        <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
          The Passenger Car also has an Open skin. Use Vehicle Paint to select it in game.
        </p>
      ) : null}
      {vehicle.id === "flat_car" ? (
        <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
          The Flat Car has no seats, so riders stand on its deck. Right-click the car and click the chest in its menu to
          open its hold. A train on a recorded route can load and unload it at{" "}
          <Link href="/wiki/vehicles#cargo-docks" className="underline">
            cargo docks
          </Link>
          .
        </p>
      ) : null}
      <WikiSectionHeading id="blueprint">Build blueprint</WikiSectionHeading>
      <DataTable
        columns={[{ header: "Requirement" }, { header: "Details" }]}
        rows={[
          ["Construction station", <StationLink key="station" name={vehicle.station} />],
          ["Category", vehicle.kind],
          ["Personal limit", vehicle.personalLimit],
          ["Daily upkeep", vehicle.upkeep ? `${vehicle.upkeep} d` : "None"],
          ["Profession", vehicle.requirement],
          ["Build time", vehicle.buildTime],
        ]}
      />
      <DataTable
        className="mt-4"
        columns={[{ header: "Material" }, { header: "Quantity", align: "right" }]}
        rows={vehicle.inputs.split(", ").map((input) => {
          const [qty, ...name] = input.split(" ");
          const itemName = name.join(" ");
          return [<WikiItemLink key={input} name={itemName} />, qty];
        })}
      />
      <p className="mt-4 text-sm text-[var(--tfmc-mist)]">
        Choose this blueprint at the station, stand where you want the vehicle, within 12 blocks of the station, and
        left-click within 30 seconds. The materials are taken from your inventory on that click. If your faction charges a
        Registration Fee, that click shows the fee: left-click again to pay it from your personal bank and start the
        build. The finished vehicle
        appears once a player is within 96 blocks.{seatless ? "" : " Right-click it to pick a seat."} Breaking the
        station during the build cancels it and drops the materials at the station.
      </p>
      <WikiSectionHeading id="specifications">Specifications</WikiSectionHeading>
      <DataTable
        columns={[{ header: "Feature" }, { header: "Details" }]}
        rows={[
          ["Seats: captain / mechanic / passenger", vehicle.seats],
          ["Fuel", <WikiItemLink key="fuel" name={vehicle.fuel} />],
          ["Mounted weapons", vehicle.weapons],
          ["Cargo", vehicle.cargo],
        ]}
      />
      {vehicle.fuelStats ? (
        <>
          <WikiSectionHeading id="fuel">Fuel tank</WikiSectionHeading>
          <DataTable
            columns={[{ header: "Capacity" }, { header: "Items to fill" }]}
            rows={[[vehicle.fuelStats.capacity, vehicle.fuelStats.items]]}
          />
          <Callout>
            Hold <WikiItemLink name={vehicle.fuel} /> and right-click the vehicle once per item. Each one adds 100 fuel.{" "}
            {vehicle.fuel === "Arcane Fuel" ? (
              <>
                Stop the engine before you add <WikiItemLink name="Arcane Fuel" />.
              </>
            ) : (
              "Coal Blocks can go in while the engine runs."
            )}{" "}
            {vehicle.category === "planes" || vehicle.category === "airships"
              ? vehicle.id === "behemoth"
                ? "The Behemoth can also refuel and reload in flight."
                : vehicle.weapons === "N/A"
                  ? "Land before you refuel."
                  : "Land before you refuel. Bomb bays and the Monoplane's and Biplane's front rifles also reload on the ground only. Other mounted guns can reload in flight."
              : null}{" "}
            A running engine burns fuel at the same rate at any throttle, so going slowly saves nothing. At zero
            throttle it burns none.
            {vehicle.category === "train" ? " Above 100% throttle it burns more." : null}
          </Callout>
        </>
      ) : (
        <Callout>
          This vehicle needs no fuel.{" "}
          {vehicle.fuel.includes("wind")
            ? "Its sails use the wind."
            : "Train cars follow the train they are coupled to, and fixed guns have no engine."}
        </Callout>
      )}
      {vehicle.category === "train" ? (
        <Callout variant="warning">
          Build this on <WikiItemLink name="Train Track" />. See{" "}
          <Link href="/wiki/vehicles#tracks" className="underline">
            Train tracks
          </Link>
          .
        </Callout>
      ) : null}
      {vehicle.id === "small_car" ? (
        <Callout>
          Start the engine before you drive and use the gears to go faster. Space switches the headlights on and off,
          and left-click sounds the horn. Run <code className="text-[var(--tfmc-accent)]">/vf keybinds</code> in the
          seat for the other keys.
        </Callout>
      ) : null}
      <WikiSectionHeading id="operating">Operate and maintain</WikiSectionHeading>
      <p className="text-sm text-[var(--tfmc-mist)]">
        {seatless ? (
          <>The car follows the train it is coupled to. </>
        ) : (
          <>
            Right-click it to pick a seat.{" "}
            {seats.captain > 0 ? (
              <>
                Only the captain steers. Run <code className="text-[var(--tfmc-accent)]">/vf keybinds</code> in your
                seat to see this vehicle&apos;s keys.{" "}
              </>
            ) : null}
            {vehicle.category === "airships"
              ? "To open the seat menu again, sneak and left-click, because sneak alone makes a flying airship go down."
              : vehicle.category === "planes"
                ? "To open the seat menu again, sneak and left-click, because you hold sneak to steer and set the throttle."
                : "Sneak to open the seat menu again."}{" "}
          </>
        )}
        Use{" "}
        <Link href="/wiki/vehicles#repair" className="underline">
          Vehicle Repair
        </Link>{" "}
        from outside while the vehicle is on the ground and not moving
        {seats.mechanic > 0 ? ", or from a mechanic seat" : ""}.
      </p>
      <p className="mt-3 text-sm text-[var(--tfmc-mist)]">
        {seatless ? (
          "The owner can always open the hold, and so can the faction of a faction-owned car. A car you build starts with its whitelist on. While it is on, characters on the list and members of the switched-on groups can open the hold too. A ticket doesn't open it."
        ) : (
          <>
            A vehicle you build starts with its whitelist on, so only you and the characters and groups you allow can
            board. One you claim, are given or inherit starts with it off, so anyone can board. Change it in{" "}
            <Link href="/wiki/vehicles#ownership" className="underline">
              Ownership Settings
            </Link>
            .
          </>
        )}{" "}
        With no player within 160 blocks, the vehicle is put into storage, not destroyed.{" "}
        <code className="text-[var(--tfmc-accent)]">/vf findvehicles</code> lists your vehicles.
        {vehicle.category === "train" ? (
          <>
            {" "}
            A train on a recorded route with fuel and nobody aboard keeps running instead (see{" "}
            <Link href="/wiki/vehicles#routes" className="underline">
              Teach a train a route
            </Link>
            ).
          </>
        ) : null}
      </p>
      <Link href="/wiki/vehicles#operation" className="mt-4 inline-block text-[var(--tfmc-accent)] underline">
        Full driving, weapons, repair, storage and ownership guide
      </Link>
    </WikiPage>
  );
}
