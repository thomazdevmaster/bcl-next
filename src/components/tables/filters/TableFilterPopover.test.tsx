// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TableFilterPopover } from "./TableFilterPopover";

describe("TableFilterPopover", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("positions the popover and removes listeners when closed", () => {
    const showPopover = vi.fn();
    const hidePopover = vi.fn();
    vi.stubGlobal("innerWidth", 800);
    vi.stubGlobal("innerHeight", 600);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementationOnce(
        () =>
          ({ left: 200, top: 100, bottom: 120, width: 40, height: 20 }) as DOMRect,
      )
      .mockImplementation(
        () =>
          ({ left: 0, top: 0, bottom: 0, width: 256, height: 120 }) as DOMRect,
      );

    render(
      <TableFilterPopover label="Status" triggerLabel="Filtrar status" icon="filter_list">
        <span>Ativo</span>
      </TableFilterPopover>,
    );
    const group = document.querySelector<HTMLElement>('[role="group"]');
    if (!group) throw new Error("Popover group was not rendered");
    Object.assign(group, { showPopover, hidePopover });
    vi.spyOn(group, "matches").mockReturnValue(true);

    fireEvent.click(screen.getByRole("button", { name: "Filtrar status" }));

    expect(group.style.left).toBe("200px");
    expect(group.style.top).toBe("128px");
    expect(showPopover).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Filtrar status" }));
    expect(hidePopover).toHaveBeenCalledOnce();
  });
});
