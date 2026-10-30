import { describe, expect, it } from "vitest";

import { shouldNotifyOnPresentationSave } from "./notificationPayload";

describe("shouldNotifyOnPresentationSave", () => {
  it("suppresses notification on edits to an already public scheduled presentation", () => {
    expect(
      shouldNotifyOnPresentationSave(true, {
        status: "scheduled",
        isPublic: true,
      }, false),
    ).toBe(false);
  });

  it("preserves notification when creating or publishing a presentation", () => {
    expect(shouldNotifyOnPresentationSave(true, null, true)).toBe(true);
    expect(
      shouldNotifyOnPresentationSave(
        true,
        { status: "draft", isPublic: false },
        false,
      ),
    ).toBe(true);
  });

  it("respects an explicit opt-out", () => {
    expect(shouldNotifyOnPresentationSave(false, null, true)).toBe(false);
  });
});
