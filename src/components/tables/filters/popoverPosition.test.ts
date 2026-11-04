import { describe, expect, it } from "vitest";

import { calculatePopoverPosition } from "./popoverPosition";

describe("calculatePopoverPosition", () => {
  it("keeps the popover inside the viewport and places it below when possible", () => {
    expect(
      calculatePopoverPosition({
        triggerLeft: 900,
        triggerTop: 40,
        triggerBottom: 60,
        popoverWidth: 240,
        popoverHeight: 120,
        viewportWidth: 1024,
        viewportHeight: 768,
      }),
    ).toEqual({ left: 776, top: 68 });
  });

  it("places the popover above when it would overflow the bottom edge", () => {
    expect(
      calculatePopoverPosition({
        triggerLeft: -20,
        triggerTop: 300,
        triggerBottom: 320,
        popoverWidth: 200,
        popoverHeight: 180,
        viewportWidth: 800,
        viewportHeight: 400,
      }),
    ).toEqual({ left: 8, top: 112 });
  });
});
