// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

import type { EventTypeFormValues } from "@/domains/presentations/schemas/event-type.schema";
import type { PresentationType } from "@/domains/presentations/types";

import { PresentationTypeForm } from "./PresentationTypeForm";

const systemType: PresentationType = {
  id: 1,
  name: "Apresentação",
  isPublicByDefault: true,
  isActive: true,
  isSystem: true,
};

function TestForm() {
  const form = useForm<EventTypeFormValues>({
    defaultValues: {
      name: systemType.name,
      icon: "",
      isPublicByDefault: true,
      isActive: true,
    },
  });

  return (
    <PresentationTypeForm
      form={form}
      editingType={systemType}
      title="Editar tipo de evento"
      saving={false}
      error={null}
      onSubmit={async () => undefined}
      onCancel={() => undefined}
    />
  );
}

describe("PresentationTypeForm", () => {
  afterEach(cleanup);

  it("rendersSharedFieldsWithoutAnActivationControlForSystemTypes", () => {
    render(<TestForm />);

    expect(
      screen.getByRole("textbox", { name: /nome do tipo de evento/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: /ícone do tipo/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: /público por padrão/i }),
    ).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /tipo ativo/i })).toBeNull();
  });
});
