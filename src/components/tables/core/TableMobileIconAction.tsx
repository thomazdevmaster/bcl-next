"use client";

import type { MouseEventHandler } from "react";

interface TableMobileIconActionProps {
  ariaLabel: string;
  icon: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  title?: string;
  disabled?: boolean;
  className?: string;
}

export function TableMobileIconAction({
  ariaLabel,
  icon,
  onClick,
  title,
  disabled = false,
  className = "",
}: TableMobileIconActionProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-[var(--info)] transition-colors duration-150 hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${className}`}
    >
      <span className="material-icons text-xl" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
