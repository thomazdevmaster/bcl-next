// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getCrudConfig, getCrudFormStages } from "@/domains/crudConfig";
import type { CrudField } from "@/domains/crudConfig";

import {
  EntityForm,
  defaultValueForField,
  formatCrudFieldValue,
  makeFormDefaults,
  optionsForField,
  simpleFieldPresentation,
} from "./EntityForm";

describe("EntityForm creation defaults", () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  afterEach(cleanup);

  it("formats phone values and applies field-specific formatters", () => {
    const phoneField = {
      name: "phone",
      label: "Telefone",
      type: "tel",
    } as CrudField;
    const formattedField = {
      name: "title",
      label: "Título",
      format: (value: string) => value.toUpperCase(),
    };
    expect(formatCrudFieldValue(phoneField, "35998563214", {})).toBe(
      "(35) 99856-3214",
    );
    expect(formatCrudFieldValue(formattedField, "abc", {})).toBe("ABC");
    expect(formatCrudFieldValue({} as CrudField, "abc", {})).toBe("abc");
  });

  it("maps field types and event date fields to presentation props", () => {
    expect(
      simpleFieldPresentation("presentations", {
        name: "startsAt",
        label: "Início",
        type: "datetime-local",
        required: true,
      } as CrudField),
    ).toEqual({
      calendarVariant: "date-time",
      optionalMessage: undefined,
      inputMode: undefined,
      autoComplete: undefined,
      step: undefined,
    });
    expect(
      simpleFieldPresentation("songs", {
        name: "duration",
        label: "Duração",
        type: "number",
        required: false,
      } as CrudField),
    ).toEqual({
      calendarVariant: undefined,
      optionalMessage: "Opcional",
      inputMode: "decimal",
      autoComplete: undefined,
      step: "0.01",
    });
    expect(
      simpleFieldPresentation("users", {
        name: "password",
        label: "Senha",
        type: "password",
        required: true,
      } as CrudField),
    ).toMatchObject({ autoComplete: "new-password" });
  });

  it("adds resource-specific defaults while preserving existing values", () => {
    expect(makeFormDefaults("people", [], { id: 4, userId: 9 })).toEqual({
      resource: "people",
      id: 4,
      userId: 9,
    });
    expect(makeFormDefaults("songs", [], {})).toMatchObject({
      resource: "songs",
      scoreFileName: "",
      scoreMimeType: "",
    });
    expect(
      makeFormDefaults("presentations", [], {
        notifyAll: false,
        eventType: { name: "Encontro", icon: "groups" },
      }),
    ).toEqual({
      resource: "presentations",
      notifyAll: false,
      eventTypeName: "Encontro",
      eventTypeIcon: "groups",
    });
  });

  it("uses empty values matching each field control type", () => {
    expect(
      defaultValueForField({
        name: "enabled",
        label: "Ativo",
        type: "checkbox",
      }),
    ).toBe(false);
    expect(
      defaultValueForField({
        name: "roles",
        label: "Perfis",
        type: "multiselect",
      }),
    ).toEqual([]);
    expect(
      defaultValueForField({ name: "name", label: "Nome", type: "text" }),
    ).toBe("");
  });

  it("preserves an existing linked person while excluding other linked people", () => {
    const field: CrudField = {
      name: "personId",
      label: "Pessoa",
      type: "select",
      optionsSource: "people-without-user",
    };
    const options = optionsForField(
      field,
      { personId: "2" },
      {
        people: [
          { value: "1", label: "Com conta", hasUser: true },
          { value: "2", label: "Selecionada", hasUser: true },
          { value: "3", label: "Sem conta", hasUser: false },
        ],
        instruments: null,
        presentationTypes: null,
      },
    );

    expect(options.map((option) => option.value)).toEqual(["", "2", "3"]);
    expect(options[0].label).toBe("Selecione…");
  });

  it("preserves select defaults configured by the instrument domain", () => {
    const config = getCrudConfig("instruments");
    const family = config.fields.find((field) => field.name === "family");
    const defaultFamily = String(config.defaults.family);
    const defaultFamilyLabel = family?.options?.find(
      (option) => option.value === defaultFamily,
    )?.label;

    if (!family || !defaultFamilyLabel) {
      throw new Error(
        "Instrument family field or configured default is missing",
      );
    }

    render(
      <EntityForm
        resource="instruments"
        fields={config.fields}
        values={config.defaults}
        readOnly={false}
        editing={false}
        saving={false}
        error={null}
        dynamicChoices={{
          people: null,
          instruments: null,
          presentationTypes: null,
        }}
        stages={getCrudFormStages("instruments")}
        onSubmit={async () => undefined}
      />,
    );

    expect(
      screen.getByRole("combobox", {
        name: `${family.label}: ${defaultFamilyLabel}`,
      }),
    ).toBeTruthy();
  });

  it("keeps the selected person and omits the current person from choices", async () => {
    const config = getCrudConfig("patrimony");
    const personField = config.fields.find(
      (field) => field.name === "assignedPersonId",
    );
    if (!personField) throw new Error("Patrimony person field is missing");
    render(
      <EntityForm
        resource="patrimony"
        fields={[personField]}
        values={{ ...config.defaults, id: 9, assignedPersonId: "9" }}
        readOnly={false}
        editing={false}
        saving={false}
        error={null}
        dynamicChoices={{
          people: [
            { value: "9", label: "Pessoa atual", hasUser: false },
            { value: "2", label: "Outra pessoa", hasUser: true },
          ],
          instruments: null,
          presentationTypes: null,
        }}
        stages={[
          { ...getCrudFormStages("patrimony")[1], fields: [personField.name] },
        ]}
        onSubmit={async () => undefined}
      />,
    );

    fireEvent.click(
      screen.getByRole("combobox", { name: /pessoa responsável/i }),
    );

    expect(screen.queryByRole("option", { name: "Pessoa atual" })).toBeNull();
    expect(screen.getByRole("option", { name: /pessoa #9/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Outra pessoa" })).toBeTruthy();
  });

  it("newPresentationUsesSelectedTypePublicDefault", async () => {
    const config = getCrudConfig("presentations");
    const user = await import("@testing-library/user-event").then(
      ({ default: userEvent }) => userEvent.setup(),
    );
    const onSubmit = vi.fn(async () => undefined);
    render(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{
          ...config.defaults,
          eventTypeId: "",
          title: "Evento de teste",
          venue: "Sede",
          startsAt: "2026-10-31T18:00",
        }}
        readOnly={false}
        editing={false}
        saving={false}
        error={null}
        dynamicChoices={{
          people: null,
          instruments: null,
          presentationTypes: [
            {
              value: "7",
              label: "Encontro",
              icon: "groups",
              isPublicByDefault: false,
              isActive: true,
              isSystem: false,
            },
          ],
        }}
        stages={getCrudFormStages("presentations")}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: /tipo do evento/i }));
    await user.click(screen.getByRole("option", { name: /encontro/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(
      (
        screen.getByRole("checkbox", {
          name: /mostrar na agenda pública/i,
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });

  it("selectsMultipleCatalogSongsAndSubmitsTheirIds", async () => {
    const config = getCrudConfig("presentations");
    const user = await import("@testing-library/user-event").then(
      ({ default: userEvent }) => userEvent.setup(),
    );
    const onSubmit = vi.fn(async () => undefined);

    render(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{
          ...config.defaults,
          eventTypeId: "7",
          title: "Ensaio",
          venue: "Sede",
          startsAt: "2026-10-31T18:00",
        }}
        readOnly={false}
        editing={false}
        saving={false}
        error={null}
        dynamicChoices={
          {
            people: null,
            instruments: null,
            presentationTypes: [
              {
                value: "7",
                label: "Encontro",
                isPublicByDefault: true,
                isActive: true,
                isSystem: false,
              },
            ],
            songs: [
              {
                value: "101",
                label: "Dobrado Luminarense",
                icon: "library_music",
              },
              { value: "202", label: "Hino da Banda", icon: "library_music" },
            ],
          } as never
        }
        stages={getCrudFormStages("presentations")}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /^Repertório:/i }));
    await user.click(
      screen.getByRole("menuitemcheckbox", { name: /dobrado luminarense/i }),
    );
    await user.click(
      screen.getByRole("menuitemcheckbox", { name: /hino da banda/i }),
    );
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ repertoireIds: ["101", "202"] }),
    );
  });

  it("showsSongCatalogLoadingAndRetryableErrors", async () => {
    const config = getCrudConfig("presentations");
    const user = await import("@testing-library/user-event").then(
      ({ default: userEvent }) => userEvent.setup(),
    );
    const onRetrySongs = vi.fn();
    const renderForm = (songsLoading: boolean, songsError: string | null) => (
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{
          ...config.defaults,
          eventTypeId: "7",
          title: "Ensaio",
          venue: "Sede",
          startsAt: "2026-10-31T18:00",
        }}
        readOnly={false}
        editing={false}
        saving={false}
        error={null}
        dynamicChoices={{
          people: null,
          instruments: null,
          presentationTypes: null,
          songs: null,
          songsLoading,
          songsError,
        }}
        stages={getCrudFormStages("presentations")}
        onSubmit={vi.fn(async () => undefined)}
        onRetrySongs={onRetrySongs}
      />
    );
    const { rerender } = render(renderForm(true, null));
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByText("Carregando músicas…")).toBeTruthy();

    rerender(renderForm(false, "Falha ao carregar músicas."));
    expect(screen.getByRole("alert").textContent).toContain(
      "Falha ao carregar músicas.",
    );
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetrySongs).toHaveBeenCalledOnce();
  });

  it("changingTypePreservesManuallyChosenVisibility", async () => {
    const config = getCrudConfig("presentations");
    const user = await import("@testing-library/user-event").then(
      ({ default: userEvent }) => userEvent.setup(),
    );
    render(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{
          ...config.defaults,
          eventTypeId: "",
          title: "Evento de teste",
          venue: "Sede",
          startsAt: "2026-10-31T18:00",
        }}
        readOnly={false}
        editing={false}
        saving={false}
        error={null}
        dynamicChoices={{
          people: null,
          instruments: null,
          presentationTypes: [
            {
              value: "7",
              label: "Encontro interno",
              icon: "groups",
              isPublicByDefault: true,
              isActive: true,
              isSystem: false,
            },
            {
              value: "8",
              label: "Concerto público",
              icon: "music_note",
              isPublicByDefault: true,
              isActive: true,
              isSystem: true,
            },
          ],
        }}
        stages={getCrudFormStages("presentations")}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: /tipo do evento/i }));
    await user.click(screen.getByRole("option", { name: /encontro interno/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    const publicCheckbox = screen.getByRole("checkbox", {
      name: /mostrar na agenda pública/i,
    });
    expect((publicCheckbox as HTMLInputElement).checked).toBe(true);
    await user.click(publicCheckbox);
    expect(
      (
        screen.getByRole("checkbox", {
          name: /mostrar na agenda pública/i,
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: /voltar/i }));
    await user.click(screen.getByRole("combobox", { name: /tipo do evento/i }));
    await user.click(screen.getByRole("option", { name: /concerto público/i }));
    expect(
      screen.getByRole("combobox", {
        name: /tipo do evento: concerto público/i,
      }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(
      (
        screen.getByRole("checkbox", {
          name: /mostrar na agenda pública/i,
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });

  it("changingTypeOnEditPreservesVisibility", async () => {
    const config = getCrudConfig("presentations");
    const user = await import("@testing-library/user-event").then(
      ({ default: userEvent }) => userEvent.setup(),
    );
    render(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{
          ...config.defaults,
          id: 9,
          eventTypeId: "1",
          isPublic: false,
          title: "Evento de teste",
          venue: "Sede",
          startsAt: "2026-10-31T18:00",
        }}
        readOnly={false}
        editing
        saving={false}
        error={null}
        dynamicChoices={{
          people: null,
          instruments: null,
          presentationTypes: [
            {
              value: "1",
              label: "Tipo antigo",
              isPublicByDefault: true,
              isActive: false,
              isSystem: true,
            },
            {
              value: "2",
              label: "Tipo novo",
              isPublicByDefault: true,
              isActive: true,
              isSystem: false,
            },
          ],
        }}
        stages={getCrudFormStages("presentations")}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: /tipo do evento/i }));
    expect(screen.getByRole("option", { name: /tipo antigo/i })).toBeTruthy();
    await user.click(screen.getByRole("option", { name: /tipo novo/i }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(
      (
        screen.getByRole("checkbox", {
          name: /mostrar na agenda pública/i,
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });

  it("inactiveTypeRemainsAvailableOnlyForExistingPresentation", async () => {
    const config = getCrudConfig("presentations");
    const user = await import("@testing-library/user-event").then(
      ({ default: userEvent }) => userEvent.setup(),
    );
    const renderForm = (editing: boolean) =>
      render(
        <EntityForm
          resource="presentations"
          fields={config.fields}
          values={{ ...config.defaults, eventTypeId: editing ? "1" : "" }}
          readOnly={false}
          editing={editing}
          saving={false}
          error={null}
          dynamicChoices={{
            people: null,
            instruments: null,
            presentationTypes: [
              {
                value: "1",
                label: "Inativo",
                isPublicByDefault: true,
                isActive: false,
                isSystem: false,
              },
              {
                value: "2",
                label: "Ativo",
                isPublicByDefault: true,
                isActive: true,
                isSystem: false,
              },
            ],
          }}
          stages={getCrudFormStages("presentations")}
          onSubmit={vi.fn(async () => undefined)}
        />,
      );
    const existing = renderForm(true);
    await user.click(screen.getByRole("combobox", { name: /tipo do evento/i }));
    expect(screen.getByRole("option", { name: /inativo/i })).toBeTruthy();
    existing.unmount();
    renderForm(false);
    await user.click(screen.getByRole("combobox", { name: /tipo do evento/i }));
    expect(screen.queryByRole("option", { name: /inativo/i })).toBeNull();
  });

  it("showsPresentationTypeLoadingAndError", async () => {
    const config = getCrudConfig("presentations");
    const user = await import("@testing-library/user-event").then(
      ({ default: userEvent }) => userEvent.setup(),
    );
    const onRetryPresentationTypes = vi.fn();
    const { rerender } = render(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{ ...config.defaults, eventTypeId: "" }}
        readOnly={false}
        editing={false}
        saving={false}
        error={null}
        dynamicChoices={
          {
            people: null,
            instruments: null,
            presentationTypes: null,
            presentationTypesLoading: true,
            presentationTypesError: null,
          } as never
        }
        stages={getCrudFormStages("presentations")}
        onSubmit={vi.fn(async () => undefined)}
        onRetryPresentationTypes={onRetryPresentationTypes}
      />,
    );

    expect(screen.getByText(/carregando tipos de evento/i)).toBeTruthy();

    rerender(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{ ...config.defaults, eventTypeId: "" }}
        readOnly={false}
        editing={false}
        saving={false}
        error={null}
        dynamicChoices={
          {
            people: null,
            instruments: null,
            presentationTypes: null,
            presentationTypesLoading: false,
            presentationTypesError: "Falha ao carregar os tipos.",
          } as never
        }
        stages={getCrudFormStages("presentations")}
        onSubmit={vi.fn(async () => undefined)}
        onRetryPresentationTypes={onRetryPresentationTypes}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Falha ao carregar os tipos.",
    );
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetryPresentationTypes).toHaveBeenCalledOnce();
  });
});

describe("EntityForm validation on edit", () => {
  afterEach(cleanup);

  it("shows valid fields as validated as soon as an edit form opens", async () => {
    const config = getCrudConfig("presentations");

    render(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{
          ...config.defaults,
          id: 9,
          title: "Concerto",
          venue: "Praça",
          startsAt: "2026-10-31T18:00",
        }}
        readOnly={false}
        editing
        saving={false}
        error={null}
        dynamicChoices={{
          people: null,
          instruments: null,
          presentationTypes: null,
        }}
        stages={getCrudFormStages("presentations")}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    const titleField = screen
      .getByRole("textbox", { name: "Título" })
      .closest('[data-slot="styled-field"]');
    await waitFor(() => {
      expect(titleField?.querySelector(".material-icons")?.textContent).toBe(
        "check_circle",
      );
    });
  });

  it("shows validation errors as soon as an edit form opens", async () => {
    const config = getCrudConfig("presentations");

    render(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{ ...config.defaults, id: 9, status: "" }}
        readOnly={false}
        editing
        saving={false}
        error={null}
        dynamicChoices={{
          people: null,
          instruments: null,
          presentationTypes: null,
        }}
        stages={getCrudFormStages("presentations")}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    expect(await screen.findByText("Informe o título.")).toBeTruthy();
    expect(await screen.findByText("Informe o local.")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /etapa 2: repertório e publicação\. há campos com erro/i,
      }),
    ).toBeTruthy();
  });

  it("does not show untouched validation errors when creating", () => {
    const config = getCrudConfig("presentations");

    render(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={config.defaults}
        readOnly={false}
        editing={false}
        saving={false}
        error={null}
        dynamicChoices={{
          people: null,
          instruments: null,
          presentationTypes: null,
        }}
        stages={getCrudFormStages("presentations")}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.queryByText("Informe o título.")).toBeNull();
    expect(screen.queryByText("Informe o local.")).toBeNull();
  });
});

describe("EntityForm agenda layout", () => {
  afterEach(cleanup);

  it("gives event type, title, venue, and description their own rows", () => {
    const config = getCrudConfig("presentations");

    render(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{
          ...config.defaults,
          id: 9,
          eventTypeId: "1",
          title: "Concerto",
          venue: "Praça",
          startsAt: "2026-10-31T18:00",
        }}
        readOnly={false}
        editing
        saving={false}
        error={null}
        dynamicChoices={{
          people: null,
          instruments: null,
          presentationTypes: [],
        }}
        stages={getCrudFormStages("presentations")}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    for (const control of [
      screen.getByRole("combobox", { name: /tipo do evento/i }),
      screen.getByRole("textbox", { name: "Título" }),
      screen.getByRole("textbox", { name: "Local" }),
      screen.getByRole("textbox", { name: "Descrição" }),
    ]) {
      expect(control.closest('[class*="md:col-span-2"]')).not.toBeNull();
    }

    for (const control of [
      screen.getByRole("combobox", { name: "Início" }),
      screen.getByRole("combobox", { name: "Fim" }),
    ]) {
      expect(control.closest('[class*="md:col-span-2"]')).toBeNull();
    }
  });
});

describe("EntityForm date and time fields", () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
  });
  afterEach(cleanup);

  it("uses the shared date-time calendar for event start and end", () => {
    const config = getCrudConfig("presentations");

    render(
      <EntityForm
        resource="presentations"
        fields={config.fields}
        values={{
          ...config.defaults,
          startsAt: "2026-10-31T18:30",
          endsAt: "2026-10-31T20:00",
        }}
        readOnly={false}
        editing={false}
        saving={false}
        error={null}
        dynamicChoices={{
          people: null,
          instruments: null,
          presentationTypes: null,
        }}
        stages={getCrudFormStages("presentations")}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    expect(
      (screen.getByRole("combobox", { name: "Início" }) as HTMLInputElement)
        .value,
    ).toBe("31/10/2026 · 18:30");
    expect(
      (screen.getByRole("combobox", { name: "Fim" }) as HTMLInputElement).value,
    ).toBe("31/10/2026 · 20:00");
    expect(
      screen.queryByRole("listbox", { name: "Hora de início" }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir calendário de início" }),
    );
    expect(
      screen.getByRole("listbox", { name: "Hora de início" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("listbox", { name: "Minuto de início" }),
    ).toBeTruthy();
  });
});
