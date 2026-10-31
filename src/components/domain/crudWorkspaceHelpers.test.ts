import { describe, expect, it } from "vitest";

import { uniqueFieldsForResource, withAudit } from "./crudWorkspaceHelpers";

describe("CRUD workspace helpers", () => {
  it.each([
    ["users", ["username"]],
    ["people", ["email", "document.number"]],
    ["media", ["slug"]],
    ["patrimony", ["code"]],
    ["instruments", ["name"]],
    ["songs", []],
  ] as const)("returns unique fields for %s", (resource, fields) => {
    expect(uniqueFieldsForResource(resource)).toEqual(fields);
  });

  it("preserves the original creation time and sets an update time", () => {
    expect(
      withAudit({ name: "Ana" }, { createdAt: "2024-01-01" }, "2025-02-03"),
    ).toEqual({
      name: "Ana",
      createdAt: "2024-01-01",
      updatedAt: "2025-02-03",
    });
  });
});
