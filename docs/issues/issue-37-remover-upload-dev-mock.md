# Issue #37 — [Melhoria] Remover upload dev não autenticado com mock

- Issue: https://github.com/thomazdevmaster/bcl-next/issues/37
- SPEC: [docs/specs/issue-37-remove-dev-mock-upload.md](../specs/issue-37-remove-dev-mock-upload.md)
- Estado GitHub observado: aberta; atribuída a `kjunda01`; label `enhancement`; sem milestone.
- Prioridade declarada: P2.
- Estimativa PERT declarada: O=0,5, M=1, P=2 pessoa-dias; Te=1,08 dia.
- Status real do trabalho: **SPEC em revisão** (branch preparada; SPEC escrita; nenhum código alterado).
- Última verificação: 2026-10-24
- Acesso: corpo, título, labels, responsável, milestone, comentários e eventos acessíveis. Comentários: nenhum. A consulta de campos `projectItems` falhou porque o token não tem `read:project`; a timeline confirma inclusão no projeto em 2026-10-21 e alterações de status em 2026-10-21 e 2026-10-24, mas os valores dos campos não puderam ser lidos. Eventos carregados integralmente: label `enhancement` (2026-10-21 17:29:23Z), adição ao projeto (17:29:24Z), mudança de status automatizada (17:29:25Z), mudança de status por `kjunda01` (2026-10-24 06:16:59Z) e atribuição a `kjunda01` (2026-10-24 06:17:21Z). Nenhum evento de referência cruzada para PR.
- PRs relacionadas: **Nenhuma PR encontrada** após listar todas as PRs de `kjunda01` (10 resultados de 500 possíveis) e conferir seus títulos, branches, corpos e referências de fechamento.
- Branch preparada: `fix/issue-37-remove-upload-mock`, baseada em `origin/main` no commit `1b1cbcccddf83eebfe50ad867111afbd1eba52dc`.
- Entrevista: decisões confirmadas para desabilitar upload no mock, bloquear o helper sem token e desabilitar a interface remota sem sessão. A skill instalada `grilling` foi lida e seguida manualmente; a ferramenta Skill indicada pelo wrapper `grill-me` não estava exposta e não é declarada como invocada.
- SPEC: [docs/specs/issue-37-remove-dev-mock-upload.md](../specs/issue-37-remove-dev-mock-upload.md), aguardando revisão da pessoa solicitante.

## Matriz de requisitos

| Requisito original (citação curta ou referência ao trecho)                               | Status   | Evidência no código ou pendência                                                                                                                 |
| ---------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| “Endpoint `/bcl-api/uploads` deixa de existir com mock; uploads só via API autenticada.” | Pendente | A rota atual grava em `public/uploads` sem autenticação quando o mock está ativo (`src/app/bcl-api/uploads/route.ts`). `src/lib/uploadMedia.ts` envia Bearer apenas quando há token; remoção/guarda aguardam aprovação da SPEC. A autenticação server-side da API externa não pode ser verificada neste repositório. |
| “Refs: `uploads/route.ts`.”                                                              | Pendente | O arquivo referenciado permanece presente em `src/app/bcl-api/uploads/route.ts`.                                                                 |
