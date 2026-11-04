import { describe, expect, it } from "vitest";

import { DOMAINS } from "@/domains/catalog";

import { getManagementNav } from "./menus";

describe("Agenda management navigation", () => {
  it("managementMenuLabelsPresentationDomainAsAgenda", () => {
    const presentationDomain = DOMAINS.find(
      (domain) => domain.id === "presentations",
    );
    expect(presentationDomain).toMatchObject({
      label: "Agenda",
      path: "/gestao/agenda",
    });
  });

  it("keepsEventTypeManagementInsideTheAgendaMenuItem", () => {
    const menu = getManagementNav(["maestro"]);
    expect(menu).toContainEqual(
      expect.objectContaining({ href: "/gestao/agenda", label: "Agenda" }),
    );
    expect(menu.some((item) => item.label === "Tipos de evento")).toBe(false);
  });
});
