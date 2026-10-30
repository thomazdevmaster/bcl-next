# SPEC — Issue #64: backend Dockerizado no desenvolvimento do front

- **Issue:** [#64 — Dev: documentar fim do json-server :3001](https://github.com/thomazdevmaster/bcl-next/issues/64)
- **Issues complementares de escopo:** [#36](https://github.com/thomazdevmaster/bcl-next/issues/36) (remoção do mock `/bcl-api` e API única em dev), [#37](https://github.com/thomazdevmaster/bcl-next/issues/37) (upload mock), [#40](https://github.com/thomazdevmaster/bcl-next/issues/40) (auth demo/mock) e [#79](https://github.com/thomazdevmaster/bcl-next/issues/79) (limpeza de artefatos/configuração obsoletos).
- **Conflito identificado:** a issue aberta [#81](https://github.com/thomazdevmaster/bcl-next/issues/81) ainda propõe mock para preview de PR. Essa proposta contraria a decisão atual de usar somente a API real; previews deverão usar uma API de staging. A issue precisa ser revisada antes de implementação.
- **Branch:** `docs/issue-64-documentar-json-server`
- **Status da SPEC:** aprovada para implementação em 2026-10-24, após pedido explícito para implementar.
- **Status do código:** implementação concluída nesta branch; revisão code-review concluída.
- **Backend oficial:** [`thomazdevmaster/bcl-api`](https://github.com/thomazdevmaster/bcl-api), README consultado em 2026-10-24.

## Contexto original da issue (snapshot integral)

### Título

`[Tarefa] Dev: documentar fim do json-server :3001`

### Corpo integral

```markdown
## Metadado

- **Código plano:** `DEV-02`
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

Um único backend em dev.

**Refs:** README, package.json scripts.
```

### Metadados e atividade observados no GitHub

- Estado: aberta.
- Responsável: `kjunda01`.
- Labels: `documentation`.
- Milestone: nenhum.
- Prioridade: P2, declarada no corpo.
- Estimativa: O=0,5, M=1, P=2 pessoa-dias; Te=1,08 dia, declarada no corpo.
- Campos de projeto: a issue foi adicionada a um projeto e teve mudanças de status. `projectItems` não expôs nomes/valores; o token disponível não tem o escopo `read:project`. Os valores não são inferidos.
- Comentários: nenhum (consulta paginada retornou lista vazia).
- Eventos paginados: label `documentation` adicionada em 2026-10-21 17:34:50Z; inclusão no projeto às 17:34:51Z; evento de automação de status às 17:34:52Z; mudança de status às 2026-10-24 06:18:02Z; atribuição a `kjunda01` às 06:18:07Z; mudanças de status às 06:29:31Z e 19:54:35Z. Os valores dos campos de status não vieram nos eventos.
- Referências no texto: `README` e scripts de `package.json`.
- PRs relacionadas: nenhuma encontrada. A listagem completa das PRs de `kjunda01` retornou 10 (abaixo do limite 500); os títulos, corpos e branches foram inspecionados. A busca adicional por `64` e pela branch da issue não encontrou candidatas. Nenhum vínculo explícito ou provável foi identificado.
- Lacunas: valores de campos do projeto indisponíveis por falta do escopo `read:project`; demais itens acima acessíveis.

## Fatos observados no frontend

- `package.json` define `api:server`, que executa `json-server` em `:3001`; `json-server` também consta em `devDependencies` e no lockfile.
- `db.json` é a base de dados do json-server e também é importado como fonte de tipos pelo código de mock.
- O frontend implementa mocks próprios do Next em `/bcl-api`, com upload mock separado e dados em `src/domains/seed/mock-api.json`.
- `src/config/environment.ts` escolhe `/bcl-api` como fallback quando a API não está configurada e mantém a URL remota de produção.
- `next.config.ts` mantém inclusão de seed para as rotas mock e um rewrite de `/dev-api` para a API de desenvolvimento em `localhost:8080`.
- `README.md`, `PRODUCT.md`, `AGENTS.md` e `docs/arquitetura-backend.md` contêm instruções divergentes que citam json-server, mocks ou um backend ainda futuro.
- O repositório `bcl-api` é privado. Seu README e `docker-compose.yml` foram consultados com acesso autorizado. O Compose fornece Postgres e MinIO; o perfil `api` também inicia a API Spring em `localhost:8080`. O README indica `docker compose --profile api up -d --build` para iniciar a API completa no Docker.
- O backend externo é a fonte de verdade para stack, endpoints e operações. Esta SPEC registra apenas o contrato e o fluxo de integração necessários ao frontend.

## Decisões da entrevista

- O frontend usa agora o projeto [`bcl-api`](https://github.com/thomazdevmaster/bcl-api) como backend oficial.
- Não manter json-server, rotas mockadas do Next nem dados de mock para simular a API.
- Remover qualquer caminho de execução local que simule autenticação, perfil, upload ou dados da API; dev, preview e produção devem consumir o backend real.
- O desenvolvimento integrado usa a API completa dentro do Docker Compose do `bcl-api`; não oferecer fluxo de desenvolvimento sem Docker.
- O README do `bcl-api` pode ser citado na documentação local como fonte atualizada das instruções e detalhes do backend.
- A infraestrutura e arquitetura anteriores, que tratavam o json-server como atual ou o backend real como trabalho futuro, devem ser removidas ou substituídas nos documentos ativos deste frontend.

## Desenho proposto

### Fluxo local

1. Clonar/abrir o repositório `bcl-api` e iniciar a API completa com `docker compose --profile api up -d --build`, conforme seu README.
2. Confirmar a API em `http://localhost:8080/health`.
3. Configurar o frontend para consumir `http://localhost:8080` e iniciar o Next com `npm run dev`.
4. Manter o rewrite de desenvolvimento `/dev-api` para permitir que um navegador em dispositivo móvel alcance a API local; esse caminho encaminha para o backend Dockerizado, não é um mock.

### Remoção no frontend

- Remover o script `api:server` e a dependência `json-server`, atualizando `package-lock.json`.
- Remover o servidor mock `/bcl-api`, a rota mock de upload, a biblioteca que implementa mocks e os arquivos de dados/tipos usados exclusivamente por ela (`db.json` e `src/domains/seed/mock-api.json`).
- Remover o fallback que seleciona `/bcl-api` quando a API não está configurada e a configuração de tracing exclusiva desses mocks.
- Remover o modo alternativo de autenticação/salvamento local controlado por `usesRemoteApi`; login, perfil e gravação de senhas sempre usam a API. Excluir o helper de usuários demo local, mantendo contas demo que o próprio backend seedar.
- Preservar a configuração para a API externa em desenvolvimento e produção, incluindo o rewrite `/dev-api` que encaminha à API Dockerizada local.
- Não alterar o repositório `bcl-api` nem seus serviços, migrações, dados ou comandos.

### Documentação ativa do frontend

- Atualizar `README.md` com a sequência Docker do backend e o comando de desenvolvimento do frontend; remover instruções para mocks, `json-server`, `db.json` e fallback local.
- Atualizar `PRODUCT.md` para refletir o backend externo atual e a ausência de mocks locais.
- Atualizar `AGENTS.md` para que futuras alterações não recriem seeds/CRUD do `db.json`, não instruam dois servidores locais e apontem para o `bcl-api` como backend.
- Reescrever as partes obsoletas de `docs/arquitetura-backend.md` como arquitetura atual da integração: fronteira frontend/backend, configuração da URL, encaminhamento `/dev-api`, Docker local e link ao README externo. Detalhes internos do backend ficam no repositório `bcl-api`.
- Preservar documentos históricos de issues/PRs que descrevem corretamente o contexto da época em que foram escritos; não reescrever snapshots históricos.

## Critérios de aceite acordados

1. `json-server`, `api:server` e `db.json` deixam de existir como dependência, script, dado ou instrução ativa no frontend.
2. Rotas e implementação mockadas do Next deixam de existir; o frontend não usa `/bcl-api` como fallback.
3. O frontend usa a API do `bcl-api`; o fluxo de desenvolvimento documentado inicia a API completa via Docker Compose e informa como iniciar o frontend.
4. O encaminhamento `/dev-api` para o backend Dockerizado local continua funcional para desenvolvimento em dispositivos na rede local.
5. README, PRODUCT, AGENTS e `docs/arquitetura-backend.md` não descrevem a infraestrutura anterior como atual nem tratam a API real como futura.
6. `docs/arquitetura-backend.md` referencia o README do `bcl-api` como fonte de verdade para operação e implementação do backend.
7. A remoção dos mocks não altera o cliente HTTP, os contratos usados pelo frontend, a autenticação da API nem a cifragem de senhas; as chamadas devem continuar indo para a API externa configurada.
8. O frontend não mantém login demo, atualização de perfil ou gravação local que ignore a API; contas demo do backend continuam autenticando pela API.
9. Nenhum servidor, rota, fixture, seed, arquivo de dados ou fluxo de autenticação/upload mock permanece no frontend; ambientes usam a API real do `bcl-api`.

## Matriz dos requisitos

| Requisito original ou acordado                                                   | Status   | Evidência ou pendência                                                                       |
| -------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| “Um único backend em dev.”                                                       | Atendido | README e AGENTS apontam o backend completo do `bcl-api` via Docker Compose.                  |
| “Refs: README, package.json scripts.”                                            | Atendido | `api:server`/`json-server` removidos; README descreve o fluxo Docker e `npm run dev`.        |
| [Decisão da entrevista] Remover json-server, dependência, script e dados antigos | Atendido | Dependência, script, lockfile, `db.json` e instruções ativas removidos/atualizados.          |
| [Decisão da entrevista] Remover rotas e mocks próprios do Next                   | Atendido | Rotas, biblioteca, seed mock e fallback `/bcl-api` removidos; rewrite `/dev-api` preservado. |
| [Decisão da entrevista] API completa do backend em Docker no desenvolvimento     | Atendido | README e docs apontam para `docker compose --profile api up -d --build` no `bcl-api`.        |
| [Decisão da entrevista] Atualizar a arquitetura ativa do frontend para `bcl-api` | Atendido | README, PRODUCT, AGENTS e arquitetura descrevem o backend externo atual e citam seu README.  |

## Fora do escopo

- Alterações no código ou na infraestrutura do repositório `bcl-api`.
- Mudanças de contrato da API, endpoints, banco, autenticação, uploads ou worker MIDI.
- Reescrita de snapshots históricos em specs/issues/PRs antigas.
- Executar ou publicar deploy do backend.

## Revisão da SPEC

- [x] Escopo, comandos Docker e caminhos a remover revisados pela pessoa solicitante.
- [x] Matriz e contexto original conferidos.
