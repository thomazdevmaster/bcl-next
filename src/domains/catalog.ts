import type { Action, Resource } from '@/core/auth/permissions';

export interface DomainDefinition {
  id: Resource;
  label: string;
  description: string;
  path: string;
  icon: string;
  apiResource: string;
  navGroup: 'public' | 'management';
  public?: boolean;
}

export const DOMAINS: DomainDefinition[] = [
  {
    id: 'portal',
    label: 'Portal',
    description: 'Páginas institucionais visíveis sem login.',
    path: '/',
    icon: 'home',
    apiResource: 'media',
    navGroup: 'public',
    public: true,
  },
  {
    id: 'media',
    label: 'Posts do blog',
    description: 'Criar e editar posts do blog, com texto, fotos, vídeos e áudios.',
    path: '/gestao/midias',
    icon: 'article',
    apiResource: 'media',
    navGroup: 'management',
  },
  {
    id: 'users',
    label: 'Usuários',
    description: 'Contas de acesso. O vínculo com papéis é feito pelo administrador.',
    path: '/gestao/usuarios',
    icon: 'manage_accounts',
    apiResource: 'users',
    navGroup: 'management',
  },
  {
    id: 'people',
    label: 'Alunos e músicos',
    description: 'Pessoas da banda. Uma pessoa pode ser aluna, músico ou os dois.',
    path: '/gestao/pessoas',
    icon: 'groups',
    apiResource: 'people',
    navGroup: 'management',
  },
  {
    id: 'songs',
    label: 'Músicas',
    description: 'Repertório e partituras. Música pública vale para quem está logado; a privada depende do papel.',
    path: '/gestao/musicas',
    icon: 'library_music',
    apiResource: 'songs',
    navGroup: 'management',
  },
  {
    id: 'patrimony',
    label: 'Patrimônio',
    description: 'Bens da associação, incluindo instrumentos.',
    path: '/gestao/patrimonio',
    icon: 'inventory_2',
    apiResource: 'patrimony',
    navGroup: 'management',
  },
  {
    id: 'instruments',
    label: 'Instrumentos',
    description: 'Catálogo do que se toca: nome, família, afinação e tessitura. A peça física fica no patrimônio.',
    path: '/gestao/instrumentos',
    icon: 'music_note',
    apiResource: 'instruments',
    navGroup: 'management',
  },
  {
    id: 'blogpage',
    label: 'Organização do blog',
    description: 'Ordem dos posts e seções da página pública. Somente administradores.',
    path: '/gestao/blog',
    icon: 'view_agenda',
    apiResource: 'blogpage',
    navGroup: 'management',
  },
  {
    id: 'homepage',
    label: 'Página inicial',
    description: 'Textos, seções e ordem da home pública. Somente administradores.',
    path: '/gestao/home',
    icon: 'web',
    apiResource: 'homepage',
    navGroup: 'management',
  },
  {
    id: 'presentations',
    label: 'Apresentações',
    description: 'Agenda de concertos e eventos.',
    path: '/gestao/apresentacoes',
    icon: 'cast_for_education',
    apiResource: 'presentations',
    navGroup: 'management',
  },
];

export function getDomain(id: Resource): DomainDefinition {
  const domain = DOMAINS.find((item) => item.id === id);
  if (!domain) {
    throw new Error(`Domínio não registrado: ${id}`);
  }
  return domain;
}

export const MANAGEMENT_WRITE_ACTIONS: Action[] = ['create', 'update', 'delete'];
