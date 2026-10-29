import { describe, expect, it } from "vitest";

import { getCrudConfig } from "@/domains/crudConfig";
import { instrumentsCrudFormSchema } from "@/domains/instruments/schemas/crud-form.schema";
import { patrimonyCrudFormSchema } from "@/domains/patrimony/schemas/crud-form.schema";
import { peopleCrudFormSchema } from "@/domains/people/schemas/crud-form.schema";
import { presentationsCrudFormSchema } from "@/domains/presentations/schemas/crud-form.schema";
import { songsCrudFormSchema } from "@/domains/songs/schemas/crud-form.schema";

const validPeople = {
  resource: "people",
  firstName: "Ana",
  lastName: "Lima",
  birthDate: "1990-02-10",
  registeredAt: "",
  document__type: "",
  document__number: "",
  photoUrl: "",
  status: "active",
  phone: "(11) 99999-0000",
  email: "",
  address: "",
  guardianId: "",
  guardianRelationship: "",
  isStudent: false,
  isMusician: false,
  student__enrollmentDate: "",
  student__classGroup: "",
  student__level: "",
  musician__section: "",
  musician__experience: "",
  musician__defaultVoice: "",
  musician__ownInstrument: false,
  musician__joinedAt: "",
  musician__playedInstrumentId: "",
  createUser: false,
  username: "",
};

