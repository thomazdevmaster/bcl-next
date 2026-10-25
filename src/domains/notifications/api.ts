import { usesRemoteApi } from "@/config/environment";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  NotificationEmailFailure,
  NotificationPage,
  NotificationPreferences,
  NotificationRecipient,
} from "./types";

async function notificationApiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (!usesRemoteApi()) {
    throw new ApiError("Configure NEXT_PUBLIC_API_URL para conectar à API oficial de notificações.", 0);
  }
  return apiFetch<T>(path, options);
}

export function getUnreadNotificationCount(): Promise<{ count: number }> {
  return notificationApiFetch<{ count: number }>("/notifications/unread-count");
}

export function getNotifications(cursor?: number | null): Promise<NotificationPage> {
  const query = new URLSearchParams({ limit: "10" });
  if (cursor) query.set("cursor", String(cursor));
  return notificationApiFetch<NotificationPage>(`/notifications?${query.toString()}`);
}

export function markNotificationRead(id: number): Promise<void> {
  return notificationApiFetch<void>(`/notifications/${id}/read`, { method: "PATCH" });
}

export function getNotificationPreferences(): Promise<NotificationPreferences[]> {
  return notificationApiFetch<NotificationPreferences[]>("/notifications/preferences");
}

export function saveNotificationPreferences(
  preferences: NotificationPreferences[],
): Promise<NotificationPreferences[]> {
  return notificationApiFetch<NotificationPreferences[]>("/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify({ preferences }),
  });
}

export function findNotificationRecipients(search: string): Promise<NotificationRecipient[]> {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  const queryString = query.toString();
  return notificationApiFetch<NotificationRecipient[]>(
    `/notifications/recipients${queryString ? `?${queryString}` : ""}`,
  );
}

export function sendNotification(payload: {
  allApproved: boolean;
  recipientIds: number[];
  title: string;
  body: string;
  targetUrl: string | null;
}): Promise<{ id: number; recipientCount: number }> {
  return notificationApiFetch<{ id: number; recipientCount: number }>("/notifications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getNotificationEmailFailures(): Promise<NotificationEmailFailure[]> {
  return notificationApiFetch<NotificationEmailFailure[]>("/notifications/sent/email-failures");
}

export function retryNotificationEmail(outboxId: number): Promise<void> {
  return notificationApiFetch<void>(`/notifications/email-outbox/${outboxId}/retry`, { method: "POST" });
}
