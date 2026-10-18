export const HOME_SECTION_TYPES = [
  'hero',
  'highlights',
  'events',
  'blog',
  'story',
  'videos',
  'donations',
  'cta',
] as const;

export type HomeSectionType = (typeof HOME_SECTION_TYPES)[number];

export const HOME_SECTION_LABELS: Record<HomeSectionType, string> = {
  hero: 'Destaque',
  highlights: 'Números',
  events: 'Próximos eventos',
  blog: 'Blog',
  story: 'Institucional',
  videos: 'Vídeos',
  donations: 'Doações',
  cta: 'Chamada final',
};

export const DEFAULT_PIX_KEY = '20.408.324/0001-70';
export const DEFAULT_PIX_QR_PATH = '/imgs/pix-doacao.png';

export interface HomeLink {
  label: string;
  href: string;
}

export interface HomeHighlight {
  value: string;
  label: string;
}

export interface HomeImage {
  src: string;
  alt: string;
}

interface HomeSectionBase {
  type: HomeSectionType;
  enabled: boolean;
}

export interface HeroSection extends HomeSectionBase {
  type: 'hero';
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  links: HomeLink[];
}

export interface HighlightsSection extends HomeSectionBase {
  type: 'highlights';
  items: HomeHighlight[];
}

export interface FeedSection extends HomeSectionBase {
  type: 'events' | 'blog';
  title: string;
  description: string;
  linkLabel: string;
  limit: number;
}

export interface StorySection extends HomeSectionBase {
  type: 'story';
  title: string;
  body: string;
  linkLabel: string;
  images: HomeImage[];
}

export interface VideosSection extends HomeSectionBase {
  type: 'videos';
  title: string;
  description: string;
  videoIds: string[];
  limit: number;
}

export interface DonationsSection extends HomeSectionBase {
  type: 'donations';
  eyebrow: string;
  title: string;
  body: string;
  pixKeyLabel: string;
  pixKey: string;
  copyButtonLabel: string;
  qrCodeUrl: string;
  qrCodeAlt: string;
  qrHint: string;
}

export interface CtaSection extends HomeSectionBase {
  type: 'cta';
  titleLoggedOut: string;
  bodyLoggedOut: string;
  buttonLoggedOut: string;
  titleLoggedIn: string;
  bodyLoggedIn: string;
  buttonLoggedIn: string;
}

export type HomeSection =
  | HeroSection
  | HighlightsSection
  | FeedSection
  | StorySection
  | VideosSection
  | DonationsSection
  | CtaSection;

export interface HomepageDocument {
  id: 'home';
  updatedAt: string;
  sections: HomeSection[];
}

const UPDATED_AT = '2026-10-13T12:00:00.000Z';