describe("domain CRUD form schemas", () => {
  it.each([
    ["pessoas", peopleCrudFormSchema, validPeople],
    [
      "músicas",
      songsCrudFormSchema,
      {
        resource: "songs",
        title: "Dobrado",
        composer: "Compositor",
        arranger: "",
        genre: "",
        key: "",
        durationSeconds: "90",
        scoreFile: "",
        scoreFileName: "",
        scoreMimeType: "",
        status: "active",
        visibility: "private",
        visibleToStudents: true,
        visibleToMusicians: false,
        videoUrl: "",
      },
    ],
    [
      "patrimônio",
      patrimonyCrudFormSchema,
      {
        resource: "patrimony",
        code: "BCL-001",
        name: "Estante",
        category: "equipment",
        acquisitionDate: "2026-01-10",
        acquisitionValue: "120.50",
        status: "available",
        location: "Sede",
        notes: "",
        assignedPersonId: "",
        instrument__instrumentId: "",
        instrument__serialNumber: "",
        instrument__manufacturer: "",
        instrument__model: "",
      },
    ],
    [
      "instrumentos",
      instrumentsCrudFormSchema,
      {
        resource: "instruments",
        name: "Saxofone alto",
        family: "brass",
        subclass: "",
        tuning: "Eb",
        signalType: "acoustic",
        tessitura: "",
        tags: "madeiras",
        status: "active",
      },
    ],
    [
      "apresentações",
      presentationsCrudFormSchema,
      {
        resource: "presentations",
        title: "Concerto",
        venue: "Praça",
        startsAt: "2026-11-20T19:00",
        endsAt: "2026-11-20T20:00",
        description: "",
        repertoireIds: "12, 13",
        coverUrl: "",
        isPublic: true,
        status: "scheduled",
        notifyAll: true,
      },
    ],
  ])("accepts valid data for %s", (_name, schema, values) => {
    expect(schema.safeParse(values).success).toBe(true);
  });

  it("reports missing student fields using the labels from the People form", () => {
    const result = peopleCrudFormSchema.safeParse({
      ...validPeople,
      isStudent: true,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues
        .filter((issue) => issue.path[0] === "student__enrollmentDate" || issue.path[0] === "student__level")
        .map((issue) => issue.message),
    ).toEqual(["Informe a data de matrícula.", "Selecione o nível do aluno."]);
  });

  it("uses the visible End label for invalid presentation end times", () => {
    const result = presentationsCrudFormSchema.safeParse({
      resource: "presentations",
      title: "Concerto",
      venue: "Praça",
      startsAt: "2026-11-20T20:00",
      endsAt: "2026-11-20T19:00",
      description: "",
      repertoireIds: "",
      coverUrl: "",
      isPublic: true,
      status: "scheduled",
      notifyAll: true,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.find((issue) => issue.path[0] === "endsAt")?.message,
    ).toBe("O fim deve ocorrer após o início.");
  });

  it("uses the visible End label for malformed presentation end times", () => {
    const result = presentationsCrudFormSchema.safeParse({
      resource: "presentations",
      title: "Concerto",
      venue: "Praça",
      startsAt: "2026-11-20T19:00",
      endsAt: "fim inválido",
      description: "",
      repertoireIds: "",
      coverUrl: "",
      isPublic: true,
      status: "scheduled",
      notifyAll: true,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.find((issue) => issue.path[0] === "endsAt")?.message,
    ).toBe("Informe uma data e hora de fim válidas.");
  });
});

describe("domain CRUD payloads", () => {
  it("converts a person document and omits inactive profiles", () => {
    const toPayload = getCrudConfig("people").toPayload;
    if (!toPayload) throw new Error("People payload converter is missing");

    const payload = toPayload({
      firstName: "Ana",
      lastName: "Lima",
      birthDate: "1990-02-10",
      "document.type": "cpf",
      "document.number": "529.982.247-25",
      status: "active",
      phone: "11999990000",
      isStudent: false,
      isMusician: false,
      createUser: false,
      guardianId: "",
    });

    expect(payload.document).toEqual({
      type: "cpf",
      number: "529.982.247-25",
    });
    expect(payload).not.toHaveProperty("student");
    expect(payload).not.toHaveProperty("musician");
    expect(payload).not.toHaveProperty("username");
  });

  it("keeps MusicXML in the scores payload and converts duration", () => {
    const toPayload = getCrudConfig("songs").toPayload;
    if (!toPayload) throw new Error("Songs payload converter is missing");

    const payload = toPayload({
      title: "Dobrado",
      composer: "Compositor",
      durationSeconds: "90",
      scoreFile: "data:application/xml;base64,PHhtbD4=",
      scoreFileName: "dobrado.musicxml",
      scoreMimeType: "application/xml",
    });

    expect(payload.durationSeconds).toBe(90);
    expect(payload.scores).toEqual([
      {
        fileName: "dobrado.musicxml",
        mimeType: "application/xml",
        url: "data:application/xml;base64,PHhtbD4=",
      },
    ]);
  });

  it("converts a patrimony acquisition value and drops instrument-only data", () => {
    const toPayload = getCrudConfig("patrimony").toPayload;
    if (!toPayload) throw new Error("Patrimony payload converter is missing");

    const payload = toPayload({
      code: "BCL-001",
      name: "Estante",
      category: "equipment",
      acquisitionValue: "120.50",
      assignedPersonId: "",
      "instrument.instrumentId": "77",
    });

    expect(payload.acquisitionValue).toBe(120.5);
    expect(payload).not.toHaveProperty("instrument");
  });

  it("splits instrument tags into the API collection", () => {
    const toPayload = getCrudConfig("instruments").toPayload;
    if (!toPayload) throw new Error("Instrument payload converter is missing");

    expect(toPayload({ tags: "madeiras, palheta" }).tags).toEqual([
      "madeiras",
      "palheta",
    ]);
  });

  it("converts presentation time and repertoire values for the API", () => {
    const toPayload = getCrudConfig("presentations").toPayload;
    if (!toPayload) throw new Error("Presentation payload converter is missing");

    const payload = toPayload({
      title: "Concerto",
      venue: "Praça",
      startsAt: "2026-11-20T19:00",
      endsAt: "2026-11-20T20:00",
      repertoireIds: "12, 13",
    });

    expect(Number.isNaN(new Date(String(payload.startsAt)).getTime())).toBe(false);
    expect(Number.isNaN(new Date(String(payload.endsAt)).getTime())).toBe(false);
    expect(payload.repertoireIds).toEqual(["12", "13"]);
  });
});
