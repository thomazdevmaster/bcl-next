import { z } from "zod";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual ou inicial."),
    newPassword: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .superRefine(({ newPassword, confirmPassword }, context) => {
    if (newPassword !== confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "A confirmação não confere com a nova senha.",
      });
    }
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
