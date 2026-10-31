// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PresentationTypeBadge } from "./PresentationTypeBadge";

describe("PresentationTypeBadge", () => {
  afterEach(cleanup);

  it("showsTheTypeAndKeepsItsOptionalIconDecorative", () => {
    render(
      <PresentationTypeBadge
        eventType={{ name: "Encontro", icon: "groups" }}
      />,
    );

    expect(screen.getByText("Encontro")).toBeTruthy();
    expect(screen.getByText("groups").getAttribute("aria-hidden")).toBe("true");
  });

  it("rendersTheTypeWithoutAnIcon", () => {
    render(<PresentationTypeBadge eventType={{ name: "Outros" }} />);

    expect(screen.getByText("Outros")).toBeTruthy();
    expect(screen.queryByText("groups")).toBeNull();
  });
});
