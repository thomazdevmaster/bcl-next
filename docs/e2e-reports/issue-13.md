# Relatório E2E — Issue 13: Agenda e tipos de evento

## Execução de 31/10/2026 — 17:13 BRT

- **Issue:** [#13 — Unificar agenda: tipos de evento configuráveis](https://github.com/thomazdevmaster/bcl-next/issues/13)
- **Checkout:** `/Users/kjunda01/Desktop/bcl-next`
- **Branch:** `feat/13-unificar-agenda-tipos-de-evento-configuraveis`
- **Ambiente:** frontend `http://localhost:3000`; API `http://localhost:8080`; `/health` respondeu `200` com banco e storage ativos.
- **Perfil confirmado:** Administrador, por `GET /auth/me` (`roles: ["admin"]`). Credenciais omitidas.

### Resumo

Os fluxos de gestão de tipos, criação de evento, associação histórica ao desativar tipo, portal público e recuperação de erro foram exercitados. Os dados temporários foram removidos e sua ausência confirmada por leituras novas da API. O teste com perfil comum não foi concluído: o formulário de criação de integrante permaneceu aberto após clicar em “Criar integrante” e não enviou chamada à API; nenhuma conta de teste foi criada.

### Passaram

- `/gestao/agenda` abriu com abas “Eventos” e “Tipos de evento”; a conta Admin viu as ações de gestão.
- A gestão exibiu eventos e seus tipos, incluindo snapshots de eventos antigos com “Tipo removido”.
- Admin criou pela UI o tipo temporário `E2E issue13 20261031`; a API respondeu `201`, com `isPublicByDefault: false`, `isActive: true` e `isSystem: false`.
- Na criação de evento pela UI, selecionar esse tipo deixou “Mostrar na agenda pública” desmarcado. A API confirmou `eventTypeId: 4`, `isPublic: false` e `status: draft` para o evento temporário `61000025`.
- Em um formulário não enviado, selecionar um tipo, alterar manualmente a visibilidade e trocar o tipo preservou a escolha manual.
- Desativar pela UI o tipo customizado ainda associado a um evento persistiu `isActive: false`; leituras autenticadas confirmaram que o evento continuou associado ao tipo e manteve seu nome. Ao editar o evento, o tipo inativo permaneceu selecionado.
- O portal `/agenda` exibiu eventos públicos com seus tipos; evento privado não foi exposto.
- Em 360 px, `/agenda`, a gestão e o formulário de evento ficaram dentro da largura da viewport. O botão “Continuar” do formulário tinha 48 px de altura. Em 1280 px, a gestão também ficou sem overflow horizontal.
- Com a requisição `/presentations` bloqueada no browser em 360 px, a agenda mostrou a mensagem acessível “Não foi possível carregar a agenda. Verifique sua conexão e tente novamente.” e o botão “Tentar novamente”. Removido o bloqueio e acionado o botão, a agenda carregou seis eventos sem overflow.
- A rota antiga `/gestao/apresentacoes` redirecionou para a nova Agenda. Deslogado, o acesso à gestão terminou no login.
- Sem autenticação, `POST /presentation-types` retornou `401`, sem criar dados.

### Parciais

- O formulário de integrante permitiu selecionar somente “Amigos”, mas clicar em “Criar integrante” não produziu chamada à API nem fechou o modal. A consulta posterior confirmou que o username E2E não foi criado; não alterei nenhuma conta existente.
- O redirecionamento da rota antiga foi observado deslogado; não validei a preservação dos parâmetros nessa mesma sessão, pois o guard de acesso encaminhou para login. O teste de rota automatizado da branch cobre query params repetidos e codificados.
- A viewport móvel foi simulada em browser; não houve teste em aparelho físico.

### Falharam

- Nenhum critério do fluxo de agenda/tipos falhou nos cenários executados. O setup de uma conta Amigos não avançou, conforme registrado em “Parciais”.

### Não puderam ser testados

- Perfil Maestro em sessão própria.
- Perfil comum Amigos e resposta `403` da API para tentativa de escrita; a tentativa de criar uma conta dedicada não chegou ao backend.
- Fluxo de toque em aparelho físico.

### Limpeza e ambiente

- Evento de teste `61000025` foi excluído pela UI; leitura autenticada posterior confirmou ausência.
- Tipo de teste `4` foi excluído pela API oficial após remover o evento; `GET /presentation-types` confirmou ausência.
- Nenhuma conta de teste foi criada, e nenhuma conta existente teve papéis ou estado alterados.
- A tentativa de iniciar outro Compose encontrou a porta `9000` já ocupada pelo MinIO de desenvolvimento existente. Removi apenas os containers/rede `bcl-api` criados por essa tentativa (sem remover volumes); os serviços existentes permaneceram ativos e `/health` continuou `200`.
