// @vitest-environment jsdom
import type { Column } from "@tanstack/react-table";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { tableFeatures } from "../core/table-features";
import {
  parseTemporalFilterValue,
  TableColumnFilter,
} from "./TableColumnFilter";

vi.mock("@tanstack/react-store", () => ({ useSelector: () => undefined }));

const longOptionLabel =
  "Abertura da temporada com cerimônia e repertório especial";
const longestViewportOptionLabel = "Apresentação especial ".repeat(20);

function makeRangeColumn(
  filterVariant: "datetime" | "range",
  filterValue?: [number | undefined, number | undefined],
): Column<typeof tableFeatures, Record<string, unknown>, unknown> {
  return {
    id: filterVariant === "datetime" ? "startsAt" : "repertoireIds",
    columnDef: { meta: { filterVariant } },
    getFilterValue: () => filterValue,
    getFacetedMinMaxValues: () => undefined,
    getFacetedUniqueValues: () => new Map(),
    setFilterValue: vi.fn(),
    table: { store: {} },
  } as unknown as Column<
    typeof tableFeatures,
    Record<string, unknown>,
    unknown
  >;
}

function makeSelectColumn(
  filterValue?: string | string[],
  facetedValues: ReadonlyArray<readonly [string, number]> = [
    [longOptionLabel, 1],
    [longestViewportOptionLabel, 1],
    ["Trompete", 2],
    ["Clarinete", 1],
    ...Array.from(
      { length: 93 },
      (_, index) => [`Evento ${index + 1}`, 1] as const,
    ),
  ],
): Column<typeof tableFeatures, Record<string, unknown>, unknown> {
  return {
    id: "instrument",
    columnDef: { meta: { filterVariant: "select" } },
    getFilterValue: () => filterValue,
    getFacetedUniqueValues: () => new Map(facetedValues),
    setFilterValue: vi.fn(),
    table: { store: {} },
  } as unknown as Column<
    typeof tableFeatures,
    Record<string, unknown>,
    unknown
  >;
}

