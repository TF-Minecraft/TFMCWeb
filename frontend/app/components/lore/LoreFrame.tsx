"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { discordSignInUrl } from "@/lib/account/api";
import { getLoreAccess, type LoreAccess } from "@/lib/lore/api";
import LoreNav from "./LoreNav";

const AccessContext = createContext<LoreAccess | null>(null);

/** Who is using the panel. Only valid under LoreFrame, which renders pages once access is confirmed. */
export function useLoreAccess(): LoreAccess {
  const access = useContext(AccessContext);
  if (!access) throw new Error("useLoreAccess outside LoreFrame");
  return access;
}

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; access: LoreAccess };

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto mt-6 w-full max-w-[72rem] text-[var(--tfmc-mist)]">{children}</div>;
}

/**
 * The frame for every lore page: title and tabs, then the page once /lore/access
 * says the viewer is on the Lore team or staff.
 */
export default function LoreFrame({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    getLoreAccess()
      .then((access) => live && setState({ kind: "ready", access }))
      .catch(() => live && setState({ kind: "error" }));
    return () => {
      live = false;
    };
  }, []);

  const access = state.kind === "ready" ? state.access : null;
  let body: React.ReactNode;
  if (state.kind === "loading") body = <Notice>Loading…</Notice>;
  else if (state.kind === "error")
    body = (
      <Notice>
        <p className="text-sm text-[#e8a0a0]" role="alert">
          We couldn’t load the lore panel. Please refresh the page.
        </p>
      </Notice>
    );
  else if (!access!.enabled) body = <Notice>The lore panel isn’t available here yet.</Notice>;
  else if (!access!.signed_in)
    body = (
      <Notice>
        <a href={discordSignInUrl("/lore")} className="text-[var(--tfmc-accent)] underline-offset-2 hover:underline">
          Sign in with Discord
        </a>{" "}
        to use the lore panel.
      </Notice>
    );
  else if (!access!.access) body = <Notice>The lore panel is for the Lore team and staff.</Notice>;
  else body = <AccessContext.Provider value={access}>{children}</AccessContext.Provider>;

  return (
    <main className="relative mx-auto flex min-h-[calc(100dvh-var(--tfmc-header-h))] w-full max-w-[110rem] flex-col px-4 pb-6 sm:px-6">
      <header className="z-30 -mx-4 bg-[var(--tfmc-forest-deep)] px-4 pt-6 sm:-mx-6 sm:px-6 md:sticky md:top-[var(--tfmc-sticky-top)]">
        <div className="mx-auto flex max-w-[72rem] flex-wrap items-end gap-x-8 gap-y-1 border-b border-[color-mix(in_srgb,var(--tfmc-cream)_14%,transparent)]">
          <h1 className="pb-2 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--tfmc-cream)] sm:text-3xl">
            Lore panel
          </h1>
          {access?.access ? <LoreNav /> : null}
        </div>
      </header>
      {body}
    </main>
  );
}
