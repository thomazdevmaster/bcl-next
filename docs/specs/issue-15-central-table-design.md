# Issue #15 — Central de notificações em tabela

- **Issue:** https://github.com/thomazdevmaster/bcl-next/issues/15
- **SPEC principal:** [issue-15-centro-notificacoes.md](issue-15-centro-notificacoes.md)
- **Estado:** desenho aprovado em conversa; aguardando revisão deste documento antes da implementação.
- **Data:** 2026-10-25

## Contexto observado

- O domínio `src/domains/notifications` e a rota `/gestao/notificacao` já existem.
- A aba **Central** em `NotificationCenter.tsx` apresenta notificações como cartões, carrega lotes via cursor e mostra recibos de leitura expandidos na própria página.
- O endpoint `GET /notifications/center` aceita cursor e limite, mas não pesquisa nem retorna contagem total para paginação numerada.
- `TableView` é o componente padrão do projeto e hoje filtra e pagina localmente os dados recebidos; em telas estreitas ele usa cartões responsivos.
- A API já fornece recibos com nome, usuário e `readAt`; a autorização restringe esses recibos ao remetente do alerta manual.

## Objetivo

Transformar a Central em uma visualização tabular pesquisável e paginada, alinhada às tabelas de gestão do produto, e apresentar o conteúdo e os recibos em diálogos acessíveis.

## Desenho aprovado

### Navegação e tabela

- Manter `/gestao/notificacao` como o domínio existente, sem criar uma segunda entidade ou CRUD paralelo.
- Apresentar o envio existente como ação/aba **Nova notificação** e manter a Central como listagem.
- Usar o `TableView` compartilhado, com suporte reutilizável a paginação e filtro controlados pelo servidor. A tabela não deve buscar todo o histórico para filtrar no cliente.
- Colunas: **Notificação** (título e resumo), **Tipo**, **Data**, **Leitura** e **Ações**.
- A ordem inicial é mais recente primeiro, com desempate estável por identificador. A busca cobre título, corpo e tipo sobre todo o histórico visível à conta.
- A busca é debounced e volta à primeira página ao mudar o termo. O tamanho inicial é 10; opções de 10, 20 e 50 respeitam o limite máximo do backend.
- Em mobile, preservar a apresentação em cartões e os alvos de toque do `TableView`; em desktop, usar a tabela padrão.

### Diálogos

- **Visualizar:** ação por linha abre diálogo com título, tipo, conteúdo integral, data e link da notificação quando houver.
- **Ver quem leu:** disponível para alertas manuais enviados pela própria conta; abre diálogo separado com uma linha por destinatário, no formato `Nome — @usuário`, estado **Lida** ou **Não lida**, e data/hora quando lida.
- Os diálogos têm estados de carregamento, erro recuperável e vazio, foco/teclado acessíveis e rolagem interna em viewport móvel.
- A API continua sendo a autoridade para acesso aos recibos. A interface não amplia a visibilidade de alertas privados.

### Contrato de busca e paginação

- Estender `GET /notifications/center` para receber `search`, `page` e `pageSize`, mantendo o escopo de visibilidade atual e incluindo estados já presentes na Central.
- Resposta proposta: `items`, `page`, `pageSize`, `total` e `totalPages`.
- Aplicar busca no servidor em título, corpo e tipo; ordenar por data de criação decrescente e identificador decrescente.
- A mudança não altera o modelo de dados. Como a busca textual cobre título e corpo, verificar o custo da consulta na massa de teste; criar índice por migration somente se a medição justificar. A implementação backend fica no repositório `bcl-api`, na branch já dedicada à issue 15.

## Alternativas consideradas

1. **Buscar todo o histórico e paginar no browser:** simples, mas baixa milhares de registros e torna a busca/paginação progressivamente mais cara.
2. **Criar uma tabela própria para notificações:** permite o contrato necessário, mas duplica a tabela, os controles e o comportamento móvel que o projeto já mantém em `TableView`.
3. **Estender `TableView` e a API para operação server-side (escolhida):** conserva o padrão visual e mobile, pesquisa todo o histórico sem transferi-lo integralmente e centraliza autorização/paginação no backend.

## Fluxo de dados

1. A Central solicita a página atual com termo de busca e tamanho de página.
2. A API valida a conta, aplica o escopo de visibilidade, busca e ordena no banco e retorna registros e total.
3. A tabela apresenta os itens e controla páginas/tamanho; uma nova busca reinicia a página.
4. **Visualizar** usa os dados já carregados da linha. **Ver quem leu** consulta o endpoint de recibos e exibe a resposta num diálogo.

## Verificação prevista

- Lint e TypeScript nos componentes e domínios alterados.
- Verificar API em banco temporário com milhares de registros: busca em páginas distantes, total, ordem estável, ausência de duplicatas e última página.
- Verificar no browser a 360px e 960px: tabela/cartões, busca, paginação, modal de conteúdo, modal de recibos, estados loading/erro/vazio e teclado.
- Não alterar a semântica de remoção da inbox neste escopo.

## Revisão do desenho

- [x] Reutiliza o domínio e a rota existentes.
- [x] Busca e paginação abrangem o histórico permitido sem carregar tudo no cliente.
- [x] A tabela mantém o padrão responsivo existente.
- [x] Recibos são apresentados em diálogo e preservam a autorização da API.
- [x] O desenho não altera eventos, preferências, entrega de e-mail ou semântica de remoção.
