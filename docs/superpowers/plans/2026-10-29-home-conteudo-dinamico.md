# Home com conteúdo dinâmico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar a home pública com feeds independentes de posts publicados e eventos futuros, configuração de feed vazio e CTA de cadastro.

**Architecture:** Manter a home como Client Component e carregar configuração, apresentações e mídias em chamadas concorrentes com falha independente. Persistir `hideWhenEmpty` no documento homepage JSONB já existente, reaproveitando a gestão e o CTA atuais.

**Tech Stack:** Next.js 16.2.2, React 19, TypeScript, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-10-29-home-conteudo-dinamico-design.md`

## Global Constraints

- As seções de posts e eventos são ambas obrigatórias.
- Admin controla quantidade (1 a 6), título, ordem entre seções e `hideWhenEmpty` sem redeploy.
- `hideWhenEmpty` começa `true`; feed vazio bem-sucedido é ocultado quando ligado e usa o estado vazio atual quando desligado.
- Falha de posts/eventos oculta só o feed afetado, sem alerta técnico ao visitante; falha da configuração usa defaults e mantém feeds carregados.
- Posts da home aparecem por publicação mais recente; eventos aparecem por data/hora crescente e respeitam `isPublic`, status e data futura.
- CTA visitante reutiliza campos atuais, navega para `/cadastro` e inclui o convite acordado; CTA autenticado preserva o comportamento atual.
- Não alterar seeds, backend, conteúdo já persistido, nem criar mocks de API no produto.
- Todo estilo novo/alterado usa Tailwind; alvos interativos com pelo menos 44 px; testar em viewport móvel e desktop.
- Testes Vitest e infraestrutura de teste estão adiados até a atualização futura da branch com `main`, conforme orientação do usuário.

## Review Focus

- API homepage falha, mas apresentações e mídias respondem: usar `defaultHomepage` e mostrar os feeds que responderam.
- API de apresentações falha, mas mídias respondem: ocultar só a seção de eventos.
- API de mídias falha, mas apresentações respondem: ocultar só o blog.
- API responde com sucesso sem eventos ou posts: aplicar `hideWhenEmpty` sem tratar vazio como falha.
- Dados antigos de homepage sem `hideWhenEmpty`: preencher `true` ao normalizar, preservando campos configurados.

---

### Task 1: Adiada — infraestrutura de Vitest

Instalação e criação de testes foram adiadas a pedido do usuário até a branch ser atualizada com `main`, que deverá trazer a infraestrutura. Não executar esta tarefa nesta rodada.

### Task 2: Modelar e editar `hideWhenEmpty`

**Files:**

- Modify: `src/domains/homepage/types.ts`
- Modify: `src/components/homepage/HomepageEditor.tsx`

**Interfaces:**

- `FeedSection` passa a expor `hideWhenEmpty: boolean`.
- Feeds `events` e `blog` em `defaultHomepage()` usam `hideWhenEmpty: true`.
- `parseHomepagePayload` usa `asBoolean(raw.hideWhenEmpty, base.hideWhenEmpty)`.

- [x] Acrescentar o campo ao tipo, defaults e parser sem alterar o payload/contrato da API.
- [x] Adicionar checkbox nativo com label “Ocultar quando não houver conteúdo” em `FeedFields`, usando `FormFieldValidationShell` e alvo mínimo de 44 px.

### Task 3: Isolar carregamento e falhas dos feeds na home

**Files:**

- Modify: `src/app/page.tsx`
- Modify: `src/components/public/HomePageContent.tsx`
- Modify: `src/lib/publicPortal.ts`

**Interfaces:**

- `HomePageContent` recebe estado independente `loading | success | failed` para `events` e `blog`; remove `portalError` global e `postOrder` da home.
- `latestPublishedMediaPosts(items: MediaPost[]): MediaPost[]` retorna apenas posts publicados, por `publishedAt` decrescente com `createdAt` como fallback.
- A página consulta `/homepage`, `/presentations` e `/media` de forma independente; não busca `/blogpage` para ordenar a home.

- [x] Implementar chamadas independentes concorrentes que atualizam cada estado ao concluir; falha de homepage usa defaults e falha do feed marca somente aquele feed.
- [x] Implementar helper específico de home, preservando `publishedMediaPosts(items, orderIds)` usado por `/blog`.
- [x] Atualizar `HomePageContent`: estado neutro enquanto busca; ocultar feed falho; no sucesso vazio aplicar `hideWhenEmpty`; manter estado vazio existente quando configurado para mostrar vazio.

### Task 4: Atualizar CTA visitante existente

**Files:**

- Modify: `src/domains/homepage/types.ts`
- Modify: `src/components/public/HomePageContent.tsx`

- [x] Atualizar os valores padrão do CTA visitante com o convite aprovado e rótulo de cadastro; não inserir texto fixo no JSX.
- [x] Alterar somente o destino visitante do CTA para `/cadastro`, mantendo a rota autenticada atual.

### Task 5: Verificar critérios no browser e revisar o resultado

**Files:**

- Review: todos os arquivos listados acima.

- [x] Lint dos arquivos alterados (`npx eslint ...`) e checagem TypeScript (`npx tsc --noEmit`) passaram.
- [x] Home verificada em 360 px e 1280 px; CTA navegou a `/cadastro`. `/gestao/home` redirecionou para login sem autenticação; o editor não foi aberto no browser.
- [x] API de desenvolvimento indisponível em `localhost:8080`; a seed demo não pôde ser verificada em execução, sem mocks no frontend.
- [x] Diff revisado; nenhuma seed, backend ou conteúdo persistido foi alterado.
- [x] Adiamento de Vitest registrado para retomada após atualização futura da branch com `main`.
- [x] Revisão independente: chamadas passaram a atualizar cada feed/configuração sem aguardar as demais; checkbox novo usa o shell compartilhado de validação. A migração completa do editor legado para React Hook Form/Zod permanece fora do escopo desta mudança pontual.

Testes não serão adicionados nem executados nesta rodada, por orientação explícita do usuário.
