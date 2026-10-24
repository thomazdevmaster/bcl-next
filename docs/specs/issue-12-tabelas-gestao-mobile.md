# SPEC — Issue #12: Tabelas de gestão otimizadas para mobile

- Issue: [Issue #12 — Melhoria: Tabelas de gestão otimizadas para mobile](https://github.com/thomazdevmaster/bcl-next/issues/12)
- Estado GitHub observado: Aberta em 2026-10-23
- Branch: feat/issue-12-tabelas-gestao-mobile
- Base: origin/main em 357758cea3ff58b4089453ab12f3364bf73ff858
- Status: Implementação em andamento; SPEC aprovada e ajustada após feedback de interface

## Contexto original da issue

### Título integral

[Melhoria] Tabelas de gestão otimizadas para mobile

### Corpo integral

## Metadado

- **Código plano:** `FEAT-12`
- **Prioridade produto:** P1

## Priorização (PERT — person-days)

|                              | Dias     |
| ---------------------------- | -------- |
| Otimista (O)                 | 2        |
| Mais provável (M)            | 4        |
| Pessimista (P)               | 8        |
| **Esperado Te = (O+4M+P)/6** | **4.33** |

---

## Descrição

## Problema ou oportunidade

Nas telas de CRUD em `/gestao` (`DomainWorkspace` + TanStack Table), mobile (~360px) fica apertado: toolbar cheia, checkbox de seleção, ações de hover. Alunos/músicos usam listas no celular.

## Proposta

- **Mobile:** só **busca global** + ação primária (ex. Novo); **sem checkbox** de seleção em massa; ocultar toolbar secundária (export, colunas extras).
- Preferir cartão ou menu ⋯ por linha.
- **Desktop:** manter comportamento atual salvo decisão contrária.
- Toque ≥ 44px; modais com teclado virtual.

## Área

- [x] Gestão (`/gestao`)

## Critérios de aceite

- [ ] ~360px: sem checkbox de seleção nas tabelas de gestão.
- [ ] Toolbar mobile: busca + criar (se permitido).
- [ ] Teste: pessoas, usuários, patrimônio, músicas, mídias.
- [ ] Permissões `can()` inalteradas.

## Mobile e acessibilidade

- [x] ~360px; busca com label; ⋯ acessível

## Fora de escopo

- Virtualização; redesign desktop completo.

## Referências

- `DomainWorkspace.tsx`, AGENTS.md mobile
- Relacionado: #51 (GES-01 virtualização), plano qualidade

### Comentários integrais

Nenhum comentário foi retornado por gh api repos/thomazdevmaster/bcl-next/issues/12/comments --paginate (lista vazia).

### Metadados disponíveis

| Campo                   | Valor observado                                                                                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Número / URL            | #12 — https://github.com/thomazdevmaster/bcl-next/issues/12                                                                                                                                                                                              |
| Estado no GitHub        | OPEN                                                                                                                                                                                                                                                     |
| Autor                   | thomazdevmaster (Thomaz Jorge)                                                                                                                                                                                                                           |
| Responsável             | kjunda01 (Sinval Silva Junior)                                                                                                                                                                                                                           |
| Labels                  | enhancement                                                                                                                                                                                                                                              |
| Milestone               | MVP, número 1; vencimento 2026-10-31T00:00:00Z                                                                                                                                                                                                           |
| Projeto / campos atuais | gh issue view retornou projectItems: []. A consulta GraphQL dos campos foi rejeitada por escopo insuficiente: token sem read:project (scopes observados: gist, read:org, repo, workflow). O projeto e seus valores atuais não puderam ser identificados. |

### Eventos relevantes integrais (metadados retornados pela API)

Todos os eventos abaixo vieram de gh api repos/thomazdevmaster/bcl-next/issues/12/events --paginate e foram confirmados na timeline. Alterações de status do Project V2 não expõem o valor do campo.

| Data/hora UTC       | Ator                           | Evento e dados disponíveis                                           |
| ------------------- | ------------------------------ | -------------------------------------------------------------------- |
| 2026-10-21 17:00:08 | thomazdevmaster                | Label enhancement adicionada.                                        |
| 2026-10-21 17:00:09 | thomazdevmaster                | Issue adicionada a um Project V2; o evento não identifica o projeto. |
| 2026-10-21 17:00:11 | github-project-automation[bot] | Evento de alteração de status em Project V2; valor não disponível.   |
| 2026-10-21 17:50:40 | thomazdevmaster                | Evento de alteração de status em Project V2; valor não disponível.   |
| 2026-10-21 18:20:06 | thomazdevmaster                | Milestone MVP atribuída.                                             |
| 2026-10-21 19:58:10 | thomazdevmaster                | Issue atribuída a kjunda01.                                          |
| 2026-10-23 11:17:07 | kjunda01                       | Evento de alteração de status em Project V2; valor não disponível.   |

### Referência #51 citada no corpo

Consulta de gh issue view 51 em 2026-10-23:

**Título:** [Melhoria] Gestão: virtualizar ou paginar tabelas grandes  
**URL:** https://github.com/thomazdevmaster/bcl-next/issues/51  
**Estado:** OPEN  
**Autor:** thomazdevmaster (Thomaz Jorge)  
**Responsável:** nenhum  
**Label:** enhancement  
**Milestone:** nenhuma  
**Comentários:** nenhum

Corpo integral da #51:

## Metadado

- **Código plano:** `GES-01`
- **Prioridade produto:** P2

## Priorização (PERT — person-days)

|                              | Dias     |
| ---------------------------- | -------- |
| Otimista (O)                 | 1        |
| Mais provável (M)            | 2        |
| Pessimista (P)               | 5        |
| **Esperado Te = (O+4M+P)/6** | **2.33** |

_Te serve para ordenar o backlog; ajuste O/M/P quando refinarem._

---

## Descrição

**Refs:** `TableView`, `DomainWorkspace`.

### PRs e outras referências

- PRs vinculados: nenhum encontrado. closedByPullRequestsReferences e eventos CROSS_REFERENCED_EVENT vieram vazios na API GraphQL; gh pr list --state all --search "issue 12" também não retornou resultados.
- O corpo da #12 cita DomainWorkspace.tsx, “AGENTS.md mobile”, a issue #51 e “plano qualidade”. “plano qualidade” não tem URL ou identificador para localizar outra referência.
- O checklist original “~360px; busca com label; ⋯ acessível” está marcado [x] no GitHub. Na base observada, a busca tem aria-label e há cartões móveis, mas não há gatilho ⋯; a marcação da issue não comprova a implementação.

## Decisões da entrevista

Entrevista feita após recarregar corpo, comentários, metadados, eventos e referências acessíveis da issue.

- Manter cartões no mobile, sem checkboxes de seleção de linhas; preservar o botão de fixar linha.
- A ação de fixar/desafixar fica dentro do menu ⋯ de cada cartão, junto das demais opções.
- Cartões com linha fixada exibem apenas o ícone de alfinete, centralizado ao lado do ⋯; linhas não fixadas não exibem indicador.
- O menu ⋯ oferece “Selecionar” em cada linha elegível; essa ação seleciona a linha e mostra checkboxes à esquerda dos cartões selecionáveis. Toque prolongado no cartão também seleciona a linha. Com a seleção ativa, tocar no corpo de outro cartão alterna sua seleção; o modo continua ativo mesmo com zero linhas marcadas e “Limpar” o encerra. Tocar fora do ⋯ fecha o menu.
- Com linhas selecionadas, um bloco junto aos cartões da tabela mostra a quantidade, “Limpar” e “Excluir”, separado da busca e da ação primária. Excluir pede confirmação e só aparece quando a permissão existente permite exclusão.
- O menu ⋯ é um seletor móvel com ícones inspirado no seletor da página de perfil; não expande opções dentro da linha.
- “Visualizar” abre um diálogo móvel com os dados em linhas de rótulo/valor, no formato da expansão atual; remover “Ver mais/Recolher” do cartão.
- O menu móvel não deve abrir o diálogo de formulário usado pela ação Visualizar desktop; edição e exclusão seguem as permissões atuais.
- Colocar ações de linha em disclosure ⋯ acessível, com alvo de toque de pelo menos 44px.
- No mobile, mostrar busca global e criação somente quando a regra existente can() autoriza. Ocultar atualizar, redefinir, imprimir, visibilidade de colunas e controles de seleção em massa.
- Manter comportamento atual no desktop.
- Aplicar o comportamento móvel a todo TableView no repositório, incluindo Gestão e Estudo.
- No catálogo de Estudo, agrupar “Iniciar estudo” e “Vídeo” nas ações ⋯ móveis. A seleção de instrumentos dentro do modal não muda.
- Mídias tem uma lista própria fora de TableView; verificar sua usabilidade sem adicionar busca nem redesenhar a lista nesta issue.
- Preservar todas as regras de permissão can().

### Ajuste de escopo — 2026-10-24

- Aplicar também a `TableView` em Gestão de Mídias, em mobile e desktop. A lista antiga passa a usar busca global, ação “Novo post” condicionada por `can()`, cartões e menu móvel, tabela desktop e ações de linha.
- Reutilizar a seleção por menu ⋯ e toque prolongado já prevista nesta SPEC; exibir checkboxes só após iniciar seleção e permitir exclusão em lote com confirmação quando `can()` permitir.
- No rótulo secundário do cartão, mostrar tipo e status do post (por exemplo, “Matéria - Publicado”).

## Fatos observados na base

- TableView cria a coluna __table_row_controls; seleção de linhas e fixação são habilitadas por padrão (src/components/tables/core/TableView.tsx, por volta das linhas 167–250).
- TableMobileCards já mostra cartões abaixo de 960px, mas renderiza controles de seleção e ações diretamente no cartão (src/components/tables/core/TableMobileCards.tsx, por volta das linhas 38–82).
- TableToolbar mantém busca, atualizar, redefinir, seleção em massa, imprimir e visibilidade de colunas (src/components/tables/toolbar/TableToolbar.tsx).
- Gestão genérica e Gestão de Usuários usam TableView; ambas mantêm criação em seu cabeçalho e calculam permissões com can() (src/components/domain/DomainWorkspace.tsx; src/components/domain/users/UserManagementWorkspace.tsx).
- Estudo usa TableView em src/components/study/StudySongCatalog.tsx. Seleção de linhas não inicia sessão; cada música tem ações Iniciar estudo e Vídeo. Instrumentos são selecionados dentro do modal.
- Mídias era uma lista própria em src/app/gestao/midias/page.tsx; o ajuste de escopo de 2026-10-24 a migra para TableView.
- Foram encontrados três pontos de uso de TableView: CRUD genérico, usuários e catálogo de músicas de estudo.

## Desenho proposto

### Alternativas consideradas

1. **Centralizar a política móvel em TableView e TableToolbar (recomendado):** concentra as regras responsivas no módulo compartilhado e recebe a ação móvel de criação como slot opcional. Evita duplicar a composição entre Gestão, Usuários e Estudo.
2. **Implementar uma composição móvel em cada tela:** dá controle local, mas duplica toolbar, menu de linha e acessibilidade, com risco de divergência entre áreas.

A recomendação mantém uma interface pequena no TableView: os chamadores fornecem opcionalmente a ação principal; o módulo central decide sua apresentação responsiva.

### Composição proposta

1. Adicionar à interface de TableView um slot opcional mobilePrimaryAction e encaminhá-lo a TableToolbar.
2. Em TableToolbar, compor a versão móvel com busca global e esse slot; ocultar abaixo de 960px os controles secundários, incluindo seleção em massa. A versão desktop permanece como está.
3. Passar a ação de criação de DomainWorkspace e UserManagementWorkspace somente quando canCreate já autoriza. Manter os botões atuais no cabeçalho desktop e usar o mesmo handler na toolbar móvel.
4. Estender TableCheckbox com opção de apresentação móvel e aplicá-la aos checkboxes de seleção de linhas e cabeçalho. O botão de fixar linha permanece no cartão.
5. Em TableMobileCards, colocar renderRowActions dentro de disclosure ⋯ com nome acessível que identifique a linha, operação por teclado e alvo de 44px. Preservar os controles de cada domínio.
6. Aplicar o mesmo módulo ao StudySongCatalog. Não alterar seleção de instrumentos, áudio ou partitura dentro dos modais.
7. Usar utilitários Tailwind e tokens existentes; não criar CSS por componente.

## Critérios de aceite acordados

1. Em viewport de 360px, checkboxes ficam ocultos inicialmente e aparecem à esquerda dos cartões após selecionar uma linha pelo menu ⋯ ou toque prolongado.
2. Em mobile, a toolbar exibe busca global rotulada e criação quando fornecida por uma tela com permissão. Em Estudo, exibe busca sem criação. Atualizar, redefinir, imprimir e visibilidade de colunas ficam ocultos.
3. Cartões mostram menu ⋯ acessível com ícones: Visualizar, Fixar/Desafixar e ações disponíveis para a linha; editar/excluir aparecem apenas quando as regras atuais permitem.
4. “Visualizar” abre diálogo com os campos visíveis da linha em formato rótulo/valor; não há controle separado “Ver mais/Recolher”.
5. Em desktop (~960px+), tabela, toolbar, seleção e ações mantêm a apresentação e comportamento atuais.
6. Conferir Gestão de Pessoas, Usuários, Patrimônio, Músicas, Mídias e Estudo em 360px e desktop; em Estudo, validar com partituras e funcionalidades reais.
7. Controles novos têm alvo mínimo de 44px; busca e menu têm nomes acessíveis e funcionam por teclado. Toque prolongado também inicia seleção.
8. Diálogos continuam utilizáveis em viewport móvel com teclado virtual.
9. As permissões can() não mudam.
10. Não implementar virtualização nem redesign desktop completo.

## Verificação planejada

- Lint e tipos nos arquivos alterados.
- Verificação browser em viewport de 360px e desktop de 960px ou mais, conforme AGENTS.md.
- Exercitar busca, menus, criação condicionada por permissão e diálogos móveis nas áreas listadas.
- No Estudo, confirmar “Iniciar estudo” e “Vídeo” no menu móvel e preservar a seleção de instrumentos do modal.
- Em Mídias, validar navegação em ambas as larguras.

## Acesso e gates

- Corpo, comentários, metadados, eventos e PRs foram carregados. A consulta de campos do Project V2 foi limitada pela ausência de read:project; os campos e valores não foram presumidos.
- Este ambiente não disponibiliza a skill brainstorming. O desenho acima foi estruturado com a skill codebase-design; a limitação fica registrada para revisão.
- SPEC aprovada pelo usuário; implementação autorizada. Feedback posterior direcionou o menu de ações e a visualização móvel conforme as decisões acima.
- Feedback posterior acrescentou seleção por menu/toque prolongado, checkbox lateral e exclusão em lote confirmada na toolbar móvel.
