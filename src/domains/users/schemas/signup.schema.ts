import { z } from "zod";

import { hasValidPhoneNumber } from "../../people/formatting";
import { isPersonUnderage } from "../../people/types";
import { isValidUsername } from "../username";

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "Informe seu nome."),
    lastName: z.string().trim().min(1, "Informe seu sobrenome."),
    email: z.string().trim().email("Informe um e-mail válido."),
    phone: z
      .string()
      .refine(hasValidPhoneNumber, "Informe um telefone com DDD."),
    birthDate: z.iso
      .date({ error: "Informe uma data de nascimento válida." })
      .refine(
        (value) => value <= todayIsoDate(),
        "A data de nascimento não pode ser futura.",
      )
      .refine(
        (value) => value > todayIsoDate() || !isPersonUnderage(value),
        "Menores de idade são cadastrados pela banda junto com o responsável. Procure a secretaria.",
      ),
    username: z
      .string()
      .trim()
      .refine(
        (value) => value.length === 0 || isValidUsername(value),
        "Use de 3 a 60 caracteres: letras minúsculas, números, ponto, hífen ou _.",
      ),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .superRefine(({ password, confirmPassword }, context) => {
    if (password !== confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "A confirmação não confere com a senha.",
      });
    }
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
