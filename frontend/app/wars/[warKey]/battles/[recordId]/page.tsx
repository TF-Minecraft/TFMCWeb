import type { Metadata } from "next";

import { BattleReportClient } from "@/app/components/wars/WarClients";
import { mapParam, routeParam } from "@/lib/wars/api";

export const metadata: Metadata = {
  title: "Battle report · TFMC",
  description: "One battle: the sides, their losses and every fighter.",
};

export default async function BattlePage({
  params,
  searchParams,
}: {
  params: Promise<{ warKey: string; recordId: string }>;
  searchParams: Promise<{ map?: string | string[] }>;
}) {
  const [{ warKey, recordId }, query] = await Promise.all([params, searchParams]);
  return <BattleReportClient map={mapParam(query.map)} warKey={routeParam(warKey)} recordId={routeParam(recordId)} />;
}
