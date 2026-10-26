import { z } from "zod";

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
    if (isStudent && !student.enrollmentDate) {
      context.addIssue({ code: "custom", path: ["student", "enrollmentDate"], message: "Campo obrigatório para este perfil." });
    } else if (isStudent && !validDateOrEmpty(student.enrollmentDate)) {
      context.addIssue({ code: "custom", path: ["student", "enrollmentDate"], message: "Informe uma data válida e não futura." });
    }
    if (isMusician && !musician.section) {
      context.addIssue({ code: "custom", path: ["musician", "section"], message: "Campo obrigatório para este perfil." });
    }
    if (isMusician && !musician.playedInstrumentId.trim()) {
      context.addIssue({
        code: "custom",
        path: ["musician", "playedInstrumentId"],
        message: "Informe o instrumento que o músico toca.",
      });
    }
    if (musician.joinedAt && !validDateOrEmpty(musician.joinedAt)) {
      context.addIssue({ code: "custom", path: ["musician", "joinedAt"], message: "Informe uma data válida e não futura." });
    }
  });

export type PersonProfilesFormValues = z.infer<typeof personProfilesSchema>;
