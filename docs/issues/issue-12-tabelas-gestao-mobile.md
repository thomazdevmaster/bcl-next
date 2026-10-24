# Issue #12 — [Melhoria] Tabelas de gestão otimizadas para mobile

- Issue: [#12](https://github.com/thomazdevmaster/bcl-next/issues/12)
- SPEC: [issue-12-tabelas-gestao-mobile.md](../specs/issue-12-tabelas-gestao-mobile.md)
- Estado no GitHub: **Aberta**, última observação local em 2026-10-23; não foi possível atualizar via GitHub nesta verificação porque `gh auth status` retornou token inválido
- Status real do código: **Parcial**
- Última verificação: 2026-10-23
- Prioridade explícita: **P1**
- Estimativa explícita: PERT O=2, M=4, P=8 dias; Te=4,33 pessoa-dias

O status SPEC em revisão descreve o rastreamento local. A issue segue aberta no GitHub; o estado GitHub não comprova implementação.

## Matriz de requisitos

| Requisito original (citação curta ou referência ao trecho)                                                   | Status                                                | Evidência no código ou pendência                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| “~360px: sem checkbox de seleção nas tabelas de gestão.” (ajustado por feedback)                             | Atendido no código; browser pendente nas demais áreas | `TableMobileCards.tsx` só mostra checkbox em modo de seleção, iniciado pelo menu ou toque prolongado. Evidência browser documentada para Usuários; falta exercitar Pessoas, Patrimônio e Estudo. |
| “Mobile: só busca global + ação primária; ocultar toolbar secundária.”                                       | Atendido no código                                    | `TableToolbar.tsx` exibe busca e ação principal no mobile. Refresh, reset, seleção em massa, impressão e visibilidade ficam em bloco `hidden` até 960px. Busca tem `aria-label`.                 |
| “Preferir cartão ou menu ⋯ por linha.”                                                                       | Parcial (verificação)                                 | Cartões e menu ⋯ existem em `TableMobileCards.tsx`; verificação browser ampla pendente para Pessoas, Usuários, Patrimônio, Músicas e Estudo.                                                     |
| “Desktop: manter comportamento atual salvo decisão contrária.”                                               | Parcial (verificação)                                 | Tabela e toolbar desktop continuam no código a partir de 960px. Verificação browser documentada apenas para Usuários.                                                                            |
| “Toque ≥ 44px; modais com teclado virtual.”                                                                  | Parcial                                               | Menu e ações usam alvos `min-h-11`/`min-w-11`; Visualizar abre EntityDialog. Falta conferir diálogos e teclado virtual nas áreas acordadas.                                                      |
| “Teste: pessoas, usuários, patrimônio, músicas, mídias.”                                                     | Pendente                                              | Falta evidência browser para o conjunto completo. Mídias é lista própria em `src/app/gestao/midias/page.tsx`; precisa ser conferida em 360px e desktop, sem redesign.                            |
| “Permissões `can()` inalteradas.”                                                                            | Atendido no código                                    | Criação e ações são condicionadas por `canCreate`, `canUpdate`, `canDelete` em `DomainWorkspace.tsx` e `UserManagementWorkspace.tsx`; exclusão em lote também passa por callbacks condicionados. |
| “~360px; busca com label; ⋯ acessível.”                                                                      | Parcial (verificação)                                 | Busca rotulada, gatilho nomeado por linha e alvo 44px; Escape e clique externo fecham o menu em `TableMobileCards.tsx`. Falta exercício de teclado/browser nas demais telas.                     |
| Feedback: fixar no menu; Visualizar em modal; remover Ver mais/Recolher; indicar pin.                        | Atendido no código; browser pendente                  | Menu oferece Visualizar e Fixar/Desafixar; cartões fixados mostram pin. Visualizar usa EntityDialog em linhas rótulo/valor. Conferir nas telas restantes.                                        |
| Feedback: seleção pelo ⋯/toque prolongado, seleção tocando cartão, fechar menu fora, excluir junto à tabela. | Parcial (verificação)                                 | Handlers e bloco de exclusão estão em `TableView.tsx`/`TableMobileCards.tsx`; teste documentado em Usuários. Faltam as outras tabelas e confirmação nos domínios.                                |
| “Fora de escopo: virtualização; redesign desktop completo.”                                                  | Fora do escopo acordado                               | SPEC não inclui esses itens.                                                                                                                                                                     |
| Decisão: Estudo põe “Iniciar estudo” e “Vídeo” no ⋯.                                                         | Atendido no código; browser pendente                  | `StudySongCatalog.tsx` fornece essas ações; falta exercitar o menu e confirmar que a seleção de instrumentos do modal permanece funcional.                                                       |

## Decisões aprovadas na entrevista

- Aplicar o padrão móvel a todo uso de TableView no repositório, incluindo Gestão e Estudo.
- Manter cartões no mobile e esconder checkboxes de seleção.
- Colocar fixar/desafixar e demais opções no menu ⋯ móvel inspirado no IconSelect da página de perfil.
- Exibir o ícone de alfinete ao lado do ⋯ apenas nas linhas fixadas.
- Ativar seleção pelo menu ⋯ e pelo toque prolongado; exibir checkbox do lado esquerdo e permitir excluir em lote com confirmação.
- Abrir Visualizar em modal com dados por rótulo/valor e remover Ver mais/Recolher do cartão.
- Deixar busca global e criação quando can() permitir; ocultar os demais controles da barra abaixo de 960px.
- Preservar o comportamento desktop e as regras de permissão existentes.
- Mídias usa lista própria fora de TableView; verificar o fluxo, sem redesenhá-la nesta issue.
- Em Estudo, colocar “Iniciar estudo” e “Vídeo” no disclosure móvel; seleção de instrumentos do modal fica inalterada.

## O que falta para fechar

- Exercitar no browser em 360px e desktop ≥960px: Gestão de Pessoas, Usuários, Patrimônio, Músicas e Estudo; conferir busca, menu, seleção, criação conforme permissão, Visualizar, edição/exclusão e diálogos.
- No Estudo, confirmar “Iniciar estudo”/“Vídeo” no menu e que a seleção de instrumentos continua funcional.
- Conferir Mídias em mobile e desktop, mantendo a lista atual.
- Verificar diálogos com teclado virtual e navegação por teclado nos fluxos acordados. Usuários tem evidência parcial registrada.
- Reautenticar `gh` para confirmar que issue, critérios e comentários não mudaram desde 2026-10-23.

Os comportamentos principais aparecem implementados no código; a issue permanece **Parcial** até concluir essa validação e confirmar o estado remoto. Lint e TypeScript passaram em verificação anterior, não reexecutados nesta auditoria.
