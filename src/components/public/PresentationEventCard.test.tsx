// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Presentation } from "@/domains/presentations/types";

import { PresentationEventCard } from "./PresentationEventCard";

const event: Presentation = {
  id: 1,
  createdAt: "2099-01-01T00:00:00.000Z",
  updatedAt: "2099-01-01T00:00:00.000Z",
  title: "Concerto de primavera",
  venue: "Coreto central",
  startsAt: "2099-09-12T19:00:00.000Z",
  repertoireIds: [],
  isPublic: true,
  status: "scheduled",
  eventType: { id: 3, name: "Apresentação/concerto", icon: "music_note" },
};

describe("PresentationEventCard", () => {
  afterEach(cleanup);

  it("showsEventTypeOnPublicAgendaCardWithItsOptionalIcon", () => {
    render(<PresentationEventCard event={event} />);

    expect(screen.getByText("Apresentação/concerto")).toBeTruthy();
    expect(screen.getByText("music_note")).toBeTruthy();
  });

  it("rendersEventsWithoutATypeSnapshot", () => {
    render(
      <PresentationEventCard event={{ ...event, eventType: undefined }} />,
    );

    expect(screen.getByRole("heading", { name: event.title })).toBeTruthy();
    expect(screen.queryByText("Apresentação/concerto")).toBeNull();
  });

  it("keepsCompactHomeCardFocusedOnEventDetails", () => {
    render(<PresentationEventCard event={event} compact layout="home" />);

    expect(screen.getByRole("heading", { name: event.title })).toBeTruthy();
    expect(screen.getByText("Coreto central")).toBeTruthy();
    expect(screen.queryByText("Apresentação/concerto")).toBeNull();
  });
});
