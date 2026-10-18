"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Column, RowData, ReactTable } from "@tanstack/react-table";
import { tableFeatures } from "./core/table-features";
import type { TableState } from "./core/table-features";
import { getColumnPresentationClasses } from "./core/tableColumnPresentation";
import type { TableColumnAlignment, TableColumnPresentation, TableColumnVerticalAlignment } from "./core/tableColumnPresentation";
import { tableButtonMotion as buttonMotion, tableIconMotion as iconMotion } from "./core/tableMotion";

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;

function ColumnFormatMenu({
  label,
  icon,
  active = false,
  iconColor,
  children,
}: {
  label: string;
  icon: string;
  active?: boolean;
  iconColor?: string;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useId();

  const positionPopover = () => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover || !popover.matches(":popover-open")) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const horizontalPadding = 8;
    const left = Math.min(
      Math.max(horizontalPadding, triggerRect.left),
      Math.max(horizontalPadding, window.innerWidth - popoverRect.width - horizontalPadding),
    );
    const below = triggerRect.bottom + 8;
    const top = below + popoverRect.height <= window.innerHeight - horizontalPadding
      ? below
      : Math.max(horizontalPadding, triggerRect.top - popoverRect.height - 8);

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  };

  const togglePopover = () => {
    const popover = popoverRef.current;
    if (!popover) return;
    if (popover.matches(":popover-open")) {
      popover.hidePopover();
      return;
    }

    popover.showPopover();
    positionPopover();
  };

  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => positionPopover();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen]);

  return (
    <div className="shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        title={label}
        onClick={togglePopover}
        className={`group inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${buttonMotion} ${active ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:bg-[var(--accent)]"}`}
      >
        <span className={`material-icons text-base ${iconMotion}`} style={iconColor ? { color: iconColor } : undefined} aria-hidden="true">{icon}</span>
      </button>
      <div
        id={popoverId}
        ref={popoverRef}
        popover="auto"
        role="group"
        aria-label={label}
        onToggle={(event) => setIsOpen(event.currentTarget.matches(":popover-open"))}
        className="fixed inset-auto m-0 max-h-[min(70dvh,24rem)] min-w-48 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--foreground)] shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}

interface TableColumnOptionsDialogProps<TData extends RowData> {
  open: boolean;
  onClose: () => void;
  column: Column<typeof tableFeatures, TData, unknown>;
  table: TableInstance<TData>;
  columnLabel: string;
  displaySize: number;
  columnPresentation: TableColumnPresentation;
  onColumnPresentationChange: (presentation: TableColumnPresentation) => void;
  minSize: number;
  maxSize: number;
}

export function TableColumnOptionsDialog<TData extends RowData>({
  open,
  onClose,
  column,
  table,
  columnLabel,
  displaySize,
  columnPresentation,
  onColumnPresentationChange,
  minSize,
  maxSize,
}: TableColumnOptionsDialogProps<TData>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const formattingTitleId = useId();

  useEffect(() => {
    if (open && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const closeDialog = () => dialogRef.current?.close();
  const alignments: { value: TableColumnAlignment; label: string; icon: string }[] = [
    { value: "left", label: "Alinhar à esquerda", icon: "format_align_left" },
    { value: "center", label: "Centralizar texto", icon: "format_align_center" },
    { value: "right", label: "Alinhar à direita", icon: "format_align_right" },
  ];
  const verticalAlignments: { value: TableColumnVerticalAlignment; label: string; icon: string }[] = [
    { value: "top", label: "Alinhar acima", icon: "vertical_align_top" },
    { value: "middle", label: "Alinhar ao meio", icon: "vertical_align_center" },
    { value: "bottom", label: "Alinhar abaixo", icon: "vertical_align_bottom" },
  ];
  const toggleFormat = (format: "bold" | "italic" | "underline" | "strikethrough") => {
    onColumnPresentationChange({ ...columnPresentation, [format]: !columnPresentation[format] });
  };
  const closeMenu = (button: HTMLButtonElement) => {
    const popover = button.closest<HTMLElement>("[popover]");
    if (popover?.matches(":popover-open")) popover.hidePopover();
  };
  const menuChoiceClass = (active: boolean) => `group flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[var(--radius)] px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${buttonMotion} ${active ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:bg-[var(--accent)]"}`;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
      className="fixed inset-0 m-auto max-h-[min(92dvh,38rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 id={titleId} className="text-lg font-semibold">Opções da coluna</h2>
          <p className="text-sm text-[var(--muted)]">{columnLabel}</p>
        </div>
        <button
          type="button"
          aria-label="Fechar opções da coluna"
          onClick={closeDialog}
          className={`group inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${buttonMotion}`}
        >
          <span className={`material-icons group-hover:rotate-90 motion-reduce:group-hover:rotate-0 ${iconMotion}`} aria-hidden="true">close</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {column.getCanPin() && (
          <div role="group" aria-label={`Fixar coluna ${columnLabel}`} className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
            {column.getIsPinned() !== "start" && (
              <button
                type="button"
                aria-label={`Fixar ${columnLabel} à esquerda`}
                title="Fixar à esquerda"
                onClick={() => column.pin("start")}
                className={`group inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--border)] hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${buttonMotion}`}
              >
                <span className={`material-icons -rotate-90 text-base ${iconMotion}`} aria-hidden="true">push_pin</span>
              </button>
            )}
            {column.getIsPinned() && (
              <button
                type="button"
                aria-label={`Desafixar ${columnLabel}`}
                title="Desafixar coluna"
                onClick={() => column.pin(false)}
                className={`group inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--border)] hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${buttonMotion}`}
              >
                <span className={`material-icons text-base ${iconMotion}`} aria-hidden="true">push_pin</span>
              </button>
            )}
            {column.getIsPinned() !== "end" && (
              <button
                type="button"
                aria-label={`Fixar ${columnLabel} à direita`}
                title="Fixar à direita"
                onClick={() => column.pin("end")}
                className={`group inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--border)] hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${buttonMotion}`}
              >
                <span className={`material-icons rotate-90 text-base ${iconMotion}`} aria-hidden="true">push_pin</span>
              </button>
            )}
          </div>
        )}

        {column.getCanGroup() && (
          <button
            type="button"
            aria-pressed={column.getIsGrouped()}
            onClick={column.getToggleGroupingHandler()}
            className={`group flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-[var(--radius)] border border-[var(--border)] px-3 text-sm hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${buttonMotion}`}
          >
            <span className={`material-icons text-base ${iconMotion}`} aria-hidden="true">{column.getIsGrouped() ? "group_off" : "group_work"}</span>
            {column.getIsGrouped() ? "Remover agrupamento" : "Agrupar por esta coluna"}
          </button>
        )}

        <section aria-labelledby={formattingTitleId} className="flex flex-col gap-3 border-b border-[var(--border)] pb-3">
          <h3 id={formattingTitleId} className="text-sm font-semibold">Formatação da coluna</h3>

          <div role="group" aria-label="Opções de formatação" className="flex flex-wrap items-center gap-2 pb-1">
            <ColumnFormatMenu
              label="Alinhamento horizontal"
              icon={alignments.find((alignment) => alignment.value === columnPresentation.alignment)?.icon ?? "format_align_left"}
              active={columnPresentation.alignment !== "left"}
            >
              {alignments.map((alignment) => (
                <button
                  key={alignment.value}
                  type="button"
                  aria-pressed={columnPresentation.alignment === alignment.value}
                  onClick={(event) => {
                    onColumnPresentationChange({ ...columnPresentation, alignment: alignment.value });
                    closeMenu(event.currentTarget);
                  }}
                  className={menuChoiceClass(columnPresentation.alignment === alignment.value)}
                >
                  <span className="material-icons text-base" aria-hidden="true">{alignment.icon}</span>{alignment.label.replace(" texto", "")}
                </button>
              ))}
            </ColumnFormatMenu>

            <span aria-hidden="true" className="h-8 w-px bg-[var(--border)]" />

            <ColumnFormatMenu
              label="Alinhamento vertical"
              icon={verticalAlignments.find((alignment) => alignment.value === columnPresentation.verticalAlignment)?.icon ?? "vertical_align_center"}
              active={columnPresentation.verticalAlignment !== "middle"}
            >
              {verticalAlignments.map((alignment) => (
                <button
                  key={alignment.value}
                  type="button"
                  aria-pressed={columnPresentation.verticalAlignment === alignment.value}
                  onClick={(event) => {
                    onColumnPresentationChange({ ...columnPresentation, verticalAlignment: alignment.value });
                    closeMenu(event.currentTarget);
                  }}
                  className={menuChoiceClass(columnPresentation.verticalAlignment === alignment.value)}
                >
                  <span className="material-icons text-base" aria-hidden="true">{alignment.icon}</span>{alignment.label}
                </button>
              ))}
            </ColumnFormatMenu>

            <span aria-hidden="true" className="h-8 w-px bg-[var(--border)]" />

            <ColumnFormatMenu label="Caixa do texto" icon="text_fields" active={columnPresentation.textTransform !== "none"}>
              {([
                { value: "none", label: "Padrão" },
                { value: "uppercase", label: "MAIÚSCULAS" },
                { value: "lowercase", label: "minúsculas" },
              ] as const).map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={columnPresentation.textTransform === choice.value}
                  onClick={(event) => {
                    onColumnPresentationChange({ ...columnPresentation, textTransform: choice.value });
                    closeMenu(event.currentTarget);
                  }}
                  className={menuChoiceClass(columnPresentation.textTransform === choice.value)}
                >{choice.label}</button>
              ))}
            </ColumnFormatMenu>

            <span aria-hidden="true" className="h-8 w-px bg-[var(--border)]" />

            <ColumnFormatMenu
              label="Estilo do texto"
              icon="format_bold"
              active={columnPresentation.bold || columnPresentation.italic || columnPresentation.underline || columnPresentation.strikethrough}
            >
              <button type="button" aria-label="Negrito" aria-pressed={columnPresentation.bold} onClick={() => toggleFormat("bold")} className={menuChoiceClass(columnPresentation.bold)}><span className="w-6 font-bold">B</span>Negrito</button>
              <button type="button" aria-label="Itálico" aria-pressed={columnPresentation.italic} onClick={() => toggleFormat("italic")} className={menuChoiceClass(columnPresentation.italic)}><span className="w-6 italic">I</span>Itálico</button>
              <button type="button" aria-label="Sublinhado" aria-pressed={columnPresentation.underline} onClick={() => toggleFormat("underline")} className={menuChoiceClass(columnPresentation.underline)}><span className="w-6 underline">U</span>Sublinhado</button>
              <button type="button" aria-label="Tachado" aria-pressed={columnPresentation.strikethrough} onClick={() => toggleFormat("strikethrough")} className={menuChoiceClass(columnPresentation.strikethrough)}><span className="w-6 line-through">S</span>Tachado</button>
            </ColumnFormatMenu>

            <span aria-hidden="true" className="h-8 w-px bg-[var(--border)]" />

            <ColumnFormatMenu label="Cor do texto" icon="format_color_text" active={Boolean(columnPresentation.textColor)} iconColor={columnPresentation.textColor ?? undefined}>
              <label className="flex min-h-11 items-center justify-between gap-3 px-2 text-sm">
                <span>Escolher cor do texto</span>
                <input
                  aria-label="Cor do texto"
                  type="color"
                  value={columnPresentation.textColor ?? "#000000"}
                  onChange={(event) => onColumnPresentationChange({ ...columnPresentation, textColor: event.target.value })}
                  className="h-11 w-12 cursor-pointer rounded border border-[var(--border)] bg-transparent p-1"
                />
              </label>
              {columnPresentation.textColor && <button type="button" aria-label="Restaurar cor automática do texto" onClick={(event) => { onColumnPresentationChange({ ...columnPresentation, textColor: null }); closeMenu(event.currentTarget); }} className={menuChoiceClass(false)}>Restaurar cor automática</button>}
            </ColumnFormatMenu>

            <span aria-hidden="true" className="h-8 w-px bg-[var(--border)]" />

            <ColumnFormatMenu label="Cor da célula" icon="format_color_fill" active={Boolean(columnPresentation.cellColor)} iconColor={columnPresentation.cellColor ?? undefined}>
              <label className="flex min-h-11 items-center justify-between gap-3 px-2 text-sm">
                <span>Escolher cor da célula</span>
                <input
                  aria-label="Cor da célula"
                  type="color"
                  value={columnPresentation.cellColor ?? "#ffffff"}
                  onChange={(event) => onColumnPresentationChange({ ...columnPresentation, cellColor: event.target.value })}
                  className="h-11 w-12 cursor-pointer rounded border border-[var(--border)] bg-transparent p-1"
                />
              </label>
              {columnPresentation.cellColor && <button type="button" aria-label="Restaurar cor automática da célula" onClick={(event) => { onColumnPresentationChange({ ...columnPresentation, cellColor: null }); closeMenu(event.currentTarget); }} className={menuChoiceClass(false)}>Restaurar cor automática</button>}
            </ColumnFormatMenu>
          </div>

          <p className="text-sm text-[var(--muted)]">Prévia da coluna</p>
          <div
            role="img"
            aria-label={`Prévia da coluna ${columnLabel}`}
            style={{
              alignItems: { top: "flex-start", middle: "center", bottom: "flex-end" }[columnPresentation.verticalAlignment],
              backgroundColor: columnPresentation.cellColor ?? "var(--card-secondary)",
              color: columnPresentation.textColor ?? "var(--foreground)",
            }}
            className="flex min-h-16 w-full rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-sm"
          >
            <span className={`w-full ${getColumnPresentationClasses(columnPresentation)}`}>Texto de exemplo</span>
          </div>
        </section>

        {column.getCanResize() && (
          <label className="flex min-h-11 flex-col gap-2 text-sm">
            <span className="flex justify-between gap-3 font-medium">
              <span>Largura da coluna</span>
              <span className="text-[var(--muted)]">{Math.round(displaySize)} px</span>
            </span>
            <input
              type="range"
              aria-label={`Largura da coluna ${columnLabel}`}
              min={minSize}
              max={maxSize}
              step={10}
              value={Math.round(displaySize)}
              onChange={(event) => table.setColumnSizing((current) => ({ ...current, [column.id]: Number(event.target.value) }))}
              className="min-h-11 w-full accent-[var(--primary)]"
            />
          </label>
        )}
      </div>

      <div className="flex justify-end border-t border-[var(--border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={closeDialog}
          className={`min-h-11 cursor-pointer rounded-[var(--radius)] border border-[var(--info)] px-4 text-sm font-medium text-[var(--info)] hover:bg-[var(--info)] hover:text-[var(--info-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${buttonMotion}`}
        >
          Fechar
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
