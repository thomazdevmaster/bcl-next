"use client";

import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

interface TableOverflowFullscreenProps {
  containerRef: RefObject<HTMLElement | null>;
  tableRef: RefObject<HTMLDivElement | null>;
}

export function TableOverflowFullscreen({
  containerRef,
  tableRef,
}: TableOverflowFullscreenProps) {
  const hasHorizontalOverflow = useHorizontalOverflow(tableRef);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  if (!hasHorizontalOverflow) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--card-secondary)] px-3 py-2 text-sm text-[var(--foreground)]">
      <p className="m-0 flex min-w-0 flex-1 items-center gap-2">
        <span
          className="material-icons shrink-0 text-base text-[var(--info)]"
          aria-hidden="true"
        >
          swipe
        </span>
        <span>
          A tabela tem rolagem lateral. Abra em tela cheia para visualizar
          melhor.
        </span>
      </p>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--info)] px-3 font-medium text-[var(--info)] hover:bg-[var(--info)] hover:text-[var(--info-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        aria-label={
          isFullscreen ? "Sair da tela cheia" : "Abrir tabela em tela cheia"
        }
      >
        <span className="material-icons text-base" aria-hidden="true">
          {isFullscreen ? "fullscreen_exit" : "fullscreen"}
        </span>
        {isFullscreen ? "Sair da tela cheia" : "Visualizar em tela cheia"}
      </button>
    </div>
  );
}

function useHorizontalOverflow(tableRef: TableOverflowFullscreenProps["tableRef"]) {
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);

  const measureOverflow = useCallback(() => {
    const table = tableRef.current;
    setHasHorizontalOverflow(
      Boolean(
        table && table.clientWidth > 0 && table.scrollWidth > table.clientWidth,
      ),
    );
  }, [tableRef]);

  useEffect(() => {
    measureOverflow();
    const table = tableRef.current;
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measureOverflow);
    if (table) {
      observer?.observe(table);
      const content = table.querySelector("table");
      if (content) observer?.observe(content);
    }
    window.addEventListener("resize", measureOverflow);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measureOverflow);
    };
  }, [measureOverflow, tableRef]);

  return hasHorizontalOverflow;
}

function useFullscreen(containerRef: TableOverflowFullscreenProps["containerRef"]) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateFullscreen = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", updateFullscreen);
  }, [containerRef]);

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await document.exitFullscreen();
      return;
    }
    await containerRef.current?.requestFullscreen();
  };
  return { isFullscreen, toggleFullscreen };
}
