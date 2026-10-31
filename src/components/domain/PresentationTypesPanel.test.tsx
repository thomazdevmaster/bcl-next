// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PresentationType } from "@/domains/presentations/types";
import { apiFetch } from "@/lib/api";

import { PresentationTypesPanel } from "./PresentationTypesPanel";

const session = vi.hoisted(() => ({ roles: ["maestro"] as string[] }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ roles: session.roles }),
}));
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const systemType: PresentationType = {
  id: 1,
  name: "Apresentação/concerto",
  icon: "music_note",
  isPublicByDefault: true,
  isActive: true,
  isSystem: true,
};

const customType: PresentationType = {
  id: 7,
  name: "Encontro",
  icon: "groups",
  isPublicByDefault: false,
  isActive: true,
  isSystem: false,
};

describe("PresentationTypesPanel", () => {
  beforeEach(() => {
    session.roles = ["maestro"];
    vi.mocked(apiFetch).mockReset();
  });

  afterEach(cleanup);

  it("showsLoadingAndOffersRetryAfterApiFailure", async () => {
    let rejectRequest: ((error: Error) => void) | undefined;
    vi.mocked(apiFetch)
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRequest = reject;
          }),
      )
      .mockResolvedValueOnce([systemType]);
    const user = userEvent.setup();
    render(<PresentationTypesPanel />);

    expect(screen.getByText(/carregando tipos de evento/i)).toBeTruthy();
    rejectRequest?.(new Error("API indisponível"));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(await screen.findByText(systemType.name)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it("createsCustomTypeWithoutClientGeneratedId", async () => {
    const created: PresentationType = {
      id: 12,
      name: "Encontro de banda",
      icon: "groups",
      isPublicByDefault: true,
      isActive: true,
      isSystem: false,
    };
    vi.mocked(apiFetch)
      .mockResolvedValueOnce([systemType])
      .mockResolvedValueOnce(created);
    const user = userEvent.setup();
    render(<PresentationTypesPanel />);

    await user.click(await screen.findByRole("button", { name: /novo tipo/i }));
    await user.type(
      screen.getByRole("textbox", { name: /nome do tipo de evento/i }),
      "  Encontro de banda  ",
    );
    await user.click(screen.getByRole("combobox", { name: /ícone do tipo/i }));
    await user.click(screen.getByRole("option", { name: /grupo/i }));
    await user.click(
      screen.getByRole("checkbox", { name: /público por padrão/i }),
    );
    await user.click(screen.getByRole("button", { name: /salvar tipo/i }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenLastCalledWith("/presentation-types", {
        method: "POST",
        body: JSON.stringify({
          name: "Encontro de banda",
          icon: "groups",
          isPublicByDefault: true,
          isActive: true,
        }),
      }),
    );
    expect(await screen.findByText(created.name)).toBeTruthy();
  });

  it("deactivatesCustomTypeWithoutDeletingIt", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce([customType])
      .mockResolvedValueOnce({ ...customType, isActive: false });
    const user = userEvent.setup();
    render(<PresentationTypesPanel />);

    await user.click(
      await screen.findByRole("button", { name: /editar encontro/i }),
    );
    await user.click(screen.getByRole("checkbox", { name: /tipo ativo/i }));
    await user.click(screen.getByRole("button", { name: /salvar tipo/i }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenLastCalledWith("/presentation-types/7", {
        method: "PUT",
        body: JSON.stringify({
          name: "Encontro",
          icon: "groups",
          isPublicByDefault: false,
          isActive: false,
        }),
      }),
    );
  });

  it("keepsPredefinedTypeActiveAndHidesWriteActionsFromNonManagers", async () => {
    session.roles = ["aluno"];
    vi.mocked(apiFetch).mockResolvedValueOnce([systemType]);
    render(<PresentationTypesPanel />);

    expect(await screen.findByText(systemType.name)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /novo tipo/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /editar/i })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /tipo ativo/i })).toBeNull();
  });
});
