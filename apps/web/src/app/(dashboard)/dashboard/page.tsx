"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc/client";

interface DashboardStats {
  stats: {
    activeCases: number;
    pendingAlerts: number;
    openEvidence: number;
    criticalThreats: number;
    totalCases: number;
    totalUsers: number;
    totalSightings: number;
  };
  severityDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  recentCases: Array<{
    id: string;
    case_number: string;
    title: string;
    priority: string;
    status: string;
    updated_at: string;
  }>;
}

const SEVERITY_BARS: Array<{ key: keyof DashboardStats["severityDistribution"]; label: string }> = [
  { key: "LOW", label: "LOW" },
  { key: "MEDIUM", label: "MEDIUM" },
  { key: "HIGH", label: "HIGH" },
  { key: "CRITICAL", label: "CRITICAL" },
];

const quickActions = [
  { icon: "emergency_share", label: "Broadcast Alert", href: "/alerts" },
  { icon: "inventory_2", label: "Evidence Locker", href: "/evidence" },
  { icon: "visibility", label: "Sightings Queue", href: "/sightings" },
  { icon: "person_search", label: "Wanted Feed", href: "/wanted-feed" },
] as const;

function activityIcon(eventType: string): { icon: string; iconBg: string; iconColor: string; fill: boolean } {
  const t = eventType.toUpperCase();
  if (t.includes("ALERT")) return { icon: "warning", iconBg: "bg-tertiary-container/20", iconColor: "text-tertiary", fill: true };
  if (t.includes("SIGHTING")) return { icon: "visibility", iconBg: "bg-primary-container/20", iconColor: "text-primary", fill: true };
  if (t.includes("EVIDENCE")) return { icon: "inventory_2", iconBg: "bg-primary-container/20", iconColor: "text-primary", fill: true };
  if (t.includes("ARREST") || t.includes("HEARING") || t.includes("PROSECUTION")) return { icon: "gavel", iconBg: "bg-secondary-container/20", iconColor: "text-secondary", fill: true };
  if (t.includes("CASE") || t.includes("STATUS") || t.includes("INVESTIGATOR") || t.includes("NOTE")) return { icon: "folder", iconBg: "bg-secondary-container/20", iconColor: "text-secondary", fill: true };
  if (t.includes("POPIA")) return { icon: "privacy_tip", iconBg: "bg-on-surface-variant/10", iconColor: "text-on-surface-variant", fill: false };
  return { icon: "history", iconBg: "bg-on-surface-variant/10", iconColor: "text-on-surface-variant", fill: false };
}

