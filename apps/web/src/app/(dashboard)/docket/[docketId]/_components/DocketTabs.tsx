"use client";

import { useRef, type ReactNode } from "react";

import { DOCKET_TABS, useDocketNav, type DocketTabId } from "../_lib/nav";

type Badge = { count: number; tone?: "default" | "alert"; srLabel?: string };

/**
 * WAI-ARIA tabs: roving tabindex, Left/Right/Home/End move and activate,
 * and the active tab lives in the URL (?tab=) so it survives reloads and
 * can be deep-linked from "What's next".
 */
export function DocketTabs({
  badges,
  panels,
}: {
  badges: Partial<Record<DocketTabId, Badge>>;
  panels: Record<DocketTabId, ReactNode>;
}) {
  const nav = useDocketNav();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = DOCKET_TABS.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    const tab = DOCKET_TABS[next]!;
    nav.setTab(tab.id);
    tabRefs.current[tab.id]?.focus();
  };

  return (
    <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
      <div
        role="tablist"
        aria-label="Case workspace"
        className="flex overflow-x-auto border-b border-outline-variant [scrollbar-width:thin]"
      >
        {DOCKET_TABS.map((tab, i) => {
          const selected = nav.tab === tab.id;
          const badge = badges[tab.id];
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => nav.setTab(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`shrink-0 px-4 sm:px-5 py-3.5 flex items-center gap-2 text-sm whitespace-nowrap border-b-2 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
                selected
                  ? "text-primary font-bold border-primary"
                  : "text-on-surface-variant border-transparent hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                {tab.icon}
              </span>
              {tab.label}
              {badge && badge.count > 0 && (
                <span
                  className={`min-w-5 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    badge.tone === "alert" ? "bg-error text-on-error" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {badge.tone === "alert" && (
                    <span className="material-symbols-outlined text-[11px] align-[-1px] mr-0.5" aria-hidden="true">
                      warning
                    </span>
                  )}
                  {badge.count}
                  <span className="sr-only"> {badge.srLabel ?? "items"}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {DOCKET_TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={nav.tab !== tab.id}
          tabIndex={0}
          className="p-4 sm:p-stack-lg min-h-[300px] focus:outline-none"
        >
          {nav.tab === tab.id && panels[tab.id]}
        </div>
      ))}
    </section>
  );
}