export function defaultHomepage(): HomepageDocument {
  return {
    id: 'home',
    updatedAt: UPDATED_AT,
    sections: [
      {
        type: 'hero',
        enabled: true,
        eyebrow: 'Luminárias · Minas Gerais',
        title: 'Banda Carmelitana Luminarense',
        subtitle:
          'Concertos, história e notícias da banda em um só lugar. Explore a agenda pública, leia matérias e conheça mais de um século de música na região.',
        imageUrl: '/imgs/img1.jpg',
        links: [
          { label: 'Próximos eventos', href: '/agenda' },
          { label: 'Blog e galeria', href: '/blog' },
          { label: 'Sobre a banda', href: '/sobre' },
        ],
      },
      {
        type: 'highlights',
        enabled: true,
        items: [
          { value: '1894', label: 'Origens da tradição musical local' },
          { value: '1912', label: 'Primeiro estatuto' },
          { value: 'Hoje', label: 'Formação, ensaios e concertos' },
        ],
      },
      {
        type: 'events',
        enabled: true,
        title: 'Próximas apresentações',
        description: 'Eventos abertos ao público. Confira horário e local antes de ir.',
        linkLabel: 'Agenda completa',
        limit: 3,
      },
      {
        type: 'blog',
        enabled: true,
        title: 'Do blog',
        description: 'Matérias, fotos e avisos para quem acompanha a banda.',
        linkLabel: 'Ver todas as publicações',
        limit: 3,
      },
      {
        type: 'story',
        enabled: true,
        title: 'Uma instituição viva na cidade',
        body: 'A banda forma músicos, mantém o repertório e participa da vida cultural de Luminárias. No portal público você acompanha eventos e notícias; alunos, músicos e equipe acessam a área interna para estudo e gestão.',
        linkLabel: 'Conheça nossa história',
        images: [
          { src: '/imgs/img1.jpg', alt: 'Banda Carmelitana Luminarense em apresentação' },
          { src: '/imgs/img2.jpg', alt: 'Músicos da banda em formação' },
          { src: '/imgs/img3.jpg', alt: 'Ensaio aberto na praça' },
          { src: '/imgs/img4.jpg', alt: 'Tradição musical em Luminárias' },
        ],
      },
      {
        type: 'videos',
        enabled: true,
        title: 'Vídeos',
        description: 'Registros de apresentações e momentos da banda.',
        videoIds: ['TbUGOc36r9s', 'zgNL45Nl1qA', 'eTjkMqHKOvo', 'sldhCGZ-KgQ', 'jaFIxhNqYnw'],
        limit: 3,
      },
      {
        type: 'donations',
        enabled: true,
        eyebrow: 'Apoie a banda',
        title: 'Música gratuita na praça, sustentada por quem acredita',
        body:
          'A Banda Carmelitana Luminarense leva concertos e tradição para Luminárias sem cobrar ingresso nas apresentações abertas ao público. Por trás do palco existem custos concretos: instrumentos e partituras, uniformes, deslocamentos, manutenção da sede e o trabalho de ensaio da corporação.\n\nSe a banda já marcou a sua história — ou se você quer que ela continue marcando a da cidade — pode colaborar com um Pix, no valor que couber. Cada doação ajuda a manter ensaios e apresentações ao longo do ano.',
        pixKeyLabel: 'Chave Pix (CNPJ)',
        pixKey: DEFAULT_PIX_KEY,
        copyButtonLabel: 'Copiar chave Pix',
        qrCodeUrl: DEFAULT_PIX_QR_PATH,
        qrCodeAlt: 'QR Code Pix para doação à Banda Carmelitana Luminarense',
        qrHint: 'Use o QR Code ou a chave ao lado. Qualquer valor faz diferença — obrigado por apoiar a BCL.',
      },
      {
        type: 'cta',
        enabled: true,
        titleLoggedOut: 'Faz parte da banda?',
        bodyLoggedOut:
          'Alunos, músicos e equipe entram com login para estudo, gestão e informações internas.',
        buttonLoggedOut: 'Entrar na área interna',
        titleLoggedIn: 'Continue de onde parou',
        bodyLoggedIn: 'Acesse o painel, o repertório e o modo de estudo conforme o seu perfil.',
        buttonLoggedIn: 'Ir para o painel',
      },
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function clampLimit(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(6, Math.max(1, Math.round(parsed)));
}

export function safeAssetUrl(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  if (trimmed.startsWith('https://')) return trimmed;
  return fallback;
}

export function safeInternalHref(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return fallback;
}

export function safeYoutubeId(value: string): string | null {
  const trimmed = value.trim();
  return /^[\w-]{6,20}$/.test(trimmed) ? trimmed : null;
}

function sectionOf<T extends HomeSection>(type: T['type']): T {
  const found = defaultHomepage().sections.find((section) => section.type === type);
  return structuredClone(found) as T;
}

function sanitizeSection(raw: unknown): HomeSection | null {
  if (!isRecord(raw) || typeof raw.type !== 'string') return null;
  if (!HOME_SECTION_TYPES.includes(raw.type as HomeSectionType)) return null;
  const type = raw.type as HomeSectionType;

  if (type === 'hero') {
    const base = sectionOf<HeroSection>('hero');
    const links = Array.isArray(raw.links) ? raw.links : base.links;
    return {
      type: 'hero',
      enabled: asBoolean(raw.enabled, base.enabled),
      eyebrow: asString(raw.eyebrow, base.eyebrow),
      title: asString(raw.title, base.title),
      subtitle: asString(raw.subtitle, base.subtitle),
      imageUrl: safeAssetUrl(asString(raw.imageUrl, base.imageUrl), base.imageUrl),
      links: base.links.map((fallback, index) => {
        const link = links[index];
        if (!isRecord(link)) return fallback;
        return {
          label: asString(link.label, fallback.label),
          href: safeInternalHref(asString(link.href, fallback.href), fallback.href),
        };
      }),
    };
  }

  if (type === 'highlights') {
    const base = sectionOf<HighlightsSection>('highlights');
    const items = Array.isArray(raw.items) ? raw.items : base.items;
    const parsed = items.slice(0, 6).flatMap((item) => {
      if (!isRecord(item)) return [];
      const value = asString(item.value, '').trim();
      const label = asString(item.label, '').trim();
      if (!value && !label) return [];
      return [{ value, label }];
    });
    return {
      type: 'highlights',
      enabled: asBoolean(raw.enabled, base.enabled),
      items: parsed.length > 0 ? parsed : base.items,
    };
  }

  if (type === 'events' || type === 'blog') {
    const base = sectionOf<FeedSection>(type);
    return {
      type,
      enabled: asBoolean(raw.enabled, base.enabled),
      title: asString(raw.title, base.title),
      description: asString(raw.description, base.description),
      linkLabel: asString(raw.linkLabel, base.linkLabel),
      limit: clampLimit(raw.limit, base.limit),
    };
  }

  if (type === 'story') {
    const base = sectionOf<StorySection>('story');
    const images = Array.isArray(raw.images) ? raw.images : base.images;
    return {
      type: 'story',
      enabled: asBoolean(raw.enabled, base.enabled),
      title: asString(raw.title, base.title),
      body: asString(raw.body, base.body),
      linkLabel: asString(raw.linkLabel, base.linkLabel),
      images: base.images.map((fallback, index) => {
        const image = images[index];
        if (!isRecord(image)) return fallback;
        return {
          src: safeAssetUrl(asString(image.src, fallback.src), fallback.src),
          alt: asString(image.alt, fallback.alt),
        };
      }),
    };
  }

  if (type === 'videos') {
    const base = sectionOf<VideosSection>('videos');
    const ids = Array.isArray(raw.videoIds)
      ? raw.videoIds.flatMap((item) => {
          const id = safeYoutubeId(String(item ?? ''));
          return id ? [id] : [];
        })
      : base.videoIds;
    return {
      type: 'videos',
      enabled: asBoolean(raw.enabled, base.enabled),
      title: asString(raw.title, base.title),
      description: asString(raw.description, base.description),
      videoIds: ids.length > 0 ? ids.slice(0, 8) : base.videoIds,
      limit: clampLimit(raw.limit, base.limit),
    };
  }

  if (type === 'donations') {
    const base = sectionOf<DonationsSection>('donations');
    return {
      type: 'donations',
      enabled: asBoolean(raw.enabled, base.enabled),
      eyebrow: asString(raw.eyebrow, base.eyebrow),
      title: asString(raw.title, base.title),
      body: asString(raw.body, base.body),
      pixKeyLabel: asString(raw.pixKeyLabel, base.pixKeyLabel),
      pixKey: asString(raw.pixKey, base.pixKey).trim() || base.pixKey,
      copyButtonLabel: asString(raw.copyButtonLabel, base.copyButtonLabel),
      qrCodeUrl: safeAssetUrl(asString(raw.qrCodeUrl, base.qrCodeUrl), base.qrCodeUrl),
      qrCodeAlt: asString(raw.qrCodeAlt, base.qrCodeAlt),
      qrHint: asString(raw.qrHint, base.qrHint),
    };
  }

  const base = sectionOf<CtaSection>('cta');
  return {
    type: 'cta',
    enabled: asBoolean(raw.enabled, base.enabled),
    titleLoggedOut: asString(raw.titleLoggedOut, base.titleLoggedOut),
    bodyLoggedOut: asString(raw.bodyLoggedOut, base.bodyLoggedOut),
    buttonLoggedOut: asString(raw.buttonLoggedOut, base.buttonLoggedOut),
    titleLoggedIn: asString(raw.titleLoggedIn, base.titleLoggedIn),
    bodyLoggedIn: asString(raw.bodyLoggedIn, base.bodyLoggedIn),
    buttonLoggedIn: asString(raw.buttonLoggedIn, base.buttonLoggedIn),
  };
}

export function parseHomepagePayload(payload: unknown): HomepageDocument {
  const defaults = defaultHomepage();
  const row = Array.isArray(payload)
    ? payload.find((item) => isRecord(item) && item.id === 'home') ?? payload[0]
    : payload;
  if (!isRecord(row) || !Array.isArray(row.sections)) return defaults;

  const used = new Set<HomeSectionType>();
  const sections: HomeSection[] = [];
  for (const raw of row.sections) {
    const section = sanitizeSection(raw);
    if (!section || used.has(section.type)) continue;
    used.add(section.type);
    sections.push(section);
  }
  for (const fallback of defaults.sections) {
    if (!used.has(fallback.type)) sections.push(fallback);
  }

  return {
    id: 'home',
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : defaults.updatedAt,
    sections,
  };
}

export function validateHomepage(document: HomepageDocument): string | null {
  for (const section of document.sections) {
    if (!section.enabled) continue;
    if (section.type === 'hero' && !section.title.trim()) return 'O destaque precisa de um título.';
    if (
      (section.type === 'events' ||
        section.type === 'blog' ||
        section.type === 'story' ||
        section.type === 'videos' ||
        section.type === 'donations') &&
      !section.title.trim()
    ) {
      return `A seção “${HOME_SECTION_LABELS[section.type]}” precisa de um título.`;
    }
    if (section.type === 'donations' && !section.pixKey.trim()) {
      return 'A seção de doações precisa da chave Pix.';
    }
    if (section.type === 'cta' && (!section.titleLoggedOut.trim() || !section.titleLoggedIn.trim())) {
      return 'A chamada final precisa dos dois títulos.';
    }
  }
  return null;
}
