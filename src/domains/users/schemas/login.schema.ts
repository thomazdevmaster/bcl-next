import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Informe seu usuário ou e-mail."),
  password: z.string().min(1, "Informe sua senha."),
  keepLoggedIn: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
