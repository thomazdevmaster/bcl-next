# Issue 13 — Roteiro de testes ponta a ponta

Issue: [#13 — Unificar agenda: tipos de evento configuráveis](https://github.com/thomazdevmaster/bcl-next/issues/13)

Este roteiro verifica os fluxos do frontend com a API oficial conectada. Não é uma garantia matemática de ausência de defeitos; combina validação manual de interface, persistência e permissões para cobrir os critérios da issue.

## Reexecução focal dos cenários pendentes — 31/10/2026

**Ambiente:** frontend `http://localhost:3000` e API `http://localhost:8080`; `/health` confirmou banco e storage ativos. Perfil usado nesta rodada: Administrador. A suíte automatizada completa não foi executada.

### Passaram

- Criado pela gestão o tipo temporário `E2E issue13 20261031 linked type`, com “Público por padrão” desligado. Na criação do evento, o checkbox começou desmarcado; foi marcado manualmente e o evento `E2E issue13 override and linked type` foi salvo como agendado e público. A chamada observada à API confirmou `eventTypeId: 6`, `isPublic: true` e `notifyAll: false`.
- O evento apareceu em `/agenda`. Depois de desativar o tipo pela gestão e recarregar as páginas, o evento continuou na lista administrativa e no portal, exibindo o nome do tipo associado.
- Com a chamada `/presentations` bloqueada no browser, `/agenda` exibiu `Failed to fetch`. Após remover o bloqueio e recarregar, a lista de eventos voltou a aparecer.
- Em viewport de 360 px, `/agenda` e `/gestao/agenda` mantiveram `document.documentElement.scrollWidth === 360`. A gestão exibiu eventos em cartões; o modal de novo evento abriu e o botão “Continuar” ficou visível com altura mínima de 44 px.
- Limpeza concluída: o evento foi excluído pela gestão e o tipo temporário foi removido pela API oficial após a exclusão do vínculo. Leituras novas de `/presentations` e `/presentation-types` confirmaram que ambos não existem mais.

### Parciais

- A falha de rede é recuperável após recarregar a página, mas a interface mostrou a mensagem técnica em inglês (`Failed to fetch`) e não ofereceu uma ação de nova tentativa na própria página.
- A viewport móvel foi simulada no browser; não foi usado aparelho físico nem validado o fluxo completo do formulário por toque.
- A automação não conseguiu digitar no controle nativo de data e hora. Para prosseguir com o cenário, o valor ISO foi aplicado no controle pelo browser; a digitação real desse campo não foi coberta.

### Falharam

- Nenhum cenário desta rodada falhou por completo.

### Não puderam ser testados

- Os papéis Maestro e usuário comum, o visitante sem login e as permissões `401`/`403` não foram revalidados nesta rodada; há resultados de uma execução anterior neste roteiro.
- O alinhamento da documentação do contrato no repositório `bcl-api` não foi verificado.
- A suíte automatizada completa não foi executada; esta rodada cobriu apenas os cenários E2E focais acima.

## Reexecução local com Maestro — 31/10/2026

**Status desta rodada: parcial; os fluxos de Maestro e os principais cenários de visibilidade passaram.** A suíte completa não foi executada. A tentativa anterior de edição que retornou `409` não se reproduziu nesta rodada.

### Passaram

- A conta local `usuario.dev.000014` autenticou como Maestro/Músico, concluiu a troca obrigatória de senha e abriu `/gestao/agenda`.
- Maestro acessou as abas Eventos e Tipos de evento e viu as ações “Novo evento” e “Novo tipo”.
- O perfil Maestro/Músico foi temporariamente alterado para Amigos pela conta admin; autenticado como Amigos, `/gestao/agenda` exibiu “Acesso restrito” e `POST /presentation-types` respondeu `403` sem criar registro. Os papéis Maestro/Músico foram restaurados e confirmados pela API.
- `/gestao/apresentacoes?origem=e2e&tipo=evento` redirecionou para `/gestao/agenda` preservando a query string.
- Avançar sem tipo bloqueou o formulário e mostrou “Selecione o tipo do evento.”
- Maestro criou tipo com padrão público desligado; criou evento futuro agendado e privado. API confirmou `isPublic: false`, `status: scheduled`; o evento não apareceu em `/agenda`.
- Maestro criou evento futuro público. API confirmou `isPublic: true`, `status: scheduled`; ele apareceu em `/agenda` e o evento privado permaneceu oculto.
- Editou o tipo: nome, ícone `groups` e padrão público ligado persistiram na API (`isActive: true`). Ao selecionar esse tipo na criação de evento, “Mostrar na agenda pública” veio marcado por padrão.
- Editou o evento público e vinculou a música `41000047`; a edição foi salva e a API confirmou `repertoireIds: [41000047]`.
- Portal em 360 px mostrou evento público e histórico, ocultou o evento privado e manteve `document.documentElement.scrollWidth === 360`.
- Redirecionamento, validação de tipo e evento passado foram repetidos com a sessão Maestro. O evento histórico continua no banco para inspeção: **ID `61000103`**, título `TESTE E2E - Evento passado - 2026-10-30`.
- Os dois eventos temporários desta rodada (IDs `61000104` e `61000105`) e o tipo temporário (ID `5`) foram removidos; a API confirmou a remoção.

### Parciais

- O `409` anterior em `PUT /presentations/61000102` não foi reproduzido: nesta rodada, o `PUT` com repertório salvou. O evento da tentativa anterior já não existe para comparação direta.
- Validação de nome de tipo: vazio bloqueou o envio; o limite de 80 caracteres foi observado anteriormente, sem mensagem de limite. Não foi repetido nesta rodada.
- Estado vazio e erro de rede (`Failed to fetch`) foram simulados na rodada anterior, não repetidos agora; a recuperação de rede continua sem confirmação.
- O login Maestro, a criação de evento/tipo e o bloqueio de perfil Amigos autenticado passaram. A recuperação de rede segue pendente.

### Falharam

- Nenhum dos fluxos repetidos nesta rodada apresentou falha.
- A mensagem de indisponibilidade da agenda continua registrada da rodada anterior como `Failed to fetch`, em inglês e sem orientação clara de recuperação; não foi repetida nesta rodada.

### Não puderam ser testados nesta rodada

- Desativar tipo enquanto ainda ligado a evento e confirmar a disponibilidade/listagem histórica após recarga.
- Alterar manualmente o checkbox público em sentido contrário ao padrão do tipo; nesta rodada foi confirmado apenas o checkbox marcado por padrão.
- Recuperação após falha de rede, fluxo mobile por toque em formulários/controles e origem real de lista vazia na API.

## Preparar o ambiente

- [x] API oficial já estava iniciada; `/health` confirmou API, banco e storage disponíveis.
- [x] Frontend conectado a `http://localhost:8080` e acessível em `http://localhost:3000`.
- [x] Admin autenticou na rodada inicial; nesta reexecução, a conta local `usuario.dev.000014` autenticou com perfil Maestro/Músico após atualização administrativa e troca obrigatória de senha.
- [x] API e frontend conectados. Eventos públicos, um evento privado temporário e o evento passado foram verificados; os temporários foram removidos e o evento passado permanece para inspeção.

> Maestro, admin e o perfil autenticado Amigos foram exercitados nesta reexecução; falta testar outros perfis restritos, se fizerem parte do aceite.

## Gestão de eventos

- [x] `/gestao/agenda` mostra o título “Agenda” e as abas “Eventos” e “Tipos de evento”.
- [x] Menu lateral não mostra “Apresentações” como item separado.
- [x] `/gestao/apresentacoes` redireciona para `/gestao/agenda`.
- [x] O redirecionamento preserva query params (`?origem=e2e&tipo=evento`).
- [x] Admin criou um evento na rodada anterior; nesta reexecução, Maestro criou eventos público e privado e acessou a gestão de tipos.
- [x] Avançar sem selecionar tipo impediu o formulário e mostrou “Selecione o tipo do evento.”
- [x] Edição de evento com repertório salvou como Maestro; API confirmou `repertoireIds: [41000047]`. O `409` da execução anterior não se reproduziu.
- [x] API confirmou os valores dos eventos criados; registros temporários foram removidos após a rodada.
- [ ] **Não testado na gestão.** No portal público, ao simular indisponibilidade de rede, apareceu somente `Failed to fetch`; recuperação por nova tentativa não foi confirmada.

## Tipos de evento

- [x] Maestro criou tipo sem ícone e com padrão privado; depois editou nome, ícone (`groups`) e padrão público. API confirmou os valores e `isActive: true`.
- [x] O padrão privado foi aplicado ao evento novo (`isPublic: false`); após editar o padrão para público, o checkbox veio marcado ao selecionar o tipo no formulário.
- [ ] **Parcial:** estado ativo permaneceu ligado e foi confirmado pela API; desativar tipo ainda vinculado a evento não foi testado.
- [ ] **Parcial:** nome vazio mostrou erro e bloqueou o envio. Com 100 caracteres, o campo limitou a digitação a 80 e permitiu salvar; não houve mensagem de limite.
- [x] Evento com tipo cujo padrão público estava ligado ficou marcado como público e apareceu no portal.
- [x] Tipo com padrão privado foi selecionado em evento novo, que ficou privado e não apareceu no portal.
- [ ] **Não testado:** alterar manualmente a visibilidade no sentido contrário ao padrão do tipo.
- [ ] **Não testado:** desativar tipo enquanto ainda está vinculado a evento e confirmar disponibilidade/listagem histórica.
- [x] Sem login, a gestão redirecionou para `/login` e `POST /presentation-types` recebeu `401` na rodada anterior. Com perfil autenticado Amigos, `/gestao/agenda` exibiu “Acesso restrito” e `POST /presentation-types` recebeu `403`; papéis Maestro/Músico restaurados depois.
- [x] A API negou operação protegida sem autenticação (`POST /presentation-types` → `401`).

## Portal público

- [x] `/agenda` mostrou eventos públicos futuros em “Próximos eventos”.
- [x] Os cards observados exibiram nomes de tipo; o evento com ícone exibiu `groups`.
- [x] Evento privado agendado foi confirmado pela API (`isPublic: false`) e não apareceu em `/agenda`.
- [x] Evento passado de teste aparece em “Eventos anteriores” (`61000103`); registro mantido no banco para inspeção.
- [x] Eventos com snapshot “Tipo removido” e sem ícone continuaram renderizando.
- [x] Eventos temporários públicos apareceram e o privado permaneceu oculto; tipo e visibilidade foram confirmados após persistência na API.
- [ ] **Parcial:** lista vazia foi conferida com `[]` simulado. A falha foi provocada, mas exibiu `Failed to fetch`; carregamento e recuperação não foram conferidos.
- [x] `/agenda` foi verificada em 360 px e 1280 px sem largura de documento maior que a viewport. A gestão também foi aberta em 360 px sem rolagem horizontal da página.
- [ ] **Parcial:** portal em 360 px mostrou eventos esperados sem overflow; formulários e controles não foram percorridos por toque nessa largura.

## Compatibilidade de dados e aceite

- [x] Edição de evento com repertório foi bem-sucedida nesta reexecução; API confirmou `repertoireIds: [41000047]`. O `409` anterior não se reproduziu.
- [ ] **Não testado:** evento ligado a tipo desativado.
- [x] A criação e leitura confirmaram `eventTypeId` e o objeto `eventType` com `id`, `name` e `icon`.
- [ ] **Parcial:** tentativa anterior `PUT /presentations/61000102` retornou `409`, mas nesta reexecução um `PUT` equivalente salvou com repertório. A causa do conflito anterior não foi isolada.

## Pontos conhecidos fora do fluxo implementado

- A issue sugere filtro público por tipo. O frontend verificado apresenta o tipo nos cards, mas não encontrei filtro por tipo implementado. Se esse filtro for requisito de aceite, implementar antes e acrescentar um passo para filtrar, limpar o filtro e validar resultados vazios.
- A tentativa anterior `PUT /presentations/61000102` respondeu `409`; um `PUT` equivalente com repertório foi bem-sucedido nesta rodada. A causa histórica ainda não foi isolada.
- O alinhamento de contrato e documentação da API não é coberto por este roteiro do frontend; validar no `bcl-api`.
