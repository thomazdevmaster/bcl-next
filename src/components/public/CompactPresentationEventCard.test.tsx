// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Presentation } from "@/domains/presentations/types";

import { CompactPresentationEventCard } from "./CompactPresentationEventCard";

const event: Presentation = {
  id: 1,
  createdAt: "2099-01-01T00:00:00.000Z",
  updatedAt: "2099-01-01T00:00:00.000Z",
  title: "Concerto",
  venue: "Coreto",
  startsAt: "2099-09-12T19:00:00.000Z",
  repertoireIds: [],
  isPublic: true,
  status: "scheduled",
  eventType: { id: 3, name: "Apresentação" },
};

describe("CompactPresentationEventCard", () => {
  afterEach(cleanup);

  it("usesTheHomeLayoutWhenRequested", () => {
    const { container } = render(
      <CompactPresentationEventCard event={event} layout="home" />,
    );

    expect(container.querySelector("article")?.className).toContain(
      "grid-cols-",
    );
    expect(screen.getByRole("heading", { name: "Concerto" })).toBeTruthy();
  });

  it("usesTheInlineLayoutByDefault", () => {
    const { container } = render(
      <CompactPresentationEventCard event={event} layout="default" />,
    );

    expect(container.querySelector("article.flex.gap-4")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Concerto" })).toBeTruthy();
    expect(screen.queryByText("Apresentação")).toBeNull();
  });
});
