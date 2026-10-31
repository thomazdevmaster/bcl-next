import { describe, expect, it } from "vitest";

import { eventTypeSchema } from "./event-type.schema";

describe("eventTypeSchema", () => {
  it("requiresTrimmedNameAndPublicDefault", () => {
    expect(
      eventTypeSchema.safeParse({
        name: "   ",
        icon: "",
        isPublicByDefault: true,
        isActive: true,
      }).success,
    ).toBe(false);
    expect(
      eventTypeSchema.safeParse({
        name: "Encontro",
        icon: "",
        isActive: true,
      }).success,
    ).toBe(false);
  });

  it("allowsOptionalIcon", () => {
    expect(
      eventTypeSchema.safeParse({
        name: "  Encontro  ",
        isPublicByDefault: false,
        isActive: true,
      }).success,
    ).toBe(true);
  });
});
