import { apiFetch } from "@/lib/api";

import type {
  NotificationBulkAction,
  NotificationCenterPage,
  NotificationEmailFailure,
  NotificationPage,
  NotificationPreferences,
  NotificationReadReceipt,
  NotificationRecipient,
} from "./types";

const UNREAD_COUNT_CHANGED_EVENT = "bcl:notifications:count-changed";

export function notifyUnreadCountChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNREAD_COUNT_CHANGED_EVENT));
  }
}

export { UNREAD_COUNT_CHANGED_EVENT };

async function notificationApiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, options);
}

export function getUnreadNotificationCount(): Promise<{ count: number }> {
  return notificationApiFetch<{ count: number }>("/notifications/unread-count");
}

export function getNotifications(
  cursor?: number | null,
): Promise<NotificationPage> {
  const query = new URLSearchParams({ limit: "10" });
  if (cursor) query.set("cursor", String(cursor));
  return notificationApiFetch<NotificationPage>(
    `/notifications?${query.toString()}`,
  );
}

export function getNotificationCenter(options: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<NotificationCenterPage> {
  const query = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
  });
  if (options.search) query.set("search", options.search);
  return notificationApiFetch<NotificationCenterPage>(
    `/notifications/center?${query.toString()}`,
  );
}

export function bulkUpdateNotifications(
  ids: number[],
  action: NotificationBulkAction,
): Promise<void> {
  return notificationApiFetch<void>("/notifications/batch", {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });
}

export function markNotificationRead(id: number): Promise<void> {
  return notificationApiFetch<void>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markNotificationUnread(id: number): Promise<void> {
  return notificationApiFetch<void>(`/notifications/${id}/read`, {
    method: "DELETE",
  });
}

export function archiveNotification(id: number): Promise<void> {
  return notificationApiFetch<void>(`/notifications/${id}/archive`, {
    method: "PUT",
  });
}

export function restoreNotification(id: number): Promise<void> {
  return notificationApiFetch<void>(`/notifications/${id}/archive`, {
    method: "DELETE",
  });
}

export function getNotificationReadReceipts(
  id: number,
): Promise<NotificationReadReceipt[]> {
  return notificationApiFetch<NotificationReadReceipt[]>(
    `/notifications/${id}/read-receipts`,
  );
}

export function getNotificationPreferences(): Promise<
  NotificationPreferences[]
> {
  return notificationApiFetch<NotificationPreferences[]>(
    "/notifications/preferences",
  );
}

export function saveNotificationPreferences(
  preferences: NotificationPreferences[],
): Promise<NotificationPreferences[]> {
  return notificationApiFetch<NotificationPreferences[]>(
    "/notifications/preferences",
    {
      method: "PUT",
      body: JSON.stringify({ preferences }),
    },
  );
}

export function findNotificationRecipients(
  search: string,
): Promise<NotificationRecipient[]> {
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
  return notificationApiFetch<{ id: number; recipientCount: number }>(
    "/notifications",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getNotificationEmailFailures(): Promise<
  NotificationEmailFailure[]
> {
  return notificationApiFetch<NotificationEmailFailure[]>(
    "/notifications/sent/email-failures",
  );
}

export function retryNotificationEmail(outboxId: number): Promise<void> {
  return notificationApiFetch<void>(
    `/notifications/email-outbox/${outboxId}/retry`,
    { method: "POST" },
  );
}
