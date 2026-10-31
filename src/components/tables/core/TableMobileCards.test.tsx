// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { TableMobileCards } from "./TableMobileCards";

type AgendaRow = { id: string; title: string; date: string };
type Cell = {
  id: string;
  column: { id: string; columnDef: { header: string } };
  value: string;
};

const agendaRow: AgendaRow = {
  id: "event-1",
  title: "Ensaio geral",
  date: "2026-11-02",
};

const cells: Cell[] = [
  {
    id: "event-1-title",
    column: { id: "title", columnDef: { header: "Evento" } },
    value: agendaRow.title,
  },
  {
    id: "event-1-date",
    column: { id: "date", columnDef: { header: "Data" } },
    value: agendaRow.date,
  },
];

const row = {
  id: agendaRow.id,
  original: agendaRow,
  getVisibleCells: () => cells,
  getIsPinned: () => false,
  getCanPin: () => false,
  getCanSelect: () => false,
  getIsSelected: () => false,
  toggleSelected: () => undefined,
  pin: () => undefined,
};

const table = {
  FlexRender: ({ cell }: { cell: Cell }) => <span>{cell.value}</span>,
};

const nativeShowModal = HTMLDialogElement.prototype.showModal;
const nativeClose = HTMLDialogElement.prototype.close;

afterEach(() => {
  cleanup();
  if (nativeShowModal) {
    HTMLDialogElement.prototype.showModal = nativeShowModal;
  } else {
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>)
      .showModal;
  }
  if (nativeClose) {
    HTMLDialogElement.prototype.close = nativeClose;
  } else {
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  }
});

describe("TableMobileCards", () => {
  it("opens row details as a full-width bottom sheet without a close X", async () => {
    const user = userEvent.setup();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
    render(
      <TableMobileCards
        table={table as never}
        rows={[row as never]}
        noResults={false}
        noResultsMessage="Nenhum registro"
        getRowLabel={() => agendaRow.title}
        rowPinningEnabled={false}
        mobileSelectionEnabled={false}
        selectionMode={false}
        onSelectionModeChange={() => undefined}
        selectedRowCount={0}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Visualizar Ensaio geral" }),
    );

    const panel = await screen.findByRole("dialog", {
      name: "Ensaio geral",
    });
    expect(panel.getAttribute("data-side")).toBe("bottom");
    expect(panel.style.left).toBe("0px");
    expect(panel.style.right).toBe("0px");
    expect(panel.style.bottom).toBe("0px");
    expect(panel.style.width).toBe("100vw");
    expect(screen.queryByRole("button", { name: "Fechar painel" })).toBeNull();
    expect(screen.getByText("2026-11-02")).toBeTruthy();
  });
});
