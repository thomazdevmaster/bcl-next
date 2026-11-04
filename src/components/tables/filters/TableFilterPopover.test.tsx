// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TableFilterPopover } from "./TableFilterPopover";

describe("TableFilterPopover", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("positions the popover and removes listeners when closed", async () => {
    vi.stubGlobal("innerWidth", 800);
    vi.stubGlobal("innerHeight", 600);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementationOnce(
        () =>
          ({
            left: 200,
            top: 100,
            bottom: 120,
            width: 40,
            height: 20,
          }) as DOMRect,
      )
      .mockImplementation(
        () =>
          ({ left: 0, top: 0, bottom: 0, width: 256, height: 120 }) as DOMRect,
      );

    render(
      <TableFilterPopover
        label="Status"
        triggerLabel="Filtrar status"
        icon="filter_list"
      >
        <span>Ativo</span>
      </TableFilterPopover>,
    );
    const group = document.querySelector<HTMLElement>('[role="group"]');
    if (!group) throw new Error("Popover group was not rendered");
    expect(
      screen
        .getByRole("button", { name: "Filtrar status" })
        .getAttribute("popovertarget"),
    ).toBe(group.id);
    expect(
      screen
        .getByRole("button", { name: "Filtrar status" })
        .getAttribute("popovertargetaction"),
    ).toBe("toggle");
    const trigger = screen.getByRole("button", { name: "Filtrar status" });
    fireEvent.click(trigger);

    expect(group.style.left).toBe("200px");
    expect(group.style.top).toBe("128px");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const matchesOpen = vi.spyOn(group, "matches").mockReturnValue(false);
    fireEvent(group, new Event("toggle"));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const removeListener = vi.spyOn(window, "removeEventListener");
    fireEvent.click(trigger);
    await waitFor(() => expect(removeListener).toHaveBeenCalled());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(matchesOpen).toHaveBeenCalledWith(":popover-open");
  });
});
