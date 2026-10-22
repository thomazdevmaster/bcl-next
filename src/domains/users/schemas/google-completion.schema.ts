import { z } from "zod";

export const googleCompletionSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9._-]{2,59}$/,
      "Use de 3 a 60 caracteres: letras minúsculas, números, ponto, hífen ou _.",
    ),
  phone: z.string().refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 11;
  }, "Informe um telefone com DDD."),
});

export type GoogleCompletionFormValues = z.infer<typeof googleCompletionSchema>;
