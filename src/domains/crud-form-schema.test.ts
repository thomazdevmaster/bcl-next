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
  it("preserves the presentation desktop column order", () => {
    const columns = getCrudConfig("presentations").columns;

    expect(columns.slice(0, 3)).toEqual([
      { path: "eventType.name", label: "Tipo" },
      { path: "title", label: "Título" },
      { path: "venue", label: "Local" },
    ]);
    expect(columns[3]).toEqual({
      path: "startsAt",
      label: "Data",
      format: "datetime",
    });
  });

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
        eventTypeId: "1",
        title: "Concerto",
        venue: "Praça",
        startsAt: "2026-11-20T19:00",
        endsAt: "2026-11-20T20:00",
        description: "",
        repertoireIds: ["12", "13"],
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
        .filter(
          (issue) =>
            issue.path[0] === "student__enrollmentDate" ||
            issue.path[0] === "student__level",
        )
        .map((issue) => issue.message),
    ).toEqual(["Informe a data de matrícula.", "Selecione o nível do aluno."]);
  });

  it("uses the visible End label for invalid presentation end times", () => {
    const result = presentationsCrudFormSchema.safeParse({
      resource: "presentations",
      eventTypeId: "1",
      title: "Concerto",
      venue: "Praça",
      startsAt: "2026-11-20T20:00",
      endsAt: "2026-11-20T19:00",
      description: "",
      repertoireIds: [],
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
      eventTypeId: "1",
      title: "Concerto",
      venue: "Praça",
      startsAt: "2026-11-20T19:00",
      endsAt: "fim inválido",
      description: "",
      repertoireIds: [],
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

  it("presentationRequiresEventType", () => {
    const values = {
      resource: "presentations",
      title: "Concerto",
      venue: "Praça",
      startsAt: "2026-11-20T19:00",
      endsAt: "",
      description: "",
      repertoireIds: [],
      coverUrl: "",
      isPublic: true,
      status: "scheduled",
      notifyAll: true,
      eventTypeId: "",
    };
    const result = presentationsCrudFormSchema.safeParse(values);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.some((issue) => issue.path[0] === "eventTypeId"),
    ).toBe(true);
  });

  it("keepsLegacyPresentationEditableWithoutEventType", () => {
    const result = presentationsCrudFormSchema.safeParse({
      resource: "presentations",
      id: 12,
      eventTypeId: "",
      title: "Ensaio legado",
      venue: "Sede",
      startsAt: "2026-11-20T19:00",
      endsAt: "",
      description: "",
      repertoireIds: [],
      coverUrl: "",
      isPublic: false,
      status: "scheduled",
      notifyAll: true,
    });

    expect(result.success).toBe(true);
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

  it("preserves selected presentation song IDs in the API payload", () => {
    const config = getCrudConfig("presentations");
    if (!config.toPayload)
      throw new Error("Presentation payload converter is missing");

    const payload = config.toPayload({
      title: "Concerto",
      venue: "Praça",
      startsAt: "2026-11-20T19:00",
      endsAt: "2026-11-20T20:00",
      repertoireIds: ["12", "13"],
    });

    expect(Number.isNaN(new Date(String(payload.startsAt)).getTime())).toBe(
      false,
    );
    expect(Number.isNaN(new Date(String(payload.endsAt)).getTime())).toBe(
      false,
    );
    expect(payload.startsAt).toBe("2026-11-20T22:00:00.000Z");
    expect(payload.endsAt).toBe("2026-11-20T23:00:00.000Z");
    expect(payload.repertoireIds).toEqual(["12", "13"]);
  });

  it("converts presentation instants to Brasília wall time for editing", () => {
    const toForm = getCrudConfig("presentations").toForm;
    if (!toForm) throw new Error("Presentation form converter is missing");

    const values = toForm({
      startsAt: "2026-11-20T22:00:00.000Z",
      endsAt: "2026-11-20T23:00:00.000Z",
    });

    expect(values.startsAt).toBe("2026-11-20T19:00");
    expect(values.endsAt).toBe("2026-11-20T20:00");
  });

  it("converts presentation repertoire IDs to form values", () => {
    const toForm = getCrudConfig("presentations").toForm;
    if (!toForm) throw new Error("Presentation form converter is missing");

    expect(toForm({ repertoireIds: [12, "13"] }).repertoireIds).toEqual([
      "12",
      "13",
    ]);
  });

  it("omitsAnUnchangedRemovedEventTypeInsteadOfClearingItsSnapshot", () => {
    const toPayload = getCrudConfig("presentations").toPayload;
    if (!toPayload)
      throw new Error("Presentation payload converter is missing");

    const payload = toPayload(
      {
        eventTypeId: "__snapshot__",
        title: "Ensaio aberto",
      },
      {
        eventType: { id: null, name: "Tipo antigo", icon: "event" },
      },
    );

    expect(payload).not.toHaveProperty("eventTypeId");
  });

  it("turns the API song duration into text before the edit form renders", () => {
    const toForm = getCrudConfig("songs").toForm;
    if (!toForm) throw new Error("Song form converter is missing");

    const values = toForm({
      title: "Linda Demais",
      composer: "Kiko",
      arranger: null,
      genre: null,
      key: null,
      durationSeconds: 228,
      videoUrl: null,
      visibility: "private",
    });

    expect(values.durationSeconds).toBe("228");
    expect(values.arranger).toBe("");
    expect(values.genre).toBe("");
    expect(values.key).toBe("");
    expect(values.videoUrl).toBe("");
    expect(songsCrudFormSchema.safeParse({
      resource: "songs",
      ...values,
      scoreFile: "",
      scoreFileName: "",
      scoreMimeType: "",
      status: "active",
      visibleToStudents: true,
      visibleToMusicians: false,
    }).success).toBe(true);
  });

  it("asks for an audience when the song notification is enabled", () => {
    const parsed = songsCrudFormSchema.safeParse({
      resource: "songs",
      title: "Dobrado",
      composer: "Compositor",
      arranger: "",
      genre: "",
      key: "",
      durationSeconds: "",
      scoreFile: "",
      scoreFileName: "",
      scoreMimeType: "",
      status: "active",
      visibility: "public",
      visibleToStudents: false,
      visibleToMusicians: false,
      videoUrl: "",
      notifySong: true,
      notifyRoles: [],
      notifyRecipientIds: [],
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((issue) => issue.path[0] === "notifyRoles")).toBe(
      true,
    );
  });

  it("sends the selected song audience only when notification is enabled", () => {
    const payload = getCrudConfig("songs").toPayload?.(
      {
        title: "Dobrado",
        notifySong: true,
        notifyRoles: ["musico", "aluno"],
        notifyRecipientIds: ["15", ""],
      },
      undefined,
    );

    expect(payload).toMatchObject({
      notifySong: true,
      notifyRoles: ["musico", "aluno"],
      notifyRecipientIds: ["15"],
    });

    const silent = getCrudConfig("songs").toPayload?.(
      {
        title: "Dobrado",
        notifySong: false,
        notifyRoles: ["musico"],
        notifyRecipientIds: ["15"],
      },
      undefined,
    );
    expect(silent).toMatchObject({
      notifySong: false,
      notifyRoles: [],
      notifyRecipientIds: [],
    });
  });
});
