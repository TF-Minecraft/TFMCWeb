import Link from "next/link";

import { entityHref } from "@/lib/lore/api";
import { parseMentions } from "@/lib/lore/mentions";

/** Lore text with its [[kind:id|Label]] links rendered as links. Keeps line breaks. */
export default function LoreText({
  text,
  empty = "Nothing written yet.",
  className = "",
}: {
  text: string | null | undefined;
  empty?: string;
  className?: string;
}) {
  if (!text?.trim()) return <p className={`text-sm italic text-[var(--tfmc-stone)] ${className}`}>{empty}</p>;
  return (
    <p className={`whitespace-pre-wrap break-words text-sm text-[var(--tfmc-cream)] ${className}`}>
      {parseMentions(text).map((part, i) =>
        part.type === "text" ? (
          part.text
        ) : (
          <Link
            key={i}
            href={entityHref(part.kind, part.id)}
            className="text-[var(--tfmc-accent)] underline-offset-2 hover:underline"
          >
            {part.label}
          </Link>
        ),
      )}
    </p>
  );
}
