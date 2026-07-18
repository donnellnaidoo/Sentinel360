import { cn } from "@Sentinel360/ui/lib/utils";
import { AlertTriangle, CheckCircle, Edit, FileText, Plus, Upload } from "lucide-react";

const typeConfig = {
  creation: { icon: Plus, color: "text-cyan-500", bg: "bg-cyan-500/20" },
  update: { icon: Edit, color: "text-blue-500", bg: "bg-blue-500/20" },
  verification: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/20" },
  alert: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/20" },
  upload: { icon: Upload, color: "text-amber-500", bg: "bg-amber-500/20" },
  note: { icon: FileText, color: "text-purple-500", bg: "bg-purple-500/20" },
} as const;

interface TimelineItem {
  id: string;
  timestamp: string;
  action: string;
  description?: string;
  actor?: {
    name: string;
    role: string;
    avatar?: string;
  };
  type: keyof typeof typeConfig;
}

interface TimelineProps {
  items: TimelineItem[];
  variant?: "default" | "compact" | "detailed";
  maxItems?: number;
  className?: string;
  emptyMessage?: string;
}

function Timeline({
  items,
  variant = "default",
  maxItems,
  className,
  emptyMessage = "No activity recorded.",
}: TimelineProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  if (displayItems.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-sm text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div data-slot="timeline" className={cn("space-y-0", className)}>
      {displayItems.map((item, index) => {
        const Icon = typeConfig[item.type]?.icon || Plus;
        const isLast = index === displayItems.length - 1;

        if (variant === "compact") {
          return (
            <div key={item.id} className="flex items-center gap-3 py-2">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", typeConfig[item.type]?.bg)}>
                <Icon className={cn("h-3 w-3", typeConfig[item.type]?.color)} />
              </div>
              <span className="text-sm">{item.action}</span>
              <span className="ml-auto text-xs text-muted-foreground">{item.timestamp}</span>
            </div>
          );
        }

        return (
          <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", typeConfig[item.type]?.bg)}>
                <Icon className={cn("h-3.5 w-3.5", typeConfig[item.type]?.color)} />
              </div>
              {!isLast && (
                <div className="mt-1 h-full w-px bg-white/10" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium">{item.action}</p>
              {item.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              )}
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                {item.actor && (
                  <>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{item.actor.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { Timeline, type TimelineItem };
