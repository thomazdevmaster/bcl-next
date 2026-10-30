# Design — Issue #20: Home com conteúdo dinâmico

- Issue: [#20 — Home com conteúdo dinâmico (blog e agenda publicados)](https://github.com/thomazdevmaster/bcl-next/issues/20)
- Status deste documento: aprovado em 2026-10-29; implementação em andamento.
- Branch preparada: `feat/issue-20-home-conteudo-dinamico`, baseada em `origin/main` no commit `180365fe1c695b6da97817a387430318548f6cee`.
- Data: 2026-10-29.

## Contexto original integral do GitHub

### Issue

- Número: 20
- Título: `[Melhoria] Home com conteúdo dinâmico (blog e agenda publicados)`
- URL: https://github.com/thomazdevmaster/bcl-next/issues/20
- Estado observado: OPEN; atualizada em 2026-10-27T19:31:38Z.
- Autoria: `thomazdevmaster`.
- Responsável: `kjunda01` (Sinval Silva Junior).
- Labels: `enhancement`.
- Prioridade no corpo: P1.
- Estimativa declarada: O=2, M=4, P=8 dias; Te=4,33 pessoa-dias.
- Milestone: nenhum.
- Campos do projeto retornados por `gh issue view`: nenhum. A timeline registra inclusão em projeto e mudanças de status, mas não expõe o nome/campos atuais.
- Comentários: nenhum (`comments: []`).
- PRs: `gh pr list --state all --search "#20"` não retornou PR. Busca textual; nenhuma referência de PR foi apresentada na issue.
- Eventos retornados pela timeline completa: label `enhancement` adicionado por `thomazdevmaster` em 2026-10-21T17:14:10Z; adição a projeto V2 em 2026-10-21T17:14:12Z; evento de status do projeto em 2026-10-21T17:14:13Z; outro evento de status do projeto em 2026-10-27T19:31:19Z; atribuição a `kjunda01` em 2026-10-27T19:31:38Z.
- Referências incluídas no corpo: `src/app/page.tsx`, `src/domains/homepage/types.ts`, `/agenda`, gestão de mídias.

#### Corpo integral original

```md
## Metadado

- **Código plano:** `FEAT-20`
- **Prioridade produto:** P1

## Priorização (PERT — person-days)

|                              | Dias     |
| ---------------------------- | -------- |
| Otimista (O)                 | 2        |
| Mais provável (M)            | 4        |
| Pessimista (P)               | 8        |
| **Esperado Te = (O+4M+P)/6** | **4.33** |

_Te serve para ordenar o backlog; ajuste O/M/P quando refinarem._

---

## Problema ou oportunidade

A **home** (`/`, `HomePageContent`, documento `homepage`) mistura seções estáticas editáveis com conteúdo que já vive no **blog** e na **agenda**. Visitante não vê automaticamente “o que há de novo” sem ir a `/blog` ou `/agenda`.

## Proposta

- Seções dinâmicas na home alimentadas por API:
  - **Últimos posts publicados** (mídias/blog): N cards com título, capa, data, link.
  - **Próximos eventos** (agenda/apresentações públicas): data, local, tipo.
- Configuração em **gestão da página inicial** (`/gestao/home`): quantos itens, ordem, título da seção, ocultar se vazio.
- Fallback gracioso se API falhar (não derrubar a home).
- Respeitar `isPublic` / status de publicação.

## Outras informações para a home

Adicionar um texto informativo, dizendo para usuário se cadastrar, para ter acesso ao aprendizado, com partitura dinâmica e jogos para educação musical

## Área

- [x] Portal (home)
- [x] Gestão (homepage + mídias + eventos)

## Critérios de aceite

- [ ] Home exibe pelo menos uma seção dinâmica demo (post + evento do seed).
- [ ] Admin edita quantidade/ordem sem redeploy.
- [ ] Mobile: cards empilhados, imagens `next/image`, toque amplo.

## Fora de escopo

- Feed infinito ou algoritmo de recomendação.

## Referências

- `src/app/page.tsx`, `src/domains/homepage/types.ts`, `/agenda`, gestão mídias
```

### Verificação das seeds mencionadas

O repositório `bcl-api` contém em `src/main/resources/db/seed/demo.sql` um post publicado e um evento público futuro. A seed pública `public.sql`, na data desta verificação, tem um evento passado. Não foi confirmado se essas seeds estão carregadas em uma API em execução. As seeds são evidência para o critério demo da issue; nenhuma alteração de seed faz parte deste desenho.

## Intenção

Mostrar na home pública o conteúdo recente já publicado no blog e os próximos eventos públicos, para que visitantes encontrem novidades sem navegar primeiro para outras páginas. A home também deve convidar o visitante a se cadastrar para conhecer o aprendizado musical com partituras dinâmicas e jogos educativos.

## Situação atual verificada

- `src/app/page.tsx` é Client Component e carrega homepage, apresentações, mídias e blog page com `Promise.all`; uma falha em homepage/apresentações/mídias pode impedir a aplicação de todos os resultados. `/blogpage` já captura falha localmente.
- `src/components/public/HomePageContent.tsx` renderiza os feeds de eventos e posts, mas recebe um único `portalError`; erros de evento aparecem como mensagem e posts podem ficar sem conteúdo.
- `src/lib/publicPortal.ts` já filtra apresentações por `isPublic`, status e data, e posts por `status === 'published'`.
- `src/components/homepage/HomepageEditor.tsx` já edita título, descrição, limite, visibilidade e ordem entre seções. O limite atual é de 1 a 6. Não há opção explícita para ocultar feed vazio.
- `src/domains/homepage/types.ts` mantém o tipo e valores padrão do documento. O CTA já possui campos editáveis para visitante e pessoa logada.
- Os cards atuais usam `next/image` e layout em uma coluna em telas estreitas.
- A API oficial `bcl-api` persiste o documento `homepage` em JSONB; `HomepageService.replace` exige que `sections` seja array. Não é necessária mudança de endpoint para salvar uma propriedade de configuração de feed.
- `package.json` do frontend não declara Vitest nem runner de testes de componentes.

## Abordagens consideradas

### 1. Estender o fluxo atual — escolhida

Manter o App Router e a home client-side, mas tratar de forma independente a configuração, as apresentações e as mídias. Acrescentar `hideWhenEmpty` à configuração existente de cada feed e ao editor da home. Reutilizar o CTA atual e os dados editáveis do documento `homepage`. Configurar Vitest para testar cada componente React alterado.

Vantagem: cobre os requisitos usando os componentes, a API e a configuração existentes, com uma mudança delimitada.

### 2. Refatorar a home para Server Components

Separar as consultas públicas para renderização no servidor e deixar no cliente apenas autenticação e controles interativos.

Tradeoff: seria uma refatoração maior da fronteira entre fetch público e estado de autenticação. Não é necessária para os requisitos acordados e foi rejeitada.

## Objetivos

- Mostrar posts publicados e eventos públicos futuros como seções dinâmicas da home.
- Manter quantidade, título, ordem das seções e opção de ocultar quando vazio na gestão existente.
- Isolar falhas: ocultar apenas o feed cuja busca falhar; se a configuração da home falhar, usar `defaultHomepage` e continuar usando feeds que carregaram.
- Respeitar as regras atuais de visibilidade e publicação.
- Atualizar o convite de visitante no CTA existente, com destino `/cadastro`; preservar o CTA para pessoa logada.
- Testes Vitest foram solicitados para cada componente alterado e depois adiados até atualizar a branch com `main`.

## Fora do escopo e antiobjetivos

- Feed infinito ou recomendação.
- Alterar seed de produção ou demonstração.
- Criar dados mock, endpoints ou persistência no frontend.
- Alterar a API ou o schema de banco do `bcl-api`.
- Refatorar a home inteira para Server Components.
- Adicionar uma nova seção CTA em paralelo à atual.
- Substituir textos configurados por administradores com heurísticas de comparação de strings.

## Decisões acordadas na entrevista

- Ambas as seções, posts e eventos, são obrigatórias.
- A ordem configurável é entre seções da home. Posts seguem publicação mais recente primeiro; eventos seguem data/hora cronológica.
- “Ocultar se vazio” é uma opção por feed, ligada por padrão. Desligada, mostra o estado vazio existente.
- Falha de busca de posts ou eventos oculta apenas o feed afetado, sem aviso técnico visível. Se a configuração falhar, usar os defaults e continuar buscando os feeds.
- O CTA existente será reutilizado. Para visitante, o botão vai diretamente a `/cadastro`; para pessoa logada, o comportamento atual permanece.
- Copy aprovada para o CTA de visitante: “Cadastre-se para conhecer nossos recursos de aprendizado musical, com partituras dinâmicas e jogos educativos. O acesso aos recursos internos pode depender da autorização da banda.” O conteúdo é mantido no documento `homepage` e editável pela gestão; não será codificado dentro do componente.
- Adicionar testes Vitest para cada componente alterado.
- O texto original limita o trabalho ao portal e gestão e exclui feed infinito/recomendação. A seed serve apenas para popular o post e o evento de demonstração do critério de aceite.

### Adiamento posterior

Em 2026-10-29, a pessoa pediu para não instalar a infraestrutura Vitest nem adicionar/executar testes nesta rodada. O trabalho funcional continua; os testes serão retomados depois de atualizar a branch com `main`, quando a infraestrutura prevista estará disponível.

## Restrições e chamadas do implementador

- Usar Tailwind para todo estilo novo/alterado, TypeScript estrito, acessibilidade e alvos de toque de pelo menos 44 px.
- Ler as referências Next.js 16 aplicáveis antes de alterar código; docs de fetch já foram consultadas durante a inspeção.
- Testes: não adicionar dependências nem testes nesta rodada, conforme adiamento posterior.
- Na atualização do CTA, preservar os valores customizados já salvos no documento da API. O editor existente é o local de gestão do conteúdo; a SPEC não inclui migração automática nem alteração de seed.
- Seguir estritamente a issue: não acrescentar trabalho de operação/migração de dados à implementação. O conteúdo do CTA continua no campo editável já existente.
- As verificações finais de interface devem cobrir viewport móvel (~360 px) e desktop (~960 px+) segundo `AGENTS.md`.

## Requisitos de aceite derivados

1. Quando as APIs responderem com dados, a home exibe posts publicados mais recentes e apresentações públicas futuras, respeitando os limites configurados.
2. Admin pode editar quantidade, título, ordem entre seções e `hideWhenEmpty` sem redeploy.
3. Feed vazio desaparece se `hideWhenEmpty` estiver ligado; com a opção desligada, permanece o estado vazio atual.
4. Falha de uma API de feed não bloqueia a outra seção nem o restante da home e não exibe mensagem técnica ao visitante.
5. Falha da API de homepage usa o documento padrão sem impedir os feeds independentes.
6. Seção de visitante do CTA contém o convite acordado e seu botão navega para `/cadastro`; o CTA para pessoa logada não muda.
7. Testes Vitest ficam fora desta rodada e serão retomados após atualização da branch com `main`, conforme pedido posterior.
8. Seed existente do `bcl-api` pode demonstrar um post e evento; esta mudança não altera seeds.

## Checagem do construtor

O revisor perguntou como o novo texto chegaria a documentos de homepage já persistidos. Direção registrada após retorno da pessoa: manter-se no escopo da issue, usar o CTA editável existente e não acrescentar migração de conteúdo nem mudança de seed. Valores já configurados continuam sob controle da gestão.

## Pendências

- Nenhuma decisão de produto pendente após Q1–Q9 e a checagem do construtor.
- A confirmação do critério demo depende de executar o frontend contra a API com `demo.sql` carregado; não foi verificado estado de API em execução nesta análise.
