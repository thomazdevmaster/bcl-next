import { describe, expect, it, vi } from "vitest";

import LegacyPresentationsPage from "./page";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

describe("legacy presentations route", () => {
  it("redirectsToAgendaAndPreservesQueryParams", async () => {
    const page = LegacyPresentationsPage as unknown as (props: {
      searchParams: Promise<Record<string, string | string[] | undefined>>;
    }) => Promise<unknown>;

    await page({
      searchParams: Promise.resolve({
        evento: "concerto/12",
        modo: "editar",
        tag: ["aberto", "interno"],
      }),
    });

    expect(redirect).toHaveBeenCalledWith(
      "/gestao/agenda?evento=concerto%2F12&modo=editar&tag=aberto&tag=interno",
    );
  });
});
