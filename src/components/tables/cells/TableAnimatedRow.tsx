"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface TableAnimatedRowProps {
  children: ReactNode;
  index: number;
}

export function TableAnimatedRow({ children, index }: TableAnimatedRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const initialIndex = useRef(index);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rowAnimation = row.animate(
      [
        {
          opacity: 0.35,
          transform: "translateY(7px)",
          filter: "drop-shadow(0 3px 5px color-mix(in srgb, var(--primary) 16%, transparent))",
        },
        { opacity: 1, transform: "translateY(0)", filter: "drop-shadow(0 0 0 transparent)" },
      ],
      {
        duration: 220,
        delay: Math.min(initialIndex.current * 12, 240),
        easing: "cubic-bezier(0.2, 0, 0, 1)",
      },
    );

    const cellAnimations = Array.from(row.cells, (cell) => {
      const background = window.getComputedStyle(cell).backgroundColor;
      return cell.animate(
        [
          { backgroundColor: "color-mix(in srgb, var(--primary) 12%, var(--card))" },
          { backgroundColor: background },
        ],
        {
          duration: 360,
          delay: Math.min(initialIndex.current * 12, 240) + 30,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        },
      );
    });

    return () => {
      rowAnimation.cancel();
      cellAnimations.forEach((animation) => animation.cancel());
    };
  }, []);

  return <tr ref={rowRef} className="group">{children}</tr>;
}
