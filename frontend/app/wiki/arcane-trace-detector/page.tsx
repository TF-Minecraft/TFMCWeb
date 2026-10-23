import { Callout, StationLink, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import { detectorRecipes } from "../data/detector";

const body = "text-sm text-[var(--tfmc-mist)]";

export default function ArcaneTraceDetectorPage() {
  return (
    <WikiPage
      lastModified="2026-10-23"
      title="Arcane Trace Detector"
      width="lg"
      intro="An Arcane Trace Detector leads you to an Arcane Cache buried somewhere far away. Each character has their own cache, and nobody else can see or open it."
    >
      <WikiSectionHeading
        id="craft"
        intro={
          <>
            Everything is made at the <StationLink name="Engineer Station" />, and anyone can craft it.
          </>
        }
      >
        Making a detector
      </WikiSectionHeading>
      <p className={body}>
        The station makes an <WikiItemLink name="Unpowered Trace Detector" />. Combine it with one{" "}
        <WikiItemLink name="Arcane Fuel" /> to power it up. One fuel is good for one cache, and a single craft makes 16
        fuel.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {detectorRecipes.map((r) => (
          <CraftingGrid key={r.key} recipe={r} />
        ))}
      </div>

      <WikiSectionHeading id="hunt">Following the signal</WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Hold a powered detector in either hand while playing a character in the main world. The first time you do,
          your cache is buried somewhere far from where you stand. It stays there, even over restarts, until you dig it
          up.
        </li>
        <li>
          Rings of particles appear around you, the detector clicks, and an <strong>Arcane Signal</strong> bar shows at
          the top of the screen. Only you can see and hear them.
        </li>
        <li>
          Walk and watch the signal. The closer you get, the more rings you see, the more their colour turns from dark
          purple to bright purple and then white, the faster the clicks and the fuller the bar.
        </li>
        <li>
          When you are nearly there, the bar is renamed <em>Arcane Signal - dig close by</em> and starts again from
          empty, and the clicks drop back to slow. From there both build up again as you close in, until the clicks
          become a steady stream right on top of the cache. The rings and colour only measure distance across the
          ground, while the clicks and the bar also count how deep the cache is.
        </li>
        <li>Dig down. Once you are close, a chest only you can see appears. Click it to open the Arcane Cache.</li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Take your reward. Anything you leave in the cache goes into your inventory when you close it, or drops at your
        feet if your inventory is full. Chat says <em>You found the arcane source! Your detector is spent.</em> and the
        detector turns back into an Unpowered Trace Detector, ready for another fuel. Your next cache is buried the next
        time you hold a powered detector.
      </p>

      <WikiSectionHeading id="limits">Limits</WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>
          You can open one cache every 23 hours 30 minutes. The limit is per player, so switching characters
          doesn&apos;t give you another. If you reach a cache too early, it tells you how long to wait, and both the
          cache and your powered detector stay as they are.
        </li>
        <li>
          If the cache lies under protected land you can&apos;t dig, chat says <em>This ground is warded</em> and the
          cache moves somewhere else.
        </li>
        <li>If you wander very far from your cache, it is buried again closer to you.</li>
      </ul>
      <Callout title="Events">
        During some events, staff switch the detectors to a single shared cache that everyone hunts at once.
      </Callout>
    </WikiPage>
  );
}
