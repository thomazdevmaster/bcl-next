# Issue #8 — [Melhoria] Conferir e Padronizar formulários de gestão (CRUD legado)

- Issue: https://github.com/thomazdevmaster/bcl-next/issues/8
- SPEC: [issue-8-formularios-gestao.md](../specs/issue-8-formularios-gestao.md).
- Estado no GitHub observado em 2026-10-28: aberta; atribuída a `kjunda01`; label `enhancement`; sem milestone.
- Status real do código: **implementação concluída para os cinco CRUDs; a pessoa usuária confirmou a validação real em mobile e desktop**.
- Última verificação: 2026-10-28.
- Branch preparada: `feat/issue-8-padroes-formularios-gestao`, base `180365f` (`origin/main`).

## Contexto original observado

Prioridade declarada: P1. Estimativa PERT declarada: O=5, M=10, P=20; Te=(5+4×10+20)/6=10,83 pessoa-dias.

Comentários: nenhum.

Projeto: `gh issue view` retornou `projectItems: []`. Eventos paginados registraram `project_v2_item_status_changed` em 2026-10-21 14:31:07Z e 14:31:11Z, 2026-10-21 17:42:26Z, 2026-10-27 19:33:06Z e 19:33:20Z e 2026-10-28 11:28:34Z; também houve remoção do projeto em 2026-10-21 15:12:04Z e inclusão em 14:31:07Z e 17:42:25Z. A API de eventos não forneceu nome do projeto, campo ou valores de status.

Referências consultadas: PR #7 (`fix/formularios`) está merged; sua descrição relata UserManagementWorkspace em etapas pessoal/responsável/acesso/permissões e senha padronizada. Issues #53 (P3, aberta) propõe convergir `UserManagementWorkspace` e `DomainWorkspace`; #54 (P3, aberta) propõe migrar CRUDs legados para FormStage/Zod. Busca de PRs com `gh pr list --search 'issue:8'` não encontrou PR vinculado à #8. Isso não invalida a referência explícita ao PR #7. Comentários da #8: nenhum; `gh issue view` retornou `comments: []` e consulta paginada de comentários retornou lista vazia.

## Decisões da entrevista (2026-10-28)

- Escopo acordado: todos os cinco recursos genéricos em `DomainWorkspace`: pessoas, músicas, patrimônio, instrumentos e apresentações. Outros fluxos de formulários próprios e a reescrita de `UserManagementWorkspace` permanecem fora do escopo.
- Preservar comportamentos, regras e dados/payloads existentes; melhorar composição e validação cliente.
- Seguir o padrão de formulários descrito em `AGENTS.md`: schemas Zod no domínio, React Hook Form, biblioteca compartilhada e acessibilidade.
- Dividir em etapas os cinco formulários onde houver grupos viáveis, usando como referência o fluxo responsivo já implementado em Usuários. A divisão proposta na entrevista: pessoas (dados pessoais/contato/responsável; perfis; acesso), músicas (partitura; dados/visibilidade), patrimônio (identificação/aquisição; localização/responsável/dados do instrumento), instrumentos (identificação; características musicais), apresentações (dados/datas; repertório/publicação). Validar a composição concreta na SPEC.
- A pessoa confirmou o entendimento consolidado (Q6 = sim).
- A ferramenta Skill/skill `brainstorming` não estava disponível. Depois da entrevista confirmada, a pessoa autorizou prosseguir com a implementação; o desenho executável e os critérios estão registrados na SPEC vinculada acima.

## Critérios de aceite — status atual

- [x] Pelo menos pessoas e patrimônio (e também músicas, instrumentos e apresentações) seguem o padrão novo.
- [x] Validação cliente equivalente ou melhor, concentrada nos schemas Zod e complementada pela validação autoritativa da API.
- [x] Etapas e modais validados pela pessoa usuária em uso real no celular e no desktop.
- [x] Acessibilidade de labels/erros por campo e layout em ~360 px confirmados pela pessoa usuária.
- [x] Permissões, máscara PII, endpoints e payloads preservados no escopo: os handlers e fluxos existentes foram mantidos.

O snapshot integral da issue abaixo mantém as caixas como foram consultadas originalmente; esta lista registra o resultado atual da implementação.

## Matriz de requisitos após implementação

