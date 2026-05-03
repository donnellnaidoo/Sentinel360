"use client";

import { cn } from "@Sentinel360/ui/lib/utils";

import {
  CommandCenterSidebar,
  MaterialIcon,
  headlineStyle,
} from "./command-center-shell";
import {
  databaseStats,
  suspectFilterOptions,
  suspectRecords,
} from "./suspect-database-data";

type SuspectDatabaseProps = {
  agentName: string;
};

const topNav = ["Global View", "Analytics", "Reports"] as const;

export default function SuspectDatabase({
  agentName,
}: SuspectDatabaseProps) {
  const resolvedAgentName = agentName.trim() || "Agent K. Miller";

  return (
    <div className="sentinel-dashboard min-h-screen bg-[#f8f9fa] text-[#191c1d]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap");
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
      `}</style>

      <CommandCenterSidebar activeSidebarLabel="Suspect Database" />

      <header className="fixed right-0 top-0 z-30 ml-64 flex h-16 w-[calc(100%-16rem)] items-center justify-between bg-[#f8f9fa]/80 px-8 backdrop-blur-xl">
        <div className="flex flex-1 items-center gap-8">
          <div className="relative w-full max-w-md">
            <MaterialIcon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[#45474d]"
            />
            <input
              className="w-full rounded-lg border-none bg-[#f3f4f5] py-2 pl-10 pr-4 text-sm text-[#191c1d] placeholder:text-[#45474d]/60 focus:ring-2 focus:ring-[#051125]/20"
              placeholder="Search suspect identities..."
              type="text"
            />
          </div>

          <nav className="hidden items-center gap-6 lg:flex">
            {topNav.map((tab) => (
              <button
                key={tab}
                className={cn(
                  "text-sm font-medium transition-colors",
                  tab === "Reports"
                    ? "border-b-2 border-[#051125] py-1 text-[#191c1d]"
                    : "text-[#45474d] hover:text-[#051125]",
                )}
                type="button"
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            className="rounded-full p-2 text-[#45474d] transition-colors hover:bg-[#e7e8e9]"
            type="button"
          >
            <MaterialIcon name="help" />
          </button>
          <button
            className="relative rounded-full p-2 text-[#45474d] transition-colors hover:bg-[#e7e8e9]"
            type="button"
          >
            <MaterialIcon name="notifications" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#f8f9fa] bg-[#ba1a1a]" />
          </button>

          <div className="ml-2 flex items-center gap-3 border-l border-[#c5c6cd]/20 pl-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-[#191c1d]">{resolvedAgentName}</p>
              <p className="text-[10px] text-[#45474d]">Level 4 Clearance</p>
            </div>
            <img
              alt="Professional male intelligence officer headshot with neutral background"
              className="h-8 w-8 rounded-full bg-[#e7e8e9] object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0gR66Q_OWZ_ZmAIEweR-8ggci8D4Y6Xse2rqFmokc9L5HY_h37pOo5GYvAwn1IrkIj8phi3l_ps4Qawx7jyV4MQEvW1fJa9BNPHtFEHwZ1lJ3s6HQrCsOmy4QC_3BJKmbiAEFL39CGA8LU8vBSuW5SpETu0sfOVa8p_74ieiRW3umdEZlB6uJdG_g9ynFYVsUK4oncYT52FX725KvsNElfChSO6oXY4bEIq6MX9oB6d4HKhNEwka12Il-BC8D9eXWoeLROP5SaZU"
            />
          </div>
        </div>
      </header>

      <main className="ml-64 min-h-screen bg-[#f8f9fa] px-8 pb-8 pt-20">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1
                className="text-3xl font-extrabold tracking-tight text-[#051125]"
                style={headlineStyle}
              >
                Suspect Database
              </h1>
              <p className="mt-1 font-medium text-[#45474d]">
                Monitoring 2,842 active intelligence profiles across all sectors.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#45474d] shadow-sm transition-colors hover:bg-[#e7e8e9]"
                type="button"
              >
                <MaterialIcon name="file_download" className="text-lg" />
                <span>Export Data</span>
              </button>
              <button
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#051125] to-[#1b263b] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#051125]/10 transition-opacity hover:opacity-90"
                type="button"
              >
                <MaterialIcon name="person_add" className="text-lg" />
                <span>Register Suspect</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-[#f3f4f5] p-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#45474d]">
                Filters:
              </span>
            </div>

            <FilterSelect options={suspectFilterOptions.crimeTypes} />
            <FilterSelect options={suspectFilterOptions.regions} />
            <FilterSelect options={suspectFilterOptions.statuses} />

            <div className="ml-auto">
              <button className="text-xs font-bold text-[#051125] hover:underline" type="button">
                Clear all filters
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#f3f4f5]/50">
                    {[
                      "Suspect Identity",
                      "Classification",
                      "Current Status",
                      "Geo-Coordinates",
                      "Lead Officer",
                      "Interventions",
                    ].map((heading, index) => (
                      <th
                        key={heading}
                        className={cn(
                          "px-6 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#45474d]",
                          index === 5 ? "text-right" : "",
                        )}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-8 divide-white">
                  {suspectRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="group transition-colors hover:bg-[#e7e8e9]/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img
                              alt={record.imageAlt}
                              className="h-12 w-12 rounded-xl object-cover grayscale transition-all group-hover:grayscale-0"
                              src={record.imageUrl}
                            />
                            <div
                              className={cn(
                                "absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#f8f9fa]",
                                record.indicatorClassName,
                              )}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#191c1d]">
                              {record.name}
                            </p>
                            <p className="font-mono text-[10px] text-[#45474d]">
                              ID: {record.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-bold",
                            record.classificationClassName,
                          )}
                        >
                          {record.classification}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              record.indicatorClassName,
                            )}
                          />
                          <span
                            className={cn(
                              "text-xs font-bold",
                              record.statusClassName,
                            )}
                          >
                            {record.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-[#45474d]">
                        <div className="flex items-center gap-1">
                          <MaterialIcon name="location_on" className="text-sm" />
                          <span>{record.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-[#45474d]">
                        {record.officer}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="rounded-lg bg-[#f3f4f5] px-3 py-1.5 text-[10px] font-bold text-[#191c1d] transition-colors hover:bg-[#e7e8e9]"
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg bg-[#051125] px-3 py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90"
                            type="button"
                          >
                            View Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-[#c5c6cd]/10 p-6">
              <p className="text-xs font-medium text-[#45474d]">
                Showing 4 of 2,842 intelligence profiles
              </p>
              <div className="flex gap-2">
                <PaginationButton icon="chevron_left" />
                <PaginationPage active label="1" />
                <PaginationPage label="2" />
                <PaginationPage label="3" />
                <PaginationButton icon="chevron_right" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {databaseStats.map((stat) => (
              <article
                key={stat.label}
                className={cn("flex flex-col gap-4 rounded-3xl p-6", stat.cardClassName)}
              >
                <div
                  className={cn(
                    "z-10 flex h-10 w-10 items-center justify-center rounded-xl",
                    stat.iconWrapClassName,
                  )}
                >
                  <MaterialIcon
                    name={stat.icon}
                    className={stat.iconClassName}
                  />
                </div>
                <div className="z-10">
                  <h3
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-[0.16em]",
                      stat.labelClassName,
                    )}
                  >
                    {stat.label}
                  </h3>
                  <p
                    className={cn(
                      "mt-1 text-3xl font-extrabold",
                      stat.valueClassName,
                    )}
                    style={headlineStyle}
                  >
                    {stat.value}
                  </p>
                </div>
                {stat.glow ? (
                  <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function FilterSelect({ options }: { options: string[] }) {
  return (
    <div className="relative">
      <select className="cursor-pointer appearance-none rounded-lg border-none bg-white py-2 pl-4 pr-10 text-xs font-semibold text-[#45474d] focus:ring-2 focus:ring-[#051125]/10">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <MaterialIcon
        name="expand_more"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-lg text-[#45474d]"
      />
    </div>
  );
}

function PaginationButton({ icon }: { icon: string }) {
  return (
    <button
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3f4f5] text-[#45474d] transition-colors hover:bg-[#e7e8e9]"
      type="button"
    >
      <MaterialIcon name={icon} className="text-lg" />
    </button>
  );
}

function PaginationPage({
  active = false,
  label,
}: {
  active?: boolean;
  label: string;
}) {
  return (
    <button
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors",
        active
          ? "bg-[#051125] text-white"
          : "text-[#45474d] hover:bg-[#f3f4f5]",
      )}
      type="button"
    >
      {label}
    </button>
  );
}
