"use client";

import Link from "next/link";
import type { TableRowAction } from "./table-actions";
import { tableButtonMotion, tableCrudIconMotion } from "./tableMotion";

export function TableRowActions({ actions }: { actions: TableRowAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="flex justify-center gap-1" role="group" aria-label="Ações do registro">
      {actions.map((action) => {
        const className = `group inline-flex h-11 w-11 touch-manipulation cursor-pointer select-none items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40 ${tableButtonMotion} ${
          action.danger
            ? "text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
            : "text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)]"
        }`;
        const title = action.disabled ? (action.disabledTitle ?? action.label) : action.label;
        const icon = (
          <span
            className={`material-icons inline-flex items-center justify-center text-lg ${tableCrudIconMotion}`}
            aria-hidden="true"
          >
            {action.icon}
          </span>
        );

        if (action.href && !action.disabled) {
          return (
            <Link
              key={action.id}
              href={action.href}
              title={title}
              aria-label={action.label}
              className={`${className} no-underline hover:no-underline hover:opacity-100`}
            >
              {icon}
            </Link>
          );
        }

        return (
          <button
            key={action.id}
            type="button"
            title={title}
            aria-label={action.label}
            disabled={action.disabled}
            onClick={action.onSelect}
            className={className}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
