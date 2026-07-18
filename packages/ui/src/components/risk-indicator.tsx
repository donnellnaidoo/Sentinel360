import { cn } from "@Sentinel360/ui/lib/utils";

const riskConfig = {
  critical: { color: "#ef4444", ringColor: "stroke-red-500" },
  high: { color: "#f59e0b", ringColor: "stroke-amber-500" },
  medium: { color: "#eab308", ringColor: "stroke-yellow-500" },
  low: { color: "#22c55e", ringColor: "stroke-green-500" },
} as const;

type RiskLevel = keyof typeof riskConfig;

interface RiskIndicatorProps {
  level: RiskLevel;
  percentage: number;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: { dimension: 64, stroke: 4, text: "text-xs" },
  md: { dimension: 96, stroke: 5, text: "text-sm" },
  lg: { dimension: 128, stroke: 6, text: "text-base" },
};

function RiskIndicator({
  level,
  percentage,
  size = "md",
  animated,
  label,
  className,
}: RiskIndicatorProps) {
  const config = riskConfig[level];
  const { dimension, stroke, text } = sizeMap[size];
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      data-slot="risk-indicator"
      className={cn("relative inline-flex flex-col items-center gap-1", className)}
    >
      <svg
        width={dimension}
        height={dimension}
        className={cn(animated && "animate-spin-slow")}
        style={{ transformOrigin: "center" }}
      >
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/5"
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-all duration-700",
            config.ringColor,
            animated && "drop-shadow-[0_0_6px_var(--glow-color)]",
          )}
          style={
            {
              "--glow-color": config.color,
              stroke: config.color,
              transform: "rotate(-90deg)",
              transformOrigin: "center",
            } as React.CSSProperties
          }
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill={config.color}
          className={cn("font-bold", text)}
        >
          {percentage}%
        </text>
      </svg>
      {label && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

export { RiskIndicator };
