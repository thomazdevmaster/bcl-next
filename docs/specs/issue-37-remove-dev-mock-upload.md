# SPEC — Issue #37: remover upload dev não autenticado com mock

- Issue: [#37 — Remover upload dev não autenticado com mock](https://github.com/thomazdevmaster/bcl-next/issues/37)
- Status: **SPEC em revisão**
- Branch: `fix/issue-37-remove-upload-mock`
- Commit base: `1b1cbcccddf83eebfe50ad867111afbd1eba52dc` (`origin/main`)
- Data da SPEC: 2026-10-24

## Objetivo

Remover o endpoint de upload local não autenticado do mock do Next.js. Uploads de arquivos devem usar a API configurada com uma sessão autenticada. A interface deve explicar e impedir o envio quando o mock está ativo ou quando não há sessão.

## Contexto observado no código

- `src/app/bcl-api/uploads/route.ts` aceita `POST` sem autenticação quando `usesRemoteApi()` é falso, grava os arquivos em `public/uploads` e devolve uma URL local. Quando a API remota está ativa, essa rota devolve 404.
- `src/lib/uploadMedia.ts` envia `POST` para `${getApiUrl()}/uploads`, mas o Bearer é opcional: o envio continua mesmo sem token.
- `getApiUrl()` aponta para `/bcl-api` quando o mock local está ativo e para a URL da API configurada quando `usesRemoteApi()` é verdadeiro.
- Os controles que chamam `uploadMediaFile` estão em `src/components/blog/PostEditor.tsx`, `src/components/blog/MediaSourceField.tsx` e `src/components/domain/users/UserPersonalContactStage.tsx` (`ProfilePhotoPicker`). `MediaSourceField` é usado por várias partes do editor de mídias.
- O `AuthContext` expõe `isHydrated` e `isLoggedIn`; `getAccessToken()` lê o token mantido pela camada de autenticação.
- Os campos para informar URLs manualmente são independentes do envio de arquivos e permanecem utilizáveis.
- `docs/arquitetura-backend.md` descreve uploads autenticados na API. O código do backend não está neste repositório; portanto, esta SPEC não altera nem confirma a implementação da API externa.

## Decisões acordadas na entrevista

1. Com `usesRemoteApi() === false`, os controles de seleção/envio de arquivo ficam desabilitados e mostram aviso acessível, por exemplo: “O envio de arquivos exige a API autenticada.”
2. `uploadMediaFile` bloqueia antes do `fetch` quando não há token.
3. Com a API remota configurada e sem token/sessão, os controles também ficam desabilitados com aviso acessível, por exemplo: “Entre na sua conta para enviar arquivos.”
4. Com sessão válida, o cliente envia para `/uploads` na API configurada com `Authorization: Bearer <token>`. A API continua responsável pela validação de autenticação.
5. O comportamento vale para todos os consumidores existentes de `uploadMediaFile`; a entrada manual de URLs permanece disponível.
6. A rota mock local será removida. A aplicação não deverá gravar novos uploads em `public/uploads` por esse endpoint.

## Desenho recomendado

Usar uma regra compartilhada de disponibilidade de upload ligada ao modo de API e ao estado de autenticação, consumida pela interface e pelo helper. A interface consulta o estado de hidratação do `AuthContext` para evitar exibir um aviso incorreto antes da sessão ser restaurada. Os avisos devem ser texto visível e acessível (por exemplo, `role="status"`). O helper mantém uma verificação própria antes de qualquer requisição, pois a desativação visual dos controles não é uma fronteira de segurança.

Remover `src/app/bcl-api/uploads/route.ts`. Os controles em `PostEditor`, `MediaSourceField` e `ProfilePhotoPicker` usam a disponibilidade compartilhada para desativar a seleção e apresentar o motivo. A API remota continua sendo chamada pelo helper existente, com Bearer obrigatório. Respostas de erro da API permanecem no fluxo atual de mensagens de usuário.

Alternativas consideradas:

- Repetir condições em cada formulário: implementação inicial simples, com risco de divergência entre consumidores.
- **Regra compartilhada para UI e helper (recomendada):** mantém uma decisão única e protege chamadas diretas ao helper.
- Componente React de upload único: oferece composição visual mais uniforme, mas exigiria refatorar controles com usos e layouts diferentes além do necessário nesta issue.

## Critérios de aceite

- [ ] A rota `src/app/bcl-api/uploads/route.ts` não existe mais; chamadas diretas a `/bcl-api/uploads` não executam armazenamento local e retornam o 404 normal do App Router.
- [ ] No modo mock, todos os controles de envio de arquivo estão desabilitados e apresentam aviso acessível como “O envio de arquivos exige a API autenticada.”
- [ ] Com API remota configurada e sem sessão/token, todos os controles de envio estão desabilitados e apresentam aviso acessível como “Entre na sua conta para enviar arquivos.”
- [ ] `uploadMediaFile` rejeita antes de chamar `fetch` quando o mock está ativo ou não há token.
- [ ] Com API remota e token, `uploadMediaFile` envia `POST` a `${getApiUrl()}/uploads` com `Authorization: Bearer <token>`.
- [ ] Os erros devolvidos pela API continuam chegando aos usuários pelo tratamento existente.
- [ ] Os campos de URL manual continuam disponíveis nos formulários atuais.
- [ ] Nenhum novo upload pelo mock é gravado em `public/uploads`.
- [ ] Nenhuma mudança é feita no backend externo nem nas permissões por papel.

## Plano de implementação e verificação

- Ler a documentação local do Next.js 16 pertinente a Route Handlers e remoção de rotas antes de alterar código, conforme `AGENTS.md`.
- Implementar a regra compartilhada para os consumidores existentes e remover a rota mock.
- Usar Tailwind nas classes dos componentes alterados; não criar folha CSS por componente.
- Conferir tipos e lint nos arquivos alterados.
- Verificar no browser o fluxo em desktop e em viewport móvel, conforme `AGENTS.md`: modo mock, API remota sem sessão, API remota autenticada e preservação da entrada manual de URL.
- Não adicionar nem executar testes automatizados sem pedido explícito de teste/verificação.
- A autenticação real do endpoint remoto depende do backend, que não está disponível neste repositório; validar visualmente que o cliente envia o Bearer não prova a política do servidor.

## Estado do escopo

- **Incluído:** remoção do endpoint mock; disponibilidade dos controles em mock/sem sessão; bloqueio no helper quando não há API remota ou token; envio autenticado pela API configurada; preservação de entradas manuais de URL.
- **Fora do escopo acordado:** mudanças no backend/API externa; alteração de autorização por papel; criação de armazenamento local alternativo; remoção de campos de URL manual.
- **Limitação observada:** a autenticação server-side da API externa não pode ser inspecionada neste repositório.

## Contexto original da issue — snapshot integral do GitHub

Snapshot carregado em 2026-10-24. O conteúdo abaixo preserva o título e o corpo retornados pela API do GitHub.

### Título

`[Melhoria] Remover upload dev não autenticado com mock`

### Corpo integral

```markdown
## Metadado
- **Código plano:** `SEC-05`
- **Prioridade produto:** P2

## Priorização (PERT — person-days)
| | Dias |
|---|-----|
| Otimista (O) | 0.5 |
| Mais provável (M) | 1 |
| Pessimista (P) | 2 |
| **Esperado Te = (O+4M+P)/6** | **1.08** |

*Te serve para ordenar o backlog; ajuste O/M/P quando refinarem.*

---

## Descrição

Endpoint `/bcl-api/uploads` deixa de existir com mock; uploads só via API autenticada.

**Refs:** `uploads/route.ts`.
```

### Metadados observados

- Estado: `OPEN`; criada em `2026-10-21T17:29:21Z`; atualizada em `2026-10-24T06:17:21Z`.
- Autor: `thomazdevmaster`.
- Responsável: `kjunda01`.
- Labels: `enhancement`.
- Milestone: nenhum.
- Prioridade explicitamente declarada: P2.
- Estimativa PERT explícita: O=0,5; M=1; P=2 pessoa-dias; Te informado pela issue=1,08 pessoa-dia.
- Projetos: a timeline confirma adição a um Project V2, mas nome/campos/valores não puderam ser lidos. A consulta GraphQL de `projectItems` exigiu o escopo `read:project`, ausente no token (`gist`, `read:org`, `repo`, `workflow`).

### Comentários

Nenhum comentário na issue (endpoint paginado de comentários retornou lista vazia).

### Eventos relevantes e referências

- `2026-10-21T17:29:23Z` — label `enhancement` aplicada por `thomazdevmaster`.
- `2026-10-21T17:29:24Z` — issue adicionada a um Project V2 por `thomazdevmaster`; projeto/campos não acessíveis com o escopo atual.
- `2026-10-21T17:29:25Z` — automação `github-project-automation[bot]` alterou status de item do Project V2; valor indisponível.
- `2026-10-24T06:16:59Z` — `kjunda01` alterou status de item do Project V2; valor indisponível.
- `2026-10-24T06:17:21Z` — issue atribuída a `kjunda01`.
- Referência no corpo: `uploads/route.ts`, resolvida no código atual como `src/app/bcl-api/uploads/route.ts`.
- Nenhum evento de referência cruzada para PR foi retornado na timeline.

### PRs relacionadas

**Nenhuma PR encontrada.** A busca completa de PRs de `kjunda01` em todos os estados retornou 10 resultados, abaixo do limite de 500. Foram conferidos títulos, branches, corpos e `closingIssuesReferences`; nenhum menciona ou fecha a #37 e não houve candidato provável. Por não haver PR candidata, não há comentários/revisões de PR relacionados a registrar.

### Lacunas de acesso

- Campos e valores do Project V2 indisponíveis por falta do escopo `read:project`; os eventos de inclusão/mudança de status foram observados, sem seus valores.
- Código e política de autenticação do backend remoto não estão neste repositório.

## Registro da entrevista e da decisão

A entrevista foi conduzida nesta conversa após leitura da skill instalada `grilling`. A ferramenta Skill indicada pelo wrapper `grill-me` não estava exposta nesta execução; não se afirma que ela foi invocada.

- Q1 — No mock local, desabilitar controles e mostrar aviso acessível: **Sim**.
- Q2 — Bloquear no helper antes do envio quando não houver token: **Sim**.
- Q3 — Com API remota sem sessão, desabilitar controles e mostrar aviso de login: **Sim**.
- Desenho recomendado com regra compartilhada e remoção da rota mock: **Aprovado para elaboração da SPEC**.
