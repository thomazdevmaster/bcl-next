import { describe, expect, it, vi } from "vitest";

import { matchesAnySelectedString, tableFeatures } from "./table-features";

describe("matchesAnySelectedString", () => {
  it("matches a row when its value is among the selected options", () => {
    expect(matchesAnySelectedString("Encontro", ["Concerto", "Encontro"])).toBe(
      true,
    );
    expect(matchesAnySelectedString("Encontro", ["Concerto", "Recital"])).toBe(
      false,
    );
  });

  it("leaves the table unfiltered when no options are selected", () => {
    expect(matchesAnySelectedString("Encontro", [])).toBe(true);
    expect(matchesAnySelectedString("Encontro", undefined)).toBe(true);
  });
});

describe("fuzzy table features", () => {
  it("ranks text matches and reports their ranking metadata", () => {
    const filter = tableFeatures.filterFns.fuzzy;
    const row = {
      getValue: () => "Concerto de inverno",
    } as unknown as Parameters<typeof filter>[0];
    const addMeta = vi.fn();

    expect(filter(row, "title", "concerto", addMeta)).toBe(true);
    expect(addMeta).toHaveBeenCalledOnce();
    expect(filter(row, "title", "saxofone", undefined)).toBe(false);
  });

  it("sorts fuzzy ranked rows and falls back to alphanumeric values", () => {
    const sort = tableFeatures.sortFns.fuzzy;
    const rankedA = {
      getValue: () => "Concerto",
      columnFiltersMeta: { title: { itemRank: { rank: 1, passed: true } } },
    } as unknown as Parameters<typeof sort>[0];
    const rankedB = {
      getValue: () => "Concerto",
      columnFiltersMeta: { title: { itemRank: { rank: 2, passed: true } } },
    } as unknown as Parameters<typeof sort>[1];
    const unranked = {
      getValue: () => "Álbum",
      columnFiltersMeta: {},
    } as unknown as Parameters<typeof sort>[1];

    expect(sort(rankedA, rankedB, "title")).not.toBe(0);
    expect(sort(rankedA, unranked, "title")).toBeTypeOf("number");
  });

  it("sorts Portuguese strings without accents and falls back for non-text", () => {
    const sort = tableFeatures.sortFns.ptBR;
    const row = (value: unknown) =>
      ({ getValue: () => value }) as unknown as Parameters<typeof sort>[0];

    expect(sort(row("Álbum 2"), row("Album 10"), "title")).toBeLessThan(0);
    expect(sort(row(10), row(2), "title")).toBeGreaterThan(0);
  });
});
