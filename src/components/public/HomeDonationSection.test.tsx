// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultHomepage, type DonationsSection } from "@/domains/homepage/types";

import { HomeDonationSection } from "./HomeDonationSection";

function donationsSection(): DonationsSection {
  const section = defaultHomepage().sections.find(
    (item) => item.type === "donations",
  );
  if (!section || section.type !== "donations") {
    throw new Error("Seção de doações ausente no padrão da home");
  }
  return section;
}

describe("HomeDonationSection", () => {
  afterEach(() => cleanup());

  it("mostra a chave Pix, o QR e os dois passos sem quebrar o texto no meio", () => {
    render(<HomeDonationSection section={donationsSection()} />);

    expect(
      screen.getByRole("heading", { name: /sustentada por quem acredita/i }),
    ).toBeTruthy();
    expect(screen.getAllByText("20.408.324/0001-70").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("img", {
        name: "QR Code Pix para doação à Banda Carmelitana Luminarense",
      }).length,
    ).toBeGreaterThan(0);
    const pixGrid = document.querySelector("[data-donation-pix-grid]");
    expect(pixGrid?.textContent).toContain("20.408.324/0001-70");
    expect(pixGrid?.textContent).toContain("Abra o app do seu banco");
    expect(pixGrid?.textContent).toContain("Escaneie o QR Code ou cole a chave");
    expect(pixGrid?.querySelector("img")?.getAttribute("alt")).toBe(
      "QR Code Pix para doação à Banda Carmelitana Luminarense",
    );
    expect(document.querySelector("[data-donation-curtain]")?.className).toContain("75%");
    expect(screen.getAllByText("Abra o app do seu banco").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Escaneie o QR Code ou cole a chave").length,
    ).toBeGreaterThan(0);
  });

  it("copia a chave Pix e confirma no botão", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<HomeDonationSection section={donationsSection()} />);

    const [copyButton] = screen.getAllByRole("button", { name: "Copiar chave Pix" });
    await user.click(copyButton!);

    expect(writeText).toHaveBeenCalledWith("20.408.324/0001-70");
    expect(screen.getAllByRole("button", { name: "Chave copiada" }).length).toBeGreaterThan(0);
  });
});
