# SPEC — Issue #64: backend Dockerizado no desenvolvimento do front

- **Issue:** [#64 — Dev: documentar fim do json-server :3001](https://github.com/thomazdevmaster/bcl-next/issues/64)
- **Branch:** `docs/issue-64-documentar-json-server`
- **Status da SPEC:** em revisão
- **Status do código:** o `json-server` e os mocks ainda existem; nenhuma mudança funcional desta SPEC foi implementada.
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
| | Dias |
|---|-----|
| Otimista (O) | 0.5 |
| Mais provável (M) | 1 |
| Pessimista (P) | 2 |
| **Esperado Te = (O+4M+P)/6** | **1.08** |

*Te serve para ordenar o backlog; ajuste O/M/P quando refinarem.*

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
7. A remoção dos mocks não altera o cliente HTTP, os contratos usados pelo frontend ou as regras de autenticação; as chamadas devem continuar indo para a API externa configurada.

## Matriz dos requisitos

| Requisito original ou acordado | Status | Evidência ou pendência |
| --- | --- | --- |
| “Um único backend em dev.” | Pendente | Hoje há json-server, mock `/bcl-api` e backend externo Dockerizado; implementar o fluxo único acordado. |
| “Refs: README, package.json scripts.” | Pendente | Remover instruções/scripts do legado e documentar `bcl-api` via Docker nos arquivos ativos. |
| [Decisão da entrevista] Remover json-server, dependência, script e dados antigos | Pendente | `package.json`, `package-lock.json`, `db.json` e referências do README ainda contêm o legado. |
| [Decisão da entrevista] Remover rotas e mocks próprios do Next | Pendente | `src/app/bcl-api/**`, `src/lib/mock-api/**`, seed mock e fallback em `src/config/environment.ts` ainda existem. |
| [Decisão da entrevista] API completa do backend em Docker no desenvolvimento | Pendente | Documentar e apontar para o comando oficial `docker compose --profile api up -d --build` no `bcl-api`. |
| [Decisão da entrevista] Atualizar a arquitetura ativa do frontend para `bcl-api` | Pendente | README, PRODUCT, AGENTS e `docs/arquitetura-backend.md` ainda descrevem o estado anterior. |

## Fora do escopo

- Alterações no código ou na infraestrutura do repositório `bcl-api`.
- Mudanças de contrato da API, endpoints, banco, autenticação, uploads ou worker MIDI.
- Reescrita de snapshots históricos em specs/issues/PRs antigas.
- Executar ou publicar deploy do backend.

## Revisão da SPEC

- [ ] Escopo, comandos Docker e caminhos a remover revisados pela pessoa solicitante.
- [ ] Matriz e contexto original conferidos.
