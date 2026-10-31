import { describe, expect, it } from "vitest";

import {
  flattenEntity,
  toLocalDateTime,
  validateUsername,
} from "@/domains/crudConfig";

describe("CRUD entity helpers", () => {
  it("flattens nested objects while preserving their parent values", () => {
    expect(
      flattenEntity({
        name: "Ana",
        document: { type: "cpf", numbers: [1, 2] },
        tags: ["a", "b"],
      }),
    ).toEqual({
      name: "Ana",
      document: { type: "cpf", numbers: [1, 2] },
      "document.type": "cpf",
      "document.numbers": ["1", "2"],
      tags: ["a", "b"],
    });
  });

  it("formats valid datetimes for a local datetime input", () => {
    const date = new Date("2025-03-04T12:30:00.000Z");
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);

    expect(toLocalDateTime(date.toISOString())).toBe(local);
    expect(toLocalDateTime(undefined)).toBe("");
    expect(toLocalDateTime("invalid")).toBe("");
  });

  it("allows empty usernames and rejects invalid nonempty usernames", () => {
    expect(validateUsername("")).toBeNull();
    expect(validateUsername("ana.silva")).toBeNull();
    expect(validateUsername("Ana Silva")).toContain("3 a 60 caracteres");
  });
});
