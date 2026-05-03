"use client";

import { cn } from "@Sentinel360/ui/lib/utils";

import CommandCenterShell, {
  MaterialIcon,
  headlineStyle,
} from "./command-center-shell";
import {
  aiStats,
  alertItems,
  investigationRows,
  kpiCards,
  mapDeployments,
  mapImageUrl,
  surveillanceStats,
} from "./data";

type CommandCenterDashboardProps = {
  agentName: string;
};

export default function CommandCenterDashboard({
  agentName,
}: CommandCenterDashboardProps) {
  return (
    <CommandCenterShell
      activeSidebarLabel="Dashboard"
      activeTopNavTab="Global View"
      agentName={agentName}
      searchPlaceholder="Global Search Intelligence..."
    >
      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <article
            key={card.label}
            className={cn(
              "rounded-xl border-l-4 bg-white p-6 transition-transform hover:scale-[1.02]",
              card.accentClassName,
            )}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#45474d]">
              {card.label}
            </p>
            <div className="flex items-end justify-between gap-4">
              <h2
                className="text-3xl font-extrabold text-[#051125]"
                style={headlineStyle}
              >
                {card.value}
              </h2>

              {card.progressPercent ? (
                <div className="w-16 overflow-hidden rounded-full bg-[#edeeef]">
                  <div
                    className="h-2 bg-[#051125]"
                    style={{ width: `${card.progressPercent}%` }}
                  />
                </div>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-bold",
                    card.detailClassName,
                  )}
                >
                  {card.detailIcon ? (
                    <MaterialIcon name={card.detailIcon} className="text-sm" />
                  ) : null}
                  {card.detailText}
                </span>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4">
          <section className="flex h-[600px] flex-col overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b border-[#f3f4f5] p-6">
              <h3
                className="text-lg font-bold text-[#191c1d]"
                style={headlineStyle}
              >
                Active AI Alerts
              </h3>
              <span className="rounded bg-[#ba1a1a]/10 px-2 py-1 text-[10px] font-bold text-[#ba1a1a]">
                LIVE FEED
              </span>
            </div>

            <div className="sentinel-no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
              {alertItems.map((alert) => (
                <button
                  key={alert.title}
                  className="group w-full rounded-xl bg-[#f8f9fa] p-4 text-left transition-colors hover:bg-[#e7e8e9]"
                  type="button"
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-black">
                      <img
                        alt={alert.imageAlt}
                        className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-100"
                        src={alert.imageUrl}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            alert.priorityClassName,
                          )}
                        >
                          {alert.priorityLabel}
                        </span>
                        <span className="text-[10px] text-[#45474d]">
                          {alert.elapsed}
                        </span>
                      </div>
                      <p className="mb-1 text-sm font-bold text-[#051125]">
                        {alert.title}
                      </p>
                      <p className="text-xs text-[#45474d]">{alert.location}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {alert.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded border border-[#051125]/10 bg-[#051125]/5 px-2 py-0.5 text-[9px] text-[#051125]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-[#f3f4f5] p-4 text-center">
              <button
                className="text-xs font-bold text-[#051125] hover:underline"
                type="button"
              >
                View All Intelligence Feeds
              </button>
            </div>
          </section>
        </div>

        <div className="col-span-12 flex flex-col gap-8 lg:col-span-8">
          <section className="relative h-[400px] overflow-hidden rounded-2xl bg-[#f3f4f5]">
            <img
              alt="Top-down city grid with highlighted deployment data points"
              className="h-full w-full object-cover opacity-80 mix-blend-multiply"
              src={mapImageUrl}
            />

            <div className="glass-panel absolute left-6 top-6 rounded-xl border border-white/20 p-4 shadow-lg">
              <h4
                className="mb-3 flex items-center gap-2 text-xs font-bold text-[#051125]"
                style={headlineStyle}
              >
                <MaterialIcon name="location_on" className="text-sm" />
                <span>LIVE DEPLOYMENT</span>
              </h4>

              <div className="space-y-2">
                {mapDeployments.map((deployment) => (
                  <div key={deployment.label} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        deployment.dotClassName,
                        deployment.pulse ? "animate-pulse" : "",
                      )}
                    />
                    <span className="text-[10px] font-medium text-[#191c1d]">
                      {deployment.label}: {deployment.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <span className="absolute left-1/3 top-1/2 h-4 w-4 rounded-full bg-[#ba1a1a] ring-4 ring-[#ba1a1a]/20 motion-safe:animate-bounce" />
            <span className="absolute right-1/4 top-1/4 h-3 w-3 rounded-full bg-[#051125] ring-4 ring-[#051125]/20" />
            <span className="absolute bottom-1/3 left-1/2 h-3 w-3 rounded-full bg-[#47607e] ring-4 ring-[#47607e]/20" />

            <div className="absolute bottom-6 right-6 flex gap-2">
              <button
                className="glass-panel rounded-lg p-2 text-[#051125] transition-colors hover:bg-white"
                type="button"
              >
                <MaterialIcon name="my_location" className="text-sm" />
              </button>
              <button
                className="glass-panel rounded-lg p-2 text-[#051125] transition-colors hover:bg-white"
                type="button"
              >
                <MaterialIcon name="layers" className="text-sm" />
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <section className="h-[170px] rounded-2xl bg-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3
                  className="text-sm font-bold text-[#191c1d]"
                  style={headlineStyle}
                >
                  Surveillance Status
                </h3>
                <MaterialIcon
                  name="videocam"
                  className="text-lg text-[#45474d]"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex justify-between text-[10px] font-bold">
                    <span>ACTIVE CAPACITY</span>
                    <span className="text-[#051125]">
                      {surveillanceStats.activeCapacity}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#edeeef]">
                    <div
                      className="h-full bg-gradient-to-r from-[#47607e] to-[#48617e]"
                      style={{
                        width: `${surveillanceStats.activeCapacity}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className="text-2xl font-black text-[#051125]"
                    style={headlineStyle}
                  >
                    {surveillanceStats.onlineNodes}
                  </p>
                  <p className="text-[10px] font-medium text-[#45474d]">
                    ONLINE NODES
                  </p>
                </div>
              </div>
            </section>

            <section className="h-[170px] rounded-2xl bg-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3
                  className="text-sm font-bold text-[#191c1d]"
                  style={headlineStyle}
                >
                  AI Performance
                </h3>
                <MaterialIcon
                  name="query_stats"
                  className="text-lg text-[#45474d]"
                />
              </div>

              <div className="space-y-3">
                {aiStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[10px] font-semibold text-[#45474d]">
                      {stat.label}
                    </span>
                    <span className="text-[10px] font-bold text-[#051125]">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="col-span-12">
          <section className="overflow-hidden rounded-2xl bg-white">
            <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <h3
                className="text-lg font-bold text-[#191c1d]"
                style={headlineStyle}
              >
                Investigation Queue
              </h3>

              <div className="flex flex-wrap gap-4">
                <button
                  className="flex items-center gap-2 rounded bg-[#f3f4f5] px-3 py-1 text-xs font-medium text-[#191c1d]"
                  type="button"
                >
                  <MaterialIcon name="filter_list" className="text-sm" />
                  <span>Sort: Priority</span>
                </button>
                <button
                  className="border-b-2 border-[#1b263b] text-xs font-bold text-[#1b263b]"
                  type="button"
                >
                  Export Data
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-[#f3f4f5] text-[10px] font-bold uppercase tracking-[0.14em] text-[#45474d]">
                  <tr>
                    <th className="px-8 py-4">Case ID</th>
                    <th className="px-8 py-4">Incident Type</th>
                    <th className="px-8 py-4">Lead Investigator</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Timestamp</th>
                    <th className="px-8 py-4" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f3f4f5]">
                  {investigationRows.map((row) => (
                    <tr
                      key={row.caseId}
                      className="group cursor-pointer transition-colors hover:bg-[#f3f4f5]"
                    >
                      <td className="px-8 py-5 text-xs font-bold text-[#051125]">
                        {row.caseId}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded",
                              row.iconWrapClassName,
                            )}
                          >
                            <MaterialIcon
                              name={row.icon}
                              className={cn("text-sm", row.iconClassName)}
                            />
                          </div>
                          <span className="text-xs font-semibold text-[#191c1d]">
                            {row.incidentType}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <img
                            alt={row.leadAvatarAlt}
                            className="h-6 w-6 rounded-full object-cover"
                            src={row.leadAvatarUrl}
                          />
                          <span className="text-xs text-[#191c1d]">
                            {row.lead}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={cn(
                            "rounded px-2 py-1 text-[10px] font-bold",
                            row.statusClassName,
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-xs text-[#45474d]">
                        {row.timestamp}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <MaterialIcon
                          name="chevron_right"
                          className="text-base text-[#45474d] transition-colors group-hover:text-[#051125]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-[#f3f4f5] p-4 text-center">
              <button
                className="text-xs font-bold text-[#1b263b]"
                type="button"
              >
                Load 24 More Cases
              </button>
            </div>
          </section>
        </div>
      </section>
    </CommandCenterShell>
  );
}
