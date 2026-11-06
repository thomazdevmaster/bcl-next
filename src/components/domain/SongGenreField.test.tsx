// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

import { SongGenreField } from "./SongGenreField";

function Harness({
  suggestions,
  onRemember,
}: {
  suggestions: string[];
  onRemember: (genre: string) => void;
}) {
  const form = useForm({ defaultValues: { genre: "" } });
  return (
    <FormProvider {...form}>
      <SongGenreField
        name="genre"
        suggestions={suggestions}
        onRemember={onRemember}
      />
    </FormProvider>
  );
}

describe("SongGenreField", () => {
  afterEach(cleanup);

  it("sugere gêneros já usados e guarda um gênero novo ao sair do campo", async () => {
    const user = userEvent.setup();
    const onRemember = vi.fn();
    render(
      <Harness suggestions={["MPB", "Samba"]} onRemember={onRemember} />,
    );

    const input = screen.getByRole("combobox", { name: /gênero/i });
    await user.click(input);
    expect(screen.getByRole("option", { name: "MPB" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Samba" })).toBeTruthy();

    await user.type(input, "sa");
    expect(screen.getByRole("option", { name: "Samba" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "MPB" })).toBeNull();

    await user.clear(input);
    await user.type(input, "Choro");
    expect(screen.getByRole("option", { name: "Choro" })).toBeTruthy();
    await user.tab();
    expect(onRemember).toHaveBeenCalledWith("Choro");
  });

  it("preenche o campo ao escolher uma sugestão", async () => {
    const user = userEvent.setup();
    render(<Harness suggestions={["MPB", "Samba"]} onRemember={vi.fn()} />);

    await user.click(screen.getByRole("combobox", { name: /gênero/i }));
    await user.click(screen.getByRole("option", { name: "Samba" }));

    expect(
      (screen.getByRole("combobox", { name: /gênero/i }) as HTMLInputElement)
        .value,
    ).toBe("Samba");
  });
});
