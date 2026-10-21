import { z } from "zod";
import { isValidCpf } from "@/domains/people/types";

const dateIsNotFuture = (value: string) => {
  if (!value) return true;
  const parsed = z.iso.date().safeParse(value);
  return parsed.success && new Date(`${value}T00:00:00`) <= new Date();
};

export const personDetailsSchema = z
  .object({
    firstName: z.string().trim().min(1, "Informe o nome."),
    lastName: z.string().trim().min(1, "Informe o sobrenome."),
    birthDate: z
      .string()
      .min(1, "Informe a data de nascimento.")
      .refine(dateIsNotFuture, "Informe uma data de nascimento válida e não futura."),
    registeredAt: z.string().refine(dateIsNotFuture, "A data de cadastro não pode estar no futuro."),
    documentType: z.enum(["", "none", "cpf", "rg"]),
    documentNumber: z.string(),
    photoSource: z.enum(["", "upload", "external"]),
    photoUrl: z.string().trim(),
    status: z.enum(["", "active", "inactive"]),
    postalCode: z.string().refine(
      (value) => value === "" || /^\d{5}-\d{3}$/.test(value),
      "Informe um CEP no formato 00000-000.",
    ),
    street: z.string(),
    addressNumber: z.string(),
    complement: z.string(),
    unit: z.string(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.enum([
      "", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
      "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
    ]),
    phone: z.string().refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 11;
    }, "Informe um telefone com DDD."),
    email: z.string().trim().refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Informe um e-mail válido.",
    ),
    address: z.string(),
  })
  .superRefine(({ documentType, documentNumber, photoSource, photoUrl, status }, context) => {
    if (!status) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Selecione um status.",
      });
    }
    if (photoSource === "external" && !z.url().safeParse(photoUrl).success) {
      context.addIssue({
        code: "custom",
        path: ["photoUrl"],
        message: photoUrl ? "Informe uma URL externa válida para a foto." : "Informe a URL externa da foto.",
      });
    }
    if (photoSource === "upload") {
      const uploadedFileUrl = /^\/uploads\/[^/]+$/.test(photoUrl);
      if (!photoUrl || (!uploadedFileUrl && !z.url().safeParse(photoUrl).success)) {
        context.addIssue({
          code: "custom",
          path: ["photoUrl"],
          message: "Envie uma foto do computador.",
        });
      }
    }
    const number = documentNumber.trim();
    if (documentType === "none") {
      if (number) {
        context.addIssue({
          code: "custom",
          path: ["documentNumber"],
          message: "Remova o número ou selecione CPF/RG.",
        });
      }
      return;
    }
    if (!documentType) {
      if (number) {
        context.addIssue({
          code: "custom",
          path: ["documentType"],
          message: "Selecione o tipo do documento.",
        });
      }
      return;
    }
    if (!number) {
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: "Informe o número do documento.",
      });
      return;
    }
    const valid = documentType === "cpf"
      ? isValidCpf(number)
      : (() => {
          const rg = number.replace(/[^A-Za-z0-9]/g, "");
          return rg.length >= 5 && rg.length <= 14;
        })();
    if (!valid) {
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: documentType === "cpf" ? "Informe um CPF válido." : "Informe um RG válido.",
      });
    }
  });

export type PersonDetailsFormValues = z.infer<typeof personDetailsSchema>;
