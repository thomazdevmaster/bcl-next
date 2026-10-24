# Issue #12 — [Melhoria] Tabelas de gestão otimizadas para mobile

- Issue: [#12](https://github.com/thomazdevmaster/bcl-next/issues/12)
- SPEC: [issue-12-tabelas-gestao-mobile.md](../specs/issue-12-tabelas-gestao-mobile.md)
- Estado no GitHub: **Aberta**, confirmado em 2026-10-24; consulta atualizada via `gh issue view 12`
- Status real do código: **Parcial**
- Última verificação: 2026-10-24
- Prioridade explícita: **P1**
- Estimativa explícita: PERT O=2, M=4, P=8 dias; Te=4,33 pessoa-dias

O status SPEC em revisão descreve o rastreamento local. A issue segue aberta no GitHub; o estado GitHub não comprova implementação.

## Matriz de requisitos

| Requisito original (citação curta ou referência ao trecho)                                                   | Status                                               | Evidência no código ou pendência                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “~360px: sem checkbox de seleção nas tabelas de gestão.” (ajustado por feedback)                             | Confirmado pelo usuário para Gestão; Estudo pendente | `TableMobileCards.tsx` só mostra checkbox em modo de seleção, iniciado pelo menu ou toque prolongado. Validação das telas de Gestão confirmada pelo usuário em 2026-10-24; Estudo fica para depois da integração de partituras e funcionalidades reais. |
| “Mobile: só busca global + ação primária; ocultar toolbar secundária.”                                       | Atendido no código                                   | `TableToolbar.tsx` exibe busca e ação principal no mobile. Refresh, reset, seleção em massa, impressão e visibilidade ficam em bloco `hidden` até 960px. Busca tem `aria-label`.                                                                        |
| “Preferir cartão ou menu ⋯ por linha.”                                                                       | Confirmado pelo usuário para Gestão; Estudo pendente | Cartões e menu ⋯ existem em `TableMobileCards.tsx`; validação de Pessoas, Usuários, Patrimônio e Músicas confirmada pelo usuário. Estudo aguarda partituras e funcionalidades reais.                                                                    |
| “Desktop: manter comportamento atual salvo decisão contrária.”                                               | Confirmado pelo usuário para Gestão                  | Tabela e toolbar desktop continuam no código a partir de 960px; validação das telas de Gestão confirmada pelo usuário.                                                                                                                                  |
| “Toque ≥ 44px; modais com teclado virtual.”                                                                  | Confirmado pelo usuário para Gestão                  | Menu e ações usam alvos `min-h-11`/`min-w-11`; Visualizar abre EntityDialog. Validação das telas de Gestão confirmada pelo usuário.                                                                                                                     |
| “Teste: pessoas, usuários, patrimônio, músicas, mídias.”                                                     | Parcial                                              | Pessoas, Usuários, Patrimônio e Músicas confirmadas pelo usuário. Mídias agora usa `TableView`; falta conferir o fluxo em 360px e desktop.                                                                                                              |
| “Permissões `can()` inalteradas.”                                                                            | Atendido no código                                   | Criação e ações são condicionadas por `canCreate`, `canUpdate`, `canDelete` em `DomainWorkspace.tsx` e `UserManagementWorkspace.tsx`; exclusão em lote também passa por callbacks condicionados.                                                        |
| “~360px; busca com label; ⋯ acessível.”                                                                      | Confirmado pelo usuário para Gestão                  | Busca rotulada, gatilho nomeado por linha e alvo 44px; Escape e clique externo fecham o menu em `TableMobileCards.tsx`. Validação das telas de Gestão confirmada pelo usuário.                                                                          |
| Feedback: fixar no menu; Visualizar em modal; remover Ver mais/Recolher; indicar pin.                        | Confirmado pelo usuário para Gestão                  | Menu oferece Visualizar e Fixar/Desafixar; cartões fixados mostram pin. Visualizar usa EntityDialog em linhas rótulo/valor. Validação das telas de Gestão confirmada pelo usuário.                                                                      |
| Feedback: seleção pelo ⋯/toque prolongado, seleção tocando cartão, fechar menu fora, excluir junto à tabela. | Confirmado pelo usuário para Gestão; Estudo pendente | Handlers e bloco de exclusão estão em `TableView.tsx`/`TableMobileCards.tsx`; validação de Gestão confirmada pelo usuário. Estudo será conferido quando usar partituras e funcionalidades reais.                                                        |
| “Fora de escopo: virtualização; redesign desktop completo.”                                                  | Fora do escopo acordado                              | SPEC não inclui esses itens.                                                                                                                                                                                                                            |
| Decisão: Estudo põe “Iniciar estudo” e “Vídeo” no ⋯.                                                         | Atendido no código; browser pendente                 | `StudySongCatalog.tsx` fornece essas ações; falta exercitar o menu e confirmar que a seleção de instrumentos do modal permanece funcional.                                                                                                              |

## Decisões aprovadas na entrevista

- Aplicar o padrão móvel a todo uso de TableView no repositório, incluindo Gestão e Estudo. A validação funcional de Estudo fica condicionada à disponibilidade de partituras e funcionalidades reais.
- Manter cartões no mobile e esconder checkboxes de seleção.
- Colocar fixar/desafixar e demais opções no menu ⋯ móvel inspirado no IconSelect da página de perfil.
- Exibir o ícone de alfinete ao lado do ⋯ apenas nas linhas fixadas.
- Ativar seleção pelo menu ⋯ e pelo toque prolongado; exibir checkbox do lado esquerdo e permitir excluir em lote com confirmação.
- Abrir Visualizar em modal com dados por rótulo/valor e remover Ver mais/Recolher do cartão.
- Deixar busca global e criação quando can() permitir; ocultar os demais controles da barra abaixo de 960px.
- Preservar o comportamento desktop e as regras de permissão existentes.
- Mídias recebeu TableView por decisão do usuário em 2026-10-24; seleção por menu/toque prolongado e exclusão em lote seguem a regra de permissões.
- Em Estudo, colocar “Iniciar estudo” e “Vídeo” no disclosure móvel; seleção de instrumentos do modal fica inalterada.

## O que falta para fechar

- Gestão de Pessoas, Usuários, Patrimônio e Músicas: validação em 360px e desktop, incluindo busca, menu, seleção, criação conforme permissão, Visualizar, edição/exclusão e diálogos, confirmada pelo usuário em 2026-10-24.
- Conferir Mídias em mobile e desktop após a integração com `TableView`.
- Estudo não foi confirmado. Revalidar depois que partituras e funcionalidades reais estiverem disponíveis: “Iniciar estudo”/“Vídeo” no menu e seleção de instrumentos funcional.
- Confirmar diálogos com teclado virtual e navegação por teclado em Mídias e, quando disponível, Estudo.
- Issue consultada em 2026-10-24: continua aberta, sem comentários.

Os comportamentos principais aparecem implementados e a validação de Gestão foi confirmada pelo usuário. A issue permanece **Parcial** até conferir Mídias e fazer a validação adiada de Estudo quando houver partituras e funcionalidades reais. Lint e TypeScript passaram em verificação anterior, não reexecutados nesta auditoria.
