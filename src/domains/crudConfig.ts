import type { CrudResource } from '@/core/auth/permissions';
import { youtubeVideoId } from '@/domains/songs/youtube';
import { INSTRUMENT_FAMILY_OPTIONS, INSTRUMENT_SIGNAL_OPTIONS } from '@/domains/instruments/types';
import {
  EXPERIENCE_LABEL,
  GUARDIAN_RELATIONSHIP_LABEL,
  formatCpf,
  isPersonUnderage,
  isValidCpf,
} from '@/domains/people/types';

export type CrudFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'password'
  | 'number'
  | 'date'
  | 'datetime-local'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'xml';

export interface CrudOption {
  value: string;
  label: string;
}

/**
 * Origem dinâmica das opções de um campo, carregada pelo workspace:
 * - `people`: todas as pessoas (sem a própria, quando houver `id`);
 * - `people-without-user`: pessoas que ainda não têm conta;
 * - `instruments`: catálogo de instrumentos (trompete, sax alto), não a peça do patrimônio.
 */
export type CrudOptionSource = 'people' | 'people-without-user' | 'instruments';

export interface CrudField {
  name: string;
  label: string;
  type?: CrudFieldType;
  required?: boolean;
  options?: CrudOption[];
  optionsSource?: CrudOptionSource;
  /** Agrupa campos sob um título dentro do formulário. */
  section?: string;
  /** Só pode ser definido na criação; na edição aparece bloqueado. */
  lockOnEdit?: boolean;
  placeholder?: string;
  helpText?: string;
  accept?: string;
  showWhen?: (values: Record<string, unknown>) => boolean;
  validate?: (value: unknown, values: Record<string, unknown>) => string | null;
  /** Transforma o valor digitado (máscara) antes de guardar no formulário. */
  format?: (value: string, values: Record<string, unknown>) => string;
}

export interface CrudColumn {
  path: string;
  label: string;
  format?: 'boolean' | 'date' | 'datetime' | 'currency' | 'count' | 'roles' | 'status';
}

/** Quem criou o registro ou fez a última alteração. */
const actorColumn: CrudColumn = { path: 'createdBy', label: 'Criado por' };

export interface DomainCrudConfig {
  resource: CrudResource;
  singular: string;
  fields: CrudField[];
  columns: CrudColumn[];
  defaults: Record<string, unknown>;
  itemLabel: (item: Record<string, unknown>) => string;
  filter?: (item: Record<string, unknown>) => boolean;
  toForm?: (item: Record<string, unknown>) => Record<string, unknown>;
  toPayload?: (
    values: Record<string, unknown>,
    current?: Record<string, unknown>,
  ) => Record<string, unknown>;
}

const requiredProfile = (value: unknown, values: Record<string, unknown>, enabled: string) =>
  values[enabled] && !String(value ?? '').trim() ? 'Campo obrigatório para este perfil.' : null;

const isMinor = (values: Record<string, unknown>) =>
  Boolean(values.birthDate) && isPersonUnderage(String(values.birthDate));

const validatePhone = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11
    ? null
    : 'Informe um telefone com DDD.';
};

const validateUsername = (value: unknown) => {
  const username = String(value ?? '').trim();
  if (!username) return null;
  return /^[a-z0-9][a-z0-9._-]{2,59}$/.test(username)
    ? null
    : 'Use de 3 a 60 caracteres: letras minúsculas, números, ponto, hífen ou _.';
};

