import { z } from "zod";

import { isValidUsername } from "@/domains/users/username";

export const accessSchema = z
  .object({
    username: z.string().trim().toLowerCase(),
    password: z.string(),
    confirmPassword: z.string(),
    isActive: z.boolean(),
  })
  .superRefine(({ username, password, confirmPassword }, context) => {
    if (username && !isValidUsername(username)) {
      context.addIssue({
        code: "custom",
        path: ["username"],
        message:
          "Use de 3 a 60 caracteres: letras minúsculas, números, ponto, hífen ou _.",
      });
    }
    if (password && password.length < 8) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "A senha precisa ter pelo menos 8 caracteres.",
      });
    }
    if (password && !confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Confirme a senha inicial.",
      });
    } else if (confirmPassword && !password) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Informe uma senha inicial para confirmar.",
      });
    } else if (password !== confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "A confirmação não confere com a senha.",
      });
    }
  });

export type AccessFormValues = z.infer<typeof accessSchema>;
