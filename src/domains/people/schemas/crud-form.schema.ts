import { z } from "zod";

import { hasValidPhoneNumber } from "@/domains/people/formatting";
import {
  type ProfileFieldKey,
  getMissingProfileFields,
} from "@/domains/people/profileValidation";
import { isPersonUnderage, isValidCpf } from "@/domains/people/types";
import { isValidUsername } from "@/domains/users/username";

const profileFieldPaths: Record<ProfileFieldKey, (string | number)[]> = {
  studentEnrollmentDate: ["student__enrollmentDate"],
  studentLevel: ["student__level"],
  musicianSection: ["musician__section"],
  musicianExperience: ["musician__experience"],
  musicianDefaultVoice: ["musician__defaultVoice"],
  musicianPlayedInstrumentId: ["musician__playedInstrumentId"],
};

const profileFieldMessages: Record<ProfileFieldKey, string> = {
  studentEnrollmentDate: "Informe a data de matrícula.",
  studentLevel: "Selecione o nível do aluno.",
  musicianSection: "Selecione o naipe.",
  musicianExperience: "Selecione o tempo de experiência.",
  musicianDefaultVoice: "Selecione a voz padrão.",
  musicianPlayedInstrumentId: "Selecione o instrumento que toca.",
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const validPastOrTodayDate = (value: string) => {
  if (!value) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && value <= todayIsoDate();
};

export const peopleCrudFormSchema = z
  .object({
    resource: z.literal("people"),
    id: z.union([z.string(), z.number()]).optional(),
    userId: z.union([z.string(), z.number()]).nullable().optional(),
    firstName: z.string().trim().min(1, "Informe o nome."),
    lastName: z.string().trim().min(1, "Informe o sobrenome."),
    birthDate: z
      .string()
      .refine(
        validPastOrTodayDate,
        "Informe uma data de nascimento válida e não futura.",
      ),
    registeredAt: z
      .string()
      .refine(
        (value) => !value || validPastOrTodayDate(value),
        "A data de cadastro não pode estar no futuro.",
      ),
    document__type: z.enum(["", "cpf", "rg"]),
    document__number: z.string(),
    photoUrl: z.string(),
    status: z.enum(["", "active", "inactive"]),
    phone: z
      .string()
      .refine(hasValidPhoneNumber, "Informe um telefone com DDD."),
    email: z
      .string()
      .trim()
      .refine(
        (value) => !value || z.email().safeParse(value).success,
        "Informe um e-mail válido.",
      ),
    address: z.string(),
    guardianId: z.string(),
    guardianRelationship: z.enum([
      "",
      "pai",
      "mae",
      "irmao",
      "avo",
      "tutor_legal",
      "outro",
    ]),
    isStudent: z.boolean(),
    isMusician: z.boolean(),
    student__enrollmentDate: z.string(),
    student__classGroup: z.string(),
    student__level: z.enum(["", "1", "2", "3", "4", "5"]),
    musician__section: z.string(),
    musician__experience: z.enum([
      "",
      "less_than_1",
      "from_1_to_3",
      "from_3_to_5",
      "more_than_5",
    ]),
    musician__defaultVoice: z.enum(["", "1", "2", "3", "4"]),
    musician__ownInstrument: z.boolean(),
    musician__joinedAt: z.string(),
    musician__playedInstrumentId: z.string(),
    createUser: z.boolean(),
    username: z.string().trim(),
  })
  .superRefine((values, context) => {
    const minor = isPersonUnderage(values.birthDate);
    const missingProfileFields = getMissingProfileFields({
      isStudent: values.isStudent,
      isMusician: values.isMusician,
      student: {
        enrollmentDate: values.student__enrollmentDate,
        level: values.student__level,
      },
      musician: {
        section: values.musician__section,
        experience: values.musician__experience,
        defaultVoice: values.musician__defaultVoice,
        playedInstrumentId: values.musician__playedInstrumentId,
      },
    });
    for (const field of missingProfileFields) {
      context.addIssue({
        code: "custom",
        path: profileFieldPaths[field],
        message: profileFieldMessages[field],
      });
    }
    if (!values.status) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Selecione o status.",
      });
    }
    if (values.document__type && !values.document__number.trim()) {
      context.addIssue({
        code: "custom",
        path: ["document__number"],
        message: "Informe o número do documento.",
      });
    } else if (
      values.document__type === "cpf" &&
      !isValidCpf(values.document__number)
    ) {
      context.addIssue({
        code: "custom",
        path: ["document__number"],
        message: "Informe um CPF válido.",
      });
    } else if (values.document__type === "rg") {
      const digits = values.document__number.replace(/[^A-Za-z0-9]/g, "");
      if (digits.length < 5 || digits.length > 14) {
        context.addIssue({
          code: "custom",
          path: ["document__number"],
          message: "Informe um RG válido.",
        });
      }
    }
    if (minor && !values.guardianId) {
      context.addIssue({
        code: "custom",
        path: ["guardianId"],
        message: "Menor de idade precisa de uma pessoa responsável.",
      });
    }
    if (values.guardianId && !values.guardianRelationship) {
      context.addIssue({
        code: "custom",
        path: ["guardianRelationship"],
        message: "Informe o parentesco do responsável.",
      });
    }
    if (
      values.isStudent &&
      values.student__enrollmentDate &&
      !validPastOrTodayDate(values.student__enrollmentDate)
    ) {
      context.addIssue({
        code: "custom",
        path: ["student__enrollmentDate"],
        message: "Informe uma data de matrícula válida.",
      });
    }
    if (
      values.createUser &&
      values.username &&
      !isValidUsername(values.username)
    ) {
      context.addIssue({
        code: "custom",
        path: ["username"],
        message:
          "Use de 3 a 60 caracteres: letras minúsculas, números, ponto, hífen ou _.",
      });
    }
  });

export type PeopleCrudFormValues = z.infer<typeof peopleCrudFormSchema>;
