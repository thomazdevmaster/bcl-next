# Issue #37 — [Melhoria] Remover upload dev não autenticado com mock

- Issue: https://github.com/thomazdevmaster/bcl-next/issues/37
- SPEC: [docs/specs/issue-37-remove-dev-mock-upload.md](../specs/issue-37-remove-dev-mock-upload.md)
- Estado GitHub observado: aberta; atribuída a `kjunda01`; label `enhancement`; sem milestone.
- Prioridade declarada: P2.
- Estimativa PERT declarada: O=0,5, M=1, P=2 pessoa-dias; Te=1,08 dia.
- Status real do trabalho: **Parcial** (Route Handler local removido e helper bloqueia chamadas sem token; a validação server-side da API externa não é verificável neste repositório).
- Última verificação: 2026-10-24
- Acesso: corpo, título, labels, responsável, milestone, comentários e eventos acessíveis. Comentários: nenhum. A consulta de campos `projectItems` falhou porque o token não tem `read:project`; a timeline confirma inclusão no projeto em 2026-10-21 e alterações de status em 2026-10-21 e 2026-10-24, mas os valores dos campos não puderam ser lidos. Eventos carregados integralmente: label `enhancement` (2026-10-21 17:29:23Z), adição ao projeto (17:29:24Z), mudança de status automatizada (17:29:25Z), mudança de status por `kjunda01` (2026-10-24 06:16:59Z) e atribuição a `kjunda01` (2026-10-24 06:17:21Z). Nenhum evento de referência cruzada para PR.
- PRs relacionadas: **Nenhuma PR encontrada** após listar todas as PRs de `kjunda01` (10 resultados de 500 possíveis) e conferir seus títulos, branches, corpos e referências de fechamento.
- Branch preparada: `fix/issue-37-remove-upload-mock`, baseada em `origin/main` no commit `1b1cbcccddf83eebfe50ad867111afbd1eba52dc`.
- Escopo confirmado após releitura: remover o endpoint local `/bcl-api/uploads` e exigir autenticação nos uploads pela API; não alterar mascaramento, formulários, conteúdo editorial nem outros caminhos.
- SPEC: [docs/specs/issue-37-remove-dev-mock-upload.md](../specs/issue-37-remove-dev-mock-upload.md), atualizada ao escopo literal da issue.
- Código alterado: `src/app/bcl-api/uploads/route.ts` removido; `src/lib/uploadMedia.ts` exige token antes do `fetch` e envia Bearer obrigatório. Nenhum outro arquivo de código foi alterado.
- Verificação: ESLint de `src/lib/uploadMedia.ts` e `npx tsc --noEmit` passaram. A remoção do Route Handler faz `/bcl-api/uploads` cair na rota catch-all, que devolve 404 para paths que não sejam coleções do mock. A autenticação server-side da API externa não pode ser verificada neste repositório.
- Mapeamento dos consumidores: `PostEditor`, `MediaSourceField` e `ProfilePhotoPicker` chamam o helper compartilhado. A máscara em `src/core/auth/mask.ts` cobre e-mail, telefone, endereço, nascimento e responsável; não cobre `photoUrl`. A issue não pede alteração dessa máscara nem de foto/contato.

## Matriz de requisitos

| Requisito original (citação curta ou referência ao trecho)                               | Status   | Evidência no código ou pendência                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Endpoint `/bcl-api/uploads` deixa de existir com mock; uploads só via API autenticada.” | Parcial  | `src/app/bcl-api/uploads/route.ts` foi removida. `src/lib/uploadMedia.ts` rejeita sem token antes do `fetch` e sempre envia `Authorization: Bearer <token>`. A autenticação server-side da API externa não é verificável neste repositório. |
| “Refs: `uploads/route.ts`.”                                                              | Atendido | O arquivo referenciado foi removido. A rota catch-all permanece e devolve 404 para `/bcl-api/uploads`.                                                                                                                                      |
