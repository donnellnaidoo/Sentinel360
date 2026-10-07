"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Native <dialog> opened with showModal(): focus is trapped, Esc closes it,
 * and focus returns to whatever opened it when it closes.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      openerRef.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-outline-variant bg-surface p-0 text-on-surface shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4">
            <h2 id={titleId} className="text-base font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 hover:bg-surface-container"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">{children}</div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant px-5 py-4">{footer}</div>
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  pendingLabel = "Working…",
  destructive,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${
              destructive ? "bg-error text-on-error" : "bg-primary text-on-primary"
            }`}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-on-surface leading-relaxed">{body}</div>
      {error && (
        <p role="alert" className="p-3 bg-error-container text-on-error-container rounded-xl text-sm">
          {error}
        </p>
      )}
    </Dialog>
  );
}
