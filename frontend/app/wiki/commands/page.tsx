import Link from "next/link";
import { DataTable, SeeAlso, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { allCommandRows, getNavItemByHref, wikiCategories, type RegisteredCommand } from "../data";

const code = "font-mono text-[var(--tfmc-accent)]";
const body = "mt-3 text-sm text-[var(--tfmc-mist)]";

/** Player commands only, grouped under the guide category of the page that explains them. */
function commandGroups() {
  const commands = allCommandRows.filter((entry) => (entry.row.access ?? "player") === "player");
  return wikiCategories
    .map((category) => ({
      category,
      commands: commands.filter((entry) => getNavItemByHref(entry.href)?.category === category.key),
    }))
    .filter((group) => group.commands.length > 0);
}

function CommandCell({ entry }: { entry: RegisteredCommand }) {
  return (
    <>
      <code className={code}>{entry.row.command}</code>
      {entry.row.aliases?.length ? (
        <span className="mt-1 block text-xs text-[var(--tfmc-stone)]">Also: {entry.row.aliases.join(", ")}</span>
      ) : null}
    </>
  );
}

export default function CommandIndexPage() {
  const groups = commandGroups();
  return (
    <WikiPage
      lastModified="2026-10-23"
      title="Command Index"
      width="lg"
      intro="Every command a player can type, grouped by topic. Each one links to the guide page that explains it."
    >
      <WikiSectionHeading id="reading">Reading a command</WikiSectionHeading>
      <p className={body}>
        Type commands in chat, starting with <code className={code}>/</code>. A word in angle brackets, like{" "}
        <code className={code}>&lt;player&gt;</code>, is something you fill in. A word in square brackets, like{" "}
        <code className={code}>[page]</code>, is optional. A bar, as in <code className={code}>keep | discard</code>,
        means you pick one. Press Tab while typing to see what the server accepts.
      </p>
      <p className={body}>
        Many systems have no command at all: you use them by right-clicking a block or an item. Their guide pages
        explain how.
      </p>

      {groups.map(({ category, commands }) => (
        <section key={category.key}>
          <WikiSectionHeading id={category.key}>{category.label}</WikiSectionHeading>
          <DataTable
            className="mt-4"
            minWidth="40rem"
            rowKey={(_row, index) => `${commands[index].href}:${commands[index].row.command}`}
            columns={[
              { header: "Command", width: "40%" },
              { header: "What it does" },
              { header: "Guide", width: "11rem" },
            ]}
            rows={commands.map((entry) => [
              <CommandCell key="command" entry={entry} />,
              entry.row.description,
              <Link
                key="guide"
                href={entry.href}
                className="underline decoration-dotted hover:text-[var(--tfmc-accent)]"
              >
                {getNavItemByHref(entry.href)?.label ?? entry.system}
              </Link>,
            ])}
          />
        </section>
      ))}

      <SeeAlso hrefs={["/wiki/getting-started", "/wiki/stations", "/wiki/materials"]} />
    </WikiPage>
  );
}
