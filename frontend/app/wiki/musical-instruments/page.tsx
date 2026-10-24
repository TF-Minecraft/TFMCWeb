import Link from "next/link";
import {
  cx,
  CommandTable,
  SeeAlso,
  StationLink,
  WikiItemLink,
  wikiCard,
  WikiPage,
  WikiSectionHeading,
} from "@/app/components/wiki";
import { instrumentCommands, instruments } from "../data/instruments";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";
const code = "text-[var(--tfmc-accent)]";

export default function MusicalInstrumentsPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Musical Instruments"
      intro={
        <>
          Nine instruments, each with its own sound, crafted at the <StationLink name="Instrument Station" />. Anyone
          can craft and play one, and everyone within 64 blocks hears you. Pick one below to hear it and see its recipe.
        </>
      }
    >
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {instruments.map((inst) => (
          <Link
            key={inst.slug}
            href={`/wiki/musical-instruments/${inst.slug}`}
            className={cx(
              "group flex flex-col items-center gap-2",
              wikiCard,
              "transition-colors hover:border-[var(--tfmc-accent)]",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={inst.icon}
              alt={inst.name}
              className="h-10 w-10 [image-rendering:pixelated] transition-transform duration-150 group-hover:scale-110"
            />
            <p className="font-[family-name:var(--font-fraunces)] text-sm text-[var(--tfmc-cream)]">{inst.name}</p>
          </Link>
        ))}
      </div>

      <WikiSectionHeading id="hotbar" intro="The quickest way to play, and you can keep walking while you do.">
        Playing from the hotbar
      </WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>Put the instrument in your off-hand.</li>
        <li>Press 1 to 8 to play C, D, E, F, G, A, B and the next C up.</li>
        <li>
          Hold Shift for a second layer. Most instruments play a full chord on each key. The{" "}
          <WikiItemLink name="Flute" />, <WikiItemLink name="Trumpet" /> and <WikiItemLink name="Bagpipe" /> play the
          same notes an octave higher instead.
        </li>
        <li>
          After each note your selection jumps back to slot 9, so you can play the same note twice. Slot 9 plays
          nothing, and whatever is in it is what others see in your hand.
        </li>
        <li>
          <code className={code}>/instruments keybinds</code> lists every key for the instrument you hold.
        </li>
      </ul>

      <WikiSectionHeading id="keyboard" intro="Play with the mouse instead of the number keys.">
        The on-screen keyboard
      </WikiSectionHeading>
      <p className={body}>
        Right-click while holding an instrument, or use <code className={code}>/instruments play</code>. The keyboard
        has three rows of notes from C to B: high, middle and low. Click a note to play it. Instruments with chords show
        a small dot under each note: click it for the chord. The options button changes the keyboard&apos;s size.
      </p>

      <WikiSectionHeading id="recording" intro="Record a song in up to four layers and press it onto a music disc.">
        Recording music discs
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Craft a <strong>Music Station</strong> at the <StationLink name="Instrument Station" /> from 6 Spruce Planks,
          4 Glass Panes, 1 Iron Ingot and 1 Black Dye. Place it and right-click it. Stay within a few blocks while you
          use it.
        </li>
        <li>
          Create a song and give it a title. Each character can keep up to 36 songs; right-click one to delete it.
        </li>
        <li>
          Each row is a track, up to four. Hold an instrument and press record on a track. After a 3-second count-in,
          play from your hotbar or the keyboard. A take can last up to 3 minutes.
        </li>
        <li>
          Listen to the take with the other tracks, then keep or discard it. Each track has its own volume and mute.
          Song settings change the title and the metronome, which only you hear and is never recorded.
        </li>
        <li>
          Get a music disc from{" "}
          <Link href="/wiki/fishing" className={link}>
            fishing
          </Link>{" "}
          and place it on <strong>Publish full song</strong>. The disc now plays your song in any jukebox, heard within
          32 blocks, and shows its title and you as the author.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Publishing over a disc that already has a song needs a second click to confirm. Copies made before keep the old
        version. You can publish once every 30 seconds, and up to 20 new or changed versions across your account in any
        24 hours. Publishing an unchanged version again doesn&apos;t count. Every studio button also has a{" "}
        <code className={code}>/music</code> command, and <code className={code}>/music copy</code> copies a recorded
        disc onto a blank one.
      </p>

      <WikiSectionHeading id="faq">If no sound plays</WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          Turn up the <strong>Jukebox/Note Blocks</strong> volume. Instruments, the keyboard and music discs all use it.
        </li>
        <li>For the hotbar, the instrument must be in your off-hand, and slot 9 never plays.</li>
        <li>
          The Lute weapon forged in{" "}
          <Link href="/wiki/advanced-crafting" className={link}>
            Advanced Crafting
          </Link>{" "}
          is not an instrument and can&apos;t be played.
        </li>
      </ul>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={instrumentCommands.commands} />

      <SeeAlso hrefs={["/wiki/stations", "/wiki/commands"]} />
    </WikiPage>
  );
}
