import Link from "next/link";
import { CommandTable, DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { codexCommands } from "../data/codex";

const link = "text-[var(--tfmc-accent)] hover:underline";
const body = "text-sm text-[var(--tfmc-mist)]";

export default function CodexPage() {
  return (
    <WikiPage
      lastModified="2026-10-24"
      title="Codex"
      width="lg"
      intro="The Codex is your character's journal of discoveries. Type /codex while playing a character to open it."
    >
      <WikiSectionHeading id="journal">Reading the journal</WikiSectionHeading>
      <ul className={`mt-3 list-disc space-y-2 pl-5 ${body}`}>
        <li>The first page shows each category and how much of it you have unlocked.</li>
        <li>
          Inside a category, entries you haven&apos;t found yet show as locked placeholders. Their names and
          descriptions stay hidden, though some placeholders give a hint. An unlocked entry shows its name and
          description, and some also show the date you found it and the percentage of players who have unlocked it.
        </li>
        <li>Some entries, such as research and important figures, can be clicked to read more.</li>
        <li>
          Many discoveries give you experience. The message you get when you unlock one tells you what you received.
        </li>
      </ul>

      <WikiSectionHeading id="categories">Categories</WikiSectionHeading>
      <DataTable
        columns={[{ header: "Category", nowrap: true }, { header: "How entries unlock" }]}
        rows={[
          ["Points of Interest", "Travel to notable places around the world."],
          [
            "Research",
            <>
              Right-click a Completed Thesis from{" "}
              <Link href="/wiki/research" className={link}>
                Research
              </Link>
              .
            </>,
          ],
          ["Important Figures", "Right-click a Completed Thesis about a historical figure."],
          ["Special Discoveries", "The world's deepest secrets."],
          [
            "Achievements",
            "Milestones, such as your first death or how much of the Codex you have found, plus a few surprises.",
          ],
        ]}
      />

      <WikiSectionHeading id="characters" intro="Most discoveries belong to your whole account.">
        Your other characters
      </WikiSectionHeading>
      <p className={body}>
        When another of your characters starts playing, it receives your discoveries and their experience. Research
        entries and a few achievements are the exception. They stay with the character who earned them. Your other
        characters can still read an entry they did not find themselves, and the entry shows which of your characters
        knows it in character. Play the others as if they don&apos;t.
      </p>

      <WikiSectionHeading id="commands">Commands</WikiSectionHeading>
      <CommandTable commands={codexCommands.commands} showNotes={false} />
      <SeeAlso hrefs={["/wiki/research", "/wiki/commands"]} />
    </WikiPage>
  );
}
