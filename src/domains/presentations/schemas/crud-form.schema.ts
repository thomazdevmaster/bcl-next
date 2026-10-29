import { z } from "zod";

const validDateTime = (value: string) =>
  !Number.isNaN(new Date(value).getTime());

export const presentationsCrudFormSchema = z
  .object({
    resource: z.literal("presentations"),
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string().trim().min(1, "Informe o título."),
    venue: z.string().trim().min(1, "Informe o local."),
    startsAt: z
      .string()
      .refine(
        (value) => Boolean(value) && validDateTime(value),
        "Informe uma data e hora de início válidas.",
      ),
    endsAt: z
      .string()
      .refine(
        (value) => !value || validDateTime(value),
        "Informe uma data e hora de fim válidas.",
      ),
    description: z.string(),
    repertoireIds: z.string(),
    coverUrl: z.string(),
    isPublic: z.boolean(),
    status: z.enum(["", "draft", "scheduled", "done", "cancelled"]),
    notifyAll: z.boolean(),
  })
  .superRefine((values, context) => {
    if (!values.status) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Selecione o status da apresentação.",
      });
    }
    if (
      values.endsAt &&
      validDateTime(values.endsAt) &&
      validDateTime(values.startsAt) &&
      values.endsAt < values.startsAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "O fim deve ocorrer após o início.",
      });
    }
  });

export type PresentationsCrudFormValues = z.infer<
  typeof presentationsCrudFormSchema
>;
