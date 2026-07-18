"use client";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-outline-variant">
      <div className="flex h-16 justify-between items-center w-full px-margin-desktop">
        <div className="relative w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input
            placeholder="Search users, cases, evidence..."
            className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-body-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-all active:scale-95">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </div>
    </header>
  );
}
