// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { StudySession, StudyViewSnapshot } from "@/study/studySession";

import { StudyMobileSheet } from "./StudyMobileSheet";

const studySession = {} as unknown as StudySession;
const studyState: StudyViewSnapshot = {
  scoreLoading: false,
  xmlLoaded: true,
  scoreError: null,
  currentScoreName: "Partitura de teste",
  scoreHeader: null,
  fullscreenScore: true,
  isMobile: true,
  mobileMeasuresPerLine: 4,
  canZoomMobileIn: false,
  canZoomMobileOut: false,
  playbackPosition: null,
  playbackCursorX: null,
  loading: false,
  playerReady: false,
  playerLoading: false,
  midiLoaded: false,
  midiLoading: false,
  playerError: null,
  audioReady: false,
  audioPreparing: false,
  desktopAutoScroll: false,
  playerExpanded: false,
  bpm: 100,
  bpmMin: 40,
  bpmMax: 200,
  timeSignature: "4/4",
  baseBpm: 100,
  metronomeEnabled: false,
  metronomeVolume: 0.5,
  audioVolume: 1,
  loopEnabled: false,
  loopStartMeasure: null,
  loopEndMeasure: null,
  instruments: {
    available: [],
    selectedIds: [],
    midiSelectedIds: [],
    filtered: [],
    selectionMatchesApplied: true,
    showSelection: false,
    cardCollapsed: true,
    allSelected: false,
    midiAllSelected: false,
    summary: "Nenhum",
    filter: "",
  },
};

describe("StudyMobileSheet", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  it("opens from the bottom and closes on Escape, returning focus to its trigger", async () => {
    const user = userEvent.setup();
    render(
      <StudyMobileSheet
        session={studySession}
        state={studyState}
        videoUrl={null}
        onBack={() => undefined}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Mais opções" });
    await user.click(trigger);

    const panel = await screen.findByRole("dialog", {
      name: "Opções do estudo",
    });
    expect(screen.queryByRole("button", { name: "Mais opções" })).toBeNull();
    expect(panel.getAttribute("data-side")).toBe("bottom");
    expect(panel.style.left).toBe("0px");
    expect(panel.style.right).toBe("0px");
    expect(panel.style.bottom).toBe("0px");
    expect(panel.style.width).toBe("100vw");
    expect(panel.style.transform).toBe("translate3d(0, 0, 0)");
    expect(screen.queryByRole("button", { name: "Fechar painel" })).toBeNull();
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(document.body.style.overflow).toBe("");
    expect(
      document.querySelector<HTMLElement>("[data-side=bottom]")?.style
        .transform,
    ).toBe("translate3d(0, 100%, 0)");
  });

  it("shows the video link and pending instrument actions when selections differ", async () => {
    const user = userEvent.setup();
    render(
      <StudyMobileSheet
        session={studySession}
        state={{
          ...studyState,
          instruments: {
            ...studyState.instruments,
            selectionMatchesApplied: false,
          },
        }}
        videoUrl="https://youtu.be/abc123def45"
        onBack={() => undefined}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Mais opções" }));

    expect(
      screen.getByRole("link", { name: "YouTube" }).getAttribute("href"),
    ).toBe("https://www.youtube.com/watch?v=abc123def45");
    expect(screen.getByRole("button", { name: "Gerar com selecionados" }))
      .toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });
});
