"use client";

interface HeaderProps {
  onMobileMenuClick?: () => void;
}

export default function Header({ onMobileMenuClick }: HeaderProps) {
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

        <div className="relative hidden w-full max-w-80 sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input
            placeholder="Search users, cases, evidence..."
            className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-body-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-surface" />
          </button>
        </div>
      </div>
    </header>
  );
}
