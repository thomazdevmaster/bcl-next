"use client";

import { useState } from "react";

import { ResponsiveTabs } from "@/components/shared/ResponsiveTabs";

import { DomainWorkspace } from "./DomainWorkspace";
import { PresentationTypesPanel } from "./PresentationTypesPanel";

type AgendaSection = "events" | "types";

const agendaTabs = [
  {
    value: "events",
    label: "Eventos",
    icon: "event",
    tabId: "agenda-events-tab",
    panelId: "agenda-events-panel",
  },
  {
    value: "types",
    label: "Tipos de evento",
    icon: "category",
    tabId: "agenda-types-tab",
    panelId: "agenda-types-panel",
  },
] as const;

export function PresentationManagementWorkspace() {
  const [section, setSection] = useState<AgendaSection>("events");
  const panelId =
    section === "events" ? "agenda-events-panel" : "agenda-types-panel";

  return (
    <section className="mx-auto w-full space-y-5">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Gestão
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Agenda</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Gerencie os eventos da banda e os tipos usados para organizá-los.
        </p>
      </header>

      <ResponsiveTabs
        label="Seções da Agenda"
        options={agendaTabs}
        value={section}
        onChange={setSection}
        className="w-full"
      >
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={
            section === "events" ? "agenda-events-tab" : "agenda-types-tab"
          }
          className="min-w-0 p-3 sm:p-4"
        >
          {section === "events" ? (
            <DomainWorkspace
              resource="presentations"
              hideHeader
              createNoun="evento"
            />
          ) : (
            <PresentationTypesPanel />
          )}
        </div>
      </ResponsiveTabs>
    </section>
  );
}
