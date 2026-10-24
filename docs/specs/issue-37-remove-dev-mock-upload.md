# SPEC — Issue #37: remover upload dev não autenticado com mock

- Issue: [#37 — Remover upload dev não autenticado com mock](https://github.com/thomazdevmaster/bcl-next/issues/37)
- Status: **Em andamento**
- Branch: `fix/issue-37-remove-upload-mock`
- Commit base: `1b1cbcccddf83eebfe50ad867111afbd1eba52dc` (`origin/main`)
- Data da SPEC: 2026-10-24

## Objetivo

Remover o Route Handler local `/bcl-api/uploads` e impedir que o helper envie arquivos sem token. Os uploads existentes devem continuar usando a API externa autenticada.

## Contexto observado no código

- `src/app/bcl-api/uploads/route.ts` aceita `POST` sem autenticação quando `usesRemoteApi()` é falso, grava os arquivos em `public/uploads` e devolve uma URL local. Quando a API remota está ativa, essa rota devolve 404.
- `src/lib/uploadMedia.ts` envia `POST` para `${getApiUrl()}/uploads`, mas o Bearer é opcional: o envio continua mesmo sem token.
- `getApiUrl()` aponta para `/bcl-api` quando o mock local está ativo e para a URL da API configurada quando `usesRemoteApi()` é verdadeiro.
- Os controles que chamam `uploadMediaFile` estão em `src/components/blog/PostEditor.tsx`, `src/components/blog/MediaSourceField.tsx` e `src/components/domain/users/UserPersonalContactStage.tsx` (`ProfilePhotoPicker`). `MediaSourceField` é usado por várias partes do editor de mídias.
- O `AuthContext` expõe `isHydrated` e `isLoggedIn`; `getAccessToken()` lê o token mantido pela camada de autenticação.
- Os campos para informar URLs manualmente são independentes do envio de arquivos e permanecem utilizáveis.
- `docs/arquitetura-backend.md` descreve uploads autenticados na API. O código do backend não está neste repositório; portanto, esta SPEC não altera nem confirma a implementação da API externa.

## Decisões acordadas na entrevista

1. O endpoint local de upload será removido.
2. `uploadMediaFile` não fará `fetch` sem token e enviará Bearer obrigatório quando autenticado.
3. Os consumidores existentes e seus formulários não serão alterados; eles já tratam erros do helper.
4. O helper é compartilhado por uploads editoriais e pela foto de perfil. A remoção do endpoint local afeta qualquer consumidor que ainda tente enviar sem autenticação, conforme o pedido “uploads só via API autenticada”.
5. A issue não solicita mudanças em dados mascarados. `photoUrl` não é mascarado pelo domínio.
6. Nenhuma alteração será feita no backend externo ou em permissões por papel.

## Desenho recomendado

Excluir `src/app/bcl-api/uploads/route.ts`. Em `src/lib/uploadMedia.ts`, exigir token antes de criar/enviar a requisição e sempre incluir `Authorization: Bearer <token>`. Manter os consumidores e o tratamento de erro existentes, sem mudanças na UI ou no mascaramento.

Não alterar os consumidores (`PostEditor`, `MediaSourceField` e `ProfilePhotoPicker`): os três usam o helper compartilhado e apresentam os erros pelo tratamento que já existe.

## Alternativas consideradas

- Desabilitar controles individualmente: descartado porque alteraria formulários e consumidores além do necessário para remover o upload local não autenticado.
- Refatorar para um componente de upload único: descartado porque a issue não pede mudança de UI e os consumidores atuais já tratam as falhas do helper.
- **Remover a rota local e exigir token no helper (implementado):** impede armazenamento local pela rota e impede chamadas do cliente sem token, mantendo os consumidores existentes.

## Critérios de aceite

- [x] A rota dedicada `src/app/bcl-api/uploads/route.ts` foi removida; a rota catch-all existente responde 404 a `/bcl-api/uploads`.
- [x] `uploadMediaFile` rejeita antes de chamar `fetch` quando não há token.
- [x] Com token, `uploadMediaFile` envia `POST` a `${getApiUrl()}/uploads` com `Authorization: Bearer <token>`.
- [x] Os erros devolvidos pela API continuam chegando aos usuários pelo tratamento existente.
- [x] Nenhuma mudança foi feita em formulários, conteúdos, mascaramento, permissões por papel ou backend externo.

## Plano de implementação e verificação

- Ler a documentação local do Next.js 16 pertinente a Route Handlers e remoção de rotas antes de alterar código, conforme `AGENTS.md`.
- Remover `src/app/bcl-api/uploads/route.ts`.
- Exigir token em `uploadMediaFile` antes de `fetch` e enviar o Bearer em toda requisição.
- Conferir tipos e lint nos arquivos de código tocados.
- Não adicionar nem executar testes automatizados sem pedido explícito de teste/verificação.
- A autenticação real do endpoint remoto depende do backend, que não está disponível neste repositório; o código cliente enviar Bearer não confirma a política do servidor.

## Resultado da implementação

- Implementado em `src/app/bcl-api/uploads/route.ts` (removido) e `src/lib/uploadMedia.ts` (token obrigatório antes de `fetch`; Bearer obrigatório).
- `npx eslint src/lib/uploadMedia.ts` passou.
- `npx tsc --noEmit` passou.
- Nenhum teste automatizado foi adicionado ou executado. Não houve alteração de UI, então não foi necessário verificar layout no browser.
- A rota catch-all existente responde 404 para `/bcl-api/uploads`, sem persistir o arquivo localmente.

## Estado do escopo

- **Incluído e implementado:** remoção do Route Handler local de upload e exigência de token no helper compartilhado.
- **Fora do escopo acordado:** mudanças de UI/formulários, mascaramento de dados, outras rotas ou conteúdos, backend/API externa e permissões por papel.
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

|                              | Dias     |
| ---------------------------- | -------- |
| Otimista (O)                 | 0.5      |
| Mais provável (M)            | 1        |
| Pessimista (P)               | 2        |
| **Esperado Te = (O+4M+P)/6** | **1.08** |

_Te serve para ordenar o backlog; ajuste O/M/P quando refinarem._

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

## Registro histórico da entrevista

As respostas abaixo foram registradas antes da releitura do escopo literal da #37. A instrução posterior da pessoa solicitante restringiu o trabalho ao endpoint e ao helper compartilhado; por isso, as propostas de alterar a UI registradas aqui foram superadas pelas decisões atuais acima. A entrevista foi conduzida após leitura da skill instalada `grilling`; a ferramenta Skill indicada pelo wrapper `grill-me` não estava exposta nesta execução, então não se afirma que ela foi invocada.

- Q1 — No mock local, desabilitar controles e mostrar aviso acessível: **Sim**.
- Q2 — Bloquear no helper antes do envio quando não houver token: **Sim**.
- Q3 — Com API remota sem sessão, desabilitar controles e mostrar aviso de login: **Sim**.
- Desenho inicial com regra compartilhada e remoção da rota mock: **Aprovado para elaboração da SPEC; depois restringido conforme registrado acima**.
