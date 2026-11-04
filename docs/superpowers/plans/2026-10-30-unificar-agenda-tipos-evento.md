# Unificar agenda e tipos de evento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unificar gestão e portal sob Agenda, permitindo administrar tipos e identificá-los nos eventos sem perder compatibilidade, repertório ou a visibilidade escolhida.

**Architecture:** Preservar `presentations` e o `DomainWorkspace` existente. Criar a rota principal `/gestao/agenda`, uma seção interna de administração de tipos composta com os formulários compartilhados e um redirecionamento da rota antiga. A API segue como autoridade para persistência, IDs e permissões.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, Tailwind CSS, Zod, React Hook Form, Vitest e Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-30-unificar-agenda-tipos-evento-design.md`

## Global Constraints

- Escopo exclusivamente frontend `bcl-next`; não alterar `bcl-api`, migrações ou seeds.
- Preservar o recurso `presentations`, o formulário atual de eventos, IDs e repertório associado.
- Usar `GET /presentation-types` e as operações de catálogo acordadas com a API; não criar mocks como fonte de dados nem IDs no frontend.
- Tipos iniciais são fornecidos pela API: **Apresentação/concerto**, **Encontro de banda** e **Outros**.
- Maestro/admin podem criar, editar e desativar tipos personalizados; tipos predefinidos permanecem ativos e não podem ser excluídos. Não implementar exclusão de tipos.
- Tipo inativo continua visível em eventos existentes e só pode permanecer selecionado na edição desses eventos.
- Tipo preenche `isPublic` ao ser escolhido num evento novo; depois de uma alteração manual de visibilidade, trocar o tipo não sobrescreve a escolha.
- Formulários seguem schema Zod no domínio, React Hook Form com `zodResolver`, `FormProvider`, `FormView`, componentes compartilhados, mensagens acessíveis e `noValidate`.
- Toda UI nova usa Tailwind, funciona a 360 px e desktop, oferece alvos de toque de pelo menos 44 px e mantém loading/erro visíveis.
- Ler a documentação Next.js instalada em `node_modules/next/dist/docs/` sobre páginas App Router e redirects antes de editar código de rota.
- Mudanças funcionais recebem testes de regressão; ao concluir, executar testes focados e suíte completa, além de lint/tipos nos arquivos alterados.

## Review Focus

- Uma resposta da API sem tipo/ícone ou com tipo desativado não pode quebrar a leitura ou edição de eventos existentes; cobrir fallback e preservação em `EntityForm.test.tsx` e `PresentationEventCard.test.tsx`.
- Alterar tipo antes de tocar a visibilidade deve atualizar o valor padrão, mas depois de uma interação manual deve preservá-la; cobrir os dois casos em `EntityForm.test.tsx`.
- Erro ou indisponibilidade da API de tipos deve produzir estado acessível de erro e permitir tentar novamente; cobrir em `DomainWorkspace.test.tsx` e `PresentationTypesPanel.test.tsx`.
- Maestro/admin podem gerir tipos e perfis sem autorização não recebem controles de escrita; cobrir no painel e no guard de gestão.
- A rota de compatibilidade deve preservar query params repetidos/valores codificados usados por deep links; cobrir `evento` e `modo` no teste de rota.

---

### Task 1: Completar integração do tipo no formulário e lista de eventos

**Files:**

- Modify: `src/domains/presentations/types.ts`
- Modify: `src/domains/presentations/schemas/crud-form.schema.ts`
- Modify: `src/domains/crudConfig.ts`
- Modify: `src/components/domain/DomainWorkspace.tsx`
- Modify: `src/components/domain/EntityForm.tsx`
- Modify: `src/components/domain/table-columns.ts`
- Modify: `src/domains/crud-form-schema.test.ts`
- Modify: `src/components/domain/DomainWorkspace.test.tsx`
- Modify: `src/components/domain/EntityForm.test.tsx`
- Modify: `src/components/domain/table-columns.test.tsx`

**Interfaces:**

- `PresentationType`: `{ id: number; name: string; icon?: string | null; isPublicByDefault: boolean; isActive: boolean; isSystem: boolean }`.
- `Presentation.eventType`: `{ id: number | null; name: string; icon?: string | null } | null | undefined` para leitura resiliente de payloads antigos.
- `DomainWorkspace` carrega tipos de `GET /presentation-types`; opções novas incluem somente tipos ativos.
- Criação envia `eventTypeId`; edição preserva seleção inativa/snapshot já associado.

- [x] **Step 1: Escrever ou ajustar testes** `presentationRequiresEventType`, `loadsPresentationTypesForEventForm`, `showsPresentationTypeLoadingAndError`, `inactiveTypeRemainsAvailableOnlyForExistingPresentation`, `selectingTypeUsesPublicDefaultBeforeManualVisibilityChange`, `changingTypePreservesManuallyChosenVisibility` e `managementEventRowShowsType`.
- [x] **Step 2: Confirmar RED**

Run: `npm test -- src/domains/crud-form-schema.test.ts src/components/domain/DomainWorkspace.test.tsx src/components/domain/EntityForm.test.tsx src/components/domain/table-columns.test.tsx`
Expected: os casos novos falham nas condições ainda não implementadas.

- [x] **Step 3: Completar os tipos, o schema, o mapeamento de payload e os controles compartilhados**. Na criação, aplicar o default do tipo até que a visibilidade tenha sido tocada; depois, preservar a escolha manual. Na edição, não alterar visibilidade quando o tipo mudar.
- [x] **Step 4: Confirmar GREEN**

Run: `npm test -- src/domains/crud-form-schema.test.ts src/components/domain/DomainWorkspace.test.tsx src/components/domain/EntityForm.test.tsx src/components/domain/table-columns.test.tsx`
Expected: testes focados aprovados.

---

### Task 2: Adicionar gestão de tipos dentro do módulo Agenda

**Files:**

- Create: `src/components/domain/PresentationTypesPanel.tsx`
- Create: `src/components/domain/PresentationTypesPanel.test.tsx`
- Create: `src/domains/presentations/schemas/event-type.schema.ts`
- Create: `src/domains/presentations/schemas/event-type.schema.test.ts`
- Create: `src/components/domain/PresentationManagementWorkspace.tsx`
- Create: `src/components/domain/PresentationManagementWorkspace.test.tsx`

**Interfaces:**

- O painel consome e atualiza `PresentationType` por `/presentation-types` usando `apiFetch`.
- Campos editáveis: nome, ícone opcional e `isPublicByDefault`; `isActive` permite desativar apenas tipos personalizados.
- Maestro/admin veem ações de gestão; outros perfis não recebem controles de escrita. A autorização da API continua obrigatória.
- Criar/editar usa `zodResolver(eventTypeSchema)`, `FormProvider`, `FormView`, `FormStageBlock`, `FormStageField`, `FormStageActions`, `FormFieldValidationShell` para o seletor de ícone e mensagens globais acessíveis.
- Não há operação de exclusão. Tipos de sistema não podem ser desativados.

- [x] **Step 1: Escrever testes** `requiresTrimmedNameAndPublicDefault`, `allowsOptionalIcon`, `showsLoadingState`, `showsApiErrorAndRetry`, `maestroAndAdminCanCreateAndEditCustomType`, `customTypeCanBeDeactivated`, `systemTypeCannotBeDeactivated`, `nonManagerCannotSeeWriteActions` e `showsApiFailureAccessibly`.
- [x] **Step 2: Confirmar RED**

Run: `npm test -- src/domains/presentations/schemas/event-type.schema.test.ts src/components/domain/PresentationTypesPanel.test.tsx`
Expected: falhas nos comportamentos ainda não implementados.

- [x] **Step 3: Implementar schema e painel** com o fluxo de formulário padrão, seletor compartilhado de ícones Material, estados de loading/erro e ações com alvo mínimo de 44 px. Conferir o contrato de integração disponível e usar os métodos/rotas de criação, edição e desativação já oferecidos pela API; se o contrato impedir o frontend, registrar a incompatibilidade sem alterar `bcl-api`.
- [x] **Step 4: Confirmar GREEN**

Run: `npm test -- src/domains/presentations/schemas/event-type.schema.test.ts src/components/domain/PresentationTypesPanel.test.tsx`
Expected: testes focados aprovados.

---

### Task 3: Unificar menu e rota de gestão

**Files:**

- Modify: `src/domains/catalog.ts`
- Create: `src/app/gestao/agenda/page.tsx`
- Modify: `src/app/gestao/apresentacoes/page.tsx`
- Create: `src/core/navigation/menus.test.ts`
- Create: `src/app/gestao/apresentacoes/page.test.tsx`
- Create: `src/components/domain/PresentationManagementWorkspace.test.tsx`

**Interfaces:**

- O domínio continua `presentations`, mas seu label/path de navegação tornam-se `Agenda` e `/gestao/agenda`.
- A rota nova compõe o CRUD existente com seção interna “Tipos de evento”, sem novo item no menu lateral.
- A rota antiga redireciona para a nova e preserva todos os query params.

- [x] **Step 1: Ler os guias instalados do Next.js 16 para App Router, `searchParams` e `redirect`; escrever testes** `managementMenuLabelsPresentationDomainAsAgenda`, `agendaIncludesEventsAndTypeManagement`, `legacyRouteRedirectsToAgenda` e `legacyRoutePreservesQueryParams`.
- [x] **Step 2: Confirmar RED**

Run: `npm test -- src/core/navigation/menus.test.ts src/app/gestao/apresentacoes/page.test.tsx src/components/domain/PresentationManagementWorkspace.test.tsx`
Expected: falhas nos novos rótulos/rotas.

- [x] **Step 3: Implementar navegação e rotas** usando a API App Router documentada na versão instalada, sem quebrar links de notificação antigos.
- [x] **Step 4: Confirmar GREEN**

Run: `npm test -- src/core/navigation/menus.test.ts src/app/gestao/apresentacoes/page.test.tsx src/components/domain/PresentationManagementWorkspace.test.tsx`
Expected: testes focados aprovados.

---

### Task 4: Exibir tipo na agenda pública

**Files:**

- Modify: `src/components/public/PresentationEventCard.tsx`
- Create: `src/components/public/PresentationEventCard.test.tsx`
- Create: `src/app/agenda/page.test.tsx`

**Interfaces:**

- Card público apresenta nome do tipo em badge e o ícone Material opcional com nome acessível.
- Eventos sem informação de tipo continuam renderizando sem falha; estados de carga, erro, ordenação e filtro de visibilidade atuais permanecem.

- [x] **Step 1: Escrever testes** `showsEventTypeBadge`, `showsOptionalTypeIconAccessibly`, `rendersEventWithoutType`, `publicAgendaContinuesFilteringEvents` e `publicAgendaContinuesSortingUpcomingAndPastEvents`.
- [x] **Step 2: Confirmar RED**

Run: `npm test -- src/components/public/PresentationEventCard.test.tsx src/app/agenda/page.test.tsx`
Expected: falha no badge ausente ou nos casos de compatibilidade novos.

- [x] **Step 3: Implementar o badge** usando Tailwind e o padrão visual existente.
- [x] **Step 4: Confirmar GREEN**

Run: `npm test -- src/components/public/PresentationEventCard.test.tsx src/app/agenda/page.test.tsx`
Expected: testes focados aprovados.

---

### Task 5: Verificação integrada do frontend

**Files:** todos os arquivos tocados nas Tasks 1–4.

- [x] **Step 1: Executar a suíte completa** com `npm test`.
- [x] **Step 2: Executar TypeScript** com `npx tsc --noEmit`.
- [x] **Step 3: Executar ESLint** nos arquivos alterados com `npx eslint <lista de arquivos alterados>`; reportar separadamente falhas antigas do player caso apareçam no escopo global.
- [ ] **Step 4: Verificar em browser** os fluxos de criar/editar/desativar tipo, criar/editar evento, redirecionamento legado e agenda pública em viewport de 360 px e desktop de aproximadamente 960 px; verificar teclado, foco, loading e erro de API. (Parcial: agenda pública verificada em 360 px/960 px; gestão e API não disponíveis sem login/serviço local.)
- [x] **Step 5: Conferir o diff** para confirmar que não há alterações no backend, mocks de API, IDs criados pelo frontend ou estilos fora de Tailwind para layout/composição de componentes.
