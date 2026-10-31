import { describe, expect, it } from "vitest";

import { createDomainTableColumns } from "./table-columns";

describe("presentation management columns", () => {
  it("managementEventRowShowsType", () => {
    const columns = createDomainTableColumns(
      [{ path: "eventType.name", label: "Tipo" }],
      (row) => String((row.eventType as { name: string }).name),
      "presentations",
    );
    const typeColumn = columns[0];
    if (!typeColumn || !("accessorFn" in typeColumn)) {
      throw new Error("The event type column has no accessor");
    }
    expect(typeColumn.accessorFn({ eventType: { name: "Encontro" } }, 0)).toBe(
      "Encontro",
    );
  });

  it("uses searchable select filters for ordinary text columns", () => {
    const columns = createDomainTableColumns(
      [
        { path: "eventType.name", label: "Tipo" },
        { path: "title", label: "Título" },
        { path: "location", label: "Local" },
        { path: "createdBy", label: "Criado por" },
      ],
      () => "",
      "presentations",
    );

    expect(
      columns.map((column) => [column.meta?.filterVariant, column.filterFn]),
    ).toEqual([
      ["select", "includesAnyString"],
      ["select", "includesAnyString"],
      ["select", "includesAnyString"],
      ["select", "includesAnyString"],
    ]);
  });

  it("preserves free-text filters outside the agenda scope", () => {
    const columns = createDomainTableColumns(
      [{ path: "name", label: "Nome" }],
      () => "",
      "instruments",
    );

    expect(columns[0]?.meta?.filterVariant).toBe("text");
    expect(columns[0]?.filterFn).toBeUndefined();
  });

  it("selects filter variants from the column format", () => {
    const columns = createDomainTableColumns(
      [
        { path: "date", label: "Data", format: "date" },
        { path: "startsAt", label: "Início", format: "datetime" },
        { path: "count", label: "Quantidade", format: "count" },
        { path: "amount", label: "Valor", format: "currency" },
        { path: "public", label: "Pública", format: "boolean" },
        { path: "status", label: "Status", format: "status" },
      ],
      () => "",
      "people",
    );

    expect(columns.map((column) => column.meta?.filterVariant)).toEqual([
      "date",
      "datetime",
      "range",
      "range",
      "select",
      "select",
    ]);
  });

  it("uses the closed song catalog fields as select filters", () => {
    const columns = createDomainTableColumns(
      [
        { path: "genre", label: "Gênero" },
        { path: "key", label: "Tonalidade" },
        { path: "composer", label: "Compositor" },
      ],
      () => "",
      "songs",
    );

    expect(columns.map((column) => column.meta?.filterVariant)).toEqual([
      "select",
      "select",
      "text",
    ]);
  });
});

describe("domain column accessor values", () => {
  it("maps formatted values for filtering and sorting", () => {
    const columns = createDomainTableColumns(
      [
        { path: "songs", label: "Músicas", format: "count" },
        { path: "amount", label: "Valor", format: "currency" },
        { path: "startsAt", label: "Data", format: "datetime" },
        { path: "status", label: "Status", format: "status" },
        { path: "title", label: "Título" },
      ],
      (_row, column) => `formatado:${column.format}`,
      "people",
    );
    const read = (path: string, row: Record<string, unknown>) => {
      const column = columns.find((item) => item.id === path);
      if (!column || !("accessorFn" in column)) {
        throw new Error(`Column ${path} has no accessor`);
      }
      return column.accessorFn(row, 0);
    };

    expect(read("songs", { songs: [1, 2] })).toBe(2);
    expect(read("songs", { songs: "not an array" })).toBe(0);
    expect(read("amount", { amount: 12.5 })).toBe(12.5);
    expect(read("amount", { amount: "12.5" })).toBeUndefined();
    expect(read("startsAt", { startsAt: "invalid" })).toBeUndefined();
    expect(read("startsAt", { startsAt: "2026-10-31T18:00:00Z" })).toBe(
      Date.parse("2026-10-31T18:00:00Z"),
    );
    expect(read("status", { status: "active" })).toBe("formatado:status");
    expect(read("title", { title: "Concerto" })).toBe("Concerto");
    expect(read("title", { title: null })).toBe("");
  });
});
