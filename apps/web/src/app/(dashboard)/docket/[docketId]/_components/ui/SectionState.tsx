"use client";

import type { ReactNode } from "react";

import { getErrorMessage } from "@/lib/trpc-errors";

export function SectionLoading({ rows = 3, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <div aria-busy="true" className="space-y-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="animate-pulse bg-surface-container-low rounded-xl h-16" aria-hidden="true" />
      ))}
    </div>
  );
}

export function SectionError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 p-4 bg-error-container text-on-error-container rounded-xl text-sm">
      <span className="material-symbols-outlined text-base mt-0.5" aria-hidden="true">
        error
      </span>
      <div className="flex-1">
        <p className="font-semibold">This section couldn&apos;t be loaded.</p>
        <p className="mt-0.5">{getErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 px-3 py-1.5 rounded-lg border border-current text-xs font-semibold hover:bg-on-error-container/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function SectionEmpty({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-8 px-4 rounded-xl border border-dashed border-outline-variant">
      <span className="material-symbols-outlined text-3xl text-on-surface-variant" aria-hidden="true">
        {icon}
      </span>
      <p className="text-sm font-semibold text-on-surface">{title}</p>
      {body && <p className="text-xs text-on-surface-variant max-w-md">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

type QueryLike<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
};

/**
 * Renders loading / error (with retry) / empty / data for one query, so no
 * section can ever show a blank panel when a request fails — which in a
 * legal record would read as "nothing recorded".
 */
export function QueryState<T>({
  query,
  isEmpty,
  empty,
  loadingRows,
  children,
}: {
  query: QueryLike<T>;
  isEmpty: (data: T) => boolean;
  empty: ReactNode;
  loadingRows?: number;
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <SectionLoading rows={loadingRows} />;
  if (query.isError || query.data === undefined) {
    return <SectionError error={query.error} onRetry={() => void query.refetch()} />;
  }
  if (isEmpty(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
