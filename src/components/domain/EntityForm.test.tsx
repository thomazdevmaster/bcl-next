// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { EntityForm } from "./EntityForm";
import { getCrudConfig, getCrudFormStages } from "@/domains/crudConfig";

describe("EntityForm creation defaults", () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it("preserves select defaults configured by the instrument domain", () => {
    const config = getCrudConfig("instruments");
    const family = config.fields.find((field) => field.name === "family");
    const defaultFamily = String(config.defaults.family);
    const defaultFamilyLabel = family?.options?.find(
      (option) => option.value === defaultFamily,
    )?.label;

    if (!family || !defaultFamilyLabel) {
      throw new Error("Instrument family field or configured default is missing");
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
        dynamicChoices={{ people: null, instruments: null }}
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
});
