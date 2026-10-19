import type { Auditable, EntityId, RecordStatus } from '../shared';

export type GuardianRelationship = 'pai' | 'mae' | 'irmao' | 'avo' | 'tutor_legal' | 'outro';

export type DocumentType = 'cpf' | 'rg';

export type ExperienceRange = 'less_than_1' | 'from_1_to_3' | 'from_3_to_5' | 'more_than_5';

export const GUARDIAN_RELATIONSHIP_LABEL: Record<GuardianRelationship, string> = {
  pai: 'Pai',
  mae: 'Mãe',
  irmao: 'Irmão/irmã',
  avo: 'Avô/avó',
  tutor_legal: 'Tutor legal',
  outro: 'Outro',
};

export const EXPERIENCE_LABEL: Record<ExperienceRange, string> = {
  less_than_1: 'Menos de 1 ano',
  from_1_to_3: 'De 1 a 3 anos',
  from_3_to_5: 'De 3 a 5 anos',
  more_than_5: 'Mais de 5 anos',
};

export interface PersonDocument {
  type: DocumentType;
  number: string;
}

export interface StudentProfile {
  enrollmentDate: string;
  classGroup?: string;
  /** Nível de 1 a 5. */
  level: number;
}

export interface MusicianProfile {
  section: string;
  experience: ExperienceRange;
  /** Voz padrão: 1ª a 4ª. */
  defaultVoice: number;
  ownInstrument: boolean;
  joinedAt?: string;
  /** Instrumento do catálogo que a pessoa toca hoje. */
  playedInstrumentId?: EntityId | null;
  playedInstrument?: { id: EntityId; name: string; family?: string; tuning?: string | null };
}

export interface PersonAccount {
  id: EntityId;
  username: string;
  roles: string[];
}

export interface Person extends Auditable {
  id: EntityId;
  firstName: string;
  lastName: string;
  birthDate: string;
  /** Idade calculada pela API; omitida quando os dados vêm mascarados. */
  age?: number;
  document: PersonDocument | null;
  photoUrl?: string;
  email?: string;
  phone: string;
  address?: string;
  guardianId: EntityId | null;
  guardianName?: string;
  guardianRelationship?: GuardianRelationship;
  registeredAt: string;
  status: RecordStatus;
  isStudent: boolean;
  isMusician: boolean;
  student?: StudentProfile;
  musician?: MusicianProfile;
  userId: EntityId | null;
  user: PersonAccount | null;
}

export function personFullName(person: Pick<Person, 'firstName' | 'lastName'>): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function isPersonUnderage(birthDate: string): boolean {
  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const notYet =
    today.getMonth() < parsed.getMonth() ||
    (today.getMonth() === parsed.getMonth() && today.getDate() < parsed.getDate());
  if (notYet) age -= 1;
  return age < 18;
}

/** Valida os dígitos verificadores de um CPF (só números). */
export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}
