"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

interface TableAnimatedRowProps {
  children: ReactNode;
  index: number;
  onClick?: (event: MouseEvent<HTMLTableRowElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTableRowElement>) => void;
  label?: string;
}

export function TableAnimatedRow({
  children,
  index,
  onClick,
  onKeyDown,
  label,
}: TableAnimatedRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const initialIndex = useRef(index);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    const rowAnimation = row.animate(
      [
        {
          opacity: 0.86,
          transform: "translateY(3px)",
        },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 160,
        delay: Math.min(initialIndex.current * 8, 96),
        easing: "cubic-bezier(0.2, 0, 0, 1)",
      },
    );

    return () => {
      rowAnimation.cancel();
    };
  }, []);

  return (
    <tr
      ref={rowRef}
      className={`group ${onClick ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--ring)]" : ""}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? label : undefined}
    >
      {children}
    </tr>
  );
}
