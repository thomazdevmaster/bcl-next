import type { NotificationItem, NotificationType } from "./types";

const NOTIFICATION_LINK_BASE = "https://portal.invalid";

export type NotificationLink = { href: string; external: boolean };

function readPayloadId(
  payload: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!payload) return null;
  for (const key of keys) {
    const value = payload[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function internalHref(path: string): NotificationLink {
  return { href: path, external: false };
}

function gestaoEditPath(
  basePath: string,
  param: string,
  id: string,
): NotificationLink {
  const qs = new URLSearchParams({
    [param]: id,
    modo: "editar",
  });
  return internalHref(`${basePath}?${qs.toString()}`);
}

/** Destino ao clicar na notificação (payload + targetUrl). */
export function resolveNotificationLink(
  item: NotificationItem,
): NotificationLink | null {
  const payload = item.payload;
  const type = item.type as NotificationType;

  switch (type) {
    case "signup_approval_pending":
    case "signup_incomplete":
    case "signup_completed": {
      const userId = readPayloadId(payload, "userId");
      if (userId) return gestaoEditPath("/gestao/usuarios", "conta", userId);
      break;
    }
    case "blog_post_published": {
      const slug =
        typeof payload?.slug === "string" ? payload.slug.trim() : "";
      if (slug) {
        return internalHref(`/blog/${encodeURIComponent(slug)}`);
      }
      const postId = readPayloadId(payload, "postId");
      if (postId) {
        return internalHref(`/gestao/midias/${encodeURIComponent(postId)}`);
      }
      break;
    }
    case "agenda_event_published": {
      const presentationId = readPayloadId(payload, "presentationId");
      if (presentationId) {
        return gestaoEditPath(
          "/gestao/apresentacoes",
          "evento",
          presentationId,
        );
      }
      break;
    }
    case "repertoire_song_created": {
      const songId = readPayloadId(payload, "songId");
      if (songId) {
        return gestaoEditPath("/gestao/musicas", "musica", songId);
      }
      break;
    }
    default:
      break;
  }

  return getNotificationLink(item.targetUrl);
}

export function getNotificationLink(
  value: string | null,
): NotificationLink | null {
  const candidate = value?.trim();
  if (
    !candidate ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return null;
  }

  try {
    const parsed = new URL(candidate, NOTIFICATION_LINK_BASE);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    if (!parsed.hostname || parsed.username || parsed.password) return null;
    if (parsed.origin === NOTIFICATION_LINK_BASE && !candidate.startsWith("/"))
      return null;
    return {
      href: candidate,
      external: parsed.origin !== NOTIFICATION_LINK_BASE,
    };
  } catch {
    return null;
  }
}
