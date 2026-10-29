import type { MediaKind, MediaPost } from "@/domains/media/types";
import type { Presentation } from "@/domains/presentations/types";

const KIND_LABELS: Record<MediaKind, string> = {
  article: "Matéria",
  photo: "Galeria",
  video: "Vídeo",
};

export function mediaKindLabel(kind: MediaKind): string {
  return KIND_LABELS[kind];
}

export function formatPresentationWhen(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPublishedDate(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function isUpcomingPublicPresentation(
  item: Presentation,
  now = Date.now(),
): boolean {
  if (!item.isPublic || item.status === "cancelled" || item.status === "done")
    return false;
  return new Date(item.startsAt).getTime() >= now;
}

export function sortPresentationsByDate(items: Presentation[]): Presentation[] {
  return [...items].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export function upcomingPublicPresentations(
  items: Presentation[],
  limit?: number,
): Presentation[] {
  const sorted = sortPresentationsByDate(
    items.filter((item) => isUpcomingPublicPresentation(item)),
  );
  return limit ? sorted.slice(0, limit) : sorted;
}

export function orderMediaPosts(
  items: MediaPost[],
  orderIds: string[] = [],
): MediaPost[] {
  const rank = new Map(orderIds.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const left = rank.get(String(a.id));
    const right = rank.get(String(b.id));
    if (left !== undefined || right !== undefined) {
      if (left === undefined) return 1;
      if (right === undefined) return -1;
      if (left !== right) return left - right;
    }
    return (
      new Date(b.publishedAt ?? b.createdAt).getTime() -
      new Date(a.publishedAt ?? a.createdAt).getTime()
    );
  });
}

export function publishedMediaPosts(
  items: MediaPost[],
  orderIds: string[] = [],
): MediaPost[] {
  return orderMediaPosts(
    items.filter((item) => item.status === "published"),
    orderIds,
  );
}

export function latestPublishedMediaPosts(items: MediaPost[]): MediaPost[] {
  return items
    .filter((item) => item.status === "published")
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? b.createdAt).getTime() -
        new Date(a.publishedAt ?? a.createdAt).getTime(),
    );
}
