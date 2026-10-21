import { z } from "zod";

const guardianPhoneIsValid = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
};

const dateIsValidAndNotFuture = (value: string) => {
  const parsed = z.iso.date().safeParse(value);
  return parsed.success && new Date(`${value}T00:00:00`) <= new Date();
};

export const guardianSchema = z
  .object({
    guardianId: z.string(),
    guardianRelationship: z.string(),
    guardian: z.object({
      firstName: z.string().trim(),
      lastName: z.string().trim(),
      birthDate: z.string(),
      phone: z.string(),
      email: z.string().trim(),
      username: z.string().trim().toLowerCase(),
    }),
  })
  .superRefine(({ guardianId, guardianRelationship, guardian }, context) => {
    if (!guardianId) {
      context.addIssue({
        code: "custom",
        path: ["guardianId"],
        message: "Selecione um responsável.",
      });
      return;
    }
    if (!guardianRelationship) {
      context.addIssue({
        code: "custom",
        path: ["guardianRelationship"],
        message: "Selecione o parentesco.",
      });
    }
    if (guardianId !== "__new_guardian__") return;

    if (!guardian.firstName) {
      context.addIssue({ code: "custom", path: ["guardian", "firstName"], message: "Informe o nome." });
    }
    if (!guardian.lastName) {
      context.addIssue({ code: "custom", path: ["guardian", "lastName"], message: "Informe o sobrenome." });
    }
    if (!guardian.birthDate) {
      context.addIssue({ code: "custom", path: ["guardian", "birthDate"], message: "Informe a data de nascimento." });
    } else if (!dateIsValidAndNotFuture(guardian.birthDate)) {
      context.addIssue({ code: "custom", path: ["guardian", "birthDate"], message: "Informe uma data válida e não futura." });
    }
    if (!guardian.phone) {
      context.addIssue({ code: "custom", path: ["guardian", "phone"], message: "Informe o telefone." });
    } else if (!guardianPhoneIsValid(guardian.phone)) {
      context.addIssue({ code: "custom", path: ["guardian", "phone"], message: "Informe um telefone com DDD." });
    }
    if (guardian.email && !z.email().safeParse(guardian.email).success) {
      context.addIssue({ code: "custom", path: ["guardian", "email"], message: "Informe um e-mail válido." });
    }
    if (guardian.username && !/^[a-z0-9][a-z0-9._-]{2,59}$/.test(guardian.username)) {
      context.addIssue({
        code: "custom",
        path: ["guardian", "username"],
        message: "Use de 3 a 60 caracteres: letras minúsculas, números, ponto, hífen ou _.",
      });
    }
  });

export type GuardianFormValues = z.infer<typeof guardianSchema>;
