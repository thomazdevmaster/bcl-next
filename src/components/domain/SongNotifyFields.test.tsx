// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

import { apiFetch } from "@/lib/api";

import { SongNotifyFields } from "./SongNotifyFields";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

function Harness() {
  const form = useForm({
    defaultValues: {
      notifySong: false,
      notifyRoles: [] as string[],
      notifyRecipientIds: [] as string[],
    },
  });
  return (
    <FormProvider {...form}>
      <SongNotifyFields />
      <output data-testid="roles">{form.watch("notifyRoles").join(",")}</output>
    </FormProvider>
  );
}

describe("SongNotifyFields", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps the audience hidden until notification is enabled", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue([
      {
        firstName: "Ana",
        lastName: "Lima",
        userId: 15,
        user: { username: "ana" },
      },
    ]);
    render(<Harness />);

    expect(screen.queryByRole("group", { name: "Perfis" })).toBeNull();

    await user.click(screen.getByRole("checkbox", { name: "Enviar notificação" }));

    expect(screen.getByRole("group", { name: "Perfis" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Músicos" })).toBeTruthy();
    expect(
      await screen.findByRole("button", { name: /Pessoas específicas/ }),
    ).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith("/people");

    await user.click(screen.getByRole("checkbox", { name: "Músicos" }));
    expect(screen.getByTestId("roles").textContent).toBe("musico");
  });
});
