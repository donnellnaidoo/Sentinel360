import { cn } from "@Sentinel360/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border",
  {
    variants: {
      status: {
        wanted: "bg-red-500/15 text-red-400 border-red-500/30",
        investigating: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        arrested: "bg-green-500/15 text-green-400 border-green-500/30",
        cleared: "bg-slate-500/15 text-slate-400 border-slate-500/30",
        deceased: "bg-gray-500/15 text-gray-400 border-gray-500/30",
        under_review: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        closed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
        archived: "bg-gray-500/15 text-gray-400 border-gray-500/30",
        pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
        critical: "bg-red-500/15 text-red-400 border-red-500/30",
        high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
        medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
        low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        info: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      },
    },
    defaultVariants: { status: "wanted" },
  },
);

interface StatusBadgeProps
  extends VariantProps<typeof statusBadgeVariants> {
  status:
    | "wanted"
    | "investigating"
    | "arrested"
    | "cleared"
    | "deceased"
    | "under_review"
    | "active"
    | "closed"
    | "archived"
    | "pending"
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "info";
  pulse?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function StatusBadge({
  status,
  pulse,
  className,
  children,
}: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(
        statusBadgeVariants({ status }),
        pulse && "animate-pulse",
        className,
      )}
    >
      {pulse && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