| Requisito original (citação curta ou referência ao trecho)                       | Status                       | Evidência no código ou pendência                                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Pelo menos pessoas + patrimônio (ou músicas) no padrão novo.”                   | Implementado                 | Os cinco recursos acordados têm schemas próprios por domínio, etapas em `crudConfig.ts` e composição RHF em `EntityForm.tsx`.                                                                                           |
| “Validação cliente equivalente ou melhor que hoje.”                              | Implementado no cliente      | Schemas/Zod concentram obrigatoriedade, regras cruzadas, telefone, CPF/RG, datas, URLs e dependências; `DomainWorkspace` mantém unicidade e API. A validação do backend continua autoritativa.                          |
| “Mobile: etapas/modais usáveis no celular.”                                      | Validado pela pessoa usuária | A pessoa usuária confirmou que exerceu o fluxo real em celular e desktop e que ambos passaram. `DomainWorkspace` usa `placement="mobile-full"`; `EntityDialog` ocupa `100dvh` no mobile e fica centralizado no desktop. |
| “~360px; labels e erros por campo”                                               | Validado pela pessoa usuária | Campos usam shell compartilhado, mensagens associadas e controles customizados; a pessoa usuária confirmou a validação real em mobile e desktop.                                                                        |
| “Reutilizar máscaras e mensagens já usadas em cadastro/login.”                   | Implementado                 | Telefone e username reutilizam helpers existentes. CPF usa o validador do domínio; a máscara permanece transformação de apresentação.                                                                                   |
| “Manter permissões e máscara PII.”                                               | Preservado por escopo        | Lógica de permissões/máscara, handlers, endpoints e payloads foram mantidos; não houve revisão integrada autenticada por perfil.                                                                                        |
| Fora de escopo: “Reescrever `UserManagementWorkspace` inteiro (ver GES-03 #53).” | Fora do escopo acordado      | `UserManagementWorkspace` não foi reescrito; componentes compartilhados receberam suporte opcional a `readOnly`, `step` e classe do rótulo.                                                                             |

## Implementação e verificações (2026-10-28)

- `EntityForm` usa React Hook Form, `FormProvider`, schema discriminado por recurso, campos/shells compartilhados, navegação progressiva e ações compartilhadas. O fluxo MusicXML conserva upload e extração de metadados; modo de leitura, edição, unicidade e payload/API permanecem no workspace.
- `crudConfig.ts` permanece como metadados de composição (rótulos, tipos, opções, etapas, máscaras/formatos e transformações), sem segundo sistema de validação para os cinco recursos. A configuração do documento da pessoa formata CPF/RG; a validação está em `people/schemas/crud-form.schema.ts`. Closures `validate` restantes são de usuários e mídias, fora do escopo acordado.
- `npx tsc --noEmit`: passou. ESLint passou nos arquivos alterados exceto `DomainWorkspace.tsx`, que reporta o erro preexistente `react-hooks/set-state-in-effect` no efeito de carregamento inicial, confirmado em `HEAD`.
- `git diff --check`: passou. Nenhum teste automatizado foi executado.
- A pessoa usuária confirmou ter validado o uso real em celular e desktop e que ambos passaram. Em verificação independente anterior, o browser local redirecionou `/gestao` para a área pública por falta de sessão; portanto, o registro do fluxo autenticado é uma confirmação da pessoa usuária, não uma captura independente anexada ao repositório.
- `DomainWorkspace` usa posicionamento `mobile-full`; `EntityDialog` define altura `100dvh` no mobile e enquadramento central limitado no desktop. Uma verificação anterior confirmou o retângulo do diálogo em 360×800.
- Correção de seletores: selects de escolha única dos cinco CRUDs usam `IconSelect` com ícones, ligado ao RHF e às mensagens acessíveis; cadastros novos começam em “Selecione…” e schemas Zod exigem a escolha para campos obrigatórios/condicionais. Edição e leitura preservam valores existentes. `AGENTS.md` aponta também para `ResponsiveTabs` na página Perfil. O cálculo da altura do menu inclui a borda, evitando rolagem residual com duas opções.
- Revisão da implementação: não foram encontrados bloqueios claros de padrão ou divergências funcionais nos cinco CRUDs. A validação condicional de campos de aluno/músico foi centralizada em `people/profileValidation.ts`; cada schema mantém seus caminhos e mensagens. O nome de usuário vazio permanece permitido por regra anterior: a API o gera automaticamente. A revisão do agente não exercitou permissões e máscara PII com cada perfil autenticado; a lógica existente permanece no workspace.

## Snapshot integral da issue

```markdown
## Metadado

- **Código plano:** `FEAT-08`
- **Prioridade produto:** P1

## Priorização (PERT — person-days)

|                              | Dias      |
| ---------------------------- | --------- |
| Otimista (O)                 | 5         |
| Mais provável (M)            | 10        |
| Pessimista (P)               | 20        |
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
