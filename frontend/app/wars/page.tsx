import type { Metadata } from "next";

import { WarsIndexClient } from "@/app/components/wars/WarClients";
import { mapParam } from "@/lib/wars/api";

export const metadata: Metadata = {
  title: "Wars · TFMC",
  description: "Every war fought on TFMC: the sides, the battles and what they cost.",
};

type SearchParams = Promise<{ map?: string | string[] }>;

export default async function WarsPage({ searchParams }: { searchParams: SearchParams }) {
  return <WarsIndexClient map={mapParam((await searchParams).map)} />;
}
