"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";

export const DOCKET_TABS = [
  { id: "notes", icon: "notes", label: "Notes" },
  { id: "evidence", icon: "upload_file", label: "Evidence" },
  { id: "people", icon: "group", label: "People" },
  { id: "prosecution", icon: "gavel", label: "Prosecution & court" },
  { id: "activity", icon: "history", label: "Activity" },
] as const;

export type DocketTabId = (typeof DOCKET_TABS)[number]["id"];

// Old tab ids, so links shared before the rename still land correctly.
const TAB_ALIASES: Record<string, DocketTabId> = {
  suspects: "people",
  court: "prosecution",
  timeline: "activity",
};

/** Ids of focusable form targets inside the docket, used by deep links. */
export type FocusTarget =
  | "assign-investigator"
  | "status-actions"
  | "note-form"
  | "evidence-form"
  | "person-form"
  | "arrest-form"
  | "hearing-form"
  | "decision-form"
  | "hearing-outcome";

/** Extra one-shot params a deep link can carry to prefill the target form. */
const ONE_SHOT_PARAMS = ["focus", "hearingId", "hearingType", "scheduledAt", "entityProfileId"] as const;

export type DocketLink = {
  tab?: DocketTabId;
  focus?: FocusTarget;
  params?: Partial<Record<(typeof ONE_SHOT_PARAMS)[number], string>>;
};

type DocketNav = {
  tab: DocketTabId;
  focus: FocusTarget | null;
  param: (name: (typeof ONE_SHOT_PARAMS)[number]) => string | null;
  setTab: (tab: DocketTabId) => void;
  navigate: (link: DocketLink) => void;
  clearFocus: () => void;
};

const DocketNavContext = createContext<DocketNav | null>(null);

function parseTab(raw: string | null): DocketTabId {
  if (!raw) return "notes";
  if (DOCKET_TABS.some((t) => t.id === raw)) return raw as DocketTabId;
  return TAB_ALIASES[raw] ?? "notes";
}

export function DocketNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const replace = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}` as Route, { scroll: false });
    },
    [router, pathname],
  );

  const nav = useMemo<DocketNav>(() => {
    const tab = parseTab(searchParams.get("tab"));
    return {
      tab,
      focus: (searchParams.get("focus") as FocusTarget | null) ?? null,
      param: (name) => searchParams.get(name),
      setTab: (next) => {
        const params = new URLSearchParams();
        // Notes is the default, so keep its URL clean.
        if (next !== "notes") params.set("tab", next);
        replace(params);
      },
      navigate: (link) => {
        const params = new URLSearchParams();
        const nextTab = link.tab ?? tab;
        if (nextTab !== "notes") params.set("tab", nextTab);
        if (link.focus) params.set("focus", link.focus);
        for (const [k, v] of Object.entries(link.params ?? {})) {
          if (v) params.set(k, v);
        }
        replace(params);
      },
      clearFocus: () => {
        const params = new URLSearchParams(searchParams.toString());
        for (const p of ONE_SHOT_PARAMS) params.delete(p);
        replace(params);
      },
    };
  }, [searchParams, replace]);

  return <DocketNavContext.Provider value={nav}>{children}</DocketNavContext.Provider>;
}

export function useDocketNav(): DocketNav {
  const nav = useContext(DocketNavContext);
  if (!nav) throw new Error("useDocketNav must be used inside DocketNavProvider");
  return nav;
}

/**
 * When the URL asks to focus `target` and the section is ready, scroll it
 * into view and move keyboard focus to its first field. Returns the one-shot
 * params so the form can prefill from them before they're cleared.
 */
export function useDeepLinkFocus(target: FocusTarget, ready: boolean, onArrive?: (nav: DocketNav) => void) {
  const nav = useDocketNav();
  const isTarget = nav.focus === target;

  useEffect(() => {
    if (!isTarget || !ready) return;
    onArrive?.(nav);
    // Two frames: one for the tab panel to mount, one for anything onArrive
    // opened (e.g. a hearing's outcome editor) to render.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const el = document.getElementById(target);
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          const field = el.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button");
          (field ?? el).focus({ preventScroll: true });
        }
        nav.clearFocus();
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTarget, ready]);
}
