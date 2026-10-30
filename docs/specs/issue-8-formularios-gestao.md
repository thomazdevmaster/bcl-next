# SPEC — Issue #8: Conferir e padronizar formulários de gestão

- Issue: https://github.com/thomazdevmaster/bcl-next/issues/8
- Branch: `feat/issue-8-padroes-formularios-gestao`
- Base: `180365f` (`origin/main`)
- Status: implementação concluída para os cinco CRUDs; validação real mobile/desktop confirmada pela pessoa usuária; revisão técnica sem bloqueios claros (2026-10-28).

## Contexto original integral do GitHub

### Título

`[Melhoria] Conferir e Padronizar formulários de gestão (CRUD legado)`

### Corpo integral (snapshot consultado em 2026-10-28)

```text
## Metadado
- **Código plano:** `FEAT-08`
- **Prioridade produto:** P1

## Priorização (PERT — person-days)
| | Dias |
|---|-----|
| Otimista (O) | 5 |
| Mais provável (M) | 10 |
| Pessimista (P) | 20 |
| **Esperado Te = (O+4M+P)/6** | **10.83** |

---

## Descrição

Continuação do trabalho de #6/#7: formulários de **domínios de gestão** (pessoas, patrimônio, músicas, etc.) ainda usam padrão legado (`EntityForm`, validação manual) em `DomainWorkspace`, enquanto usuários já usam FormStage + Zod.

## Problema ou oportunidade

Inconsistência de UX, validação e acessibilidade entre módulos; duplicação de regras (CPF, telefone, menor + responsável).

## Proposta

- Migrar CRUDs prioritários para schemas Zod + FormStage (ou alinhar visual/comportamento).
- Reutilizar máscaras e mensagens já usadas em cadastro/login.
- Manter permissões e máscara PII.

## Área

- [x] Gestão (`/gestao`)

## Critérios de aceite

- [ ] Pelo menos pessoas + patrimônio (ou músicas) no padrão novo.
- [ ] Validação cliente equivalente ou melhor que hoje.
- [ ] Mobile: etapas/modais usáveis no celular.

## Mobile e acessibilidade

- [x] ~360px; labels e erros por campo

## Fora de escopo

- Reescrever `UserManagementWorkspace` inteiro (ver GES-03 #53).

## Referências

- `DomainWorkspace.tsx`, `crudConfig.ts`, branch `fix/formularios` (merged parcial PR #7)
- Issue relacionada: #53, #54
```

### Metadados, comentários, eventos e referências consultados

- Estado observado: aberta; responsável `kjunda01`; label `enhancement`; milestone ausente.
- A issue declara prioridade P1 e estimativa PERT de 10,83 pessoa-dias (`O=5`, `M=10`, `P=20`).
- Comentários: nenhum (`gh issue view` retornou `comments: []`; consulta paginada de comentários também retornou lista vazia).
- Campos de projeto: `gh issue view` retornou `projectItems: []`. Os eventos abaixo mostram inclusão/remoção e mudanças de status no board, mas os nomes de projeto/campo e valores não foram retornados pela API consultada.
- Eventos paginados: `project_v2_item_status_changed` em 2026-10-21 14:31:07Z e 14:31:11Z (`thomazdevmaster`); remoção de projeto às 15:12:04Z; label `enhancement` às 17:42:23Z; renomeação de `Ajuste formulários` para `[Melhoria] Padronizar formulários de gestão (CRUD legado)` às 17:42:23Z; inclusão no projeto e mudança de status pelo bot às 17:42:25Z e 17:42:26Z; mudanças de status por `thomazdevmaster` em 2026-10-27 19:33:06Z e 19:33:20Z; atribuição a `kjunda01` às 19:33:40Z; renomeação para o título atual às 19:33:41Z; mudança de status por `kjunda01` em 2026-10-28 11:28:34Z.
- PRs vinculados: busca `gh pr list --search 'issue:8'` não encontrou PR vinculado à #8. A issue cita o PR #7, merged, branch `fix/formularios`, cuja descrição relata `UserManagementWorkspace` em etapas pessoal/responsável/acesso/permissões e tela de alterar senha padronizada.
- Issue relacionada #53: aberta, código `GES-03`, prioridade declarada P3, “Gestão: convergir UserManagementWorkspace e DomainWorkspace”, descrição “Reduzir duplicação CRUD”, referência a `UserManagementWorkspace.tsx`.
- Issue relacionada #54: aberta, código `GES-04`, prioridade declarada P3, “Gestão: migrar CRUDs legados para FormStage/Zod”, referência a `crudConfig`, domain forms.
- Lacunas de acesso: os campos e valores do projeto GitHub não foram disponibilizados pelas consultas usadas. Não há comentários nem PR associado à #8 segundo os resultados consultados.

