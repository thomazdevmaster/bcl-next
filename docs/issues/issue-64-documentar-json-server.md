# Issue #64 — [Tarefa] Dev: documentar fim do json-server :3001

- Issue: https://github.com/thomazdevmaster/bcl-next/issues/64
- SPEC: [docs/specs/issue-64-documentar-json-server.md](../specs/issue-64-documentar-json-server.md)
- Estado GitHub observado: aberta; atribuída a `kjunda01`; label `documentation`; sem milestone.
- Prioridade declarada: P2.
- Estimativa PERT declarada: O=0,5, M=1, P=2 pessoa-dias; Te=1,08 dia.
- Status real do código: **Implementada em revisão**. A remoção do json-server e dos mocks do Next, a adoção do `bcl-api` via Docker e a atualização dos documentos ativos foram concluídas. A revisão code-review não encontrou arquivos fora do escopo; verificação final registrada na SPEC.
- Última verificação: 2026-10-24
- Acesso: corpo, título, labels, responsável, milestone e comentários acessíveis; não há comentários. `projectItems` não retornou campos do projeto; o token não possui `read:project`, então os valores dos campos não puderam ser confirmados. O histórico paginado contém sete eventos: label `documentation` adicionada em 2026-10-21 17:34:50Z; inclusão no projeto às 17:34:51Z; automação de status às 17:34:52Z; mudança de status do projeto em 2026-10-24 06:18:02Z; atribuição a `kjunda01` às 06:18:07Z; e mudanças de status do projeto às 06:29:31Z e 19:54:35Z. Os valores de status não vieram nos eventos.
- PRs relacionadas: **Nenhuma PR encontrada**. A listagem completa das PRs de `kjunda01` retornou 10 itens, abaixo do limite de 500; conferidos títulos, branches, corpos e referências disponíveis. Busca adicional por `64` e pela branch desta issue não retornou PR candidata.
- Última verificação: 2026-10-24.

## Matriz de requisitos

| Requisito original (citação curta ou referência ao trecho)                     | Status   | Evidência no código ou pendência                                                                            |
| ------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| “Um único backend em dev.”                                                     | Atendido | README e AGENTS descrevem o backend do `bcl-api` via Docker Compose.                                        |
| “Refs: README, package.json scripts.”                                          | Atendido | Script e dependência removidos; README documenta o comando Docker do `bcl-api` e `npm run dev`.             |
| [Decisão de escopo] Remover rotas mock locais e exigir o backend Dockerizado   | Atendido | Rotas e biblioteca removidas; fallback eliminado e `/dev-api` encaminha para o backend Docker.              |
| [Decisão de escopo] Atualizar a arquitetura ativa para o repositório `bcl-api` | Atendido | README, PRODUCT, AGENTS e `docs/arquitetura-backend.md` registram o backend atual e citam o README externo. |
