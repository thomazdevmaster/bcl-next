import { describe, expect, it } from "vitest";

import { resolveNotificationLink } from "./links";
import type { NotificationItem } from "./types";

describe("resolveNotificationLink", () => {
  it("opens published presentation notifications in the unified agenda", () => {
    const item: NotificationItem = {
      id: 1,
      type: "agenda_event_published",
      title: "Novo evento",
      body: "Um evento foi publicado.",
      targetUrl: null,
      payload: { presentationId: "concerto/12" },
      actorUserId: null,
      createdAt: "2026-11-01T12:00:00Z",
      readAt: null,
      archived: false,
    };

    expect(resolveNotificationLink(item)).toEqual({
      href: "/gestao/agenda?evento=concerto%2F12&modo=editar",
      external: false,
    });
  });

  it("opens repertoire notifications in the score playground", () => {
    const item: NotificationItem = {
      id: 2,
      type: "repertoire_song_created",
      title: "Nova música no repertório",
      body: "Linda Demais",
      targetUrl: "/score_playground",
      payload: { songId: 8 },
      actorUserId: 1,
      createdAt: "2026-11-06T12:00:00Z",
      readAt: null,
      archived: false,
    };

    expect(resolveNotificationLink(item)).toEqual({
      href: "/score_playground",
      external: false,
    });
  });
});
