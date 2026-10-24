import Link from "next/link";
import { Callout, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function TrialRoomsPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Trial Rooms"
      intro="Trial Rooms are a dungeon crawl. Use an Unknown Key to get in, fight the monsters that guard each room, and open chests with the keys they leave behind."
    >
      <WikiSectionHeading id="key">The Unknown Key</WikiSectionHeading>
      <p className={body}>
        You need an <strong>Unknown Key</strong> to get in. One can turn up in the Arcane Cache you dig up with an{" "}
        <Link href="/wiki/arcane-trace-detector" className={link}>
          Arcane Trace Detector
        </Link>
        . Finding the entrance is up to you.
      </p>

      <WikiSectionHeading id="entering">Getting in</WikiSectionHeading>
      <p className={body}>
        The entrance is a lodestone with a green ring of particles around it. Stand in the ring, hold the Unknown Key in
        your main hand and right-click. The key is used up and you are taken inside. Each key lets one person in, so
        everyone in your group needs their own.
      </p>

      <WikiSectionHeading id="inside">Inside</WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Natural healing is off while you are inside. Bring potions or other ways to heal.</li>
        <li>Players inside can&apos;t hit each other in melee.</li>
      </ul>

      <WikiSectionHeading id="spawners">Spawners</WikiSectionHeading>
      <p className={body}>
        Each room is guarded by a spawner with its level shown above it. Walk close and it wakes up. Doors seal the area
        and it releases its monsters. Higher levels mean tougher monsters that hit harder. Kill them all and the doors
        open, and the spawner drops a key.
      </p>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Monsters from a spawner can drop a key of their own when they die.</li>
        <li>A cleared spawner rests for an hour before it can be fought again.</li>
        <li>
          If everyone walks away during the fight, the monsters vanish and the spawner rests without dropping a key.
        </li>
      </ul>

      <WikiSectionHeading id="chests">Chests</WikiSectionHeading>
      <p className={body}>
        Some chests are always there. Others belong to a spawner. They appear when it is cleared and disappear again
        when its hour of rest is over, so open them in time. Hold a key and right-click a chest. The key is used up, the
        chest vanishes and its loot pops out onto the ground. Any key opens any chest. Each key has a rarity, and its
        description lists what it can give.
      </p>

      <WikiSectionHeading id="leaving">Leaving</WikiSectionHeading>
      <p className={body}>
        Walk into the red ring of particles at the exit to return to the entrance. Natural healing comes back.
      </p>
      <Callout className="mt-4" title="Trial potions turn into money">
        Some potions you find inside say in their description that they convert to denars on exit. Any of those you
        still carry when you leave are taken and paid out in denars. Drink them inside if you would rather use them.
      </Callout>

      <SeeAlso hrefs={["/wiki/arcane-trace-detector", "/wiki/materials"]} />
    </WikiPage>
  );
}
