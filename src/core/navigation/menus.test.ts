import { describe, expect, it } from "vitest";

import { DOMAINS } from "@/domains/catalog";

import { getAuthenticatedNavGroups, getManagementNav, titleForPath } from "./menus";

describe("menu sem o módulo de estudo", () => {
  it("mostra o playground e não oferece /study para quem pode treinar", () => {
    const groups = getAuthenticatedNavGroups(["aluno"]);
    const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));

    expect(hrefs).toContain("/score_playground");
    expect(hrefs).not.toContain("/study");
    expect(getManagementNav(["musico"]).some((item) => item.href === "/study")).toBe(false);
  });

  it("nomeia o endereço antigo com o playground, que é para onde ele redireciona", () => {
    expect(titleForPath("/study/8")).toBe("Score playground");
    expect(titleForPath("/score_playground")).toBe("Score playground");
  });
});

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
