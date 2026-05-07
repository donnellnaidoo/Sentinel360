"use client";

import { cn } from "@Sentinel360/ui/lib/utils";

import CommandCenterShell, {
  MaterialIcon,
  headlineStyle,
} from "./command-center-shell";
import {
  evidenceItems,
  investigationLogs,
  subjectProfiles,
  timelineBars,
} from "./investigation-workspace-data";

type InvestigationWorkspaceProps = {
  agentName: string;
};

const actionButtons = [
  { label: "Add Evidence", icon: "post_add" },
  { label: "Link Suspect", icon: "link" },
];

export default function InvestigationWorkspace({
  agentName,
}: InvestigationWorkspaceProps) {
  const resolvedAgentName = agentName.trim() || "Det. James Miller";

  return (
    <CommandCenterShell
      activeSidebarLabel="Investigations"
      activeTopNavTab="Analytics"
      agentName={agentName}
      brandIcon="security"
      profileTitle={resolvedAgentName}
      profileSubtitle="Level 4 Investigator"
      searchPlaceholder="Search case ID, evidence, suspect..."
      variant="investigation"
      contentClassName="flex h-[calc(100vh-4rem)] flex-col overflow-hidden"
    >
      <div className="flex items-end justify-between gap-6 bg-[#f8f9fa] px-0 py-2 pb-6">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-[#45474d]">
            <span>Investigations</span>
            <MaterialIcon name="chevron_right" className="text-[10px]" />
            <span>Case #SR-2024-8842</span>
          </nav>

          <h2
            className="text-3xl font-extrabold tracking-tight text-[#051125]"
            style={headlineStyle}
          >
            Downtown Transit Incursion
          </h2>

          <div className="mt-2 flex items-center gap-4">
            <span className="flex items-center gap-1.5 rounded-full bg-[#ffdad6] px-2.5 py-1 text-[11px] font-bold text-[#93000a]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ba1a1a]" />
              PRIORITY: ALPHA
            </span>
            <span className="text-[11px] font-medium text-[#45474d]">
              <MaterialIcon name="history" className="mr-1 text-xs" />
              14h 22m elapsed
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {actionButtons.map((button) => (
            <button
              key={button.label}
              className="flex items-center gap-2 rounded border border-[#c5c6cd]/50 px-4 py-2 text-sm font-semibold text-[#051125] transition-all hover:bg-[#f3f4f5]"
              type="button"
            >
              <MaterialIcon name={button.icon} className="text-sm" />
              <span>{button.label}</span>
            </button>
          ))}

          <button
            className="flex items-center gap-2 rounded bg-gradient-to-br from-[#051125] to-[#1b263b] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#051125]/10 transition-all active:scale-95"
            type="button"
          >
            <MaterialIcon name="analytics" className="text-sm" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="flex flex-1 flex-col gap-6 overflow-hidden">
          <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-[#f3f4f5] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3
                className="flex items-center gap-2 text-lg font-bold text-[#051125]"
                style={headlineStyle}
              >
                <MaterialIcon name="perm_media" />
                <span>Evidence Vault</span>
              </h3>

              <div className="flex gap-2">
                <button
                  className="rounded p-1.5 text-[#45474d] transition-colors hover:bg-[#e7e8e9]"
                  type="button"
                >
                  <MaterialIcon name="grid_view" />
                </button>
                <button
                  className="rounded p-1.5 text-[#45474d] transition-colors hover:bg-[#e7e8e9]"
                  type="button"
                >
                  <MaterialIcon name="list" />
                </button>
              </div>
            </div>

            <div className="custom-scrollbar grid min-h-0 grid-cols-1 gap-4 overflow-y-auto pr-2 md:grid-cols-2 xl:grid-cols-3">
              {evidenceItems.map((item) => (
                <article
                  key={item.title}
                  className="group cursor-pointer overflow-hidden rounded-lg border border-transparent bg-white transition-all hover:border-[#1b263b]"
                >
                  <div className="relative aspect-video">
                    {item.imageUrl ? (
                      <img
                        alt={item.imageAlt}
                        className="h-full w-full object-cover"
                        src={item.imageUrl}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#1b263b]/10">
                        <MaterialIcon
                          name="audio_file"
                          className="text-[#1b263b]"
                        />
                        <div className="flex h-6 items-end gap-0.5">
                          {item.audioBars?.map((bar, index) => (
                            <span
                              key={`${item.title}-${bar}-${index}`}
                              className="w-1 bg-[#1b263b]"
                              style={{ height: `${bar * 4}px` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-md">
                      {item.badge}
                    </span>

                    <div className="absolute inset-0 flex items-center justify-center bg-[#051125]/20 opacity-0 transition-opacity group-hover:opacity-100">
                      {item.previewIcon ? (
                        <MaterialIcon
                          name={item.previewIcon}
                          className="text-3xl text-white"
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="truncate text-xs font-bold text-[#051125]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-[#45474d]">
                      {item.meta}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="flex h-56 flex-col rounded-xl bg-[#051125] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <MaterialIcon
                    name="timeline"
                    className="text-white/60"
                  />
                  <span>Global Timeline</span>
                </h3>

                <div className="flex rounded bg-white/5 p-0.5 text-[10px] font-bold text-white/60">
                  <button
                    className="rounded-sm bg-white/10 px-2 py-1 text-white"
                    type="button"
                  >
                    LIVE
                  </button>
                  <button className="px-2 py-1" type="button">
                    ARCHIVE
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-[10px] text-white/60">
                <span>04:00:00</span>
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ba1a1a]" />
                  04:22:15 MARKER
                </div>
                <span>05:00:00</span>
              </div>
            </div>

            <div className="group relative flex flex-1 flex-col justify-end overflow-hidden rounded-lg border border-white/10 bg-white/5">
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md"
                  type="button"
                >
                  <MaterialIcon name="play_arrow" className="text-3xl" />
                </button>
              </div>

              <div className="mb-4 flex h-24 items-end gap-1 px-4">
                {timelineBars.map((bar, index) => (
                  <div
                    key={`${bar.heightClassName}-${index}`}
                    className={cn(
                      "flex-1 rounded-t-sm",
                      bar.heightClassName,
                      bar.className,
                    )}
                  />
                ))}
              </div>

              <div className="absolute bottom-0 left-1/3 top-0 z-10 w-[2px] bg-white shadow-[0_0_10px_white]">
                <div className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
              </div>

              <div className="flex justify-between border-t border-white/10 bg-black/20 px-4 py-2 font-mono text-[9px] tracking-widest text-white/40">
                {["04:10", "04:15", "04:20", "04:25", "04:30", "04:35", "04:40"].map(
                  (time) => (
                    <span
                      key={time}
                      className={time === "04:20" ? "text-white/80" : ""}
                    >
                      {time}
                    </span>
                  ),
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex w-96 flex-col gap-6">
          <section className="flex h-[45%] flex-col rounded-xl bg-[#f3f4f5] p-6">
            <h3
              className="mb-6 flex items-center gap-2 text-lg font-bold text-[#051125]"
              style={headlineStyle}
            >
              <MaterialIcon name="person_search" />
              <span>Subject Profiles</span>
            </h3>

            <div className="custom-scrollbar space-y-4 overflow-y-auto pr-2">
              {subjectProfiles.map((profile) => (
                <button
                  key={profile.name}
                  className={cn(
                    "group flex w-full items-center gap-4 rounded-lg border-l-4 bg-white p-3 text-left transition-all hover:bg-[#e7e8e9]",
                    profile.critical
                      ? "border-[#ba1a1a]"
                      : "border-[#c5c6cd]",
                  )}
                  type="button"
                >
                  <img
                    alt={profile.imageAlt}
                    className={cn(
                      "h-12 w-12 rounded bg-[#f8f9fa] object-cover",
                      profile.critical ? "grayscale" : "",
                    )}
                    src={profile.imageUrl}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#051125]">
                      {profile.name}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[10px] font-bold uppercase tracking-tight",
                        profile.statusClassName,
                      )}
                    >
                      {profile.status}
                    </p>
                    <div className="mt-1.5 flex gap-1">
                      {profile.critical ? (
                        <span className="h-2 w-2 animate-ping rounded-full bg-[#ba1a1a]" />
                      ) : null}
                      <span className="text-[9px] font-medium text-[#45474d]">
                        {profile.detail}
                      </span>
                    </div>
                  </div>

                  <MaterialIcon
                    name="open_in_new"
                    className="text-[#45474d] opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>

            <button
              className="mt-4 w-full rounded-lg border-2 border-dashed border-[#c5c6cd] py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#45474d] transition-all hover:border-[#1b263b] hover:text-[#051125]"
              type="button"
            >
              + Identification Queue
            </button>
          </section>

          <section className="flex flex-1 flex-col rounded-xl border border-[#c5c6cd]/20 bg-white p-6 shadow-sm shadow-[#051125]/5">
            <div className="mb-6 flex items-center justify-between">
              <h3
                className="flex items-center gap-2 text-lg font-bold text-[#051125]"
                style={headlineStyle}
              >
                <MaterialIcon name="edit_note" />
                <span>Investigation Logs</span>
              </h3>
              <span className="rounded bg-[#edeeef] px-2 py-1 text-[10px] font-bold text-[#45474d]">
                AUTO-SAVING
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-hidden">
              <div className="custom-scrollbar flex-1 overflow-y-auto rounded-lg border-b-2 border-[#051125] bg-[#f3f4f5]/30 p-4">
                <div className="space-y-6">
                  {investigationLogs.map((log) => (
                    <div
                      key={log.timestamp}
                      className={cn("relative border-l-2 pl-4", log.borderClassName)}
                    >
                      <span
                        className={cn(
                          "absolute -left-1 top-0 h-2 w-2 rounded-full",
                          log.dotClassName,
                        )}
                      />
                      <p
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-[0.2em]",
                          log.timestampClassName,
                        )}
                      >
                        {log.timestamp}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#191c1d]">
                        {log.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <textarea
                  className="h-24 w-full resize-none rounded-lg border-none bg-[#edeeef] p-4 text-xs text-[#191c1d] placeholder:text-[#45474d]/50 focus:ring-1 focus:ring-[#1b263b]"
                  placeholder="Append new intelligence note..."
                />
                <button
                  className="absolute bottom-3 right-3 rounded bg-[#051125] p-1.5 text-white shadow-md"
                  type="button"
                >
                  <MaterialIcon name="send" className="text-sm" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </CommandCenterShell>
  );
}
