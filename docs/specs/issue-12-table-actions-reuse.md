# Proposta — ações reutilizáveis nas tabelas

- Contexto: refinamento da issue #12
- Estado: implementado; verificação browser pendente
- Escopo: CRUD genérico, usuários, estudo e mídias

## Problema

As telas montam `TableView` separadamente e repetem parte da apresentação das ações. `ActionButton` tem implementações quase idênticas em `DomainWorkspace.tsx` e `UserManagementWorkspace.tsx`. A composição desktop de visualizar/editar/excluir também se repete nesses workspaces. No mobile, os mesmos workspaces e Mídias montam arrays semelhantes para editar e excluir.

As interfaces de desktop e mobile têm necessidades diferentes: desktop mostra controles na linha; mobile usa um menu ⋯ com rótulos, seleção por toque prolongado e seleção em lote. Estudo também tem ações próprias e estado de preparação da partitura.

## Arquivos mapeados

| Uso                                                                | Arquivos                                                                                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRUD de pessoas, patrimônio, músicas, instrumentos e apresentações | `src/components/domain/DomainWorkspace.tsx`; rotas em `src/app/gestao/{pessoas,patrimonio,musicas,instrumentos,apresentacoes}/page.tsx`                                         |
| Gestão de usuários                                                 | `src/components/domain/users/UserManagementWorkspace.tsx`; composição por `src/components/domain/users/UsersWorkspace.tsx`; rota `src/app/gestao/usuarios/page.tsx`             |
| Catálogo de estudo                                                 | `src/components/study/StudySongCatalog.tsx`; usado por `src/study/StudyPage.tsx` e rota `src/app/study/[[...slug]]/page.tsx`                                                    |
| Mídias                                                             | `src/app/gestao/midias/page.tsx`                                                                                                                                                |
| Infraestrutura já compartilhada                                    | `src/components/tables/core/TableView.tsx`, `TableMobileCards.tsx`, `TableMobileIconAction.tsx`, `TableToolbar.tsx` e `src/components/tables/toolbar/TableSelectionToolbar.tsx` |

## O que já é compartilhado

- `TableView` centraliza a tabela desktop, toolbar, adaptação para cartões e slots distintos para `renderRowActions` e `renderMobileRowActions`.
- `TableMobileCards` centraliza menu ⋯, seleção iniciada pelo menu ou toque prolongado, checkboxes que aparecem após iniciar seleção e ações em lote.
- `MobileTableAction` já define o formato das ações do menu móvel: rótulo, ícone, handler, estado desabilitado e perigo.
- A configuração de `mobileSelectionEnabled` e o callback de exclusão continuam por domínio para respeitar `can()` e as regras de cada recurso.

Não criar outro menu móvel nem outro módulo de seleção.

## Repetições encontradas

1. O botão desktop de ícone/ação (`ActionButton`) está duplicado em `DomainWorkspace.tsx` e `UserManagementWorkspace.tsx`, com estrutura, acessibilidade, alvo de 44px e classes equivalentes.
2. A composição desktop de visualizar/editar/excluir é quase igual nos dois workspaces de CRUD. Em Mídias, a composição é própria e hoje usa editar/excluir.
3. Os arrays de ações móveis repetem editar/excluir nos dois workspaces e Mídias; as funções específicas de cada domínio precisam permanecer fora do renderizador.
4. Estudo usa uma composição desktop diferente (`SongStudyActions`): vídeo e início do estudo têm texto, carregamento e regras de preparação. Não deve ser convertido à força para a apresentação icon-only do CRUD.
5. Os rótulos, textos vazios e handlers da tabela variam por domínio. A extração não deve escondê-los numa configuração global difícil de entender.

## Proposta

### Alternativas consideradas

1. **Um modelo de ações e um renderizador para desktop e mobile:** maximiza a uniformidade dos metadados, mas tende a aumentar a interface para cobrir links, botões, texto visível, carregamento e ações externas do Estudo.
2. **Renderizador CRUD desktop + adaptador/função para ações móveis:** compartilha o que se repete sem substituir `TableMobileCards` nem exigir que Estudo use ações icon-only. **Recomendado.**
3. **Extrair somente o botão de ícone:** mudança pequena, mas mantém a composição e os arrays CRUD duplicados nos workspaces.

O código segue a alternativa 2: modelo de ação compartilhado com apresentação desktop independente; mobile continua no menu central de `TableMobileCards`.

### Desktop

`TableRowActions` é o renderizador desktop de ações CRUD. Recebe ações já autorizadas pelo chamador, com rótulo, ícone, handler ou destino, estado desabilitado e indicador de perigo. Renderiza os controles icon-only com alvo mínimo de 44px, nomes acessíveis, tooltip e foco visível.

`DomainWorkspace`, `UserManagementWorkspace` e Mídias montam as ações usando suas permissões e callbacks e passam a lista ao renderizador. O módulo não consulta `can()` nem decide regras como impedir excluir a própria conta.

Estudo mantém seu renderizador desktop próprio enquanto precisar de botões textuais, loading e fluxo de preparação.

### Mobile

Manter o menu e a seleção em `TableMobileCards`. `createCrudTableRowActions` monta os descritores CRUD uma vez; eles servem ao renderizador desktop e ao slot móvel, que consome o subconjunto `MobileTableAction`. Ações extras e handlers de músicas/estudo continuam sendo fornecidos pelo domínio.

Não criar um segundo componente de menu ou copiar o estado de seleção para as páginas.

### Interface entre domínio e apresentação

As páginas calculam permissões com `can()` e fornecem callbacks. Os módulos compartilhados recebem apenas as ações permitidas. A apresentação separa desktop e mobile; ambos mantêm rótulos e ícones coerentes. A integração continua usando os dois slots atuais do `TableView`, evitando ampliar sua interface sem necessidade comprovada.

## Critérios de aceite para uma implementação futura

- Remover a duplicação de `ActionButton` entre os dois workspaces de CRUD.
- Reutilizar a composição desktop CRUD em Pessoas/Patrimônio/Músicas/Instrumentos/Apresentações, Usuários e Mídias, mantendo as ações e restrições atuais.
- Reutilizar a montagem de ações móveis CRUD sem duplicar menu, seleção, toque prolongado ou seleção em lote.
- Manter ações de Estudo e estados de carregamento funcionais sem mudar a seleção de instrumentos.
- Preservar `can()`, o impedimento de excluir a própria conta e a confirmação de exclusão em lote.
- Verificar os fluxos em 360px e desktop a partir de 960px; alvos interativos com pelo menos 44px.

## Decisões aplicadas

- Mídias mantém editar e excluir; não ganhou “Visualizar” desktop.
- Ações CRUD desktop usam ícones com rótulos acessíveis e tooltip. Estudo mantém botões próprios com texto e estado de preparação.
- `TableRowAction` estende os campos de `MobileTableAction` com identidade e destino para link desktop; a renderização permanece separada por superfície.

## Verificação

- ESLint nos arquivos alterados: passou.
- `tsc --noEmit`: sem erros nos arquivos alterados; segue bloqueado por `.next/types/validator.ts` referenciando `src/app/prototype/settings/page.js`, que não existe no repositório.
- Browser: pendente. O login demo apresentou `Failed to fetch` ao tentar acessar a API configurada em `localhost:8080`.

## Fora de escopo

- Alterar permissões, regras de exclusão, navegação, formulários ou APIs.
- Redesenhar `TableView`, o menu ⋯ ou as tabelas desktop.
- Unificar ações de Estudo com o CRUD se isso exigir remover seus estados e affordances específicos.
