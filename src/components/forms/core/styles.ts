import type { StyledSize, ValidationState } from "./types";

export type StripTone = "error" | "warning" | "success" | "info";

export const labelText: Record<StyledSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
  xl: "text-base",
};

export const helpText: Record<StyledSize, string> = {
  sm: "text-xs",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-sm",
};

export const controlHeight: Record<StyledSize, string> = {
  sm: "min-h-8 text-sm",
  md: "min-h-11 text-sm",
  lg: "min-h-12 text-base",
  xl: "min-h-12 text-base",
};

export const controlBase =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--input)] py-2 pl-3 pr-11 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:bg-[var(--input-disabled)] disabled:text-[var(--input-disabled-foreground)] disabled:[-webkit-text-fill-color:var(--input-disabled-foreground)] disabled:opacity-100 focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40 aria-invalid:!border-[var(--destructive)] aria-invalid:ring-2 aria-invalid:ring-[var(--destructive)]/20 aria-invalid:focus-visible:!border-[var(--destructive)] aria-invalid:focus-visible:!ring-[var(--destructive)]/30";

export const FIELD_STATUS: Record<
  ValidationState,
  { icon?: string; iconTone?: string; tone: string; border: string }
> = {
  valid: {
    icon: "check_circle",
    tone: "text-[var(--success)]",
    border:
      "!border-[var(--success)] focus-visible:!border-[var(--success)] focus-visible:!ring-[var(--success)]/30",
  },
  invalid: {
    icon: "error",
    tone: "text-[var(--destructive)]",
    border:
      "border-[var(--destructive)] focus-visible:border-[var(--destructive)] focus-visible:ring-[var(--destructive)]/30",
  },
  warning: {
    icon: "warning",
    tone: "text-[var(--warning)]",
    border:
      "!border-[var(--warning)] focus-visible:!border-[var(--warning)] focus-visible:!ring-[var(--warning)]/30",
  },
  info: {
    icon: "info_outline",
    iconTone: "text-[var(--info)]/70",
    tone: "text-[var(--muted)]",
    border:
      "!border-[var(--info)]/30 focus-visible:!border-[var(--info)]/60 focus-visible:!ring-[var(--info)]/20",
  },
};

export const STRIP_STYLES: Record<StripTone, string> = {
  error:
    "border-[var(--destructive)]/50 bg-[var(--destructive)]/10 text-[var(--destructive)]",
  warning:
    "border-[var(--warning)]/50 bg-[var(--warning)]/10 text-[var(--warning)]",
  success:
    "border-[var(--success)]/50 bg-[var(--success)]/10 text-[var(--success)]",
  info: "border-[var(--info)]/25 bg-[var(--info)]/5 text-[var(--muted)]",
};

export const STRIP_ROLES: Record<StripTone, "alert" | "status"> = {
  error: "alert",
  warning: "status",
  success: "status",
  info: "status",
};