## Decisões acordadas

- Abrangência: todos os cinco recursos genéricos encaminhados por `DomainWorkspace`: pessoas, músicas, patrimônio, instrumentos e apresentações. Formulários de fluxos separados e refatoração de `UserManagementWorkspace` permanecem fora do escopo.
- O comportamento existente, regras de domínio, dados e payloads será preservado; o trabalho troca a composição/validação do formulário e melhora a experiência.
- Usar schemas Zod no domínio, React Hook Form, `FormProvider`, `FormView` quando compatível com o contexto, `FormStageBlock`, `FormStageField`, `FormFieldValidationShell`, `FormStageProgress` e `FormStageActions`.
- Reutilizar a navegação responsiva do exemplo de Usuários: seletor compacto no móvel e `FormStageProgress` no desktop; não permitir avançar antes de validar a etapa e não permitir navegar para etapas ainda não alcançadas.
- Dividir em etapas todos os cinco formulários onde houver separação viável e útil. O desenho inicial está abaixo; a divisão final pode ajustar os limites conforme dependências de campos e validação.
- Manter permissões, máscara PII, endpoints, contrato da API e feedback de salvamento existentes.
- A pessoa confirmou o entendimento consolidado da entrevista (Q6) e em seguida autorizou a implementação.

## Situação atual observada

- `DomainWorkspace` encaminha recursos distintos de `users` ao mesmo `EntityForm` e mantém valores/erros em estado controlado (`src/components/domain/DomainWorkspace.tsx`).
- `EntityForm` renderiza os campos a partir de `CrudField` em uma grade responsiva rolável, com condicionais e controles customizados; ainda não usa React Hook Form/FormProvider.
- Validação obrigatória/customizada e verificações de unicidade estão no workspace e em `crudConfig`; schemas Zod específicos para estes formulários ainda não existem.
- `EntityDialog` já tem portal, diálogo semântico, ciclo de foco, uso de `dvh`, confirmação ao fechar e contêiner scrollável.
- `UserManagementWorkspace` demonstra etapas e validação via schemas Zod e componentes compartilhados, mas sua implementação não será reescrita.
- Formulário de músicas tem caminho especial para MusicXML: valida tipo/conteúdo, extrai metadados e converte arquivo para valor enviado; isso precisa continuar integrado ao RHF sem duplicar parse.

## Desenho

### Composição

- Preservar `DomainWorkspace` como responsável por carregamento, permissões, chamada à API, mensagem geral de erro e pós-salvamento.
- Migrar o estado de campos de `EntityForm` para RHF. O envio deve usar `handleSubmit`; falhas de API ficam em mensagem global acessível.
- Criar um schema e tipo inferido por cada domínio coberto, no diretório `schemas/` desse domínio. Reutilizar as funções de domínio existentes para CPF, idade, telefone e URL do YouTube em vez de copiar sua lógica.
- Manter `CrudField`/`crudConfig` como descrição de apresentação/opções e transformação de payload onde isso simplificar a compatibilidade, mas não manter `validate` como segundo sistema de validação. Regras de validação migram para schemas.
- Usar `FormStageField` para entradas string suportadas; integrar checkbox, select, multiselect e arquivo a RHF e `FormFieldValidationShell`/`FormFieldStatusMessage`.
- O modal mantém o título acessível no `EntityDialog`; como composição em diálogo é uma exceção prevista no `AGENTS.md`, a implementação pode usar o contêiner de diálogo sem duplicar títulos do `FormView`, mas reutiliza os campos, mensagens, etapas e ações compartilhados.
- Manter create, edit e view read-only disponíveis. Etapas mantêm valores ao trocar; validação por etapa antes de avançar e validação total ao salvar.
- Preservar estado pendente, desabilitar ações durante envio, mensagem de envio, conversão de erros com utilitários existentes e payload/API atual.

### Divisão inicial por etapas

| Recurso       | Etapas iniciais                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Pessoas       | Dados pessoais, contato e responsável; perfis de aluno/músico; acesso/criação opcional de conta |
| Músicas       | Partitura MusicXML; dados da música e visibilidade                                              |
| Patrimônio    | Identificação e aquisição; localização, pessoa responsável e dados de instrumento condicionais  |
| Instrumentos  | Identificação e família; características musicais e status                                      |
| Apresentações | Dados e datas; repertório, publicação e notificação                                             |

Os grupos devem continuar curtos e coerentes em ~360 px. Campos condicionais devem aparecer na etapa do contexto a que pertencem. Se uma condição em etapa anterior mudar a validade de outra etapa, validar novamente a etapa afetada.

