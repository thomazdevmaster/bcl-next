import { describe, expect, it } from "vitest";

import type { Presentation } from "@/domains/presentations/types";
import type { MediaPost } from "@/domains/media/types";
import {
  formatPresentationWhen,
  latestPublishedMediaPosts,
  orderMediaPosts,
  pastPublicPresentations,
} from "./publicPortal";

const mediaPost = (
  id: number,
  publishedAt: string,
  status: MediaPost["status"] = "published",
): MediaPost => ({
  id,
  title: `Post ${id}`,
  slug: `post-${id}`,
  excerpt: "",
  body: "",
  kind: "article",
  status,
  createdAt: publishedAt,
  updatedAt: publishedAt,
  publishedAt,
});

describe("formatPresentationWhen", () => {
  it("displays presentation times in Brasília time", () => {
    expect(formatPresentationWhen("2026-11-20T22:00:00.000Z")).toContain(
      "19:00",
    );
  });
});

describe("pastPublicPresentations", () => {
  it("sorts past events newest first and excludes future events", () => {
    const item = (id: number, startsAt: string): Presentation => ({
      id,
      createdAt: startsAt,
      updatedAt: startsAt,
      title: `Evento ${id}`,
      venue: "Sede",
      startsAt,
      repertoireIds: [],
      isPublic: true,
      status: "scheduled",
    });

    expect(
      pastPublicPresentations(
        [
          item(1, "2020-01-01T00:00:00.000Z"),
          item(2, "2030-01-01T00:00:00.000Z"),
          item(3, "2025-01-01T00:00:00.000Z"),
        ],
        Date.parse("2026-01-01T00:00:00.000Z"),
      ).map(({ id }) => id),
    ).toEqual([3, 1]);
  });
});

describe("media post ordering", () => {
  it("applies explicit order first, puts unranked posts last, then sorts by date", () => {
    const posts = [
      mediaPost(1, "2024-01-01T00:00:00Z"),
      mediaPost(2, "2026-01-01T00:00:00Z"),
      mediaPost(3, "2025-01-01T00:00:00Z"),
      mediaPost(4, "2023-01-01T00:00:00Z"),
    ];

    expect(orderMediaPosts(posts, ["3", "1"]).map(({ id }) => id)).toEqual([
      3, 1, 2, 4,
    ]);
    expect(orderMediaPosts(posts).map(({ id }) => id)).toEqual([2, 3, 1, 4]);
  });

  it("returns published posts newest first", () => {
    expect(
      latestPublishedMediaPosts([
        mediaPost(1, "2024-01-01T00:00:00Z"),
        mediaPost(2, "2026-01-01T00:00:00Z"),
        mediaPost(3, "2025-01-01T00:00:00Z", "draft"),
      ]).map(({ id }) => id),
    ).toEqual([2, 1]);
  });
});
