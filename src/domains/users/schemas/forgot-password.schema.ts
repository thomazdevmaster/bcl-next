import { z } from "zod";

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Informe seu usuário ou e-mail."),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
