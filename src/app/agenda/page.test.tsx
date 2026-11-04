// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Presentation } from "@/domains/presentations/types";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

function presentation(
  id: number,
  overrides: Partial<Presentation> = {},
): Presentation {
  return {
    id,
    createdAt: "2099-01-01T00:00:00.000Z",
    updatedAt: "2099-01-01T00:00:00.000Z",
    title: `Evento ${id}`,
    venue: "Sede da banda",
    startsAt: "2099-09-12T19:00:00.000Z",
    repertoireIds: [],
    isPublic: true,
    status: "scheduled",
    eventType: { id: 3, name: "Encontro", icon: "groups" },
    ...overrides,
  };
}

describe("AgendaPage", () => {
  afterEach(cleanup);

  it("showsPublicEventTypesWithoutExposingPrivateEvents", async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      presentation(1),
      presentation(2, { isPublic: false }),
    ]);
    const { default: AgendaPage } = await import("./page");
    render(<AgendaPage />);

    expect(
      await screen.findByRole("heading", { name: "Evento 1" }),
    ).toBeTruthy();
    expect(screen.getByText("Encontro")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Evento 2" })).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith("/presentations");
  });

  it("keepsUpcomingAscendingAndPastEventsDescendingByDate", async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      presentation(1, { startsAt: "2099-09-12T19:00:00.000Z" }),
      presentation(2, { startsAt: "2099-10-12T19:00:00.000Z" }),
      presentation(3, { startsAt: "2000-09-12T19:00:00.000Z" }),
      presentation(4, { startsAt: "2001-09-12T19:00:00.000Z" }),
    ]);
    const { default: AgendaPage } = await import("./page");
    render(<AgendaPage />);

    const upcoming = await screen.findByRole("heading", {
      name: "Próximos eventos",
    });
    const upcomingSection = upcoming.closest("section");
    const pastHeading = screen.getByRole("heading", {
      name: "Eventos anteriores",
    });
    const pastSection = pastHeading.closest("section");

    if (!upcomingSection || !pastSection)
      throw new Error("Agenda sections not rendered");
    expect(
      within(upcomingSection)
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["Próximos eventos", "Evento 1", "Evento 2"]);
    expect(
      within(pastSection)
        .getAllByText(/Evento [34]/)
        .map((item) => item.textContent),
    ).toEqual(["Evento 4", "Evento 3"]);
  });

  it("showsAFriendlyRetryableErrorWhenTheAgendaRequestFails", async () => {
    vi.mocked(apiFetch).mockClear();
    vi.mocked(apiFetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.mocked(apiFetch).mockResolvedValueOnce([presentation(7)]);
    const { default: AgendaPage } = await import("./page");
    render(<AgendaPage />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Não foi possível carregar a agenda.");
    expect(alert.textContent).not.toContain("Failed to fetch");

    fireEvent.click(
      within(alert).getByRole("button", { name: "Tentar novamente" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Evento 7" }),
    ).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});
