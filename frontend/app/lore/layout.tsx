import type { Metadata } from "next";

import LoreFrame from "../components/lore/LoreFrame";

export const metadata: Metadata = { title: "Lore panel", robots: { index: false, follow: false } };

export default function LoreLayout({ children }: { children: React.ReactNode }) {
  return <LoreFrame>{children}</LoreFrame>;
}
