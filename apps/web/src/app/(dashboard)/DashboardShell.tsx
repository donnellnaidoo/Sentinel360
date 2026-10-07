"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { ConsoleRole } from "@/lib/auth/console-role";
import { ConsoleRoleProvider } from "@/lib/auth/console-role-context";
import { queryClient } from "@/lib/trpc/client";

interface DashboardShellProps {
  children: React.ReactNode;
  userRole: ConsoleRole;
  userName: string;
}

export default function DashboardShell({ children, userRole, userName }: DashboardShellProps) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConsoleRoleProvider value={userRole}>
        <div className="flex min-h-screen bg-background text-on-surface">
          <Sidebar
            currentPath={pathname}
            userRole={userRole}
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
          <div className="flex flex-1 flex-col lg:pl-[270px]">
            <Header
              userName={userName}
              userRole={userRole}
              onMobileMenuClick={() => setMobileSidebarOpen(true)}
            />
            <main className="flex-1 overflow-y-auto p-margin-mobile lg:p-margin-desktop">
              {children}
            </main>
          </div>
        </div>
        <Toaster position="bottom-right" richColors closeButton />
      </ConsoleRoleProvider>
    </QueryClientProvider>
  );
}
