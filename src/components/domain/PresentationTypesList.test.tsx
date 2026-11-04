// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PresentationType } from "@/domains/presentations/types";

import { PresentationTypesList } from "./PresentationTypesList";

const types: PresentationType[] = [
  {
    id: 1,
    name: "Apresentação",
    isPublicByDefault: true,
    isActive: true,
    isSystem: true,
  },
  {
    id: 2,
    name: "Encontro",
    isPublicByDefault: false,
    isActive: false,
    isSystem: false,
  },
];

describe("PresentationTypesList", () => {
  afterEach(cleanup);

  it("showsTypeStatusAndNotifiesWhenAManagerChoosesAnItemToEdit", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <PresentationTypesList
        types={types}
        canManage
        onCreate={vi.fn()}
        onEdit={onEdit}
      />,
    );

    expect(screen.getByText("Predefinido · Público por padrão")).toBeTruthy();
    expect(screen.getByText("Inativo · Interno por padrão")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Editar Encontro" }));
    expect(onEdit).toHaveBeenCalledWith(types[1]);
  });

  it("hidesWriteActionsFromNonManagers", () => {
    render(
      <PresentationTypesList
        types={types}
        canManage={false}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Novo tipo" })).toBeNull();
    expect(screen.queryByRole("button", { name: /editar/i })).toBeNull();
  });
});
