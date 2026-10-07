import { PRIORITY_LABELS, PRIORITY_STYLES, type CasePriority } from "@/lib/case-labels";
import { STATUS_ICONS, STATUS_LABELS, STATUS_STYLES, type CaseStatus } from "@/lib/case-status";

// Status and priority always carry an icon and text, never colour alone.

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const s = status as CaseStatus;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
        STATUS_STYLES[s] ?? "bg-surface-container-high text-on-surface-variant"
      } ${className}`}
    >
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
        {STATUS_ICONS[s] ?? "circle"}
      </span>
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority as CasePriority;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
        PRIORITY_STYLES[p] ?? "bg-surface-container-high text-on-surface-variant"
      }`}
    >
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
        flag
      </span>
      {PRIORITY_LABELS[p] ?? priority} priority
    </span>
  );
}
