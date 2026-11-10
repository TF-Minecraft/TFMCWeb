"use client";

import Link from "next/link";

import LoadingSkeleton, { Skeleton } from "@/app/components/shared/LoadingSkeleton";
import { battlePath, warListPath, warPath } from "@/lib/wars/api";
import { warsHref } from "@/lib/wars/format";
import type { BattleReport, WarListResponse, WarPageModel } from "@/lib/wars/types";

import BattleReportView from "./BattleReportView";
import WarPageView from "./WarPageView";
import WarsIndexView from "./WarsIndexView";
import { PageMessage, cardClass, linkClass, pageClass } from "./WarUi";
import { useWarData, type WarLoadError } from "./useWarData";

export function WarsLoading({ label }: { label: string }) {
  return (
    <main className={pageClass}>
      <LoadingSkeleton label={label}>
        <Skeleton className="h-10 w-48" />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${cardClass} h-44`}>
              <Skeleton className="h-5 w-56 max-w-full" />
              <Skeleton className="mt-4 h-4 w-40 max-w-full" />
            </div>
          ))}
        </div>
      </LoadingSkeleton>
    </main>
  );
}

const NOT_FOUND = {
  list: "This map has no war records.",
  war: "No war was found at this address.",
  battle: "No battle report was found at this address.",
};

function LoadProblem({
  error,
  kind,
  mapId,
}: {
  error: WarLoadError;
  kind: keyof typeof NOT_FOUND;
  mapId: string | null;
}) {
  if (error === "login") {
    return (
      <PageMessage title="Staff map">
        <p>
          These wars are on a staff map.{" "}
          <Link href="/profile" className={linkClass}>
            Sign in
          </Link>{" "}
          with a staff account to see them.
        </p>
      </PageMessage>
    );
  }
  if (error === "permission") {
    return <PageMessage title="Staff map">Your account cannot see this map&apos;s wars.</PageMessage>;
  }
  if (error === "not_found") {
    return (
      <PageMessage title="Not found">
        <p>{NOT_FOUND[kind]}</p>
        {kind !== "list" ? (
          <p className="mt-3">
            <Link href={warsHref(mapId ?? "main")} className={linkClass}>
              All wars
            </Link>
          </p>
        ) : null}
      </PageMessage>
    );
  }
  return (
    <PageMessage title="Wars unavailable">The wars could not be loaded. Refresh the page to try again.</PageMessage>
  );
}

export function WarsIndexClient({ map }: { map: string | null }) {
  const state = useWarData<WarListResponse>(map, warListPath);
  if (state.status === "loading") return <WarsLoading label="Loading wars…" />;
  if (state.status === "error") return <LoadProblem error={state.error} kind="list" mapId={state.mapId} />;
  return <WarsIndexView wars={state.data.wars} mapId={state.data.map_id} sessionToken={state.sessionToken} />;
}

export function WarPageClient({ map, warKey }: { map: string | null; warKey: string }) {
  const state = useWarData<WarPageModel>(map, (mapId) => warPath(mapId, warKey));
  if (state.status === "loading") return <WarsLoading label="Loading war…" />;
  if (state.status === "error") return <LoadProblem error={state.error} kind="war" mapId={state.mapId} />;
  return <WarPageView model={state.data} sessionToken={state.sessionToken} />;
}

export function BattleReportClient({
  map,
  warKey,
  recordId,
}: {
  map: string | null;
  warKey: string;
  recordId: string;
}) {
  const state = useWarData<BattleReport>(map, (mapId) => battlePath(mapId, warKey, recordId));
  if (state.status === "loading") return <WarsLoading label="Loading battle report…" />;
  if (state.status === "error") return <LoadProblem error={state.error} kind="battle" mapId={state.mapId} />;
  return <BattleReportView report={state.data} />;
}
