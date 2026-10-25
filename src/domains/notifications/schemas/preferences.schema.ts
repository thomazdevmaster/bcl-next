import { z } from "zod";
import { NOTIFICATION_TYPES } from "../types";

const preferenceSchema = z.object({ portalEnabled: z.boolean(), emailEnabled: z.boolean() });

export const notificationPreferencesSchema = z.object(
  Object.fromEntries(NOTIFICATION_TYPES.map((type) => [type, preferenceSchema])) as Record<
    (typeof NOTIFICATION_TYPES)[number],
    typeof preferenceSchema
  >,
);

export type NotificationPreferenceValues = z.infer<typeof notificationPreferencesSchema>;
