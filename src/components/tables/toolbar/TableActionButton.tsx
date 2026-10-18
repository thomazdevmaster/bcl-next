"use client";

import type { ReactNode } from "react";
import { tableButtonMotion } from "../core/tableMotion";

export function TableActionButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`group min-h-11 min-w-11 rounded-[var(--radius)] border border-[var(--primary)] px-3 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-45 ${tableButtonMotion}`}
    >
      {children}
    </button>
  );
}
