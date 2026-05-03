"use client";

import { cn } from "@Sentinel360/ui/lib/utils";

import {
  CommandCenterSidebar,
  MaterialIcon,
  headlineStyle,
} from "./command-center-shell";
import {
  caseMetrics,
  filingChecks,
  filingSourceImages,
  metricThumbs,
  priorityCase,
  recentDocketUpdates,
} from "./crime-docket-data";

type CrimeDocketProps = {
  agentName: string;
};

const positiveResolutionBars = Array.from({ length: 12 }, (_, index) => index < 9);
const overheadBars = Array.from({ length: 6 }, (_, index) => index < 2);

export default function CrimeDocket({ agentName }: CrimeDocketProps) {
  const resolvedAgentName = agentName.trim() || "James Thorne";

  return (
    <div className="sentinel-dashboard flex min-h-screen overflow-hidden bg-[#f0f1f2] text-[#191c1d]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap");
        @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");

        .sentinel-dashboard .material-symbols-outlined {
          font-variation-settings:
            "FILL" 0,
            "wght" 400,
            "GRAD" 0,
            "opsz" 24;
          font-size: inherit;
          line-height: 1;
        }

        .sentinel-dashboard .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
      `}</style>

      <CommandCenterSidebar activeSidebarLabel="Crime Docket" />

      <main className="ml-64 flex h-screen flex-1 flex-col bg-[#f0f1f2]">
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#c5c6cd]/10 bg-white/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold uppercase tracking-widest text-[#051125]">
              Sentinel360
            </span>
            <div className="relative group">
              <span className="absolute inset-y-0 left-3 flex items-center text-[#828da7]">
                <MaterialIcon name="search" className="text-sm" />
              </span>
              <input
                className="w-64 rounded-full border-none bg-[#f3f4f5] py-1.5 pl-10 pr-4 text-sm text-[#191c1d] transition-all focus:ring-2 focus:ring-[#1b263b]"
                placeholder="Search case numbers..."
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex gap-2">
              <button
                className="rounded-full p-2 text-[#45474d] transition-colors hover:bg-[#edeeef]"
                type="button"
              >
                <MaterialIcon name="notifications" />
              </button>
              <button
                className="rounded-full p-2 text-[#45474d] transition-colors hover:bg-[#edeeef]"
                type="button"
              >
                <MaterialIcon name="settings" />
              </button>
            </div>

            <div className="flex items-center gap-3 border-l border-[#c5c6cd]/30 pl-6">
              <div className="text-right">
                <p className="text-xs font-bold leading-none text-[#051125]">
                  {resolvedAgentName}
                </p>
                <p className="text-[10px] font-medium text-[#45474d]">
                  Chief Intelligence Officer
                </p>
              </div>
              <img
                alt="Chief Intelligence Officer Profile"
                className="h-8 w-8 rounded-full object-cover ring-2 ring-[#1b263b]"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxhUzsOWJUnOSd_WW3U_nM3AHkOvuV9j7vWIBezpDe5C-hZRshXYBVQ8lcmw9jjeoZQngbkT01iQiVaC3zTbooEad0CuVz-sofZZVgfFYJarevFDmLi9NdvXMHx99hlcRM2_JfqKHiuJWqveP6byDAucDeoXoEk0DrrrsB7aZeJjl1ZJCQWLN5PDvgi8lmF5X5_usYdk0b1eqFBvmLRGvgZ5A7r7YR0WmsaVY_OTif8jmaFCP_0ktpgyrjRUbO7NiQWi1ngXepK04"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#c5c6cd]/10 bg-white p-5 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#45474d]">
                  Case Resolution Rate
                </h3>
                <MaterialIcon name="download" className="text-sm text-[#828da7]" />
              </div>

              <div className="space-y-4">
                <div className="flex gap-[2px]">
                  {positiveResolutionBars.map((active, index) => (
                    <div
                      key={`positive-${index}`}
                      className={cn(
                        "h-4 w-2 rounded-full bg-[#ff9f00]",
                        active ? "" : "opacity-40",
                      )}
                    />
                  ))}
                </div>
                <div className="rounded bg-[#fff8e1] py-1 text-center text-[10px] font-bold text-[#a67c00]">
                  82% Positive Resolution
                </div>
                <div className="flex gap-[2px]">
                  {overheadBars.map((active, index) => (
                    <div
                      key={`overhead-${index}`}
                      className={cn(
                        "h-4 w-2 rounded-full bg-[#4caf50]",
                        active ? "" : "opacity-40",
                      )}
                    />
                  ))}
                </div>
                <div className="rounded bg-[#e8f5e9] py-1 text-center text-[10px] font-bold text-[#2e7d32]">
                  25% Investigation Overhead
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="rounded-full bg-[#f3f4f5] px-3 py-1 text-[10px] font-bold">
                  EFFICIENCY: HIGH
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#c5c6cd]/10 bg-white p-5 shadow-sm md:col-span-2">
              <div>
                <h2
                  className="text-3xl font-extrabold tracking-tight text-[#051125]"
                  style={headlineStyle}
                >
                  Crime Docket Analysis
                </h2>
                <p className="mt-1 text-sm text-[#45474d]">
                  842 Total Active Cases under surveillance
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-xl bg-[#f3f4f5] p-3 text-[#051125] transition-colors hover:bg-[#e7e8e9]"
                  type="button"
                >
                  <MaterialIcon name="file_download" />
                </button>
                <button
                  className="flex items-center gap-2 rounded-xl bg-[#051125] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#1b263b]"
                  type="button"
                >
                  <MaterialIcon name="add" className="text-sm" />
                  <span>NEW LOG</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-3">
              <div className="rounded-2xl border border-[#c5c6cd]/10 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#45474d]">
                    Recent Filing Sources
                  </h3>
                  <MaterialIcon name="download" className="text-sm text-[#828da7]" />
                </div>
                <div className="mb-6 flex gap-2">
                  {filingSourceImages.map((image) => (
                    <img
                      key={image.src}
                      alt={image.alt}
                      className="h-14 w-14 rounded-lg object-cover"
                      src={image.src}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  {filingChecks.map((check) => (
                    <div
                      key={check.title}
                      className={cn(
                        "flex items-center gap-3 rounded-lg p-2",
                        check.containerClassName,
                      )}
                    >
                      <MaterialIcon
                        name={check.icon}
                        className={cn("text-sm", check.iconClassName)}
                      />
                      <span className="flex-1 text-[11px] font-semibold text-[#051125]">
                        {check.title}
                      </span>
                      <MaterialIcon
                        name="info"
                        className="text-[12px] text-[#45474d]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#c5c6cd]/10 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#45474d]">
                    Recent Docket Updates
                  </h3>
                  <MaterialIcon name="download" className="text-sm text-[#828da7]" />
                </div>
                <div className="space-y-1">
                  {recentDocketUpdates.map((update) => (
                    <button
                      key={`${update.time}-${update.title}`}
                      className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[#f3f4f5]"
                      type="button"
                    >
                      <span className="text-[9px] font-bold text-[#45474d]/60">
                        {update.time}
                      </span>
                      <span className="flex-1 text-[10px] font-bold text-[#051125]">
                        {update.title}
                      </span>
                      <span className="text-[10px] text-[#45474d]">
                        {update.detail}
                      </span>
                      <MaterialIcon
                        name="chevron_right"
                        className="text-[12px] opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-6">
              <div className="group relative overflow-hidden rounded-3xl border border-[#c5c6cd]/10 bg-white shadow-xl">
                <div className="relative aspect-[4/5] overflow-hidden md:aspect-video">
                  <img
                    alt={priorityCase.imageAlt}
                    className="h-full w-full object-cover brightness-75 grayscale transition-all duration-700 group-hover:grayscale-0"
                    src={priorityCase.imageUrl}
                  />

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex h-[80%] w-[80%] items-center justify-center rounded-full border border-white/20">
                      <div className="h-[70%] w-[70%] animate-[spin_10s_linear_infinite] rounded-full border-b border-t border-white/40" />
                    </div>
                  </div>

                  <div className="absolute left-6 top-6">
                    <span className="rounded bg-[#ba1a1a] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg">
                      {priorityCase.badge}
                    </span>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="glass-card rounded-2xl p-6 shadow-2xl">
                      <h4 className="mb-2 text-sm font-bold text-[#051125]">
                        {priorityCase.subject}
                      </h4>
                      <p className="mb-4 text-xs leading-relaxed text-[#45474d]">
                        {priorityCase.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm"
                            type="button"
                          >
                            <MaterialIcon name="add" className="text-sm" />
                          </button>
                          <button
                            className="flex items-center gap-2 rounded-lg bg-[#051125] px-4 py-2 text-[10px] font-bold text-white shadow-md"
                            type="button"
                          >
                            <MaterialIcon name="visibility" className="text-xs" />
                            <span>ANALYZE DATA</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-white/50 px-3 py-2">
                          <MaterialIcon name="mic" className="text-sm" />
                          <div className="h-4 w-px bg-[#c5c6cd]/30" />
                          <MaterialIcon name="arrow_forward" className="text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-3">
              <div className="rounded-2xl border border-[#c5c6cd]/10 bg-white p-5 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#45474d]">
                    Immediate Actions
                  </h3>
                  <MaterialIcon name="settings" className="text-sm text-[#828da7]" />
                </div>

                <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[#c5c6cd]/30 bg-[#f3f4f5] p-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                    <MaterialIcon name="upload_file" className="text-[#47607e]" />
                  </div>
                  <p className="mb-1 text-[11px] font-bold text-[#051125]">
                    Verify Evidence
                  </p>
                  <p className="mb-4 text-[9px] text-[#45474d]">
                    Drop files to link to current docket
                  </p>
                  <button
                    className="rounded bg-[#ffeb3b] px-4 py-2 text-[10px] font-bold text-[#051125] shadow-sm transition-all hover:brightness-95"
                    type="button"
                  >
                    BROWSE FILES
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#c5c6cd]/10 bg-white p-5 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#45474d]">
                    Case Metrics
                  </h3>
                  <MaterialIcon name="share" className="text-sm text-[#828da7]" />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-4">
                    {caseMetrics.map((metric) => (
                      <div key={metric.label}>
                        <p className="text-[9px] font-bold uppercase opacity-60 text-[#45474d]">
                          {metric.label}
                        </p>
                        <p className="text-xs font-bold text-[#051125]">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {metricThumbs.map((thumb) => (
                      <div
                        key={thumb.src}
                        className="h-12 w-20 overflow-hidden rounded bg-[#e7e8e9]"
                      >
                        <img
                          alt={thumb.alt}
                          className="h-full w-full object-cover"
                          src={thumb.src}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
