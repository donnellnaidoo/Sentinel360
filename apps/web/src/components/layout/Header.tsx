"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ConsoleRole } from "@/lib/auth/console-role";

const ROLE_LABELS: Record<ConsoleRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
};

interface HeaderProps {
  userName: string;
  userRole: ConsoleRole;
  onMobileMenuClick?: () => void;
}

export default function Header({ userName, userRole, onMobileMenuClick }: HeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/cases?q=${encodeURIComponent(q)}` : "/cases");
  };

  return (
    <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-sm border-b border-outline-variant/60">
      <div className="flex h-[70px] items-center gap-3 w-full px-margin-mobile lg:px-margin-desktop">
        <button
          type="button"
          onClick={onMobileMenuClick}
          aria-label="Open menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95 lg:hidden"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <form onSubmit={handleSearch} role="search" className="relative hidden w-full max-w-80 sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input
            type="search"
            aria-label="Search cases"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases by number or title..."
            className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-body-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all"
          />
        </form>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/alerts"
            aria-label="Alerts"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95"
          >
            <span className="material-symbols-outlined">notifications</span>
          </Link>
          <div className="hidden text-right md:block">
            <p className="text-body-sm font-medium text-on-surface leading-tight">{userName}</p>
            <p className="text-[11px] text-on-surface-variant leading-tight">{ROLE_LABELS[userRole]}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
