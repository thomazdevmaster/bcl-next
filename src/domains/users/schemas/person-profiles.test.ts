import { describe, expect, it } from "vitest";

import { personProfilesSchema } from "./person-profiles.schema";

describe("personProfilesSchema field messages", () => {
  it("names each required profile field in its validation message", () => {
    const result = personProfilesSchema.safeParse({
      isStudent: true,
      isMusician: true,
      student: { enrollmentDate: "", classGroup: "", level: "" },
      musician: {
        section: "",
        experience: "",
        defaultVoice: "",
        ownInstrument: false,
        joinedAt: "",
        playedInstrumentId: "",
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const messages = Object.fromEntries(
      result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
    );
    expect(messages).toMatchObject({
      "student.enrollmentDate": "Informe a data de matrícula.",
      "student.level": "Selecione o nível do aluno.",
      "musician.section": "Selecione o naipe.",
      "musician.experience": "Selecione o tempo de experiência.",
      "musician.defaultVoice": "Selecione a voz padrão.",
      "musician.playedInstrumentId": "Selecione o instrumento que toca.",
    });
  });
});
