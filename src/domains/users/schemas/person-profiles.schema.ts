import { z } from "zod";

import {
  type ProfileFieldKey,
  getMissingProfileFields,
} from "@/domains/people/profileValidation";

const profileFieldPaths: Record<ProfileFieldKey, (string | number)[]> = {
  studentEnrollmentDate: ["student", "enrollmentDate"],
  studentLevel: ["student", "level"],
  musicianSection: ["musician", "section"],
  musicianExperience: ["musician", "experience"],
  musicianDefaultVoice: ["musician", "defaultVoice"],
  musicianPlayedInstrumentId: ["musician", "playedInstrumentId"],
};

const profileFieldMessages: Record<ProfileFieldKey, string> = {
  studentEnrollmentDate: "Campo obrigatório para este perfil.",
  studentLevel: "Selecione o nível do aluno.",
  musicianSection: "Campo obrigatório para este perfil.",
  musicianExperience: "Selecione o tempo de experiência.",
  musicianDefaultVoice: "Selecione a voz padrão.",
  musicianPlayedInstrumentId: "Informe o instrumento que o músico toca.",
};

const validDateOrEmpty = (value: string) => {
  if (!value) return true;
  const parsed = z.iso.date().safeParse(value);
  return parsed.success && new Date(`${value}T00:00:00`) <= new Date();
};

export const personProfilesSchema = z
  .object({
    isStudent: z.boolean(),
    isMusician: z.boolean(),
    student: z.object({
      enrollmentDate: z.string(),
      classGroup: z.string(),
      level: z.string(),
    }),
    musician: z.object({
      section: z.string(),
      experience: z.string(),
      defaultVoice: z.string(),
      ownInstrument: z.boolean(),
      joinedAt: z.string(),
      playedInstrumentId: z.string(),
    }),
  })
  .superRefine(({ isStudent, isMusician, student, musician }, context) => {
    const missingProfileFields = getMissingProfileFields({
      isStudent,
      isMusician,
      student,
      musician,
    });
    for (const field of missingProfileFields) {
      context.addIssue({
        code: "custom",
        path: profileFieldPaths[field],
        message: profileFieldMessages[field],
      });
    }
    if (
      isStudent &&
      student.enrollmentDate &&
      !validDateOrEmpty(student.enrollmentDate)
    ) {
      context.addIssue({
        code: "custom",
        path: ["student", "enrollmentDate"],
        message: "Informe uma data válida e não futura.",
      });
    }
    if (musician.joinedAt && !validDateOrEmpty(musician.joinedAt)) {
      context.addIssue({
        code: "custom",
        path: ["musician", "joinedAt"],
        message: "Informe uma data válida e não futura.",
      });
    }
  });

export type PersonProfilesFormValues = z.infer<typeof personProfilesSchema>;
