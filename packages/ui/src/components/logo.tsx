import { cn } from "@Sentinel360/ui/lib/utils";

interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {}

function LogoMark({ className, ...props }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("size-6", className)}
      aria-hidden="true"
      {...props}
    >
      <polygon className="fill-[#d98e2b]" points="50.0,17.0 50.0,0.0 72.7,5.45 64.98,20.6" />
      <polygon className="fill-current" points="73.33,26.67 85.36,14.64 97.55,34.55 81.38,39.8" />
      <polygon className="fill-current" points="83.0,50.0 100.0,50.0 94.55,72.7 79.4,64.98" />
      <polygon className="fill-current" points="73.33,73.33 85.36,85.36 65.45,97.55 60.2,81.38" />
      <polygon className="fill-current" points="50.0,83.0 50.0,100.0 27.3,94.55 35.02,79.4" />
      <polygon className="fill-current" points="26.67,73.33 14.64,85.36 2.45,65.45 18.62,60.2" />
      <polygon className="fill-current" points="17.0,50.0 0.0,50.0 5.45,27.3 20.6,35.02" />
      <polygon className="fill-current" points="26.67,26.67 14.64,14.64 34.55,2.45 39.8,18.62" />
      <circle className="fill-current" cx="50" cy="50" r="11" />
    </svg>
  );
}

interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "lockup" | "mark";
  markClassName?: string;
}

function Logo({ variant = "lockup", className, markClassName, ...props }: LogoProps) {
  if (variant === "mark") {
    return <LogoMark className={markClassName} {...(props as React.SVGProps<SVGSVGElement>)} />;
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)} {...props}>
      <LogoMark className={cn("size-[1.15em] shrink-0", markClassName)} />
      <span className="inline-flex items-baseline gap-1 font-bold tracking-tight">
        <span>Sentinel</span>
        <span className="font-mono text-[0.62em] font-semibold text-[#d98e2b]">360</span>
      </span>
    </span>
  );
}

export { Logo, LogoMark };
