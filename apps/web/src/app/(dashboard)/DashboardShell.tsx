"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { queryClient } from "@/lib/trpc/client";

interface DashboardShellProps {
  children: React.ReactNode;
  userRole: string;
  userName: string;
  userAvatar?: string;
}

export default function DashboardShell({ children, userRole }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen bg-background text-on-surface">
        <Sidebar currentPath={pathname} userRole={userRole} />
        <div className="flex flex-1 flex-col lg:pl-64">
          <Header />
          <main className="flex-1 overflow-y-auto p-margin-desktop">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
