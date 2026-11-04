import { describe, expect, it } from "vitest";

import { parseTablePreferences } from "./TableView";

const validPreferences = {
  version: 1,
  columnPresentations: {
    title: {
      alignment: "left",
      verticalAlignment: "middle",
      textTransform: "none",
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      textColor: null,
      cellColor: null,
    },
  },
  columnOrder: ["title"],
  columnPinning: { start: [], end: [] },
  columnSizing: { title: 180 },
  columnVisibility: { title: true },
};

describe("parseTablePreferences", () => {
  it("accepts a complete persisted table preference record", () => {
    expect(parseTablePreferences(validPreferences)).toEqual(validPreferences);
  });

  it("rejects invalid roots, versions, column orders, and presentations", () => {
    expect(parseTablePreferences(null)).toBeNull();
    expect(parseTablePreferences([])).toBeNull();
    expect(parseTablePreferences({ ...validPreferences, version: 2 })).toBeNull();
    expect(
      parseTablePreferences({ ...validPreferences, columnOrder: ["title", 2] }),
    ).toBeNull();
    expect(
      parseTablePreferences({
        ...validPreferences,
        columnPresentations: {
          title: { ...validPreferences.columnPresentations.title, bold: "yes" },
        },
      }),
    ).toBeNull();
  });

  it("rejects invalid pinning, sizing, and visibility values", () => {
    expect(
      parseTablePreferences({
        ...validPreferences,
        columnPinning: { start: ["title", 1], end: [] },
      }),
    ).toBeNull();
    expect(
      parseTablePreferences({
        ...validPreferences,
        columnSizing: { title: Number.NaN },
      }),
    ).toBeNull();
    expect(
      parseTablePreferences({
        ...validPreferences,
        columnVisibility: { title: "visible" },
      }),
    ).toBeNull();
  });
});
