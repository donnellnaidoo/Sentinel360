import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden font-body-md text-on-surface p-margin-mobile md:p-0">
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-[#00d4ff] opacity-5 blur-3xl" />
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-[#00ff88] opacity-5 blur-3xl" />
      {children}
      <div className="fixed bottom-0 left-0 w-full p-8 flex justify-end pointer-events-none opacity-40">
        <span className="font-label-caps text-label-caps text-outline">© {new Date().getFullYear()} SENTINEL360 INTELLIGENCE</span>
      </div>
    </div>
  );
}
