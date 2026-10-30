export const NOTIFICATION_TYPES = [
  "signup_approval_pending",
  "signup_incomplete",
  "signup_completed",
  "password_changed",
  "admin_message",
  "blog_post_published",
  "agenda_event_published",
  "repertoire_song_created",
  "board_message",
  "rehearsal_reminder",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  signup_approval_pending: "Cadastro aguardando aprovação",
  signup_incomplete: "Cadastro incompleto",
  signup_completed: "Novo cadastro concluído",
  password_changed: "Senha alterada",
  admin_message: "Alertas enviados pela gestão",
  blog_post_published: "Publicações do blog",
  agenda_event_published: "Novidades da agenda",
  repertoire_song_created: "Música nova no repertório",
  board_message: "Mensagem da diretoria",
  rehearsal_reminder: "Lembrete de ensaio",
};

export type NotificationItem = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  targetUrl: string | null;
  payload: Record<string, unknown> | null;
  actorUserId: number | null;
  createdAt: string;
  readAt: string | null;
  archived: boolean;
};

export type NotificationPage = {
  items: NotificationItem[];
  nextCursor: number | null;
  hasMore: boolean;
};

export type NotificationCenterPage = {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type NotificationBulkAction = "read" | "unread" | "remove";

export type NotificationPreferences = {
  type: NotificationType;
  portalEnabled: boolean;
  emailEnabled: boolean;
};

export type NotificationRecipient = {
  id: number;
  username: string;
  name: string;
};

export type NotificationEmailFailure = {
  outboxId: number;
  notificationId: number;
  recipientId: number;
  recipientName: string;
  recipientEmail: string | null;
  attemptCount: number;
  lastError: string | null;
};

export type NotificationReadReceipt = {
  recipientId: number;
  recipientName: string;
  recipientUsername: string;
  readAt: string | null;
};
