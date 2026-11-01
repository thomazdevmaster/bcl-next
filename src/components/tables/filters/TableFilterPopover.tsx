"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import { calculatePopoverPosition } from "./popoverPosition";

interface TableFilterPopoverProps {
  label: string;
  triggerLabel: string;
  icon: string;
  active?: boolean;
  children: ReactNode;
}

export function TableFilterPopover({
  label,
  triggerLabel,
  icon,
  active = false,
  children,
}: TableFilterPopoverProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const positionPopover = () => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const position = calculatePopoverPosition({
      triggerLeft: triggerRect.left,
      triggerTop: triggerRect.top,
      triggerBottom: triggerRect.bottom,
      popoverWidth: popoverRect.width,
      popoverHeight: popoverRect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    popover.style.left = `${position.left}px`;
    popover.style.top = `${position.top}px`;
  };

  useEffect(() => {
    if (!isOpen) return;
    const popover = popoverRef.current;
    if (!popover) return;

    positionPopover();

    const reposition = () => positionPopover();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen]);

  return (
    <div className="mt-2 flex w-full justify-center">
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-pressed={active}
        popoverTarget={popoverId}
        popoverTargetAction="toggle"
        title={`Clique para abrir ${label.toLocaleLowerCase("pt-BR")}`}
        onClick={() => setIsOpen((current) => !current)}
        className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius)] border bg-[var(--input)] text-[var(--table-header-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] hover:bg-[var(--card-secondary)] ${active ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
      >
        <span className="material-icons text-base" aria-hidden="true">
          {icon}
        </span>
      </button>
      <div
        id={popoverId}
        ref={popoverRef}
        popover="auto"
        hidden={!isOpen}
        role="group"
        aria-label={label}
        onToggle={(event) =>
          setIsOpen(event.currentTarget.matches(":popover-open"))
        }
        className="fixed inset-auto m-0 max-h-[min(70dvh,24rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto whitespace-normal rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-sm font-normal normal-case tracking-normal text-[var(--foreground)] shadow-[var(--shadow-soft)]"
      >
        {children}
      </div>
    </div>
  );
}
