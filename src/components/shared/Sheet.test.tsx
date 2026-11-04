// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./Sheet";

describe("Sheet", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  it("opens a labelled bottom sheet in a portal and restores focus on close", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Abrir painel</SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Instrumentos</SheetTitle>
            <SheetDescription>Escolha os instrumentos.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Concluir</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    const trigger = screen.getByRole("button", { name: "Abrir painel" });
    await user.click(trigger);

    const panel = await screen.findByRole("dialog", { name: "Instrumentos" });
    expect(panel.getAttribute("aria-describedby")).not.toBeNull();
    expect(panel.getAttribute("data-side")).toBe("bottom");
    expect(panel.style.left).toBe("0px");
    expect(panel.style.right).toBe("0px");
    expect(panel.style.bottom).toBe("0px");
    expect(panel.style.width).toBe("100vw");
    expect(panel.style.transform).toBe("translate3d(0, 0, 0)");
    expect(document.body.contains(panel)).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(document.activeElement).toBe(trigger);
    expect(
      document.querySelector<HTMLElement>("[data-side=bottom]")?.style
        .transform,
    ).toBe("translate3d(0, 100%, 0)");
    expect(document.body.style.overflow).toBe("");
  });

  it.each(["top", "right", "bottom", "left"] as const)(
    "positions the %s panel on its matching screen edge",
    async (side) => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Abrir lateral</SheetTrigger>
          <SheetContent side={side}>
            <SheetTitle>Painel lateral</SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      await user.click(screen.getByRole("button", { name: "Abrir lateral" }));
      const panel = await screen.findByRole("dialog", {
        name: "Painel lateral",
      });
      expect(panel.getAttribute("data-side")).toBe(side);
      expect(panel.hasAttribute("aria-describedby")).toBe(false);
      expect(panel.style.position).toBe("fixed");
      expect(panel.style.transform).toBe("translate3d(0, 0, 0)");
      if (side === "top" || side === "bottom") {
        expect(panel.style.left).toBe("0px");
        expect(panel.style.right).toBe("0px");
        expect(panel.style.width).toBe("100vw");
        expect(side === "top" ? panel.style.top : panel.style.bottom).toBe(
          "0px",
        );
      } else {
        expect(panel.style.top).toBe("0px");
        expect(panel.style.bottom).toBe("0px");
        expect(side === "left" ? panel.style.left : panel.style.right).toBe(
          "0px",
        );
      }
    },
  );

  it("closes on backdrop press but keeps open for clicks inside the panel", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Abrir</SheetTrigger>
        <SheetContent>
          <SheetTitle>Painel</SheetTitle>
          <button type="button">Ação interna</button>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const panel = await screen.findByRole("dialog", { name: "Painel" });
    await user.click(screen.getByRole("button", { name: "Ação interna" }));
    expect(screen.getByRole("dialog", { name: "Painel" })).toBe(panel);

    await user.click(
      document.querySelector("[data-sheet-overlay]") as HTMLElement,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("reports state changes without changing a controlled open value", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetTrigger>Abrir controlado</SheetTrigger>
        <SheetContent>
          <SheetTitle>Controlado</SheetTitle>
          <SheetClose>Fechar</SheetClose>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir controlado" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <Sheet open onOpenChange={onOpenChange}>
        <SheetTrigger>Abrir controlado</SheetTrigger>
        <SheetContent>
          <SheetTitle>Controlado</SheetTitle>
          <SheetClose>Fechar</SheetClose>
        </SheetContent>
      </Sheet>,
    );
    expect(
      await screen.findByRole("dialog", { name: "Controlado" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("traps keyboard focus and supports hiding the close button", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Abrir foco</SheetTrigger>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Foco</SheetTitle>
          <button type="button">Primeira ação</button>
          <button type="button">Última ação</button>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir foco" }));
    await screen.findByRole("dialog", { name: "Foco" });
    const first = screen.getByRole("button", { name: "Primeira ação" });
    const last = screen.getByRole("button", { name: "Última ação" });
    expect(screen.queryByRole("button", { name: /fechar/i })).toBeNull();
    expect(document.activeElement).toBe(first);

    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);
    first.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it("keeps focus on the panel when there are no tabbable controls", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Abrir vazio</SheetTrigger>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Sem controles</SheetTitle>
          <p>Conteúdo somente de leitura.</p>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir vazio" }));
    const panel = await screen.findByRole("dialog", { name: "Sem controles" });
    await user.tab();
    expect(document.activeElement).toBe(panel);
  });

  it("keeps focus and the document scroll lock when its parent rerenders", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [revision, setRevision] = useState(0);
      return (
        <Sheet onOpenChange={() => undefined}>
          <SheetTrigger>Abrir estável</SheetTrigger>
          <SheetContent>
            <SheetTitle>Estado estável</SheetTitle>
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Atualizar {revision}
            </button>
          </SheetContent>
        </Sheet>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Abrir estável" }));
    const updateButton = await screen.findByRole("button", {
      name: "Atualizar 0",
    });
    updateButton.focus();
    await user.click(updateButton);

    expect(
      await screen.findByRole("button", { name: "Atualizar 1" }),
    ).toBeTruthy();
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => resolve()),
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Atualizar 1" }),
    );
    expect(document.body.style.overflow).toBe("hidden");
  });
});