function activityTitle(eventType: string): string {
  return eventType
    .replace(/[._]/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanTime(dateStr: string | Date): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString("en-ZA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const priorityConfig: Record<string, { label: string; class: string }> = {
  CRITICAL: { label: "Critical", class: "bg-error/10 text-error" },
  HIGH: { label: "High", class: "bg-tertiary/10 text-tertiary" },
  MEDIUM: { label: "Medium", class: "bg-primary-container/20 text-primary" },
  LOW: { label: "Low", class: "bg-surface-container-high text-on-surface-variant" },
};

const statusConfig: Record<string, { label: string; class: string }> = {
  OPEN: { label: "Active Investigation", class: "bg-primary-container/20 text-primary" },
  CLOSED: { label: "Closed", class: "bg-secondary-container/20 text-secondary" },
  ARCHIVED: { label: "Archived", class: "bg-surface-container-high text-on-surface-variant" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activity = useQuery({
    ...trpc.audit.list.queryOptions({ limit: 5, offset: 0 }),
    retry: false,
  });
  const activityItems = activity.data?.items ?? [];

  const maxSeverityCount = data
    ? Math.max(1, ...SEVERITY_BARS.map((b) => data.severityDistribution[b.key]))
    : 1;

  const stats = data
    ? [
        { label: "ACTIVE CASES", value: data.stats.activeCases.toLocaleString(), change: `+${Math.min(data.stats.activeCases, 10)}%`, changeClass: "text-secondary", sub: `${data.stats.activeCases} open investigations`, border: "border-primary" },
        { label: "PENDING ALERTS", value: data.stats.pendingAlerts.toLocaleString(), change: `+${data.stats.pendingAlerts}`, changeClass: "text-error", sub: "Requiring immediate review", border: "border-tertiary" },
        { label: "OPEN EVIDENCE", value: data.stats.openEvidence.toLocaleString(), change: "Stable", changeClass: "text-on-surface-variant", sub: "Digital/Physical assets", border: "border-secondary" },
        { label: "CRITICAL THREATS", value: String(data.stats.criticalThreats).padStart(2, "0"), badge: data.stats.criticalThreats > 0 ? "Severe" : undefined, sub: "Level 5 incidents", border: "border-error" },
      ]
    : [];

  return (
    <div className="space-y-stack-lg max-w-container-max mx-auto w-full min-h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Intelligence Overview</h2>
          <p className="text-on-surface-variant mt-1">Real-time situational awareness for Precinct 07 operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/cases" className="bg-surface-container-highest text-primary px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-primary-container/20 transition-all">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            <span>Adjust Filters</span>
          </Link>
          <Link href="/cases/new" className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>New Investigation</span>
          </Link>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {stats.map((stat) => (
            <div key={stat.label} className={`bg-surface-container-lowest rounded-xl p-6 border-l-4 ${stat.border} shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200`}>
              <p className="font-label-caps text-label-caps text-on-surface-variant">{stat.label}</p>
              <div className="flex items-baseline justify-between mt-2">
                <h3 className="font-headline-lg text-headline-lg">{stat.value}</h3>
                {stat.change && (
                  <span className={`${stat.changeClass} font-bold text-xs flex items-center`}>{stat.change}</span>
                )}
                {stat.badge && (
                  <span className="bg-error/10 text-error px-2 py-0.5 rounded text-[10px] font-bold uppercase">{stat.badge}</span>
                )}
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-headline-md text-headline-md">Incident Severity</h4>
              <p className="text-body-sm text-on-surface-variant">Recorded incidents grouped by severity level</p>
            </div>
          </div>
          {loading ? (
            <div className="flex-1 flex items-end justify-between gap-4 pt-4 px-2 animate-pulse">
              {SEVERITY_BARS.map((bar, i) => (
                <div key={bar.key} className="flex flex-col items-center flex-1 gap-2 h-full justify-end">
                  <div className="h-4 w-6 bg-surface-container-high rounded" />
                  <div
                    className="w-full bg-surface-container-high rounded-t-lg"
                    style={{ height: `${25 + (i % 2) * 20}%` }}
                  />
                  <div className="h-2.5 w-10 bg-surface-container-high rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-end justify-between gap-4 pt-4 px-2">
              {SEVERITY_BARS.map((bar) => {
                const value = data?.severityDistribution[bar.key] ?? 0;
                const pct = Math.max((value / maxSeverityCount) * 100, value > 0 ? 6 : 2);
                return (
                  <div key={bar.key} className="flex flex-col items-center flex-1 gap-2 group h-full justify-end">
                    <span className="text-body-sm font-bold text-on-surface">{value}</span>
                    <div
                      className="w-full bg-primary-container/20 rounded-t-lg relative flex items-end justify-center group-hover:bg-primary-container/40 transition-all"
                      style={{ height: "100%" }}
                    >
                      <div className="w-full bg-primary rounded-t-lg transition-all" style={{ height: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant">{bar.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200 flex flex-col h-[400px]">
          <h4 className="font-headline-md text-headline-md mb-6">Recent Activity</h4>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {activity.isLoading && (
              <div className="space-y-6 animate-pulse">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="relative pl-8">
                    <div className="absolute left-0 top-0 w-6 h-6 bg-surface-container-high rounded-full" />
                    {i < 3 && <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-outline-variant" />}
                    <div className="h-3 w-32 bg-surface-container-high rounded" />
                    <div className="h-2.5 w-40 bg-surface-container-high rounded mt-2" />
                    <div className="h-2 w-16 bg-surface-container-high rounded mt-2" />
                  </div>
                ))}
              </div>
            )}
            {activity.isError && (
              <p className="text-body-sm text-on-surface-variant">Recent activity requires elevated access.</p>
            )}
            {!activity.isLoading && !activity.isError && activityItems.length === 0 && (
              <p className="text-body-sm text-on-surface-variant">No recent activity recorded.</p>
            )}
            {activityItems.map((item, i) => {
              const cfg = activityIcon(item.eventType);
              const target = item.targetEntityType ? item.targetEntityType.toLowerCase().replace(/_/g, " ") : undefined;
              const desc = `${item.actorName ?? "System"}${target ? ` — ${target}` : ""}`;
              return (
                <div key={item.id} className="relative pl-8">
                  <div className={`absolute left-0 top-0 w-6 h-6 ${cfg.iconBg} rounded-full flex items-center justify-center`}>
                    <span className={`material-symbols-outlined ${cfg.iconColor} text-[14px]`} style={cfg.fill ? { fontVariationSettings: "'FILL' 1" } : undefined}>{cfg.icon}</span>
                  </div>
                  {i < activityItems.length - 1 && <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-outline-variant" />}
                  <p className="text-body-sm font-bold">{activityTitle(item.eventType)}</p>
                  <p className="text-[12px] text-on-surface-variant">{desc}</p>
                  <span className="text-[10px] text-primary-fixed-dim font-bold mt-1">{humanTime(item.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-gutter">
        <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
            <h4 className="font-headline-md text-headline-md">Recent Case Folder</h4>
            <Link href="/cases" className="text-primary font-bold text-body-sm hover:underline">View All Registry</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">CASE ID</th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">SUBJECT/TARGET</th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">PRIORITY</th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">STATUS</th>
                  <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">LAST UPDATED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  [0, 1, 2, 3, 4].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-3 w-16 bg-surface-container-high rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-40 bg-surface-container-high rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-14 bg-surface-container-high rounded-full" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-surface-container-high rounded-full" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-20 bg-surface-container-high rounded" /></td>
                    </tr>
                  ))
                ) : data && data.recentCases.length > 0 ? (
                  data.recentCases.map((c) => {
                    const pc = priorityConfig[c.priority] ?? { label: c.priority, class: "bg-surface-container-high text-on-surface-variant" };
                    const sc = statusConfig[c.status] ?? { label: c.status, class: "bg-surface-container-high text-on-surface-variant" };
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => router.push(`/docket/${c.id}`)}
                      >
                        <td className="px-6 py-4 text-body-sm font-bold text-primary">{c.case_number}</td>
                        <td className="px-6 py-4 text-body-sm">{c.title}</td>
                        <td className="px-6 py-4">
                          <span className={`${pc.class} px-2 py-0.5 rounded text-[10px] font-bold uppercase`}>{pc.label}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`${sc.class} px-2 py-0.5 rounded text-[10px] font-bold uppercase`}>{sc.label}</span>
                        </td>
                        <td className="px-6 py-4 text-body-sm text-on-surface-variant">{humanTime(c.updated_at)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">No cases found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] flex flex-col">
          <h4 className="font-headline-md text-headline-md mb-2">Quick Actions</h4>
          <p className="text-body-sm text-on-surface-variant mb-6">Jump straight to the tools you use most.</p>
          <div className="space-y-3 flex-1">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="w-full flex items-center justify-between p-3 bg-surface-container-low rounded-xl hover:bg-primary-container/10 transition-all border border-transparent hover:border-primary-container group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">{action.icon}</span>
                  <span className="font-medium text-body-sm">{action.label}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
              </Link>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-outline-variant">
            <div className="flex items-center gap-3 p-3 bg-primary-container/10 rounded-lg">
              <span className="material-symbols-outlined text-primary">support_agent</span>
              <div className="text-[12px]">
                <p className="font-bold">Command Link Active</p>
                <p className="text-on-surface-variant">24/7 Intel Support</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-auto flex justify-between items-center w-full py-stack-md border-t border-outline-variant">
        <span className="font-label-caps text-label-caps text-on-surface-variant">© 2024 Sentinel360 Intelligence. All rights reserved.</span>
        <div className="flex gap-6">
          <Link href="#" className="text-on-surface-variant hover:text-primary font-body-sm text-body-sm transition-opacity">Privacy Policy</Link>
          <Link href="#" className="text-on-surface-variant hover:text-primary font-body-sm text-body-sm transition-opacity">Terms of Service</Link>
          <Link href="#" className="text-on-surface-variant hover:text-primary font-body-sm text-body-sm transition-opacity">Security Disclosure</Link>
          <Link href="#" className="text-on-surface-variant hover:text-primary font-body-sm text-body-sm transition-opacity">Contact Support</Link>
        </div>
      </footer>
    </div>
  );
}
