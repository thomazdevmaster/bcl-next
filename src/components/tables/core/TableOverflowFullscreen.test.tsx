// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TableOverflowFullscreen } from "./TableOverflowFullscreen";

afterEach(cleanup);

describe("TableOverflowFullscreen", () => {
  it("recomenda tela cheia quando a tabela tem rolagem lateral", () => {
    const tableRef = createRef<HTMLDivElement>();
    const containerRef = createRef<HTMLElement>();
    render(
      <main ref={containerRef}>
        <TableOverflowFullscreen
          containerRef={containerRef}
          tableRef={tableRef}
        />
        <div ref={tableRef} aria-label="Tabela rolável" />
      </main>,
    );

    Object.defineProperties(tableRef.current, {
      clientWidth: { configurable: true, value: 320 },
      scrollWidth: { configurable: true, value: 640 },
    });
    fireEvent(window, new Event("resize"));

    expect(
      screen.getByRole("button", { name: "Abrir tabela em tela cheia" }),
    ).toBeTruthy();
  });

  it("não mostra a recomendação quando a tabela cabe na área", () => {
    const tableRef = createRef<HTMLDivElement>();
    const containerRef = createRef<HTMLElement>();
    render(
      <main ref={containerRef}>
        <TableOverflowFullscreen
          containerRef={containerRef}
          tableRef={tableRef}
        />
        <div ref={tableRef} aria-label="Tabela rolável" />
      </main>,
    );

    Object.defineProperties(tableRef.current, {
      clientWidth: { configurable: true, value: 640 },
      scrollWidth: { configurable: true, value: 640 },
    });
    fireEvent(window, new Event("resize"));

    expect(
      screen.queryByRole("button", { name: "Abrir tabela em tela cheia" }),
    ).toBeNull();
  });

  it("observa a tabela e seu conteúdo para atualizar o overflow", () => {
    const observed: Element[] = [];
    const disconnect = vi.fn();
    class ResizeObserverStub {
      observe(element: Element) {
        observed.push(element);
      }
      disconnect = disconnect;
      unobserve = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    const tableRef = createRef<HTMLDivElement>();
    const containerRef = createRef<HTMLElement>();
    const { unmount } = render(
      <main ref={containerRef}>
        <TableOverflowFullscreen
          containerRef={containerRef}
          tableRef={tableRef}
        />
        <div ref={tableRef}>
          <table aria-label="Conteúdo da tabela" />
        </div>
      </main>,
    );

    expect(observed).toEqual([
      tableRef.current,
      tableRef.current?.querySelector("table"),
    ]);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("solicita tela cheia para o conjunto de controles e tabela", () => {
    const tableRef = createRef<HTMLDivElement>();
    const containerRef = createRef<HTMLElement>();
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    render(
      <main ref={containerRef} aria-label="Tabela e controles">
        <TableOverflowFullscreen
          containerRef={containerRef}
          tableRef={tableRef}
        />
        <div ref={tableRef} aria-label="Tabela rolável" />
      </main>,
    );
    Object.defineProperties(tableRef.current, {
      clientWidth: { configurable: true, value: 320 },
      scrollWidth: { configurable: true, value: 640 },
    });
    fireEvent(window, new Event("resize"));
    const wrapper = screen.getByLabelText("Tabela e controles");
    Object.defineProperty(wrapper, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir tabela em tela cheia" }),
    );

    expect(requestFullscreen).toHaveBeenCalledOnce();
  });
});
