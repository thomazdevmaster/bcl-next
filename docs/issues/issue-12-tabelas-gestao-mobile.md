# Issue #12 — [Melhoria] Tabelas de gestão otimizadas para mobile

- Issue: [#12](https://github.com/thomazdevmaster/bcl-next/issues/12)
- SPEC: [issue-12-tabelas-gestao-mobile.md](../specs/issue-12-tabelas-gestao-mobile.md)
- Estado no GitHub: **Aberta**, observado em 2026-10-23
- Status real do código: **Implementação em andamento**
- Última verificação: 2026-10-23
- Prioridade explícita: **P1**
- Estimativa explícita: PERT O=2, M=4, P=8 dias; Te=4,33 pessoa-dias

O status SPEC em revisão descreve o rastreamento local. A issue segue aberta no GitHub; o estado GitHub não comprova implementação.

## Matriz de requisitos

| Requisito original (citação curta ou referência ao trecho)     | Status                  | Evidência no código ou pendência                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “~360px: sem checkbox de seleção nas tabelas de gestão.”       | Ajustado por feedback posterior | Checkboxes ficam ocultos inicialmente e surgem à esquerda dos cartões quando uma linha é selecionada pelo ⋯ ou por toque prolongado. |
| “Mobile: só busca global + ação primária; ocultar toolbar secundária (export, colunas extras).” | Pendente | TableToolbar mostra atualizar, redefinir, seleção em massa, imprimir e visibilidade de colunas. A criação fica no cabeçalho de DomainWorkspace e UserManagementWorkspace. Não há ação de exportação na toolbar atual. |
| “Preferir cartão ou menu ⋯ por linha.”                         | Verificado em Usuários | Menu ⋯ e seleção por opção foram exercitados no navegador móvel; matriz das demais áreas ainda pendente.                                                                                                                                                              |
| “Desktop: manter comportamento atual salvo decisão contrária.” | Verificado em Usuários | Em 1024px, tabela e ação do cabeçalho permanecem visíveis; gatilhos móveis ficam ocultos e não há overflow horizontal.                                                                                                                                                                           |
| “Toque ≥ 44px; modais com teclado virtual.”                    | Parcial                 | Checkboxes, ⋯, Limpar e Excluir têm alvos mínimos de 44px. A confirmação de exclusão abriu no teste móvel; falta conferir teclado virtual em outras áreas.                                               |
| “Teste: pessoas, usuários, patrimônio, músicas, mídias.”       | Pendente                | Verificação browser ainda pendente. Mídias usa lista própria e será verificada sem redesign.                                                                                                                                                                                |
| “Permissões can() inalteradas.”                                | Atendido                | Botões de criação e ações do CRUD são condicionados por can() em DomainWorkspace e UserManagementWorkspace. Reavaliar após implementar.                                                                                                                                     |
| “~360px; busca com label; ⋯ acessível.” | Parcial | O cartão móvel já é exibido até 959px e a busca global tem aria-label. O checklist da issue está marcado [x], mas o código atual não tem gatilho ⋯; implementar e validar rótulo, teclado e alvo ≥44px. |
| Feedback de implementação: fixar dentro de ⋯; Visualizar em modal; remover Ver mais/Recolher; indicar visualmente o pin. | Parcial | Cartões fixados exibem só o ícone de alfinete ao lado de ⋯; Visualizar apresenta os valores no EntityDialog. A matriz de áreas ainda falta. |
| Feedback: selecionar pelo ⋯ ou toque prolongado, selecionar linha tocando no cartão, fechar menu fora dele e exibir Excluir junto à tabela. | Verificado em Usuários | Toque real em “Selecionar” marcou uma linha; toques na terceira linha alternaram a seleção 1→2→1; tocar fora fechou o menu. Cada linha elegível recebe o mesmo menu. O bloco fica junto aos cartões, separado da busca e criação. |
| “Fora de escopo: virtualização; redesign desktop completo.”    | Fora do escopo acordado | A SPEC não inclui virtualização nem redesign desktop.                                                                                                                                                                                                                       |

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

## Próxima atualização

SPEC aprovada; implementação em andamento. Lint e TypeScript passaram. Usuários foi exercitado a 360px e 1024px; a matriz restante de Gestão, Estudo e Mídias continua pendente.
