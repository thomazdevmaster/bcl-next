<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agentes — Banda Carmelitana (`front-next`)

Frontend Next.js 16 / React 19 da Banda Carmelitana Luminarense: portal público, gestão interna e modo de estudo. Idioma da interface: **pt-BR**.

Leia este arquivo antes de alterar código. Complementos: `README.md`, `docs/arquitetura-backend.md` e, para história da banda, `docs/historia-banda.md`.

## História da banda (fonte da verdade)

A memória institucional da Banda Carmelitana Luminarense **não se inventa** e **não se completa** com texto de turismo, Wikipedia ou conhecimento geral do modelo.

1. **Fonte primária:** `src/assets/A PRESENÇA DA MÚSICA NA HISTÓRIA LUMINARENSE (2023).pdf` — Hugo Nicodemos Biavati, *A Presença da Música na História Luminarense (1894 a 1978)*.
2. **Base de conhecimento para agentes:** `docs/historia-banda.md` (síntese obrigatória desse PDF). Trate o que está ali como **verdade**. Em conflito com a página Sobre, seeds, copy antiga ou sites externos, **prevalece o livro**.
3. O volume cobre **1894–1978**. Fatos posteriores só entram se já estiverem no produto (contato, CNPJ, sede atual) ou se o próprio livro os registrar (ex.: mortes de Sinhô e Nem, reformas da sede).
4. Ao escrever ou alterar Sobre, home, blog, legendas, textos de seed ou qualquer menção histórica: ler `docs/historia-banda.md` **antes**. Não usar a narrativa de “músicos solitários nas montanhas” nem a data **1910** como fundação da associação — o livro funda a corporação em **1894** (Américo José da Costa) e o primeiro estatuto em **1912**.
5. Distinguir sempre as três corporações: BCL (1894, a que permanece), Banda dos Vitorinos / Crioulos do Mata-Boi, e Euterpe Aparecida (1925).

## Produto

- Visitante: Início, Agenda, Blog, Sobre, História. Sem login.
- Após login: `/gestao` e módulos permitidos pelo perfil.
- `/study`: treino com partitura (OSMD) e MIDI. Só músicas com MusicXML. Modal escolhe instrumentos **visíveis** e instrumentos **do áudio**, de forma independente.

Perfis autenticados: `aluno`, `musico`, `maestro`, `admin`. Conta tem `roles[]`. **Permissões = união** dos perfis (o mais permissivo vence). Maestro não atribui `admin`. Aluno/músico veem dados pessoais mascarados; maestro/admin não.

## Onde o código vive

Fluxo oficial: **App Router** (`src/app/**`).

| Pasta | Uso |
| --- | --- |
| `src/app/` | Rotas |
| `src/domains/` | Entidades, catálogo, CRUD config, seed |
| `src/core/auth/` | Papéis, permissões, máscara |
| `src/core/theme/tokens.css` | Cores, tipo, raios — não espalhar hex solto |
| `src/components/domain/` | Workspace genérico de gestão |
| `src/study/` (incl. `StudyPage.tsx`) | Sessão de estudo (client-only; OSMD/player usam `window`) |
| `src/lib/api.ts` | HTTP da API (`NEXT_PUBLIC_API_URL`, fallback `http://localhost:3001`) |

Não recriar `/students`, `src/legacy-pages` nem CRUD paralelo. IDs de registro: **só a API** (não `crypto.randomUUID()` no POST).

Novo domínio: tipos em `src/domains/<nome>/` → `catalog.ts` → `permissions.ts` → `crudConfig.ts` → rota em `src/app/gestao/` → seed em `db.json`.

## Boas práticas (obrigatório)

- **Estilização de UI: usar Tailwind CSS em 100% dos componentes e páginas novos ou alterados.** Escreva os estilos nas classes utilitárias do Tailwind; não crie arquivos CSS/SCSS por componente, módulos CSS/SCSS ou folhas separadas para implementar layout, cores, espaçamento, tipografia ou responsividade. Use folhas globais existentes somente para a importação/configuração do Tailwind, tokens do tema e estilos base realmente globais; mantenha CSS de terceiros apenas quando uma dependência exigir sua folha própria.
- TypeScript estrito: sem `any` novo; tipos de domínio explícitos.
- Client vs server: `'use client'` só quando houver estado, eventos ou APIs de browser. Não hidratar sessão do `localStorage` no SSR (usar o padrão já em `AuthContext`).
- Permissões no **cliente e, no futuro, no servidor**. UI que esconde botão não é segurança.
- Formulários: validar no cliente; telefone com máscara; menor de idade exige responsável; e-mail/documento únicos onde já existir regra.
- Acessibilidade: `label`, `aria-*` em diálogos, foco e teclado. Ícones Material com `aria-label` quando não houver texto.
- Performance: listas virtuais só se necessário; imagens com `next/image`; MusicXML/MIDI grandes não devem ser convertidos de novo no React quando o backend existir (ver arquitetura).
- Não commitar segredos. Não versionar XML/MIDI de produção em `public/` como fonte da verdade.
- Não expandir escopo: sem microserviços, BFF extra ou segundo CRUD “só para estudo”.
- Lint/tipos nos arquivos tocados. O ESLint global ainda pode falhar em código antigo do player — não “consertar o mundo” sem pedido.
- Na dúvida de produto: perguntar.

## Celular e uso real (obrigatório)

Alunos e músicos treinam **no telefone**, muitas vezes em 4G, tela estreita e uma mão.

Toda UI nova ou alterada deve funcionar em viewport ~360px **e** desktop (~960px+, breakpoint do `AppShell`). Estudo usa ~600px para tela cheia móvel.

Checklist:

1. **Toque:** alvos ≥ 44px; não depender de hover. Botões de play/pausa/estudo usáveis com o polegar.
2. **Layout:** tabela de gestão/estudo com scroll horizontal se preciso; em mobile, preferir cartão ou ações no final da linha, não oito colunas apertadas.
3. **Modais:** caber na viewport (`max-h` + scroll interno); teclado virtual não esconder Salvar/Continuar.
4. **Rede:** não baixar partitura completa de 16 naipes duas vezes sem necessidade; estados de loading/erro visíveis; falha de API mock não quebrar a página.
5. **Estudo:** partitura rolável; player fixo ou acessível sem cobrir o XML inteiro; fullscreen no móvel já existente deve continuar usável; pause ao trocar de aba.
6. **Gestos:** evitar `position: fixed` que brigue com a barra de endereço do iOS sem `dvh` / safe-area.
7. **Verificar** o fluxo no browser em desktop **e** largura mobile antes de encerrar tarefa de UI (não só screenshot).

Não assumir mouse, tela larga ou Wi-Fi estável.

## API e backend (ainda mock)

Hoje: `json-server` + `db.json`. Contrato a preservar: `roles[]`, IDs no servidor, `songs.scores[].url`.

Alvo (não implementar sozinho): um monólito (Python ou Java) + PostgreSQL + bucket S3/MinIO; MIDI gerado em worker/job, não no request de CRUD e não no celular. Detalhe em `docs/arquitetura-backend.md`.

## Como rodar

Dois processos: `npm run api:server` (3001) e `npm run dev` (3000). Contas demo no README.

## O que não fazer

- Gerar `id` no POST do front.
- Um único `role` por usuário.
- Restaurar legado de alunos.
- OSMD/player em Server Component.
- MIDI síncrono pesado no clique “Iniciar estudo” quando existir worker.
- Ignorar mobile porque “a gestão é de desktop”.
