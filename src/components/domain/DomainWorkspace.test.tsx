// @vitest-environment jsdom
// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/lib/api";

import {
  DomainWorkspace,
  loadPresentationSongChoices,
  loadPresentationTypeChoices,
} from "./DomainWorkspace";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => {
  const roles = ["admin"];
  return {
    useAuth: () => ({ roles, permissions: null, user: null }),
  };
});
vi.mock("./DomainGuard", () => ({
  DomainGuard: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/shared/EntityDialog", () => ({
  EntityDialog: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));
vi.mock("./EntityForm", () => ({
  EntityForm: ({
    onSubmit,
    values,
  }: {
    onSubmit: (values: Record<string, unknown>) => Promise<unknown>;
    values: Record<string, unknown>;
  }) => (
    <>
      <p>Event form</p>
      <button
        type="button"
        onClick={() => void onSubmit({ ...values, name: "Flauta" })}
      >
        Salvar item teste
      </button>
    </>
  ),
}));
vi.mock("@/components/tables/core/TableView", () => ({
  TableView: ({
    data,
    mobilePrimaryAction,
    getMobilePrimary,
    getMobilePrimaryLabel,
  }: {
    data: Record<string, unknown>[];
    mobilePrimaryAction?: React.ReactNode;
    getMobilePrimary?: (row: Record<string, unknown>) => React.ReactNode;
    getMobilePrimaryLabel?: (row: Record<string, unknown>) => React.ReactNode;
  }) => (
    <div>
      <ol aria-label="Itens exibidos no mobile">
        {data.map((item) => (
          <li key={String(item.id)}>
            {getMobilePrimaryLabel
              ? String(getMobilePrimaryLabel(item))
              : ""}
            {getMobilePrimary ? String(getMobilePrimary(item)) : ""}
            {String(item.name ?? item.title ?? "")}
          </li>
        ))}
      </ol>
      {mobilePrimaryAction}
    </div>
  ),
}));
vi.mock("@/lib/deepLink/useGestaoDeepLink", () => ({
  useGestaoDeepLink: () => undefined,
}));

describe("presentation type choices", () => {
  it("loadsPresentationTypesForEventForm", async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      {
        id: 4,
        name: "Encontro",
        icon: "groups",
        isPublicByDefault: true,
        isActive: true,
        isSystem: false,
      },
    ]);
    await expect(loadPresentationTypeChoices()).resolves.toEqual([
      {
        value: "4",
        label: "Encontro",
        icon: "groups",
        isPublicByDefault: true,
        isActive: true,
        isSystem: false,
      },
    ]);
    expect(apiFetch).toHaveBeenCalledWith("/presentation-types");
  });
});

describe("presentation song choices", () => {
  it("loadsEverySongForTheEventRepertoireWithStableIds", async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      { id: 101, title: "Dobrado Luminarense", composer: "A. Silva" },
      { id: "202", title: "Hino da Banda", composer: "" },
    ]);

    await expect(loadPresentationSongChoices()).resolves.toEqual([
      {
        value: "101",
        label: "Dobrado Luminarense · A. Silva",
        icon: "library_music",
      },
      { value: "202", label: "Hino da Banda", icon: "library_music" },
    ]);
    expect(apiFetch).toHaveBeenCalledWith("/songs");
  });
});

describe("domain option loading", () => {
  afterEach(() => {
    cleanup();
    vi.mocked(apiFetch).mockReset();
  });

  it("loads people and instrument choices for people fields", async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);

    render(<DomainWorkspace resource="people" hideHeader />);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/people");
      expect(apiFetch).toHaveBeenCalledWith("/instruments");
    });
  });
});

describe("event creation action", () => {
  afterEach(cleanup);

  it("shows each presentation date as its mobile card label and title as value", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === "/presentations")
        return [
          {
            id: 7,
            title: "Encontro da banda",
            startsAt: "2026-11-20T22:00:00.000Z",
          },
        ];
      return [];
    });

    render(<DomainWorkspace resource="presentations" hideHeader />);

    const item = await screen.findByRole("listitem");
    expect(item.textContent).toContain("20/11/2026");
    expect(item.textContent).toContain("Encontro da banda");
  });

  it("showsAndOpensTheCreateEventFlowWhenTheDomainHeaderIsHidden", async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);
    const user = userEvent.setup();

    render(
      <DomainWorkspace
        resource="presentations"
        hideHeader
        createNoun="evento"
      />,
    );

    const createButtons = screen.getAllByRole("button", {
      name: "Novo evento",
    });
    expect(createButtons).toHaveLength(2);

    await user.click(createButtons[0]);

    expect(screen.getByRole("dialog", { name: "Novo evento" })).toBeTruthy();
  });

  it("placesANewlyCreatedItemAtTheTopOfTheMobileList", async () => {
    const existingItem = { id: 1, name: "Clarinete" };
    const createdItem = { id: 2, name: "Flauta" };
    vi.mocked(apiFetch).mockImplementation(async (path, options) => {
      if (path === "/instruments" && options?.method === "POST") {
        return createdItem;
      }
      if (path === "/instruments") return [existingItem];
      return [];
    });
    const user = userEvent.setup();

    render(
      <DomainWorkspace
        resource="instruments"
        hideHeader
        createNoun="instrumento"
      />,
    );

    const mobileItems = await screen.findByRole("list", {
      name: "Itens exibidos no mobile",
    });
    await user.click(
      screen.getAllByRole("button", { name: "Novo instrumento" })[0],
    );
    await user.click(screen.getByRole("button", { name: "Salvar item teste" }));

    await waitFor(() => {
      expect(
        within(mobileItems)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(["Flauta", "Clarinete"]);
    });
  });
});
