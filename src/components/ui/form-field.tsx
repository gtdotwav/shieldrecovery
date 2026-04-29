import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
  /** Visually hide the label but keep it for screen readers */
  srOnlyLabel?: boolean;
  /** Render an addon to the left of the input (icon, currency, etc.) */
  leadingAddon?: ReactNode;
  /** Render an addon to the right (clear button, copy, etc.) */
  trailingAddon?: ReactNode;
};

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  {
    label,
    error,
    hint,
    required,
    srOnlyLabel,
    leadingAddon,
    trailingAddon,
    id,
    className = "",
    ...inputProps
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `field-${generatedId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const describedBy = [
    error ? errorId : null,
    hint ? hintId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={`text-xs font-medium text-[var(--foreground)] ${
          srOnlyLabel ? "sr-only" : ""
        }`}
      >
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-rose-500">
            *
          </span>
        )}
      </label>
      <div
        className={`flex items-center rounded-xl border bg-[var(--background,_white)] focus-within:ring-2 focus-within:ring-[var(--accent)]/30 transition ${
          error
            ? "border-rose-500/60 focus-within:border-rose-500"
            : "border-[var(--border,_#e4e4e7)] focus-within:border-[var(--accent)]"
        }`}
      >
        {leadingAddon && (
          <span className="pl-3 text-[var(--muted)]">{leadingAddon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={`min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none ${className}`}
          {...inputProps}
        />
        {trailingAddon && (
          <span className="pr-3 text-[var(--muted)]">{trailingAddon}</span>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-[0.7rem] text-[var(--muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[0.7rem] font-medium text-rose-600"
        >
          {error}
        </p>
      )}
    </div>
  );
});

export { FormField };
export type { FormFieldProps };
