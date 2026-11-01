# PR 105 Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Corrigir os comportamentos e regressões apontados na revisão do PR #105.

**Architecture:** Ajustar as seams atuais do frontend: folha compartilhada, roda do calendário, tabela/formulário da agenda, links de notificação e carregamento de opções. Preservar o contrato da API externa e registrar dependências que não podem ser confirmadas neste repositório.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

**Spec:** Revisão e comentários inline do PR #105 em `https://github.com/thomazdevmaster/bcl-next/pull/105`.

## Global Constraints

- Usar Tailwind nos componentes alterados e manter suporte a mobile e desktop.
- Não criar endpoints ou mocks no frontend; o `bcl-api` é a fonte do contrato.
- Mudanças funcionais devem incluir regressões automatizadas e executar testes focados e suíte completa.
- Não fazer mudanças no backend nem publicar/pushar o PR nesta tarefa.

## Review Focus

- A folha aberta durante fullscreen deve ficar acima da partitura e devolver foco/scroll ao fechar (teste de `StudyMobileSheet`).
- As opções extremas da roda desktop devem permanecer selecionadas após scroll (testes da função de posição e interação do `IconCalendar`).
- Datas da agenda devem mostrar America/Sao_Paulo no desktop e cartão mobile (testes de formatação).
- Texto livre na agenda deve manter filtro de texto; tipo/status seguem filtros fechados (testes de variantes de coluna).
- Erros de carga e de salvamento de tipos devem ter ciclo de vida independente (testes do painel).

---

### Task 1: Corrigir camadas do Sheet e roda horária

**Files:** `src/components/shared/Sheet.tsx`, `src/components/shared/IconCalendar.tsx`, `src/components/shared/calendarDateDraft.ts`, seus testes.

- [x] Fixar no teste de fullscreen que o conteúdo/overlay do Sheet usa camada maior que `z-[1300]`.
- [x] Fixar no teste desktop que scrollTop 0 e as posições extremas não alteram a seleção para 03.
- [x] Aplicar camada acima dos overlays do estudo e padding centralizador desktop de 90px, calculando índice compatível com padding.
- [x] Executar testes focados antes e depois das mudanças.

### Task 2: Corrigir datas, filtros, permissões e estados da agenda

**Files:** `src/components/domain/formatCell.ts`, `table-columns.ts`, `PresentationTypesPanel.tsx`, testes de domínio correspondentes.

- [x] Cobrir data/hora da agenda em America/Sao_Paulo independente do fuso do runtime.
- [x] Cobrir filtro `text` para título/local e `select` para `eventType.name` e status.
- [x] Cobrir edição de tipo para conta com permissão `presentations:update` sem papel maestro.
- [x] Cobrir erro de salvamento seguido de Cancelar sem exibir erro de carga na lista.

### Task 3: Corrigir links e navegação redundante

**Files:** `src/domains/notifications/links.ts`, testes, `src/app/gestao/apresentacoes/page.tsx` e teste de redirect.

- [x] Cobrir destino `/gestao/agenda?evento=...&modo=editar` para notificação de apresentação.
- [x] Remover a página intermediária redundante e preservar o redirect centralizado em `next.config.ts`.

### Task 4: Adiar carga do repertório até abrir formulário

**Files:** `src/components/domain/DomainWorkspace.tsx`, `domainWorkspaceChoiceHooks.ts`, testes de workspace e hooks.

- [x] Cobrir que montar agenda não requisita `/songs`.
- [x] Cobrir que abrir criação/edição carrega `/songs` uma vez e mantém a seleção disponível.
- [x] Ativar a carga apenas enquanto o formulário de apresentação estiver aberto.

### Task 5: Tratar comentários que dependem de confirmação externa

**Files:** `src/domains/presentations/schemas/crud-form.schema.ts`, `src/domains/crudConfig.ts`, `.gitignore` (se confirmado pelo estado do repositório).

- [x] Consultar contrato documentado disponível para `eventTypeId` opcional em edição de registros legados; não endurecer validação sem evidência compatível com a API.
- [x] Manter publicação coordenada com `/presentation-types` e `eventTypeId` como dependência explícita do `bcl-api`.
- [x] Revisar exclusões `target/` e `.metrics/`; manter apenas artefatos locais relevantes a este frontend.

### Task 6: Verificação

- [x] Rodar testes focados para os comportamentos alterados.
- [x] Rodar suíte completa, lint e checagem TypeScript nos arquivos tocados.
- [ ] Verificar o fluxo visual autenticado no browser em mobile e desktop; a sessão disponível não permite acessar gestão/estudo.
