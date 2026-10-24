# Issue #12 — [Melhoria] Tabelas de gestão otimizadas para mobile

- Issue: [#12](https://github.com/thomazdevmaster/bcl-next/issues/12)
- SPEC: [issue-12-tabelas-gestao-mobile.md](../specs/issue-12-tabelas-gestao-mobile.md)
- Estado no GitHub: **Aberta**, aguardando aprovação do PR para fechamento manual
- Status real do código: **Implementada**
- Última verificação: 2026-10-24
- Prioridade explícita: **P1**
- Estimativa explícita: PERT O=2, M=4, P=8 dias; Te=4,33 pessoa-dias

O status SPEC em revisão descreve o rastreamento local. A issue segue aberta no GitHub; o estado GitHub não comprova implementação.

## Matriz de requisitos

| Requisito original (citação curta ou referência ao trecho)                                                   | Status                                               | Evidência no código ou pendência                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “~360px: sem checkbox de seleção nas tabelas de gestão.” (ajustado por feedback)                             | Confirmado pelo usuário                              | `TableMobileCards.tsx` só mostra checkbox em modo de seleção, iniciado pelo menu ou toque prolongado. Gestão e Estudo conferidos pelo usuário em 2026-10-24. |
| “Mobile: só busca global + ação primária; ocultar toolbar secundária.”                                       | Atendido no código                                   | `TableToolbar.tsx` exibe busca e ação principal no mobile. Refresh, reset, seleção em massa, impressão e visibilidade ficam em bloco `hidden` até 960px. Busca tem `aria-label`.                                                                        |
| “Preferir cartão ou menu ⋯ por linha.”                                                                       | Confirmado pelo usuário                              | Cartões e menu ⋯ existem em `TableMobileCards.tsx`; Gestão e Estudo conferidos pelo usuário em 2026-10-24. |
| “Desktop: manter comportamento atual salvo decisão contrária.”                                               | Confirmado pelo usuário para Gestão                  | Tabela e toolbar desktop continuam no código a partir de 960px; validação das telas de Gestão confirmada pelo usuário.                                                                                                                                  |
| “Toque ≥ 44px; modais com teclado virtual.”                                                                  | Confirmado pelo usuário                              | Menu e ações usam alvos `min-h-11`/`min-w-11`; Visualizar abre EntityDialog. Diálogos conferidos pelo usuário em 2026-10-24. |
| “Teste: pessoas, usuários, patrimônio, músicas, mídias.”                                                     | Confirmado pelo usuário                              | Pessoas, Usuários, Patrimônio, Músicas e Mídias conferidas pelo usuário em 2026-10-24. |
| “Permissões `can()` inalteradas.”                                                                            | Atendido no código                                   | Criação e ações são condicionadas por `canCreate`, `canUpdate`, `canDelete` em `DomainWorkspace.tsx` e `UserManagementWorkspace.tsx`; exclusão em lote também passa por callbacks condicionados.                                                        |
| “~360px; busca com label; ⋯ acessível.”                                                                      | Confirmado pelo usuário                              | Busca rotulada, gatilho nomeado por linha e alvo 44px; Escape e clique externo fecham o menu em `TableMobileCards.tsx`. Gestão e Estudo conferidos pelo usuário. |
| Feedback: fixar no menu; Visualizar em modal; remover Ver mais/Recolher; indicar pin.                        | Confirmado pelo usuário                              | Menu oferece Visualizar e Fixar/Desafixar; cartões fixados mostram pin. Visualizar usa EntityDialog em linhas rótulo/valor. Diálogos conferidos pelo usuário. |
| Feedback: seleção pelo ⋯/toque prolongado, seleção tocando cartão, fechar menu fora, excluir junto à tabela. | Confirmado pelo usuário                              | Handlers e bloco de exclusão estão em `TableView.tsx`/`TableMobileCards.tsx`; Gestão e Estudo conferidos pelo usuário. |
| “Fora de escopo: virtualização; redesign desktop completo.”                                                  | Fora do escopo acordado                              | SPEC não inclui esses itens.                                                                                                                                                                                                                            |
| Decisão: Estudo põe “Iniciar estudo” e “Vídeo” no ⋯.                                                         | Confirmado pelo usuário                              | `StudySongCatalog.tsx` fornece essas ações; Estudo conferido pelo usuário em 2026-10-24. |

## Decisões aprovadas na entrevista

- Aplicar o padrão móvel a todo uso de TableView no repositório, incluindo Gestão e Estudo; ambos foram conferidos pelo usuário em 2026-10-24.
- Manter cartões no mobile e esconder checkboxes de seleção.
- Colocar fixar/desafixar e demais opções no menu ⋯ móvel inspirado no IconSelect da página de perfil.
- Exibir o ícone de alfinete ao lado do ⋯ apenas nas linhas fixadas.
- Ativar seleção pelo menu ⋯ e pelo toque prolongado; exibir checkbox do lado esquerdo e permitir excluir em lote com confirmação.
- Abrir Visualizar em modal com dados por rótulo/valor e remover Ver mais/Recolher do cartão.
- Deixar busca global e criação quando can() permitir; ocultar os demais controles da barra abaixo de 960px.
- Preservar o comportamento desktop e as regras de permissão existentes.
- Mídias recebeu TableView por decisão do usuário em 2026-10-24; seleção por menu/toque prolongado e exclusão em lote seguem a regra de permissões.
- Em Estudo, colocar “Iniciar estudo” e “Vídeo” no disclosure móvel; seleção de instrumentos do modal fica inalterada.

## Conclusão

- Gestão (Pessoas, Usuários, Patrimônio e Músicas), Mídias, diálogos e Estudo foram confirmados pelo usuário em 2026-10-24.
- Os critérios foram confirmados pelo usuário; a issue permanece aberta para ser fechada manualmente após a aprovação do PR.
- Lint e TypeScript passaram em verificação anterior; não foram reexecutados nesta atualização documental.
