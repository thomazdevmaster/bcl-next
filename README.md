# BCL Frontend Next

Frontend da Banda Carmelitana Luminarense: portal público institucional e área interna de gestão, construídos com Next.js 16 e React 19.

Sem login, o visitante vê apenas o portal. Depois de autenticar, a navegação e os dados visíveis seguem o perfil (admin, maestro, músico ou aluno).

## Visão geral

O app usa o App Router do Next.js e está organizado por **domínios**, para permitir incluir módulos novos sem espalhar regras de permissão nas páginas.

Hoje o produto cobre:

- portal público (início, agenda, blog, sobre) com menu superior e botão Entrar;
- autenticação integrada à API oficial `bcl-api`;
- área `/gestao` com CRUDs por domínio, filtrados pelo perfil;
- máscara de dados sensíveis para músico e aluno;
- tema global (cores, tipografia e raios) inspirado no [drone.io](https://www.drone.io/);
- modo de estudo em `/study`, com seleção de instrumentos para partitura e MIDI.

Os módulos de usuários, pessoas, músicas, patrimônio, instrumentos, apresentações e mídias permitem visualizar, criar, editar e excluir conforme as permissões do perfil. O cadastro de pessoas aceita aluno, músico ou os dois, exige responsável para menores de idade e impede e-mail ou documento duplicado.

## Stack

- Next.js 16.2.2
- React 19.2.4
- TypeScript 5
- Sass
- Tailwind CSS 4
- ESLint 9
- `opensheetmusicdisplay` e `@music-i18n/musicxml-player` no módulo de estudo

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- Docker com Docker Compose

## Instalação

Na pasta `front-next`:

```bash
npm install
```

## Como executar em desenvolvimento

O frontend usa o backend oficial [`bcl-api`](https://github.com/thomazdevmaster/bcl-api). A API, o PostgreSQL e o MinIO são iniciados pelo Docker Compose desse repositório. Não há servidor ou mock de API neste frontend.

Em uma pasta separada, clone/abra `bcl-api` e inicie a stack completa:

```bash
docker compose --profile api up -d --build
```

Confirme a API em `http://localhost:8080/health`. No repositório do frontend, configure `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Então inicie o Next:

```bash
npm run dev
```

O frontend fica em `http://localhost:3000`. Portal em `/`, login em `/login`, gestão em `/gestao`.

Sem a API Dockerizada acessível, login, gestão e estudo não conseguem carregar dados. Reinicie o `npm run dev` depois de mudar `.env.local`.

Publicação: o site vai para a **Vercel**; a API (Postgres + MinIO) sobe na VM Oracle. Na Vercel defina as variáveis de build (elas entram no bundle do browser):

```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com.br
NEXT_PUBLIC_SITE_URL=https://SEU_PROJETO.vercel.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

`NEXT_PUBLIC_API_URL` deve ser a `PUBLIC_API_URL` configurada no `bcl-api` e precisa ser **HTTPS** quando o site está na Vercel. Como `NEXT_PUBLIC_*` é incorporada ao bundle durante o build, faça novo deploy após mudar essas variáveis.

## Variáveis de ambiente

O Next carrega `.env.local`, que deve permanecer ignorado pelo Git. Para apontar ao backend Dockerizado local, use:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

O backend local é iniciado pelo Compose do repositório `bcl-api`; o README desse projeto documenta os serviços, variáveis e operações.

## Scripts

```bash
npm run dev        # Next.js em desenvolvimento
npm run build      # build de produção
npm run start      # sobe o build gerado
npm run lint       # ESLint
```

## Perfis e permissões

| Perfil  | Acesso                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------- |
| Público | Somente o portal (início, agenda pública, blog, sobre). Sem login.                                   |
| Aluno   | Lê músicas, instrumentos, alunos (dados sensíveis mascarados) e apresentações.                       |
| Músico  | Lê músicas, patrimônio, instrumentos, alunos e músicos (dados sensíveis mascarados) e apresentações. |
| Maestro | CRUD de todos os módulos de gestão. Pode gerenciar perfis, mas **não** pode atribuir admin.          |
| Admin   | Tudo, inclusive promover outro usuário a admin.                                                      |

Campos mascarados para aluno e músico: e-mail, telefone, endereço, data de nascimento, documento e dados de responsável.

A regra `can(roles, resource, action)` vive em `src/core/auth/permissions.ts`. Usuários com mais de um perfil recebem a união das permissões, e o menu interno é montado a partir disso.

### Contas de demonstração

Entre com o **nome de usuário** (ou o e-mail da pessoa) e a senha. Na tela também há acesso rápido por perfil.

Essas contas são criadas pelo seed de desenvolvimento do `bcl-api`; não use as credenciais de demonstração em produção.

| Perfil         | Usuário   | E-mail da pessoa            | Senha        |
| -------------- | --------- | --------------------------- | ------------ |
| Admin          | `admin`   | `admin@bcl.local`           | `#bcl.2026@` |
| Maestro        | `maestro` | `maestro@bcl.local`         | `#bcl.2026@` |
| Músico         | `musico`  | `helena.trompete@email.com` | `musico`     |
| Aluno          | `aluno`   | `pedro.clarineta@email.com` | `aluno`      |
| Aluno + Músico | `ambos`   | `luisa.sax@email.com`       | `ambos`      |

Modelo: **toda pessoa** (`/people`) tem nome, sobrenome, nascimento, documento (CPF ou RG), foto, telefone, endereço, data de cadastro e, se for menor de idade, outra pessoa cadastrada como responsável. Aluno (matrícula, turma, nível 1–5) e músico (naipe, experiência, voz padrão, instrumento próprio, instrumentos do patrimônio) são perfis opcionais da pessoa. O **usuário** (`/users`) é a conta de acesso de uma pessoa: só guarda `username`, status e `roles[]`; nome, e-mail e foto vêm da pessoa. Quem tem perfil de aluno recebe o papel `aluno`, quem tem perfil de músico recebe `musico` — a API mantém isso. A Luísa Sax é aluna e música e, portanto, recebe a união das permissões.

## Domínios e entidades

| Domínio          | Rota                              | Recurso da API                     | Observação                                                    |
| ---------------- | --------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| Portal           | `/`, `/agenda`, `/blog`, `/sobre` | `media`, `presentations` (público) | Sem autenticação                                              |
| Usuários         | `/gestao/usuarios`                | `users`                            | Conta, e-mail e `roles[]`                                     |
| Alunos e músicos | `/gestao/pessoas`                 | `people`                           | Uma pessoa, dois papéis possíveis                             |
| Músicas          | `/gestao/musicas`                 | `songs`                            | Partituras MusicXML em `scores[]`                             |
| Patrimônio       | `/gestao/patrimonio`              | `patrimony`                        | Bens da associação                                            |
| Instrumentos     | `/gestao/instrumentos`            | `patrimony`                        | Mesmo registro, `category: "instrument"` + atributos musicais |
| Apresentações    | `/gestao/apresentacoes`           | `presentations`                    | `isPublic` define o que entra na agenda do portal             |
| Blog e mídias    | `/gestao/midias`                  | `media`                            | Conteúdo do portal (artigos, fotos, vídeos)                   |

Instrumento **é** patrimônio: não há coleção separada. A listagem de instrumentos filtra `category === "instrument"` e lê `instrument.family`, afinação, número de série, fabricante e modelo.

### Como adicionar um domínio novo

1. Criar tipos em `src/domains/<nome>/`.
2. Registrar o módulo em `src/domains/catalog.ts` (rótulo, ícone, rota, recurso da API).
3. Declarar ações por perfil em `src/core/auth/permissions.ts`.
4. Confirmar/criar o recurso correspondente no backend `bcl-api` e seu contrato.
5. Criar a rota em `src/app/gestao/<nome>/page.tsx`.

O menu e o painel passam a considerar o módulo automaticamente quando a permissão de leitura existir.

## Identidade visual

Cores, tipografia, raios e superfícies (header, sidebar, cartões) ficam em um único arquivo:

```text
src/core/theme/tokens.css
```

O restante do app deve usar essas variáveis (`--color-brand`, `--color-ink`, `--font-sans`, `--radius`, etc.). Paleta de referência: ciano `#00c2ce` e navy `#0b1c2c`, no espírito do site do Drone CI.

Logo e fotos institucionais estão em `public/assets/logo.png` e `public/imgs/`.

Tema claro/escuro: `src/contexts/ThemeContext.tsx` e a página `/configuracoes` (`/settings` redireciona para ela).

## Estrutura do projeto

```text
.
├── public/                      # logo, imagens, partituras MusicXML
└── src/
    ├── app/                     # rotas do portal, login, gestão e estudo
    ├── components/              # UI compartilhada e DomainWorkspace
    ├── contexts/                # autenticação e tema
    ├── core/
    │   ├── auth/                # papéis, permissões, máscara, usuários demo
    │   ├── navigation/          # menus público e interno
    │   └── theme/               # tokens visuais globais
    ├── domains/                 # entidades e catálogo de módulos
    ├── hooks/                   # CRUD genérico
    ├── layouts/                 # PublicShell, AppShell, RootShell
    ├── lib/                     # cliente HTTP
    ├── study/StudyPage.tsx       # tela da sessão de estudo (client-only)
    └── study/                   # player de partituras
```

`RootShell` escolhe o layout: visitante usa o header público; usuário autenticado usa a barra lateral filtrada pelo perfil.

## Rotas

### Portal (sem login)

- `/` — início institucional
- `/agenda` — apresentações com `isPublic: true`
- `/blog` e `/blog/[slug]` — mídias publicadas
- `/sobre` — texto institucional
- `/login` — autenticação pela API `bcl-api`

### Área interna (com login)

- `/gestao` — painel com os módulos permitidos
- `/gestao/usuarios`
- `/gestao/pessoas`
- `/gestao/musicas`
- `/gestao/patrimonio`
- `/gestao/instrumentos`
- `/gestao/apresentacoes`
- `/gestao/midias`
- `/profile` — dados da sessão
- `/configuracoes` — tema e preferências (`/settings` redireciona)

### Estudo e treinamento

- `/study` — músicas com partitura, preparação dos instrumentos e sessão com partitura e MIDI

## Backend e dados

Este repositório contém apenas o frontend. A API oficial é o projeto [`bcl-api`](https://github.com/thomazdevmaster/bcl-api); seus endpoints, autenticação, persistência e operação estão documentados no README de lá.

O frontend acessa a API pelo `NEXT_PUBLIC_API_URL`. IDs são gerados pela API, contas usam `roles[]` e partituras ficam em `songs.scores[].url`. No desenvolvimento em rede local, `/dev-api` encaminha requisições do navegador para a API Dockerizada em `localhost:8080`.

## Fluxos

### Visitante

Abre o portal, navega pelo menu superior e entra em `/login` quando quiser acessar a gestão.

### Sessão

O login e a validação da sessão usam a API `bcl-api`. Contas de demonstração são fornecidas pelo seed de desenvolvimento do backend, não pelo frontend. Com “Manter conectado”, a sessão fica em `localStorage`.

### Gestão

`/gestao` lista apenas o que a união dos perfis pode ler. Cada página de domínio permite visualizar, criar, editar e excluir conforme as permissões, com máscara de dados quando aplicável.

### Estudo de partituras

O módulo `/study` lista as músicas que possuem MusicXML. Antes de iniciar, o usuário escolhe separadamente os instrumentos visíveis na partitura e os instrumentos reproduzidos pelo MIDI. A sessão oferece player, andamento, volume, metrônomo e loop.

## Observações

- O fluxo oficial usa o App Router. A rota `/study` carrega sua interface client-side porque o renderizador de partituras depende do navegador.

## Lint

```bash
npm run lint
```

## Próximos passos

- Substituir IDs digitados manualmente por seletores de pessoas, instrumentos e músicas.
- Persistir sessões, progresso e histórico de treinamento por aluno ou músico.
- Polir a UI em cima dos tokens globais.
- Evoluir os fluxos do frontend junto ao contrato mantido no repositório `bcl-api`.
