// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PresentationManagementWorkspace } from "./PresentationManagementWorkspace";

vi.mock("./DomainWorkspace", () => ({
  DomainWorkspace: ({ createNoun }: { createNoun?: string }) => (
    <p>{createNoun ? `Novo ${createNoun}` : "Gestão dos eventos"}</p>
  ),
}));
vi.mock("./PresentationTypesPanel", () => ({
  PresentationTypesPanel: () => <p>Administração de tipos</p>,
}));

describe("PresentationManagementWorkspace", () => {
  afterEach(cleanup);

  it("switchesAccessiblyBetweenEventsAndTypesInsideAgenda", async () => {
    const user = userEvent.setup();
    render(<PresentationManagementWorkspace />);

    expect(
      screen.getByRole("heading", { name: "Agenda", level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText("Novo evento")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: /tipos de evento/i }));
    expect(screen.getByText("Administração de tipos")).toBeTruthy();
    expect(screen.queryByText("Gestão dos eventos")).toBeNull();
  });
});
