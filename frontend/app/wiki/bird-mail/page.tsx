import Link from "next/link";
import { SeeAlso, StationLink, StatGrid, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import StationModelViewer from "@/app/components/wiki/StationModelViewer";
import { letterRecipe } from "../data/bird-mail";

const code = "text-[var(--tfmc-accent)]";
const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function BirdMailPage() {
  return (
    <WikiPage
      lastModified="2026-10-22"
      title="Letters & Bird Mail"
      intro="Write a letter, seal it, and hand it over yourself or send it by bird to any character on the server."
    >
      <WikiSectionHeading id="letters">Writing a letter</WikiSectionHeading>
      <div className="mt-4">
        <CraftingGrid recipe={letterRecipe} />
      </div>
      <p className={`mt-4 ${body}`}>
        Craft a <WikiItemLink name="Letter" /> from four Paper in a square and write in it like a book. Signing it seals
        it: the title becomes the letter&apos;s name, and the author is not shown. You need to be playing a character to
        sign or edit a letter.
      </p>
      <p className={`mt-3 ${body}`}>
        The seal breaks the first time someone opens the letter to read it, and it becomes an Opened Letter. Putting it
        on a lectern or a chiselled bookshelf, or clicking a door or barrel while holding it, leaves the seal intact.
      </p>

      <WikiSectionHeading id="sending">Sending a letter by bird</WikiSectionHeading>
      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ol className={`list-decimal space-y-2 pl-5 ${body}`}>
          <li>
            Right-click a <StationLink name="Bird Mailbox">bird mailbox</StationLink> without sneaking.
          </li>
          <li>
            Put one <WikiItemLink name="Letter" /> in the slot. It can be blank, sealed or opened, but nothing else can
            travel with it.
          </li>
          <li>
            Pick the recipient from the list of character heads. It shows every living character listed for mail, online
            or offline, except your own.
          </li>
          <li>Click Confirm. The letter leaves your inventory and a bird flies off with it.</li>
        </ol>
        <aside className="min-w-0 rounded-md border border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_55%,transparent)] p-4">
          <div
            className="h-72 w-full overflow-hidden rounded border border-[color-mix(in_srgb,var(--tfmc-cream)_18%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest)_70%,transparent)] sm:h-80"
            aria-label="Interactive 3D preview of Bird Mailbox"
          >
            <StationModelViewer
              modelUrl="/wiki/models/bird-mailbox.json"
              textureUrl="/wiki/textures/bird-mail/mailbox.png"
            />
          </div>
          <h3 className="mt-3 font-[family-name:var(--font-fraunces)] text-lg text-[var(--tfmc-cream)]">
            <StationLink name="Bird Mailbox" />
          </h3>
          <p className={body}>Place it on the floor; it stands 2 blocks tall. Sneak to break it.</p>
        </aside>
      </div>
      <p className={`mt-4 ${body}`}>
        If you close the list without confirming, you get the letter back. The bird cannot fly between worlds, so a
        character in another world is refused at Confirm and the letter stays with you. To keep the character you are
        playing off the list, run <code className={code}>/rpcharacter mail off</code>.
      </p>

      <WikiSectionHeading id="delivery">Delivery</WikiSectionHeading>
      <p className={body}>
        The flight takes a quarter of a second per block between you and the recipient: where they are if they are
        playing that character, otherwise where the character was last.
      </p>
      <StatGrid
        columns={3}
        stats={[
          { label: "Shortest flight", value: "30 seconds" },
          { label: "Longest flight", value: "10 minutes", note: "for about 2,400 blocks or more" },
          { label: "Cost", value: "Free" },
        ]}
      />
      <p className={`mt-3 ${body}`}>
        When the bird arrives, the recipient gets the letter at once if they are playing that character, alive, and have
        a free inventory space. Otherwise it waits, for as long as it takes, until they next play that character, and
        you are told it is waiting. If the recipient&apos;s character dies first, waiting letters go to its heir (see{" "}
        <Link href="/wiki/characters#wills" className={link}>
          wills
        </Link>
        ), or back to you if it has none.
      </p>
      <p className={`mt-3 ${body}`}>
        A recipient with a linked Discord account also gets a Discord message when a bird arrives. It does not say who
        sent the letter or what it says.
      </p>

      <SeeAlso hrefs={["/wiki/characters", "/wiki/server-features"]} />
    </WikiPage>
  );
}
