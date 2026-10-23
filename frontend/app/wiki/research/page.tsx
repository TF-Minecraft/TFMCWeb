import Link from "next/link";
import { Callout, SeeAlso, StationLink, WikiItemLink, WikiPage, WikiSectionHeading } from "@/app/components/wiki";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function ResearchPage() {
  return (
    <WikiPage
      lastModified="2026-10-23"
      title="Research"
      width="lg"
      intro="Research is a guessing game played at a Lectern. Every project hides a few aspects, such as Metal or Magic. You test items to find out which aspects they are and fill each one up, and a finished project gives you its result."
    >
      <WikiSectionHeading id="start" intro="A project starts from a research paper or a blank runestone.">
        Starting a project
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Sneak and right-click a Cartography Table to open the <StationLink name="Research Station" />. Make a{" "}
          <WikiItemLink name="Parchment Paper" /> from a Paper and an <WikiItemLink name="Alchemy Powder" />.
        </li>
        <li>
          Combine the Parchment Paper with a subject, such as an ingot, to get a Research Paper about it. You get the
          subject item back. Papers you have no ingredients for stay hidden. A{" "}
          <WikiItemLink name="Lost Knowledge Fragment" /> instead makes an{" "}
          <WikiItemLink name="Unknown Research Paper" />, which studies a random topic. Every craft here also gives a
          little Herborist experience.
        </li>
        <li>
          Hold the paper and right-click a Lectern. The paper is used up and the project starts. A blank runestone from
          the{" "}
          <Link href="/wiki/mage-weapons#rune-station" className={link}>
            Rune Station
          </Link>{" "}
          starts a project the same way, without a paper.
        </li>
      </ol>
      <p className={`mt-3 ${body}`}>
        Only the character who started a project can work on it. You can run projects on several lecterns at once, and
        they survive restarts.
      </p>

      <WikiSectionHeading id="experiments" intro="Right-click your lectern to open the project.">
        Running experiments
      </WikiSectionHeading>
      <ol className={`mt-3 list-decimal space-y-2 pl-5 ${body}`}>
        <li>
          Click an item in your inventory to put it in the test slot. Its preview shows the aspects it carries, how many
          points it would add to each, and whether each aspect is still Testing, already Confirmed or Rejected.
        </li>
        <li>
          Press <strong>Confirm Experiment</strong>. The test uses one{" "}
          <Link href="/wiki/magic#mental-points" className={link}>
            Mental Point
          </Link>
          , and you get the item back.
        </li>
        <li>Pick the next item from what you learned, and keep going until every aspect is full.</li>
      </ol>
      <ul className={`mt-4 list-disc space-y-2 pl-5 ${body}`}>
        <li>An item has a main aspect and sometimes a weaker second one. It adds more points to its main aspect.</li>
        <li>Each item can be tested only once per project. Items with no aspects can&apos;t be tested at all.</li>
        <li>
          A hidden aspect first shows as an <strong>Undiscovered</strong> row. Keep adding points to it until chat says
          &quot;Aspect confirmed&quot; and the row shows its name. Confirmed is not the same as done, so keep filling
          it.
        </li>
        <li>
          An aspect the project doesn&apos;t use is <strong>Rejected</strong> after a few tests. An experiment that only
          adds rejected aspects is refused.
        </li>
        <li>
          Points beyond what an aspect needs are wasted, and a test still costs a Mental Point when it adds nothing.
        </li>
        <li>
          Intelligence makes aspects show up and confirm sooner. On an Unknown Research Paper the result itself stays
          hidden until you have confirmed enough aspects.
        </li>
      </ul>

      <WikiSectionHeading id="results" intro="Fill every aspect to finish.">
        Results and theses
      </WikiSectionHeading>
      <p className={body}>
        When every aspect is confirmed and full, the result drops on top of the lectern. Pick it up quickly, because
        anyone nearby can. A runestone gives a random rune of its size, and a paper gives a{" "}
        <strong>Completed Thesis</strong>.
      </p>
      <p className={`mt-3 ${body}`}>
        Right-click a Completed Thesis to add its entry to your{" "}
        <Link href="/wiki/codex" className={link}>
          Codex
        </Link>{" "}
        and earn experience. This uses up the thesis. If you already know that entry, you keep the thesis, so you can
        sell or trade it.
      </p>
      <Callout variant="warning" title="Ways to lose a project">
        Breaking the lectern destroys the project. The <strong>Scrap</strong> button does too, after you confirm it, and
        nothing is refunded.
      </Callout>

      <SeeAlso hrefs={["/wiki/codex", "/wiki/magic", "/wiki/mage-weapons", "/wiki/stations"]} />
    </WikiPage>
  );
}
