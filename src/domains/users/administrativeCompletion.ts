import { isValidCpf } from "@/domains/people/types";

export type AdministrativeCompletionStatus =
  "complete" | "incomplete" | "unverified";

type PersonRecord = Record<string, unknown>;

function hasOwn(record: PersonRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isRecord(value: unknown): value is PersonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date <= new Date()
  );
}

function isValidPhone(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

function documentStatus(value: unknown): AdministrativeCompletionStatus {
  if (value === null) return "complete";
  if (!isRecord(value)) return "unverified";
  if (!hasOwn(value, "type") || !hasOwn(value, "number")) return "unverified";
  const type = value.type;
  const number = typeof value.number === "string" ? value.number.trim() : "";
  if ((type !== "cpf" && type !== "rg") || !number) return "incomplete";
  if (type === "cpf") return isValidCpf(number) ? "complete" : "incomplete";
  const rg = number.replace(/[^A-Za-z0-9]/g, "");
  return rg.length >= 5 && rg.length <= 14 ? "complete" : "incomplete";
}

export function evaluateAdministrativeCompletion(
  value: unknown,
): AdministrativeCompletionStatus {
  if (!isRecord(value)) return "unverified";
  const requiredKeys = [
    "firstName",
    "lastName",
    "birthDate",
    "status",
    "phone",
    "document",
    "isStudent",
    "isMusician",
  ];
  if (requiredKeys.some((key) => !hasOwn(value, key))) return "unverified";
  if (
    typeof value.isStudent !== "boolean" ||
    typeof value.isMusician !== "boolean"
  )
    return "unverified";

  const documentResult = documentStatus(value.document);
  if (documentResult === "unverified") return documentResult;
  if (
    !hasValue(value.firstName) ||
    !hasValue(value.lastName) ||
    !isValidDate(value.birthDate) ||
    (value.status !== "active" && value.status !== "inactive") ||
    !isValidPhone(value.phone) ||
    documentResult === "incomplete"
  ) {
    return "incomplete";
  }

  if (value.isStudent) {
    if (!hasOwn(value, "student")) return "unverified";
    if (!isRecord(value.student)) return "incomplete";
    if (!hasOwn(value.student, "enrollmentDate")) return "unverified";
    if (!isValidDate(value.student.enrollmentDate)) return "incomplete";
  }

  if (value.isMusician) {
    if (!hasOwn(value, "musician")) return "unverified";
    if (!isRecord(value.musician)) return "incomplete";
    if (!hasOwn(value.musician, "section")) return "unverified";
    if (!hasValue(value.musician.section)) return "incomplete";
  }

  return "complete";
}

/** Associa usuários e pessoas; conta sem vínculo válido é uma pendência. */
export function getAdministrativeCompletionStatuses(
  users: Record<string, unknown>[],
  people: unknown,
): Map<string, AdministrativeCompletionStatus> {
  const statuses = new Map<string, AdministrativeCompletionStatus>();
  if (!Array.isArray(people) || !people.every(isRecord)) {
    for (const user of users) statuses.set(String(user.id), "unverified");
    return statuses;
  }

  const peopleById = new Map<string, PersonRecord>();
  for (const person of people) {
    if (
      !hasOwn(person, "id") ||
      person.id == null ||
      String(person.id).trim() === ""
    ) {
      for (const user of users) statuses.set(String(user.id), "unverified");
      return statuses;
    }
    peopleById.set(String(person.id), person);
  }

  for (const user of users) {
    const id = String(user.id);
    if (!hasOwn(user, "personId")) {
      statuses.set(id, "unverified");
      continue;
    }
    if (user.personId == null || String(user.personId).trim() === "") {
      statuses.set(id, "incomplete");
      continue;
    }
    const person = peopleById.get(String(user.personId));
    statuses.set(
      id,
      person ? evaluateAdministrativeCompletion(person) : "incomplete",
    );
  }
  return statuses;
}