### Validação e compatibilidade de domínio

- Pessoas: preservar obrigatoriedade de nome/sobrenome/nascimento/telefone, CPF/RG condicionado ao tipo, responsável para menores e parentesco condicionado, regras de aluno/músico, nome de usuário e unicidade atual de e-mail/documento.
- Músicas: preservar título/compositor, visibilidade, campos condicionais, validação de link YouTube e formato/conteúdo MusicXML. Não apagar a partitura existente quando editar sem enviar outra.
- Patrimônio: preservar campos obrigatórios, categoria e campos de instrumento condicionais, vínculo opcional com pessoa e conversões numéricas.
- Instrumentos: preservar campos obrigatórios, status, transformação das tags separadas por vírgula e unicidade do nome.
- Apresentações: preservar título/local/início/status obrigatórios, transformações de datas e repertório, e envio opcional de notificação quando aplicável.
- Restrições de unicidade devem continuar oferecendo feedback cliente; validação autoritativa permanece no backend.
- Não adicionar/alterar endpoints, backend, persistência ou seeds.

### Responsividade e acessibilidade

- Usar Tailwind nas mudanças de UI; respeitar tokens do tema já existentes.
- Diálogo limitado à viewport, rolagem interna, área de ações sempre acessível e alvos de toque de pelo menos 44 px.
- Em ~360 px, seletor de etapas compacto e sem overflow horizontal crítico; validar no browser em mobile e desktop (~960 px+).
- Labels e erros associados ao campo por `aria-describedby`/`aria-invalid`; foco visível; navegação por teclado; erros gerais com `role="alert"`; não depender só de cor.
- Preservar pausa/fluxos existentes; sem mudança de comportamento fora do formulário.

## Critérios de aceite refinados

- [x] Os cinco CRUDs cobertos usam schema Zod do domínio, RHF/FormProvider e a composição compartilhada.
- [x] Regras existentes são preservadas e as validações cliente são equivalentes ou melhores; a validação do servidor continua autoritativa.
- [x] Cada formulário usa etapas onde há grupos viáveis, seguindo o modelo responsivo e mantendo valores/validando ao avançar.
- [x] Campos e erros têm associação acessível; ações têm alvos >=44 px e o diálogo funciona em ~360 px e desktop, conforme validação real confirmada pela pessoa usuária.
- [x] Permissões, máscara PII, endpoints, contrato, payloads e fluxos especiais foram preservados no código.
- [x] A pessoa usuária confirmou a validação real dos fluxos create/edit/view em desktop e mobile.
- [x] TypeScript passou. ESLint foi verificado; `DomainWorkspace.tsx` conserva um diagnóstico preexistente `react-hooks/set-state-in-effect`, confirmado na base, sem relação com a migração.

## Plano de implementação

1. Fazer inventário dos campos, condicionais, formatos e particularidades por recurso; conferir a versão atual do contrato e tipos locais.
2. Implementar schemas e tipos por domínio, migrando validações sem duplicar regras.
3. Atualizar composição RHF dos controles string e customizados; integrar upload MusicXML.
4. Adicionar etapas responsivas e validação progressiva; preservar create/edit/view e handler de API.
5. Rever estados de erro/carregamento, acessibilidade e mobile; ajustar detalhes encontrados na verificação visual.
6. Reavaliar cada requisito no código e atualizar `docs/issues/issue-8-formularios-gestao.md` e o índice.

## Fora do escopo

- Reescrever `UserManagementWorkspace` ou consolidá-lo com `DomainWorkspace`.
- Migrar outros formulários/workspaces que não sejam os cinco recursos genéricos acordados.
- Alterar o backend `bcl-api`, endpoints, modelo persistido ou contrato de payload.
- Fazer push, abrir PR ou fechar issue.

## Registro da revisão

- O desenho segue as decisões da entrevista Q1–Q6 e o padrão obrigatório de `AGENTS.md`.
- A skill local `brainstorming`/ferramenta Skill não estava disponível. O usuário autorizou prosseguir com a implementação; esta SPEC registra o desenho executável para auditoria, sem bloqueio adicional de aprovação.
- A implementação e o relato da validação real em desktop/mobile estão registrados no [acompanhamento da issue](../issues/issue-8-formularios-gestao.md). A revisão independente do agente ficou sem sessão autenticada; a confirmação dos fluxos reais é da pessoa usuária. A validação condicional compartilhada de campos de aluno/músico foi extraída para `src/domains/people/profileValidation.ts`; cada schema continua adaptando os caminhos de erro e mensagens da sua própria composição.