const todayIso = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const toId = (value: unknown): number | null => {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toIdList = (value: unknown): number[] => {
  const raw = Array.isArray(value)
    ? value
    : String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
  return raw.map(toId).filter((id): id is number => id !== null);
};

const LEVEL_OPTIONS: CrudOption[] = [1, 2, 3, 4, 5].map((level) => ({
  value: String(level),
  label: `Nível ${level}`,
}));

const VOICE_OPTIONS: CrudOption[] = [1, 2, 3, 4].map((voice) => ({
  value: String(voice),
  label: `${voice}ª voz`,
}));

const EXPERIENCE_OPTIONS: CrudOption[] = Object.entries(EXPERIENCE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const RELATIONSHIP_OPTIONS: CrudOption[] = [
  { value: '', label: 'Selecione…' },
  ...Object.entries(GUARDIAN_RELATIONSHIP_LABEL).map(([value, label]) => ({ value, label })),
];

const SECTION_OPTIONS: CrudOption[] = [
  { value: '', label: 'Selecione…' },
  ...['Madeiras', 'Metais', 'Percussão', 'Cordas', 'Teclas', 'Regência'].map((section) => ({
    value: section,
    label: section,
  })),
];

const commonStatus: CrudField = {
  name: 'status',
  label: 'Status',
  type: 'select',
  required: true,
  options: [
    { value: 'active', label: 'Ativo' },
    { value: 'inactive', label: 'Inativo' },
  ],
};

/**
 * Usuário = conta de acesso de uma pessoa já cadastrada. Nome, e-mail e foto
 * vêm da pessoa; aqui só ficam nome de usuário, papéis, status e senha.
 */
const users: DomainCrudConfig = {
  resource: 'users',
  singular: 'usuário',
  defaults: {
    personId: '',
    username: '',
    roles: [],
    isActive: true,
    password: '',
  },
  fields: [
    {
      name: 'personId',
      label: 'Pessoa',
      type: 'select',
      required: true,
      lockOnEdit: true,
      optionsSource: 'people-without-user',
      section: 'Pessoa',
      helpText: 'Só aparecem pessoas sem conta. Se ainda não existe, cadastre em Pessoas antes.',
    },
    {
      name: 'username',
      label: 'Nome de usuário',
      section: 'Acesso',
      placeholder: 'nome.sobrenome',
      helpText: 'Em branco, a API gera a partir do nome da pessoa.',
      validate: validateUsername,
      format: (value) => value.toLowerCase().replace(/\s+/g, '.'),
    },
    {
      name: 'password',
      label: 'Senha',
      type: 'password',
      section: 'Acesso',
      helpText: 'Opcional. Em branco, a API gera uma senha temporária para o primeiro acesso.',
      validate: (value) =>
        String(value ?? '').length > 0 && String(value).length < 8
          ? 'A senha precisa ter pelo menos 8 caracteres.'
          : null,
    },
    { name: 'isActive', label: 'Usuário ativo', type: 'checkbox', section: 'Acesso' },
    {
      name: 'roles',
      label: 'Perfis',
      type: 'multiselect',
      section: 'Perfis',
      options: [
        { value: 'amigos', label: 'Amigos' },
        { value: 'aluno', label: 'Aluno' },
        { value: 'musico', label: 'Músico' },
        { value: 'maestro', label: 'Maestro' },
        { value: 'admin', label: 'Administrador' },
      ],
      helpText:
        'Aluno e Músico seguem o cadastro da pessoa e são mantidos pela API. Outros papéis só o administrador vincula.',
    },
  ],
  columns: [
    { path: 'username', label: 'Usuário' },
    { path: 'name', label: 'Nome' },
    { path: 'email', label: 'E-mail' },
    { path: 'roles', label: 'Perfis', format: 'roles' },
    { path: 'isActive', label: 'Ativo', format: 'boolean' },
    actorColumn,
  ],
  itemLabel: (item) => String(item.name ?? item.username ?? 'Usuário'),
  toForm: (item) => ({
    ...item,
    roles: Array.isArray(item.roles) ? item.roles : [],
    personId: item.personId == null ? '' : String(item.personId),
    username: item.username ?? '',
    password: '',
  }),
  toPayload: (values, current) => {
    const payload: Record<string, unknown> = {
      username: String(values.username ?? '').trim(),
      roles: Array.isArray(values.roles) ? values.roles.map(String) : [],
      isActive: Boolean(values.isActive),
    };
    if (!current) payload.personId = toId(values.personId);
    if (String(values.password ?? '').length > 0) payload.password = values.password;
    return payload;
  },
};

/**
 * Pessoa = raiz de aluno, músico e usuário. O formulário é dividido em seções;
 * aluno e músico são perfis opcionais e o responsável é outra pessoa.
 */
const people: DomainCrudConfig = {
  resource: 'people',
  singular: 'pessoa',
  defaults: {
    firstName: '',
    lastName: '',
    birthDate: '',
    'document.type': '',
    'document.number': '',
    photoUrl: '',
    email: '',
    phone: '',
    address: '',
    guardianId: '',
    guardianRelationship: '',
    registeredAt: '',
    status: 'active',
    isStudent: false,
    isMusician: false,
    'student.enrollmentDate': '',
    'student.classGroup': '',
    'student.level': '1',
    'musician.section': '',
    'musician.experience': 'less_than_1',
    'musician.defaultVoice': '1',
    'musician.ownInstrument': false,
    'musician.joinedAt': '',
    'musician.playedInstrumentId': '',
    createUser: false,
    username: '',
  },
  fields: [
    { name: 'firstName', label: 'Nome', required: true, section: 'Dados pessoais' },
    { name: 'lastName', label: 'Sobrenome', required: true, section: 'Dados pessoais' },
    {
      name: 'birthDate',
      label: 'Data de nascimento',
      type: 'date',
      required: true,
      section: 'Dados pessoais',
      validate: (value) => {
        const date = new Date(`${String(value)}T00:00:00`);
        return !Number.isNaN(date.getTime()) && date <= new Date()
          ? null
          : 'Informe uma data de nascimento válida.';
      },
    },
    {
      name: 'registeredAt',
      label: 'Data de cadastro',
      type: 'date',
      section: 'Dados pessoais',
      helpText: 'Em branco, usa a data de hoje.',
      validate: (value) => {
        if (!value) return null;
        const date = new Date(`${String(value)}T00:00:00`);
        return !Number.isNaN(date.getTime()) && date <= new Date()
          ? null
          : 'A data de cadastro não pode estar no futuro.';
      },
    },
    {
      name: 'document.type',
      label: 'Documento',
      type: 'select',
      section: 'Dados pessoais',
      options: [
        { value: '', label: 'Não informado' },
        { value: 'cpf', label: 'CPF' },
        { value: 'rg', label: 'RG' },
      ],
    },
    {
      name: 'document.number',
      label: 'Número do documento',
      section: 'Dados pessoais',
      showWhen: (values) => Boolean(values['document.type']),
      placeholder: '000.000.000-00',
      format: (value, values) =>
        values['document.type'] === 'cpf' ? formatCpf(value) : value.toUpperCase(),
      validate: (value, values) => {
        const number = String(value ?? '').trim();
        if (!number) return 'Informe o número do documento.';
        if (values['document.type'] === 'cpf') {
          return isValidCpf(number) ? null : 'Informe um CPF válido.';
        }
        const rg = number.replace(/[^A-Za-z0-9]/g, '');
        return rg.length >= 5 && rg.length <= 14 ? null : 'Informe um RG válido.';
      },
    },
    { name: 'photoUrl', label: 'URL da foto de perfil', section: 'Dados pessoais', placeholder: 'https://…' },
    commonStatus,
    {
      name: 'phone',
      label: 'Telefone',
      type: 'tel',
      required: true,
      section: 'Contato',
      placeholder: '(00) 00000-0000',
      validate: validatePhone,
    },
    {
      name: 'email',
      label: 'E-mail',
      type: 'email',
      section: 'Contato',
      helpText: 'Opcional, mas necessário para entrar com e-mail em vez do nome de usuário.',
    },
    { name: 'address', label: 'Endereço', section: 'Contato' },
    {
      name: 'guardianId',
      label: 'Pessoa responsável',
      type: 'select',
      optionsSource: 'people',
      section: 'Responsável',
      helpText: 'Obrigatório para menor de idade. O responsável precisa estar cadastrado em Pessoas.',
      validate: (value, values) =>
        isMinor(values) && !value ? 'Menor de idade precisa de uma pessoa responsável.' : null,
    },
    {
      name: 'guardianRelationship',
      label: 'Parentesco',
      type: 'select',
      section: 'Responsável',
      options: RELATIONSHIP_OPTIONS,
      showWhen: (values) => Boolean(values.guardianId),
      validate: (value, values) =>
        values.guardianId && !value ? 'Informe o parentesco do responsável.' : null,
    },
    { name: 'isStudent', label: 'É aluno', type: 'checkbox', section: 'Perfis' },
    { name: 'isMusician', label: 'É músico', type: 'checkbox', section: 'Perfis' },
    {
      name: 'student.enrollmentDate',
      label: 'Data de matrícula',
      type: 'date',
      section: 'Aluno',
      showWhen: (values) => Boolean(values.isStudent),
      validate: (value, values) => requiredProfile(value, values, 'isStudent'),
    },
    {
      name: 'student.classGroup',
      label: 'Turma',
      section: 'Aluno',
      placeholder: 'Ex.: Turma A',
      showWhen: (values) => Boolean(values.isStudent),
    },
    {
      name: 'student.level',
      label: 'Nível',
      type: 'select',
      section: 'Aluno',
      options: LEVEL_OPTIONS,
      showWhen: (values) => Boolean(values.isStudent),
    },
    {
      name: 'musician.section',
      label: 'Naipe',
      type: 'select',
      section: 'Músico',
      options: SECTION_OPTIONS,
      showWhen: (values) => Boolean(values.isMusician),
      validate: (value, values) => requiredProfile(value, values, 'isMusician'),
    },
    {
      name: 'musician.experience',
      label: 'Tempo de experiência',
      type: 'select',
      section: 'Músico',
      options: EXPERIENCE_OPTIONS,
      showWhen: (values) => Boolean(values.isMusician),
    },
    {
      name: 'musician.defaultVoice',
      label: 'Voz padrão',
      type: 'select',
      section: 'Músico',
      options: VOICE_OPTIONS,
      showWhen: (values) => Boolean(values.isMusician),
    },
    {
      name: 'musician.ownInstrument',
      label: 'Tem instrumento próprio',
      type: 'checkbox',
      section: 'Músico',
      showWhen: (values) => Boolean(values.isMusician),
    },
    {
      name: 'musician.joinedAt',
      label: 'Entrada na banda',
      type: 'date',
      section: 'Músico',
      showWhen: (values) => Boolean(values.isMusician),
    },
    {
      name: 'musician.playedInstrumentId',
      label: 'Instrumento que toca',
      type: 'select',
      required: true,
      optionsSource: 'instruments',
      section: 'Músico',
      showWhen: (values) => Boolean(values.isMusician),
      helpText: 'Do catálogo de instrumentos, não do patrimônio.',
      validate: (value, values) => requiredProfile(value, values, 'isMusician'),
    },
    {
      name: 'createUser',
      label: 'Criar usuário de acesso',
      type: 'checkbox',
      section: 'Acesso',
      helpText: 'Gera uma senha inicial. Aluno e músico recebem os papéis correspondentes.',
      showWhen: (values) => !values.userId,
    },
    {
      name: 'username',
      label: 'Nome de usuário',
      section: 'Acesso',
      placeholder: 'nome.sobrenome',
      helpText: 'Em branco, a API gera a partir do nome.',
      showWhen: (values) => !values.userId && Boolean(values.createUser),
      validate: validateUsername,
      format: (value) => value.toLowerCase().replace(/\s+/g, '.'),
    },
  ],
  columns: [
    { path: 'firstName', label: 'Nome' },
    { path: 'lastName', label: 'Sobrenome' },
    { path: 'phone', label: 'Telefone' },
    { path: 'isStudent', label: 'Aluno', format: 'boolean' },
    { path: 'isMusician', label: 'Músico', format: 'boolean' },
    { path: 'user.username', label: 'Usuário' },
    { path: 'status', label: 'Status', format: 'status' },
    actorColumn,
  ],
  itemLabel: (item) => `${String(item.firstName ?? '')} ${String(item.lastName ?? '')}`.trim(),
  toForm: (item) => {
    const flat = flattenEntity(item);
    const document = item.document as Record<string, unknown> | null | undefined;
    flat['document.type'] = document?.type ?? '';
    flat['document.number'] =
      document?.type === 'cpf' ? formatCpf(String(document.number ?? '')) : (document?.number ?? '');
    flat.guardianId = item.guardianId == null ? '' : String(item.guardianId);
    flat.guardianRelationship = item.guardianRelationship ?? '';
    flat['student.level'] = String(flat['student.level'] ?? '1');
    flat['musician.defaultVoice'] = String(flat['musician.defaultVoice'] ?? '1');
    flat['musician.experience'] = flat['musician.experience'] ?? 'less_than_1';
    flat['musician.playedInstrumentId'] =
      flat['musician.playedInstrumentId'] == null ? '' : String(flat['musician.playedInstrumentId']);
    flat.createUser = false;
    flat.username = '';
    return flat;
  },
  toPayload: (values) => {
    const payload = unflattenEntity(values);
    for (const key of ['id', 'age', 'user', 'userId', 'guardianName', 'createdAt', 'updatedAt', 'temporaryPassword']) {
      delete payload[key];
    }
    const documentType = String(values['document.type'] ?? '').trim();
    const documentNumber = String(values['document.number'] ?? '').trim();
    payload.document =
      documentType && documentType !== 'none' && documentNumber
        ? { type: documentType, number: documentNumber }
        : null;
    payload.guardianId = toId(values.guardianId);
    if (!payload.guardianId) delete payload.guardianRelationship;
    payload.registeredAt = values.registeredAt || todayIso();
    if (!values.isStudent) {
      delete payload.student;
    } else {
      const student = payload.student as Record<string, unknown>;
      student.level = Number(student.level ?? 1);
    }
    if (!values.isMusician) {
      delete payload.musician;
    } else {
      const musician = payload.musician as Record<string, unknown>;
      musician.defaultVoice = Number(musician.defaultVoice ?? 1);
      musician.ownInstrument = Boolean(musician.ownInstrument);
      musician.playedInstrumentId = toId(musician.playedInstrumentId);
      delete musician.playedInstrument;
      delete musician.instrumentIds;
      delete musician.instruments;
      if (!musician.joinedAt) delete musician.joinedAt;
    }
    if (!values.createUser) {
      delete payload.createUser;
      delete payload.username;
    }
    return payload;
  },
};

const songs: DomainCrudConfig = {
  resource: 'songs',
  singular: 'música',
  defaults: {
    title: '',
    composer: '',
    arranger: '',
    genre: '',
    key: '',
    durationSeconds: '',
    scoreFile: '',
    scoreFileName: '',
    scoreMimeType: '',
    status: 'active',
    visibility: 'private',
    visibleToStudents: false,
    visibleToMusicians: false,
    videoUrl: '',
  },
  fields: [
    {
      name: 'scoreFile',
      label: 'Partitura MusicXML',
      type: 'xml',
      section: 'Partitura',
      accept: '.xml,.musicxml,application/xml,text/xml,application/vnd.recordare.musicxml+xml',
      helpText:
        'Somente MusicXML (.xml ou .musicxml). Outros formatos (por exemplo .enc do Encore) não são aceitos — exporte como MusicXML antes de enviar. Título, compositor, arranjo, gênero, tonalidade e duração estimada entram sozinhos quando o arquivo permite calcular. A duração não inclui repetições desdobradas. Ao editar, deixe vazio para manter a partitura atual.',
    },
    {
      name: 'visibility',
      label: 'Visualização',
      type: 'select',
      required: true,
      section: 'Partitura',
      options: [
        { value: 'public', label: 'Pública — quem está logado' },
        { value: 'private', label: 'Privada — escolher alunos e/ou músicos' },
      ],
      helpText: 'Pública aparece no estudo para qualquer login. Na privada, marque quem pode ver.',
    },
    {
      name: 'visibleToStudents',
      label: 'Visível para alunos',
      type: 'checkbox',
      section: 'Partitura',
      showWhen: (values) => values.visibility === 'private',
    },
    {
      name: 'visibleToMusicians',
      label: 'Visível para músicos',
      type: 'checkbox',
      section: 'Partitura',
      showWhen: (values) => values.visibility === 'private',
    },
    { name: 'title', label: 'Título', required: true, section: 'Dados' },
    { name: 'composer', label: 'Compositor', required: true, section: 'Dados' },
    { name: 'arranger', label: 'Arranjador', section: 'Dados' },
    { name: 'genre', label: 'Gênero', section: 'Dados' },
    { name: 'key', label: 'Tonalidade', placeholder: 'Ex.: Bb', section: 'Dados' },
    { name: 'durationSeconds', label: 'Duração (segundos)', type: 'number', section: 'Dados' },
    {
      name: 'videoUrl',
      label: 'Vídeo no YouTube',
      section: 'Dados',
      placeholder: 'https://www.youtube.com/watch?v=…',
      helpText: 'Opcional. O vídeo abre no estudo e nos detalhes da música.',
      validate: (value) => {
        const text = String(value ?? '').trim();
        if (!text) return null;
        return youtubeVideoId(text) ? null : 'Informe um link do YouTube.';
      },
    },
    { ...commonStatus, section: 'Dados' },
  ],
  columns: [
    { path: 'title', label: 'Título' },
    { path: 'composer', label: 'Compositor' },
    { path: 'arranger', label: 'Arranjador' },
    { path: 'genre', label: 'Gênero' },
    { path: 'key', label: 'Tonalidade' },
    { path: 'visibility', label: 'Visualização', format: 'status' },
    { path: 'hasScore', label: 'Partitura', format: 'boolean' },
    {
      path: 'studyScoreStatus',
      label: 'Prep. estudo',
      format: 'status',
    },
    { path: 'status', label: 'Status', format: 'status' },
    actorColumn,
  ],
  itemLabel: (item) => String(item.title ?? 'Música'),
  toForm: (item) => {
    const score = Array.isArray(item.scores)
      ? (item.scores[0] as Record<string, unknown> | undefined)
      : undefined;
    return {
      ...item,
      scoreFile: '',
      scoreFileName: score?.fileName ?? '',
      scoreMimeType: score?.mimeType ?? '',
      visibility: item.visibility === 'public' ? 'public' : 'private',
      visibleToStudents: Boolean(item.visibleToStudents),
      visibleToMusicians: Boolean(item.visibleToMusicians),
      videoUrl: item.videoUrl ?? '',
    };
  },
  toPayload: (values, current) => {
    const {
      scoreFile,
      scoreFileName,
      scoreMimeType,
      durationSeconds,
      ...base
    } = values;
    const previousScores = current?.scores;
    const scores = scoreFile
      ? [
          {
            fileName: scoreFileName || 'partitura.musicxml',
            mimeType: scoreMimeType || 'application/xml',
            url: scoreFile,
          },
        ]
      : Array.isArray(previousScores)
        ? previousScores
        : [];
    return withAudit(
      {
        ...base,
        durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
        scores,
      },
      current,
    );
  },
};

const patrimony: DomainCrudConfig = {
  resource: 'patrimony',
  singular: 'item de patrimônio',
  defaults: {
    code: '',
    name: '',
    category: 'equipment',
    acquisitionDate: '',
    acquisitionValue: '',
    status: 'available',
    location: '',
    notes: '',
    assignedPersonId: '',
  },
  fields: [
    { name: 'code', label: 'Código', required: true },
    { name: 'name', label: 'Nome', required: true },
    {
      name: 'category',
      label: 'Categoria',
      type: 'select',
      required: true,
      options: [
        { value: 'instrument', label: 'Instrumento' },
        { value: 'uniform', label: 'Uniforme' },
        { value: 'equipment', label: 'Equipamento' },
        { value: 'furniture', label: 'Mobiliário' },
        { value: 'other', label: 'Outro' },
      ],
    },
    { name: 'acquisitionDate', label: 'Data de aquisição', type: 'date', required: true },
    { name: 'acquisitionValue', label: 'Valor de aquisição', type: 'number' },
    {
      name: 'status',
      label: 'Estado',
      type: 'select',
      required: true,
      options: [
        { value: 'available', label: 'Disponível' },
        { value: 'in_use', label: 'Em uso' },
        { value: 'maintenance', label: 'Manutenção' },
        { value: 'retired', label: 'Baixado' },
      ],
    },
    { name: 'location', label: 'Localização' },
    {
      name: 'assignedPersonId',
      label: 'Pessoa responsável',
      type: 'select',
      optionsSource: 'people',
      helpText: 'Quem está com o item. Opcional.',
    },
    { name: 'notes', label: 'Observações', type: 'textarea' },
    {
      name: 'instrument.instrumentId',
      label: 'Instrumento',
      type: 'select',
      required: true,
      optionsSource: 'instruments',
      helpText: 'Qual instrumento do catálogo esta peça é.',
      showWhen: (values) => values.category === 'instrument',
    },
    {
      name: 'instrument.serialNumber',
      label: 'Número de série',
      showWhen: (values) => values.category === 'instrument',
    },
    {
      name: 'instrument.manufacturer',
      label: 'Fabricante',
      showWhen: (values) => values.category === 'instrument',
    },
    {
      name: 'instrument.model',
      label: 'Modelo',
      showWhen: (values) => values.category === 'instrument',
    },
  ],
  columns: [
    { path: 'code', label: 'Código' },
    { path: 'name', label: 'Nome' },
    { path: 'category', label: 'Categoria' },
    { path: 'status', label: 'Estado', format: 'status' },
    { path: 'location', label: 'Localização' },
    { path: 'acquisitionValue', label: 'Valor', format: 'currency' },
    actorColumn,
  ],
  itemLabel: (item) => String(item.name ?? item.code ?? 'Patrimônio'),
  toForm: (item) => ({
    ...flattenEntity(item),
    assignedPersonId: item.assignedPersonId == null ? '' : String(item.assignedPersonId),
    'instrument.instrumentId':
      item.instrument && typeof item.instrument === 'object' && item.instrument !== null
        ? String((item.instrument as { instrumentId?: unknown }).instrumentId ?? '')
        : '',
  }),
  toPayload: (values, current) => {
    const payload = unflattenEntity(values);
    payload.acquisitionValue = values.acquisitionValue ? Number(values.acquisitionValue) : undefined;
    payload.assignedPersonId = toId(values.assignedPersonId);
    if (payload.category !== 'instrument') {
      delete payload.instrument;
    } else if (payload.instrument && typeof payload.instrument === 'object') {
      const instrument = payload.instrument as Record<string, unknown>;
      instrument.instrumentId = toId(instrument.instrumentId);
    }
    return withAudit(payload, current);
  },
};

const instruments: DomainCrudConfig = {
  resource: 'instruments',
  singular: 'instrumento',
  defaults: {
    name: '',
    family: 'brass',
    subclass: '',
    tuning: '',
    signalType: 'acoustic',
    tessitura: '',
    tags: '',
    status: 'active',
  },
  fields: [
    { name: 'name', label: 'Nome', required: true, placeholder: 'Ex.: Saxofone Alto' },
    {
      name: 'family',
      label: 'Família',
      type: 'select',
      required: true,
      options: INSTRUMENT_FAMILY_OPTIONS,
    },
    { name: 'subclass', label: 'Subclasse', placeholder: 'Ex.: Madeiras, Palheta' },
    { name: 'tuning', label: 'Afinação', placeholder: 'Ex.: Bb, Eb, F, C' },
    {
      name: 'signalType',
      label: 'Tipo de sinal',
      type: 'select',
      required: true,
      options: INSTRUMENT_SIGNAL_OPTIONS,
    },
    { name: 'tessitura', label: 'Tessitura', placeholder: 'Ex.: Alto, Soprano, Tenor' },
    {
      name: 'tags',
      label: 'Tags',
      placeholder: 'Jazz, Banda, Palheta',
      helpText: 'Separadas por vírgula.',
    },
    commonStatus,
  ],
  columns: [
    { path: 'name', label: 'Instrumento' },
    { path: 'familyLabel', label: 'Família' },
    { path: 'subclass', label: 'Subclasse' },
    { path: 'tuning', label: 'Afinação' },
    { path: 'tessitura', label: 'Tessitura' },
    { path: 'signalLabel', label: 'Sinal' },
    { path: 'status', label: 'Status', format: 'status' },
    actorColumn,
  ],
  itemLabel: (item) => String(item.name ?? 'Instrumento'),
  toForm: (item) => ({
    ...item,
    tags: Array.isArray(item.tags) ? (item.tags as unknown[]).join(', ') : (item.tags ?? ''),
  }),
  toPayload: (values, current) => {
    const tags = String(values.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    return withAudit({ ...values, tags }, current);
  },
};

const presentations: DomainCrudConfig = {
  resource: 'presentations',
  singular: 'apresentação',
  defaults: {
    title: '',
    venue: '',
    startsAt: '',
    endsAt: '',
    description: '',
    repertoireIds: '',
    coverUrl: '',
    isPublic: true,
    status: 'draft',
  },
  fields: [
    { name: 'title', label: 'Título', required: true },
    { name: 'venue', label: 'Local', required: true },
    { name: 'startsAt', label: 'Início', type: 'datetime-local', required: true },
    { name: 'endsAt', label: 'Fim', type: 'datetime-local' },
    { name: 'description', label: 'Descrição', type: 'textarea' },
    {
      name: 'repertoireIds',
      label: 'IDs das músicas',
      helpText: 'Separe os IDs por vírgula.',
    },
    { name: 'coverUrl', label: 'URL da capa' },
    { name: 'isPublic', label: 'Mostrar na agenda pública', type: 'checkbox' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'draft', label: 'Rascunho' },
        { value: 'scheduled', label: 'Agendada' },
        { value: 'done', label: 'Realizada' },
        { value: 'cancelled', label: 'Cancelada' },
      ],
    },
  ],
  columns: [
    { path: 'title', label: 'Título' },
    { path: 'venue', label: 'Local' },
    { path: 'startsAt', label: 'Data', format: 'datetime' },
    { path: 'isPublic', label: 'Pública', format: 'boolean' },
    { path: 'status', label: 'Status', format: 'status' },
    { path: 'repertoireIds', label: 'Repertório', format: 'count' },
    actorColumn,
  ],
  itemLabel: (item) => String(item.title ?? 'Apresentação'),
  toForm: (item) => ({
    ...item,
    startsAt: toLocalDateTime(item.startsAt),
    endsAt: toLocalDateTime(item.endsAt),
    repertoireIds: Array.isArray(item.repertoireIds) ? item.repertoireIds.join(', ') : '',
  }),
  toPayload: (values, current) =>
    withAudit(
      {
        ...values,
        startsAt: toIsoDateTime(values.startsAt),
        endsAt: values.endsAt ? toIsoDateTime(values.endsAt) : undefined,
        repertoireIds: String(values.repertoireIds ?? '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      },
      current,
    ),
};

const media: DomainCrudConfig = {
  resource: 'media',
  singular: 'mídia',
  defaults: {
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    coverUrl: '',
    videoUrl: '',
    kind: 'article',
    status: 'draft',
    publishedAt: '',
  },
  fields: [
    { name: 'title', label: 'Título', required: true },
    {
      name: 'slug',
      label: 'Slug',
      required: true,
      placeholder: 'titulo-da-publicacao',
      validate: (value) =>
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value ?? ''))
          ? null
          : 'Use somente letras minúsculas, números e hífens.',
    },
    {
      name: 'kind',
      label: 'Tipo',
      type: 'select',
      required: true,
      options: [
        { value: 'article', label: 'Artigo' },
        { value: 'photo', label: 'Foto' },
        { value: 'video', label: 'Vídeo' },
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'draft', label: 'Rascunho' },
        { value: 'published', label: 'Publicado' },
      ],
    },
    { name: 'excerpt', label: 'Resumo', type: 'textarea', required: true },
    { name: 'body', label: 'Conteúdo', type: 'textarea', required: true },
    { name: 'coverUrl', label: 'URL da capa' },
    {
      name: 'videoUrl',
      label: 'URL do vídeo',
      showWhen: (values) => values.kind === 'video',
    },
    {
      name: 'publishedAt',
      label: 'Data da publicação',
      type: 'datetime-local',
      showWhen: (values) => values.status === 'published',
      validate: (value, values) =>
        values.status === 'published' && !value ? 'Informe a data de publicação.' : null,
    },
  ],
  columns: [
    { path: 'title', label: 'Título' },
    { path: 'kind', label: 'Tipo' },
    { path: 'status', label: 'Status', format: 'status' },
    { path: 'publishedAt', label: 'Publicação', format: 'datetime' },
    { path: 'slug', label: 'Slug' },
    actorColumn,
  ],
  itemLabel: (item) => String(item.title ?? 'Mídia'),
  toForm: (item) => ({ ...item, publishedAt: toLocalDateTime(item.publishedAt) }),
  toPayload: (values, current) =>
    withAudit(
      {
        ...values,
        publishedAt:
          values.status === 'published' && values.publishedAt
            ? toIsoDateTime(values.publishedAt)
            : undefined,
      },
      current,
    ),
};

const CONFIGS: Record<CrudResource, DomainCrudConfig> = {
  users,
  people,
  songs,
  patrimony,
  instruments,
  presentations,
  media,
};

export function getCrudConfig(resource: CrudResource): DomainCrudConfig {
  return CONFIGS[resource];
}

export function getValue(entity: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, entity);
}

function flattenEntity(entity: Record<string, unknown>): Record<string, unknown> {
  const flat = { ...entity };
  for (const [key, value] of Object.entries(entity)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        flat[`${key}.${nestedKey}`] = Array.isArray(nestedValue)
          ? nestedValue.map(String)
          : nestedValue;
      }
    }
  }
  return flat;
}

function unflattenEntity(values: Record<string, unknown>): Record<string, unknown> {
  const entity: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(values)) {
    if (!path.includes('.')) {
      entity[path] = value;
      continue;
    }
    const [parent, child] = path.split('.');
    const nested = (entity[parent] as Record<string, unknown> | undefined) ?? {};
    nested[child] = value;
    entity[parent] = nested;
  }
  return entity;
}

function withAudit(
  payload: Record<string, unknown>,
  current?: Record<string, unknown>,
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    ...payload,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
}

function toLocalDateTime(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDateTime(value: unknown): string {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
