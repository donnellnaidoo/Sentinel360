"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export const inputClass =
  "w-full border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest text-on-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-[invalid=true]:border-error disabled:opacity-50";

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  /** Shown as "12 / 2000" when the control is a text input or textarea. */
  count?: { value: number; max: number };
  className?: string;
  children: ReactElement<Record<string, unknown>>;
};

/**
 * Visible label, required marker, hint and error for one control. Wires up
 * id / aria-describedby / aria-invalid / aria-required on the child so every
 * form in the docket gets them without repeating the plumbing.
 */
export function Field({ label, required, hint, error, count, className = "", children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const nearLimit = count && count.max - count.value <= 100;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: (children.props.id as string | undefined) ?? id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
      })
    : children;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={(isValidElement(children) && (children.props.id as string | undefined)) || id}
          className="text-xs font-semibold text-on-surface-variant"
        >
          {label}
          {required && (
            <span className="text-error ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {count && (
          <span
            className={`text-[11px] tabular-nums ${count.value > count.max ? "text-error" : "text-on-surface-variant"}`}
            aria-live={nearLimit ? "polite" : "off"}
          >
            {count.value} / {count.max}
          </span>
        )}
      </div>
      {control}
      {hint && (
        <p id={hintId} className="text-[11px] text-on-surface-variant leading-snug">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-error flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            error
          </span>
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 p-3 bg-error-container text-on-error-container rounded-xl text-sm">
      <span className="material-symbols-outlined text-base mt-0.5" aria-hidden="true">
        error
      </span>
      <p>{message}</p>
    </div>
  );
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
  disabled,
  variant = "primary",
  type = "submit",
  onClick,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "destructive";
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  const styles = {
    primary: "bg-primary text-on-primary hover:opacity-90",
    secondary: "border border-outline-variant text-on-surface hover:bg-surface-container",
    destructive: "bg-error text-on-error hover:opacity-90",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2 min-h-10 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${styles}`}
    >
      {pending && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Card wrapper for an "add / record" form inside a tab. */
export function FormCard({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-label={title}
      className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/60 flex flex-col gap-4 scroll-mt-24 focus:outline-none"
    >
      <div>
        <h3 className="text-sm font-bold text-on-surface">{title}</h3>
        {description && <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>}
        <p className="text-[11px] text-on-surface-variant mt-1">
          <span className="text-error" aria-hidden="true">*</span> required
        </p>
      </div>
      {children}
    </section>
  );
}
