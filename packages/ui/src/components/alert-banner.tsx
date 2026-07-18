"use client";

import { cn } from "@Sentinel360/ui/lib/utils";
import { AlertTriangle, Bell, Info, ShieldAlert, X } from "lucide-react";
import { useState } from "react";

const severityConfig = {
  critical: {
    icon: ShieldAlert,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  high: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  medium: {
    icon: Bell,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  low: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  info: {
    icon: Info,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
  },
} as const;

interface AlertBannerProps {
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  message?: string;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

function AlertBanner({
  severity,
  title,
  message,
  dismissible = true,
  action,
  onDismiss,
  className,
}: AlertBannerProps) {
  const [visible, setVisible] = useState(true);
  const config = severityConfig[severity];
  const Icon = config.icon;

  if (!visible) return null;

  return (
    <div
      data-slot="alert-banner"
      role="alert"
      className={cn(
        "animate-slide-down rounded-xl border p-4 backdrop-blur-sm",
        config.bgColor,
        config.borderColor,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold", config.color)}>
            {title}
          </p>
          {message && (
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={cn(
                "mt-2 text-sm font-medium underline-offset-2 hover:underline",
                config.color,
              )}
            >
              {action.label}
            </button>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              onDismiss?.();
            }}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export { AlertBanner };
