import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/lib/api";

import {
  replaceOrAppendPresentationType,
  savePresentationType,
} from "./savePresentationType";
import type { EventTypeFormValues } from "./schemas/event-type.schema";
import type { PresentationType } from "./types";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const values: EventTypeFormValues = {
  name: " Encontro ",
  icon: " groups ",
  isPublicByDefault: true,
  isActive: false,
};

const predefinedType: PresentationType = {
  id: 1,
  name: "Apresentação",
  isPublicByDefault: false,
  isActive: true,
  isSystem: true,
};

describe("savePresentationType", () => {
  afterEach(() => vi.clearAllMocks());

  it("creates a type with a trimmed icon and no frontend id", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ id: 3 });

    await savePresentationType(values, null);

    expect(apiFetch).toHaveBeenCalledWith("/presentation-types", {
      method: "POST",
      body: JSON.stringify({
        name: " Encontro ",
        icon: "groups",
        isPublicByDefault: true,
        isActive: false,
      }),
    });
  });

  it("keeps predefined types active when saving edits", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ id: 1 });

    await savePresentationType(values, predefinedType);

    expect(apiFetch).toHaveBeenCalledWith("/presentation-types/1", {
      method: "PUT",
      body: JSON.stringify({
        name: " Encontro ",
        icon: "groups",
        isPublicByDefault: true,
        isActive: true,
      }),
    });
  });
});

describe("replaceOrAppendPresentationType", () => {
  it("replaces the edited type and appends a new type", () => {
    const first: PresentationType = {
      ...predefinedType,
      name: "Updated",
    };
    const second: PresentationType = {
      ...predefinedType,
      id: 2,
      name: "Custom",
      isSystem: false,
    };

    expect(
      replaceOrAppendPresentationType([predefinedType], first, true),
    ).toEqual([first]);
    expect(
      replaceOrAppendPresentationType([predefinedType], second, false),
    ).toEqual([predefinedType, second]);
  });
});
