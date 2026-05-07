"use client";

import { cn } from "@Sentinel360/ui/lib/utils";

import {
  detectionBoxes,
  diagnosticEngines,
  diagnosticPreviewImage,
  matchCards,
  metaChips,
  processingTask,
} from "./ai-alerts-data";
import CommandCenterShell, {
  MaterialIcon,
  headlineStyle,
} from "./command-center-shell";

type AiAlertsHubProps = {
  agentName: string;
};

export default function AiAlertsHub({ agentName }: AiAlertsHubProps) {
  return (
    <CommandCenterShell
      activeSidebarLabel="AI Alerts"
      activeTopNavTab="Analytics"
      agentName={agentName}
      brandIcon="shield"
      profileMode="avatar-only"
      searchPlaceholder="Search global surveillance nodes..."
      variant="analysis"
      contentClassName="mx-auto max-w-[1400px]"
    >
      <style jsx>{`
        @keyframes sentinel-scan {
          0% {
            transform: translateY(0%);
          }
          100% {
            transform: translateY(510px);
          }
        }
      `}</style>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#45474d]">
            AI Analysis Hub
          </span>
          <h2
            className="mt-1 text-3xl font-extrabold text-[#051125]"
            style={headlineStyle}
          >
            CCTV Forensic Analysis
          </h2>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-[#f3f4f5] px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-[#2a9d8f]" />
            <span className="text-xs font-semibold text-[#45474d]">
              Neural Engine: Active
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 rounded-xl bg-[#f3f4f5] p-6 xl:col-span-8">
          <div className="mb-6">
            <h3
              className="text-lg font-bold text-[#051125]"
              style={headlineStyle}
            >
              Media Ingestion
            </h3>
            <p className="text-sm text-[#45474d]">
              Upload raw footage for facial recognition and object tracking.
            </p>
          </div>

          <div className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c5c6cd] bg-white p-12 transition-all hover:border-[#051125]/30 hover:bg-[#edeeef]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1b263b]/10 transition-transform group-hover:scale-110">
              <MaterialIcon
                name="upload_file"
                className="text-3xl text-[#051125]"
              />
            </div>
            <h4 className="mb-1 text-center text-lg font-semibold text-[#051125]">
              Drag and drop source files
            </h4>
            <p className="mb-6 max-w-xs text-center text-sm text-[#45474d]">
              Supported formats: MP4, AVI, MKV (Up to 2GB per segment)
            </p>
            <button
              className="rounded-lg bg-gradient-to-r from-[#051125] to-[#1b263b] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#051125]/20 transition-opacity hover:opacity-90"
              type="button"
            >
              Select Local Archive
            </button>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-4 rounded-lg bg-white p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-[#c2dcff]">
                <MaterialIcon name="movie" className="text-[#48617e]" />
              </div>

              <div className="flex-1">
                <div className="mb-1 flex justify-between">
                  <span className="text-xs font-bold text-[#051125]">
                    {processingTask.fileName}
                  </span>
                  <span className="text-xs font-bold text-[#051125]">
                    {processingTask.progress}%
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#edeeef]">
                  <div
                    className="h-full bg-[#051125]"
                    style={{ width: `${processingTask.progress}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-4">
                  {processingTask.tags.map((tag) => (
                    <span
                      key={tag.label}
                      className="flex items-center gap-1 text-[10px] text-[#45474d]"
                    >
                      <MaterialIcon name={tag.icon} className="text-[10px]" />
                      <span>{tag.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              <button
                className="text-[#75777d] transition-colors hover:text-[#ba1a1a]"
                type="button"
              >
                <MaterialIcon name="close" />
              </button>
            </div>
          </div>
        </section>

        <aside className="col-span-12 flex flex-col rounded-xl bg-[#f3f4f5] p-6 xl:col-span-4">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3
              className="text-lg font-bold text-[#051125]"
              style={headlineStyle}
            >
              Possible Matches
            </h3>
            <span className="rounded bg-[#051125] px-2 py-1 text-[10px] font-bold text-white">
              DATABASE V4.2
            </span>
          </div>

          <div className="sentinel-no-scrollbar max-h-[600px] space-y-4 overflow-y-auto pr-2">
            {matchCards.map((card, index) => (
              <button
                key={card.name}
                className={cn(
                  "group w-full rounded-xl border-l-4 bg-white p-4 text-left transition-colors hover:bg-[#e1e3e4]/30",
                  card.borderClassName,
                )}
                type="button"
              >
                <div className="flex gap-4">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                    <img
                      alt={card.imageAlt}
                      className="h-full w-full object-cover"
                      src={card.imageUrl}
                    />
                    {index === 0 ? (
                      <div className="absolute inset-0 bg-[#ba1a1a]/10" />
                    ) : null}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-bold text-[#051125]">
                        {card.name}
                      </h4>
                      <span
                        className={cn(
                          "text-[10px] font-bold",
                          card.matchClassName,
                        )}
                      >
                        {card.matchScore}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#45474d]">{card.status}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {card.chips.map((chip, chipIndex) => (
                        <span
                          key={chip}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            index === 0 && chipIndex === 0
                              ? "bg-[#ffdad6] text-[#93000a]"
                              : "bg-[#edeeef] text-[#45474d]",
                          )}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-[#edeeef] py-3 text-xs font-bold text-[#051125] transition-colors hover:bg-[#e7e8e9]"
            type="button"
          >
            <span>View Full Database Matches</span>
            <MaterialIcon name="open_in_new" className="text-sm" />
          </button>
        </aside>

        <section className="col-span-12 overflow-hidden rounded-xl bg-white p-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3
                className="text-2xl font-extrabold text-[#051125]"
                style={headlineStyle}
              >
                AI Diagnostic Preview
              </h3>
              <p className="text-sm text-[#45474d]">
                Frame-by-frame intelligence processing for{" "}
                <span className="rounded bg-[#edeeef] px-2 py-0.5 font-mono text-[#051125]">
                  Cam_04_North_Entrance
                </span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {diagnosticEngines.map((engine) => (
                  <span
                    key={engine.label}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white",
                      engine.className,
                    )}
                  >
                    {engine.label}
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#45474d]">
                Multi-Engine Fusion
              </span>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-[#191c1d] shadow-2xl shadow-[#051125]/5">
            <img
              alt="Surveillance preview of a corporate lobby from a high-angle camera"
              className="h-auto w-full brightness-110 opacity-80 mix-blend-screen"
              src={diagnosticPreviewImage}
            />

            <div className="absolute inset-0">
              {detectionBoxes.map((box, index) => (
                <div
                  key={box.label}
                  className={cn("absolute border-2", box.boxClassName)}
                >
                  <div
                    className={cn(
                      "absolute -top-7 left-0 whitespace-nowrap px-2 py-1 text-[10px] font-bold",
                      box.labelClassName,
                    )}
                  >
                    {box.label}
                  </div>
                  {index === 0 ? (
                    <div className="absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-[#ba1a1a]" />
                  ) : null}
                </div>
              ))}

              <div
                className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#ba1a1a]/40 to-transparent opacity-50 shadow-[0_0_15px_rgba(186,26,26,0.5)]"
                style={{ animation: "sentinel-scan 4s linear infinite" }}
              />
            </div>

            <div className="absolute bottom-0 left-0 flex w-full items-center justify-between bg-gradient-to-t from-[#051125]/90 to-transparent p-6">
              <div className="flex items-center gap-6">
                <button
                  className="text-white transition-transform hover:scale-110"
                  type="button"
                >
                  <MaterialIcon name="play_arrow" className="text-3xl" />
                </button>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white">
                    00:42 / 12:05
                  </span>
                  <div className="h-1 w-48 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[30%] bg-white" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {["screenshot", "zoom_in", "settings", "fullscreen"].map(
                  (icon) => (
                    <button
                      key={icon}
                      className="text-white/70 transition-colors hover:text-white"
                      type="button"
                    >
                      <MaterialIcon name={icon} />
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            {metaChips.map((chip) => (
              <div
                key={chip.label}
                className={cn(
                  "rounded-lg border-l-2 bg-[#edeeef] px-4 py-2",
                  chip.borderClassName,
                )}
              >
                <span className="block text-[10px] font-bold uppercase tracking-tight text-[#45474d]">
                  {chip.label}
                </span>
                <span className={cn("text-sm font-bold", chip.valueClassName)}>
                  {chip.value}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </CommandCenterShell>
  );
}
