import { cn } from "@Sentinel360/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const glassVariants = cva(
  "rounded-xl border backdrop-blur-xl transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-white/5 border-white/10",
        elevated:
          "bg-white/8 border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        subtle:
          "bg-white/3 border-white/5 backdrop-blur-md",
        prominent:
          "bg-white/12 border-white/20 shadow-[0_12px_48px_rgba(0,0,0,0.4)] backdrop-blur-2xl",
      },
      hoverEffect: {
        true: "hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] hover:border-white/20 cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      hoverEffect: false,
    },
  },
);

interface GlassCardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof glassVariants> {
  shimmer?: boolean;
}

function GlassCard({
  className,
  variant,
  hoverEffect,
  shimmer,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      data-slot="glass-card"
      className={cn(
        glassVariants({ variant, hoverEffect }),
        shimmer && "relative overflow-hidden before:absolute before:inset-0 before:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.03)_25%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.03)_75%,transparent_100%)] before:bg-[length:200%_100%] before:animate-shimmer before:pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { GlassCard, glassVariants };
