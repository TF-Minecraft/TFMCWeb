import type { Metadata } from "next";

import { WarPageClient } from "@/app/components/wars/WarClients";
import { mapParam, routeParam } from "@/lib/wars/api";

export const metadata: Metadata = {
  title: "War · TFMC",
  description: "A war report: the sides, the score, the front, every battle and the chronicle.",
};

export default async function WarPage({
  params,
  searchParams,
}: {
  params: Promise<{ warKey: string }>;
  searchParams: Promise<{ map?: string | string[] }>;
}) {
  const [{ warKey }, query] = await Promise.all([params, searchParams]);
  return <WarPageClient map={mapParam(query.map)} warKey={routeParam(warKey)} />;
}
