import { z } from "zod";

export const sendNotificationSchema = z
  .object({
    allApproved: z.boolean(),
    recipientIds: z.array(z.number().int().positive()).max(1000),
    title: z
      .string()
      .trim()
      .min(1, "Informe o título.")
      .max(120, "Use até 120 caracteres."),
    body: z
      .string()
      .trim()
      .min(1, "Escreva a mensagem.")
      .max(5000, "Use até 5.000 caracteres."),
    targetUrl: z
      .string()
      .trim()
      .max(2048, "O link deve ter até 2.048 caracteres.")
      .refine((value) => {
        if (!value) return true;
        if (
          value.startsWith("//") ||
          value.includes("\\") ||
          /[\u0000-\u001f\u007f]/.test(value)
        )
          return false;
        try {
          const parsed = new URL(value, "https://portal.invalid");
          return (
            (parsed.protocol === "http:" || parsed.protocol === "https:") &&
            Boolean(parsed.hostname) &&
            !parsed.username &&
            !parsed.password &&
            (parsed.origin !== "https://portal.invalid" ||
              value.startsWith("/"))
          );
        } catch {
          return false;
        }
      }, "Informe uma URL http(s) válida ou um caminho do portal."),
  })
  .superRefine(({ allApproved, recipientIds }, context) => {
    if (!allApproved && recipientIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["recipientIds"],
        message: "Selecione ao menos uma conta.",
      });
    }
    if (new Set(recipientIds).size !== recipientIds.length) {
      context.addIssue({
        code: "custom",
        path: ["recipientIds"],
        message: "Remova contas duplicadas.",
      });
    }
  });

export type SendNotificationValues = z.infer<typeof sendNotificationSchema>;
