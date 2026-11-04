import { z } from "zod";

export const eventTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do tipo de evento.")
    .max(80, "O nome deve ter no máximo 80 caracteres."),
  icon: z.string().trim().max(80).optional(),
  isPublicByDefault: z.boolean(),
  isActive: z.boolean(),
});

export type EventTypeFormValues = z.infer<typeof eventTypeSchema>;