describe("TableColumnFilter", () => {
  afterEach(cleanup);

  it("parses inclusive date and datetime range bounds", () => {
    const dateMin = parseTemporalFilterValue("2026-10-31", "date", "min");
    const dateMax = parseTemporalFilterValue("2026-10-31", "date", "max");
    const timeMin = parseTemporalFilterValue(
      "2026-10-31T18:15",
      "datetime",
      "min",
    );
    const timeMax = parseTemporalFilterValue(
      "2026-10-31T18:15",
      "datetime",
      "max",
    );

    expect(new Date(dateMin).getHours()).toBe(0);
    expect(new Date(dateMax).getHours()).toBe(23);
    expect(new Date(dateMax).getMilliseconds()).toBe(999);
    expect(new Date(timeMin).getSeconds()).toBe(0);
    expect(new Date(timeMax).getSeconds()).toBe(59);
    expect(new Date(timeMax).getMilliseconds()).toBe(999);
  });

  it("opens temporal range controls from a compact filter button", async () => {
    const user = userEvent.setup();
    render(
      <TableColumnFilter
        column={makeRangeColumn("datetime")}
        columnLabel="Data"
      />,
    );

    expect(screen.queryByRole("group", { name: "Filtros de Data" })).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Abrir filtros de Data" }),
    );

    expect(screen.getByRole("group", { name: "Filtros de Data" })).toBeTruthy();
    expect(screen.getByLabelText("Mínimo: Data")).toBeTruthy();
    expect(screen.getByLabelText("Máximo: Data")).toBeTruthy();
  });

  it("marks the compact filter button when a date range is active", () => {
    const column = makeRangeColumn("datetime", [
      Date.parse("2026-10-01T00:00"),
      undefined,
    ]);
    render(<TableColumnFilter column={column} columnLabel="Data" />);

    expect(
      screen
        .getByRole("button", { name: "Abrir filtros de Data" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("opens repertoire minimum and maximum controls from the same compact filter", async () => {
    const user = userEvent.setup();
    render(
      <TableColumnFilter
        column={makeRangeColumn("range")}
        columnLabel="Repertório"
      />,
    );

    expect(
      screen.queryByRole("group", { name: "Filtros de Repertório" }),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Abrir filtros de Repertório" }),
    );

    expect(
      screen.getByLabelText("Mínimo: Repertório").getAttribute("type"),
    ).toBe("number");
    expect(
      screen.getByLabelText("Máximo: Repertório").getAttribute("type"),
    ).toBe("number");
    expect(
      screen
        .getByRole("button", { name: "Abrir filtros de Repertório" })
        .getAttribute("title"),
    ).toMatch(/clique para abrir/i);
  });

  it("uses the project select pattern with an empty state and searchable options", async () => {
    const user = userEvent.setup();
    const column = makeSelectColumn();
    render(<TableColumnFilter column={column} columnLabel="Instrumento" />);

    expect(
      screen.queryByRole("button", { name: "Limpar filtro Instrumento" }),
    ).toBeNull();
    const select = screen.getByRole("button", {
      name: "Instrumento: Selecione…",
    });
    await user.click(select);

    expect(screen.getByRole("menu", { name: "Instrumento" })).toBeTruthy();
    const optionsMenu = screen.getByRole("group", {
      name: "Instrumento opções",
    });
    expect(Number.parseFloat(optionsMenu.style.width)).toBe(
      window.innerWidth - 16,
    );
    expect(screen.queryByRole("presentation")).toBeNull();
    const search = screen.getByRole("textbox", {
      name: "Buscar instrumento",
    });
    expect(search).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Instrumento: Selecione…" }),
    ).toBeTruthy();
    const longOption = screen.getByRole("menuitemcheckbox", {
      name: longOptionLabel,
    });
    expect(longOption.textContent).toContain(longOptionLabel);
    expect(longOption.querySelector("span.min-w-0")?.className).toContain(
      "whitespace-normal",
    );
    fireEvent.change(search, { target: { value: "Trompete" } });
    await waitFor(() =>
      expect(
        screen.getByRole("menuitemcheckbox", { name: "Trompete" }),
      ).toBeTruthy(),
    );
    await user.click(
      screen.getByRole("menuitemcheckbox", { name: "Trompete" }),
    );

    expect(column.setFilterValue).toHaveBeenCalledWith(["Trompete"]);
  });

  it("keeps the options menu wide enough for short labels", async () => {
    const user = userEvent.setup();
    const column = makeSelectColumn(undefined, [
      ["Concerto", 1],
      ["Encontro", 1],
    ]);
    render(<TableColumnFilter column={column} columnLabel="Tipo" />);

    await user.click(screen.getByRole("button", { name: "Tipo: Selecione…" }));

    const menu = screen.getByRole("group", { name: "Tipo opções" });
    expect(Number.parseFloat(menu.style.width)).toBe(176);
  });

  it("shows a clear action only while a select filter is active", async () => {
    const user = userEvent.setup();
    const column = makeSelectColumn(["Trompete"]);
    render(<TableColumnFilter column={column} columnLabel="Tipo" />);

    const clearButton = screen.getByRole("button", {
      name: "Limpar filtro Tipo",
    });
    expect(
      screen.getByRole("button", { name: "Tipo: 1 selecionado" }).className,
    ).toContain("w-max");
    expect(
      screen
        .getByRole("button", { name: "Tipo: 1 selecionado" })
        .querySelector("span.min-w-0")?.className,
    ).toContain("whitespace-nowrap");
    expect(
      screen.getByRole("button", { name: "Tipo: 1 selecionado" }),
    ).toBeTruthy();
    await user.click(clearButton);

    expect(column.setFilterValue).toHaveBeenCalledWith(undefined);
  });

  it("keeps several selected options checked and adds another choice", async () => {
    const user = userEvent.setup();
    const column = makeSelectColumn(["Trompete", "Clarinete"]);
    render(<TableColumnFilter column={column} columnLabel="Instrumento" />);

    await user.click(
      screen.getByRole("button", { name: "Instrumento: 2 selecionados" }),
    );
    expect(
      screen
        .getByRole("menuitemcheckbox", { name: "Trompete" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen
        .getByRole("menuitemcheckbox", { name: "Clarinete" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    await user.click(
      screen.getByRole("menuitemcheckbox", { name: "Evento 1" }),
    );

    expect(column.setFilterValue).toHaveBeenCalledWith([
      "Trompete",
      "Clarinete",
      "Evento 1",
    ]);
  });

  it("allows clearing the last selected option from the menu", async () => {
    const user = userEvent.setup();
    const column = makeSelectColumn(["Trompete"]);
    render(<TableColumnFilter column={column} columnLabel="Instrumento" />);

    await user.click(
      screen.getByRole("button", { name: "Instrumento: 1 selecionado" }),
    );
    await user.click(
      screen.getByRole("menuitemcheckbox", { name: "Trompete" }),
    );

    expect(column.setFilterValue).toHaveBeenCalledWith(undefined);
  });
});
