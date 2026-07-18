"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const ALERT_TYPES = [
  "WANTED_PERSON_SIGHTING",
  "SUSPICIOUS_BEHAVIOR",
  "VEHICLE_MATCH",
  "THREAT_ALERT",
  "SYSTEM",
] as const;

const TARGET_ROLES = ["ALL", "COMMUNITY", "SECURITY_OPERATOR", "LAW_ENFORCEMENT", "ADMIN"] as const;

const SEVERITY_STYLES: Record<string, { accent: string; badgeBg: string; badgeFg: string; icon: string }> = {
  CRITICAL: { accent: "border-l-error", badgeBg: "bg-error-container/20", badgeFg: "text-error", icon: "priority_high" },
  HIGH: { accent: "border-l-tertiary-container", badgeBg: "bg-tertiary-container/20", badgeFg: "text-tertiary", icon: "warning" },
  MEDIUM: { accent: "border-l-primary-container", badgeBg: "bg-primary-container/20", badgeFg: "text-primary", icon: "info" },
  LOW: { accent: "border-l-outline-variant", badgeBg: "bg-surface-container", badgeFg: "text-on-surface-variant", icon: "notifications" },
};

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    alertType: ALERT_TYPES[0] as string,
    severity: "MEDIUM",
    targetRole: "ALL" as string,
  });

  const { data, isLoading, isError, error } = useQuery(
    trpc.alerts.list.queryOptions({ limit: 50, offset: 0 }),
  );

  const items = useMemo(() => data?.items ?? [], [data]);
  const visibleItems = severityFilter ? items.filter((a) => a.severity === severityFilter) : items;

  const counts = useMemo(
    () => ({
      critical: items.filter((a) => a.severity === "CRITICAL").length,
      high: items.filter((a) => a.severity === "HIGH").length,
      total: data?.total ?? 0,
    }),
    [items, data],
  );

  const createAlert = useMutation(
    trpc.alerts.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.alerts.list.queryKey() });
        setShowCreate(false);
        setForm({ title: "", description: "", alertType: ALERT_TYPES[0], severity: "MEDIUM", targetRole: "ALL" });
      },
    }),
  );

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Intelligence Alerts</h2>
          <p className="text-on-surface-variant font-body-md">Real-time alert creation and monitoring.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-medium flex items-center shadow-lg hover:bg-primary/90 transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined mr-2">add_alert</span>
          Create Alert
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
        <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex items-center space-x-4">
          <div className="h-12 w-12 rounded-lg bg-error-container/20 flex items-center justify-center text-error">
            <span className="material-symbols-outlined">priority_high</span>
          </div>
          <div>
            <p className="text-label-caps text-on-surface-variant uppercase">Critical</p>
            <h4 className="text-headline-md font-bold">{counts.critical}</h4>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex items-center space-x-4">
          <div className="h-12 w-12 rounded-lg bg-tertiary-container/20 flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <div>
            <p className="text-label-caps text-on-surface-variant uppercase">High</p>
            <h4 className="text-headline-md font-bold">{counts.high}</h4>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex items-center space-x-4">
          <div className="h-12 w-12 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">notifications</span>
          </div>
          <div>
            <p className="text-label-caps text-on-surface-variant uppercase">Total</p>
            <h4 className="text-headline-md font-bold">{counts.total}</h4>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => setSeverityFilter(null)}
          className={`px-4 py-2 rounded-full text-body-sm font-medium transition-colors ${severityFilter === null ? "bg-surface-container-high text-primary" : "bg-surface hover:bg-surface-container-low text-on-surface-variant"}`}
        >
          All Alerts
        </button>
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`px-4 py-2 rounded-full text-body-sm font-medium transition-colors ${severityFilter === sev ? "bg-surface-container-high text-primary" : "bg-surface hover:bg-surface-container-low text-on-surface-variant"}`}
          >
            {sev.charAt(0) + sev.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-on-surface-variant text-body-sm">Loading alerts...</p>}
      {isError && <p className="text-error text-body-sm">Failed to load alerts: {error?.message}</p>}
      {!isLoading && !isError && visibleItems.length === 0 && (
        <p className="text-on-surface-variant text-body-md py-12 text-center">No alerts match these filters.</p>
      )}

      <div className="space-y-4">
        {visibleItems.map((a) => {
          const style = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.MEDIUM;
          return (
            <div
              key={a.id}
              className={`bg-surface-container-lowest rounded-xl shadow-sm border-l-4 ${style.accent} hover:shadow-md transition-all p-6 flex flex-col`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`text-label-caps uppercase mb-1 block ${style.badgeFg}`}>{a.alertType.replace(/_/g, " ")}</span>
                  <h3 className="text-headline-md font-semibold text-on-surface">{a.title}</h3>
                </div>
                <div className="text-right">
                  <span className="text-body-sm text-on-surface-variant">{getRelativeTime(new Date(a.createdAt))}</span>
                  <div className={`flex items-center justify-end mt-1 ${style.badgeFg}`}>
                    <span className="material-symbols-outlined text-sm mr-1">{style.icon}</span>
                    <span className="text-[10px] font-bold uppercase">{a.severity}</span>
                  </div>
                </div>
              </div>
              {a.description && <p className="text-on-surface-variant text-body-sm flex-1">{a.description}</p>}
              <div className="mt-4 flex items-center space-x-3">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${style.badgeBg} ${style.badgeFg}`}>
                  Target: {a.targetRole}
                </span>
                {a.expiresAt && (
                  <span className="text-[10px] text-on-surface-variant">
                    Expires {new Date(a.expiresAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="bg-surface rounded-xl w-full max-w-lg shadow-2xl relative z-10 border border-outline-variant">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-semibold text-on-surface">Create Alert</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-surface-container rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAlert.mutate({
                  title: form.title,
                  description: form.description || undefined,
                  alertType: form.alertType,
                  severity: form.severity as never,
                  targetRole: form.targetRole as never,
                });
              }}
            >
              <div className="p-5 space-y-4">
                {createAlert.error && <p className="text-error text-body-sm">{createAlert.error.message}</p>}
                <div>
                  <label className="text-label-caps text-on-surface-variant uppercase block mb-1.5">Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-low"
                  />
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant uppercase block mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-low min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label-caps text-on-surface-variant uppercase block mb-1.5">Type</label>
                    <select
                      value={form.alertType}
                      onChange={(e) => setForm((f) => ({ ...f, alertType: e.target.value }))}
                      className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-low"
                    >
                      {ALERT_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-label-caps text-on-surface-variant uppercase block mb-1.5">Severity</label>
                    <select
                      value={form.severity}
                      onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                      className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-low"
                    >
                      {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant uppercase block mb-1.5">Target Audience</label>
                  <select
                    value={form.targetRole}
                    onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-low"
                  >
                    {TARGET_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-5 border-t border-outline-variant flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAlert.isPending}
                  className="px-5 py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {createAlert.isPending ? "Sending..." : "Send Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
