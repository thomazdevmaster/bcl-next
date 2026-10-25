const NOTIFICATION_LINK_BASE = "https://portal.invalid";

export type NotificationLink = { href: string; external: boolean };

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
