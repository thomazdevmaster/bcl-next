import { z } from "zod";
import { composeAddress } from "@/domains/people/composeAddress";
import { isValidCpf } from "@/domains/people/types";

const dateIsNotFuture = (value: string) => {
  if (!value) return false;
  const parsed = z.iso.date().safeParse(value);
  return parsed.success && new Date(`${value}T00:00:00`) <= new Date();
};

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const googleCompletionSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9][a-z0-9._-]{2,59}$/,
        "Use de 3 a 60 caracteres: letras minúsculas, números, ponto, hífen ou _.",
      ),
    birthDate: z
      .string()
      .min(1, "Informe a data de nascimento.")
      .refine(dateIsNotFuture, "Informe uma data de nascimento válida e não futura."),
    phone: z.string().refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 11;
    }, "Informe um telefone com DDD."),
    documentType: z.enum(["none", "cpf", "rg"]),
    documentNumber: z.string(),
    postalCode: z.string().refine(
      (value) => /^\d{5}-\d{3}$/.test(value.trim()),
      "Informe um CEP no formato 00000-000.",
    ),
    street: z.string().trim().min(1, "Informe o logradouro."),
    addressNumber: z.string().trim().min(1, "Informe o número ou S/N."),
    complement: z.string(),
    unit: z.string(),
    neighborhood: z.string().trim().min(1, "Informe o bairro."),
    city: z.string().trim().min(1, "Informe a cidade."),
    state: z.enum(brazilianStates, { error: "Selecione a UF." }),
  })
  .superRefine(({ birthDate, documentType, documentNumber }, context) => {
    const parsed = z.iso.date().safeParse(birthDate);
    if (parsed.success) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const birth = new Date(`${birthDate}T00:00:00`);
      const adultAt = new Date(birth);
      adultAt.setFullYear(adultAt.getFullYear() + 18);
      if (adultAt > today) {
        context.addIssue({
          code: "custom",
          path: ["birthDate"],
          message:
            "Menores de idade são cadastrados pela banda junto com o responsável.",
        });
      }
    }
    if (documentType === "none") return;
    const number = documentNumber.trim();
    if (!number) return;
    const valid =
      documentType === "cpf"
        ? isValidCpf(number)
        : (() => {
            const rg = number.replace(/[^A-Za-z0-9]/g, "");
            return rg.length >= 5 && rg.length <= 14;
          })();
    if (!valid) {
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message:
          documentType === "cpf"
            ? "Informe um CPF válido."
            : "Informe um RG válido.",
      });
    }
  });

export type GoogleCompletionFormValues = z.infer<typeof googleCompletionSchema>;

export function googleCompletionPayload(values: GoogleCompletionFormValues) {
  const payload: Record<string, unknown> = {
    username: values.username.trim().toLowerCase(),
    birthDate: values.birthDate,
    phone: values.phone,
    address: composeAddress(values),
  };
  const number = values.documentNumber.trim();
  if (values.documentType !== "none" && number) {
    payload.document = {
      type: values.documentType,
      number,
    };
  }
  return payload;
}

export const GOOGLE_COMPLETION_DEFAULTS: GoogleCompletionFormValues = {
  username: "",
  birthDate: "",
  phone: "",
  documentType: "none",
  documentNumber: "",
  postalCode: "",
  street: "",
  addressNumber: "",
  complement: "",
  unit: "",
  neighborhood: "",
  city: "",
  state: "MG",
};
