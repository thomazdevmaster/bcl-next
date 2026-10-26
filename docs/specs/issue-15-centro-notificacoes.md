# SPEC — Issue #15: Centro de notificações in-app

- **Issue:** [#15 — Centro de notificações in-app (MVP aprovações e conta)](https://github.com/thomazdevmaster/bcl-next/issues/15)
- **Status desta SPEC:** pronta para revisão da pessoa usuária; implementação não iniciada
- **Data do snapshot:** 2026-10-24
- **Repositórios:** `bcl-next` (frontend) e `bcl-api` (API Spring)
- **Branches preparadas:** `bcl-next: feat/issue-15-centro-notificacoes` sobre `7b3cbe4`; `bcl-api: feat/issue-15-notifications` sobre `a31a3aa`

## 1. Contexto original preservado

### Issue

- **Título:** `[Melhoria] Centro de notificações in-app (MVP aprovações e conta)`
- **URL:** https://github.com/thomazdevmaster/bcl-next/issues/15
- **Estado:** OPEN
- **Responsável:** `kjunda01` (Sinval Silva Junior)
- **Labels:** `enhancement`
- **Milestone:** nenhum
- **Campos de projeto:** `projectItems` vazio na consulta; a timeline registra eventos de projeto em 2026-10-21 e 2026-10-24, sem campos do item disponíveis.
- **Comentários:** nenhum; consulta retornou lista vazia.

### Corpo integral da issue no GitHub

<!-- Início do conteúdo original; transcrição literal do campo body da issue. -->

## Metadado

- **Código plano:** `FEAT-15`
- **Prioridade produto:** P1

## Priorização (PERT — person-days)

|                              | Dias     |
| ---------------------------- | -------- |
| Otimista (O)                 | 3        |
| Mais provável (M)            | 5        |
| Pessimista (P)               | 10       |
| **Esperado Te = (O+4M+P)/6** | **5.50** |

_Te serve para ordenar o backlog; ajuste O/M/P quando refinarem._

---

## Problema ou oportunidade

Maestro/admin não recebem sinal claro quando há **cadastro pendente de aprovação**, **novo cadastro** relevante ou quando um usuário **altera senha** (auditoria básica). Hoje parte disso pode estar em telas específicas (ex. aprovações de usuários), fácil de perder no dia a dia.

## Proposta

**MVP — notificações in-app** (sino ou ícone no `AppShell`, visível só logado):

| Evento (MVP)                                | Quem recebe                            | Ação sugerida                  |
| ------------------------------------------- | -------------------------------------- | ------------------------------ |
| Cadastro aguardando aprovação               | admin / maestro (conforme regra atual) | Link para fila de aprovação    |
| Novo cadastro concluído (informativo)       | admin                                  | Link para usuário/pessoa       |
| Senha alterada (própria conta ou por admin) | usuário afetado + opcional admin       | Link perfil / log de segurança |

**UX:**

- Lista recente (últimas N), marcar como lida, badge com contagem.
- Empty state: “Nenhuma notificação”.
- Mobile: painel full-width ou sheet, não cobrir navegação crítica.

**Arquitetura (preparar o futuro):**

- Modelo extensível: `type`, `payload`, `readAt`, `userId` destinatário.
- Tipos futuros (fora do MVP): música nova no repertório, mensagem da diretoria, lembrete de ensaio.
- API: endpoint `/notifications` (mock json-server → Spring depois); polling leve ou SSE no futuro.

## Área

- [x] Gestão / shell autenticado
- [x] Auth / perfis
- [ ] Portal público

## Critérios de aceite

- [ ] Ícone de notificações no header/shell para usuários autenticados.
- [ ] MVP dispara/atualiza notificações para os três casos acima (dados reais ou seed demonstrável).
- [ ] Marcar como lida persiste (localStorage aceitável no mock; API na produção).
- [ ] Documentar enum de tipos e contrato para extensão futura.

## Mobile e acessibilidade

- [x] Lista e badge usáveis no celular; `aria-live` para contagem nova.

## Fora de escopo (fase 1)

- Push browser, e-mail, WhatsApp.
- Notificação de “música nova” e mensagens (só deixar modelado).

## Referências

- `src/components/domain/UserApprovals.tsx` (se existir fluxo de aprovação)
- `AppShell.tsx`

<!-- Fim do conteúdo original. -->

### Referências e busca de PRs

- A timeline da issue contém uma referência cruzada da issue #24, que cita a #15 como dependência.
- Nenhuma PR relacionada à #15 foi encontrada após consulta completa das PRs de `kjunda01` (11 resultados; limite consultado 500). A #24 é issue, não PR.
- [PR #95 — Dev: encerrar json-server e usar bcl-api](https://github.com/thomazdevmaster/bcl-next/pull/95) está aberta, sem reviews nem decisão de aprovação. Ela não foi classificada como PR relacionada à #15; é contexto de arquitetura. O branch desta issue precede essa PR, portanto referências locais antigas a json-server não descrevem o destino aprovado.
- No `main` do repositório privado `bcl-api`, foram observados signup pendente, troca de senha e reset administrativo reais; não havia recurso/controller de notificações nem migration correspondente. `spring-boot-starter-mail` e `StaffMail` atendem avisos a um endereço fixo da equipe, sem preferências por usuário nem entrega individual.
- A pessoa usuária autorizou implementar também em `bcl-api` e abrir PR nesse repositório citando `thomazdevmaster/bcl-next#15`. A PR deve usar referência que não feche a issue (por exemplo, `Refs thomazdevmaster/bcl-next#15`). Isso será feito após implementação e revisão do backend.

## 2. Fatos observados no produto

- O App Router é o fluxo oficial do frontend. O shell atual fica em `src/layouts/AppShell.tsx`; o avatar abre menu de conta em mobile e desktop.
- As permissões do frontend são a união das permissões dos papéis. No backend, permissões são concedidas a papéis pela tabela `RolePermission`; não há concessão por conta individual.
- A página de preferências é `/configuracoes` em pt-BR; `/settings` redireciona para ela. Rotas de gestão ficam sob `/gestao`.
- O fluxo de aprovação já consulta a permissão efetiva `users:approve` (`src/components/domain/UserApprovals.tsx`).
- O frontend será integrado à API real `bcl-api`. Não criar json-server, mock local ou outro backend de desenvolvimento para este recurso.
- O backend usa Spring Boot/Java 21, PostgreSQL e migrations Flyway. O envio de e-mail já tem infraestrutura SMTP, mas a entrega individual e a outbox deste recurso são novas.

## 3. Decisões confirmadas na entrevista

1. Cadastro concluído gera dois avisos distintos: um aviso operacional de cadastro pendente e outro aviso informativo de novo cadastro.
2. O aviso de aprovação vai às contas com permissão efetiva `users:approve`, sem fixar os papéis `admin` ou `maestro`.
3. A alteração efetiva de senha, própria ou feita por admin, avisa somente a conta afetada. Pedido de redefinição sem troca efetiva não gera aviso.
4. Os disparos usam eventos reais; dados de seed podem complementar a demonstração, mas não substituem os eventos reais.
5. A persistência da notificação automática participa da mesma transação de signup/troca de senha/reset administrativo. Se a gravação falhar, a operação principal falha junto.
6. Não haverá polling nem SSE no MVP. Carregar badge ao montar o shell; carregar/atualizar a lista ao abrir a inbox; atualizar a interface após marcar como lida.
7. Mostrar primeiro as 10 mais recentes e permitir carregar mais em blocos de 10. O contador considera todas as não lidas que o visualizador pode consultar.
8. Links automáticos: `/gestao/usuarios` para cadastro/aprovação e `/profile` para alteração de senha. Não criar log de segurança separado no MVP.
9. Admins consultam globalmente notificações automáticas, inclusive as de alteração de senha. Cada pessoa tem estado de leitura próprio; ler uma cópia não altera as demais.
10. Um alerta manual é visível apenas à conta remetente e às contas destinatárias; outros admins não têm acesso global a alertas manuais de terceiros.
11. “Todos” significa contas ativas e aprovadas, com remetente excluído por padrão. Destinatários específicos também devem estar ativos e aprovados.
12. Uma conta autorizada envia título, corpo em texto simples e link opcional (caminho do portal ou URL externa `http(s)` válida), imediatamente; sem anexos nem agendamento.
13. Criar a permissão `notifications:create`, atribuída ao papel admin por padrão e delegável a outros papéis. A concessão é feita ao papel; todas as contas desse papel recebem a permissão efetiva pela união de papéis.
14. Alertas manuais enviados por uma conta autorizada são obrigatórios no portal, independentemente da preferência do destinatário; e-mail está desabilitado neste MVP. Para demais tipos, cada conta configura a preferência do portal; a preferência de e-mail fica reservada para ativação futura.
15. Preferências ficam em `/configuracoes`; preferências do portal começam ligadas. Mudanças aplicam-se a notificações futuras.
16. A estrutura prevista para e-mail usa outbox persistida, com até cinco tentativas e reenvio manual; o processamento só será ativado futuramente por configuração explícita.
17. No mobile, sino independente à esquerda do avatar, contador no sino e abertura direta da inbox. No desktop, o sino fica à direita do bloco de marca/perfil na navegação; quando recolhida, fica acima do primeiro item. A contagem aparece no sino, nunca sobre o avatar, e clicar no avatar não abre a inbox.
18. A inbox abre em modal centralizado usando o diálogo compartilhado, com largura ampla (aproximadamente metade da tela em desktop) e dimensões/rolagem adaptadas ao celular.
19. Modelo aprovado: um registro por acontecimento com acesso/leitura independentes por pessoa; estado de leitura global de admin é próprio. A outbox de e-mail é separada.
20. `notifications:create` pode ser delegada a outros papéis, não a contas individuais, conforme o modelo de autorização vigente.

### Ampliação acordada em relação à issue original

- Inclui alertas manuais em massa ou a destinatários específicos e a tela `/gestao/notificacao` para contas com `notifications:create`.
- Inclui preferências por tipo em `/configuracoes`; e-mail permanece explicitamente desabilitado no MVP.
- Mantém a estrutura de outbox, retry e reenvio de e-mail para futura ativação. Por decisão posterior, o canal e o processamento ficam desabilitados neste MVP.
- A área de envio aceita apenas contas ativas e aprovadas; autor não é incluído automaticamente como destinatário.

## 4. Desenho funcional

### 4.1 Tipos e gatilhos

| Tipo                      | Gatilho e público                                                                           | Link               | Preferências                                   |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------- |
| `signup_approval_pending` | Signup cria uma conta pendente; entregar aos usuários com permissão efetiva `users:approve` | `/gestao/usuarios` | Preferência individual por tipo/canal          |
| `signup_completed`        | Signup é concluído; entregar a admins                                                       | `/gestao/usuarios` | Preferência individual por tipo/canal          |
| `password_changed`        | A senha é efetivamente atualizada; entregar somente à conta afetada                         | `/profile`         | Preferência individual por tipo/canal          |
| `admin_message`           | Pessoa com `notifications:create` envia a contas escolhidas ou a todas as elegíveis         | Link opcional      | Portal obrigatório; e-mail desabilitado no MVP |
| `blog_post_published`     | Post criado ou promovido a publicado com a opção marcada; contas ativas e aprovadas         | `/blog/[slug]`     | Preferência individual do portal               |
| `agenda_event_published`  | Apresentação pública criada ou promovida a agendada com a opção marcada                     | `/agenda`          | Preferência individual do portal               |

Tipos futuros permanecem modelados sem gatilhos: `repertoire_song_created`, `board_message` e `rehearsal_reminder`.

### 4.2 Visibilidade e leitura

- Uma notificação automática é um acontecimento lógico único; cada conta destinatária tem estado de leitura independente.
- Admin pode consultar todos os acontecimentos automáticos. Sua própria leitura é registrada separadamente da leitura de destinatários.
- Uma notificação manual é acessível apenas ao remetente e destinatários, incluindo quando o remetente não é admin. Outros admins não a veem por privilégio administrativo.
- Cada pessoa marca como lida somente sua própria visualização. A API valida visibilidade e identidade do visualizador; esconder controles no cliente não é controle de segurança.
- O badge conta itens não lidos pelo visualizador dentro das notificações acessíveis a ele. Para admin isso inclui automáticas globalmente visíveis e mensagens manuais que enviou ou recebeu; exclui alertas privados de outros remetentes.
- Carregar mais e marcar como lida não devem mudar a leitura de outra conta. Uma operação de leitura repetida é idempotente.

### 4.3 Preferências e canais

- Preferências são próprias de cada conta e organizadas por tipo e canal (`portal`, `email`). No MVP, o canal e-mail fica forçado para desligado; portal segue a preferência por tipo, respeitando as exceções abaixo.
- Em `/configuracoes`, as preferências são apresentadas em seletor múltiplo compacto, com opções identificadas por módulo e aviso. Opções marcadas são recebidas no portal. Admins veem todos os tipos configuráveis; as demais contas veem somente avisos que podem receber, conforme o perfil e as permissões efetivas.
- `signup_approval_pending` e `signup_completed` usam a permissão efetiva `users:approve`; o papel `admin` recebe essa permissão por padrão. Contas sem essa permissão não veem essas preferências. As regras atuais de entrega das notificações permanecem inalteradas.
- `admin_message` é obrigatório no portal e não aparece como preferência configurável. E-mail não aparece na interface enquanto o canal estiver desabilitado; o campo `emailEnabled` continua preservado no contrato e nas preferências existentes.
- Para eventos automáticos, aplicar a preferência de portal da pessoa destinatária no momento do evento. O canal de e-mail não cria jobs enquanto `bcl.notifications.email-enabled` estiver falso. Admin mantém visibilidade global dos avisos automáticos conforme regra acima.
- Para `admin_message`, sempre criar a visualização no portal para cada destinatário; e-mail permanece desabilitado no MVP.
- Não enviar a eventos passados retroativamente quando uma pessoa altera suas preferências.

### 4.4 Envio manual

- A tela `/gestao/notificacao` exige `notifications:create`, tanto no frontend quanto na API.
- O autor seleciona destinatários específicos ou “todos”. “Todos” resolve contas ativas e aprovadas na hora do envio e exclui o autor. Destinatários específicos obedecem à mesma elegibilidade.
- Validar título, corpo simples, limites de tamanho e link opcional no cliente e no servidor. Aceitar caminhos do portal e URLs `http(s)` externas válidas; rejeitar esquemas inseguros, links malformados e URLs com credenciais.
- Persistir a notificação e todos os destinatários no mesmo commit. Se a seleção contiver ID inexistente ou inelegível, rejeitar o envio integral e não entregar parcialmente.
- Ao concluir, mostrar confirmação do número de contas destinatárias. Erros gerais devem ser acessíveis. O envio por e-mail é indicado como temporariamente desabilitado.

### 4.5 Central de notificações na Gestão

- Manter o sino/inbox junto ao perfil e acrescentar uma visualização independente na página `/gestao/notificacao`, além do formulário atual de envio.
- A central mostra as notificações que a conta autenticada pode consultar segundo as regras da inbox: automáticas globais para admin, notificações destinadas à conta e alertas manuais enviados pela própria conta. Não revela alertas manuais de outros remetentes.
- A central inclui itens não lidos, lidos e removidos da inbox principal. Abrir um item já lido permite reler seu conteúdo sem alterar a data de leitura; abrir um não lido pode marcá-lo como lido.
- “Remover da caixa” é uma ocultação por visualizador, não exclusão física. A notificação permanece disponível na central da Gestão e pode ser restaurada para a inbox principal. A leitura e a ocultação são estados independentes por pessoa.
- Para alertas manuais enviados pela própria conta, a central permite consultar a lista de destinatários e o estado lida/não lida de cada um. Somente o remetente pode consultar esses recibos; eles não ficam visíveis a outros gestores.
- A central é protegida por `notifications:create`, lista em lotes de 10 com paginação, e mantém estados de carregamento, erro e vazio. A API valida a visibilidade e a autorização em cada operação.

### 4.6 Canal de e-mail temporariamente desabilitado

- O envio de notificações por e-mail fica desabilitado no MVP. Nenhuma interface de preferências oferece controles de e-mail.
- Alertas continuam sendo gravados e entregues no portal, sem depender da preferência de e-mail.
- Mantemos o contrato `emailEnabled`, as preferências persistidas, as tabelas/outbox e a estrutura de entrega como scaffolding para uma ativação futura. Enquanto desabilitado, a API preserva as preferências existentes, mas não cria novas entradas na outbox nem executa entregas pendentes.
- O canal só volta a ser oferecido após ativação explícita da configuração de backend e atualização da interface.

### 4.7 Avisos de novas publicações

- Ao criar ou publicar um post do blog, a opção “Notificar todas as contas” vem marcada por padrão; desmarcá-la suprime o aviso daquele post.
- Ao criar ou tornar pública/agendada uma apresentação, a mesma opção vem marcada por padrão; rascunhos e apresentações privadas não enviam aviso.
- O backend cria um aviso automático para as contas ativas e aprovadas, incluindo quem publicou, respeitando a preferência de portal de cada conta. A notificação é persistida na mesma transação da publicação.
- Edições de um post já publicado ou de uma apresentação já agendada e pública não criam avisos repetidos.

## 5. Desenho técnico e contrato

### `bcl-api`

- Adicionar domínio, persistência, migration Flyway, serviço, controller/DTOs e autorização para notificações e preferências, seguindo os módulos e convenções existentes. A estrutura da outbox de e-mail fica preservada, mas desabilitada por configuração no MVP.
- Estrutura lógica: `Notification` contém tipo, ator opcional, título/corpo ou payload tipado, link opcional e instante de criação; registros de acesso identificam remetente/destinatários e guardam `readAt` por visualizador. Para leitura de automáticas globais por admins, registrar leitura por viewer sem conceder acesso a notificações manuais de outras pessoas.
- Preferências persistidas por conta, tipo e canal. Ausência de linha significa default habilitado.
- Outbox mantém destinatário, referência à notificação, status, contador de tentativas, próximo horário, última falha e metadados de auditoria como estrutura futura. Não processar nem criar jobs enquanto o canal estiver desabilitado.
- Criar chaves no catálogo backend para `notifications:create`, associadas a admin por padrão e delegáveis via gestão de papéis.
- Expor operações para: listar notificações visíveis com cursor/limite; obter contagem não lida; marcar a visualização atual como lida; ler/atualizar preferências; enviar aviso manual. O contrato da outbox e as operações de reenvio ficam preservados para ativação futura, sem processamento enquanto `bcl.notifications.email-enabled` estiver falso.
- Expor operações autorizadas para listar a central incluindo notificações arquivadas por visualizador, arquivar/restaurar a visualização atual e consultar recibos dos destinatários de alertas manuais próprios.
- Disparos automáticos no portal participam da transação da operação de negócio. A estrutura da outbox permanece no código, mas não recebe novos itens nem é processada enquanto o canal estiver desabilitado.

### `bcl-next`

- Estender o catálogo de permissões e tela de gestão de papéis com `notifications:create`; seguir o modelo de permissões já existente.
- Criar `/gestao/notificacao` usando as composições e validações de formulário compartilhadas definidas em `AGENTS.md`.
- Integrar shell autenticado, inbox e preferências via API real. Estado de leitura não fica em `localStorage`.
- Acrescentar à página `/gestao/notificacao` uma central paginada, com abertura para reler, recuperação de itens removidos da inbox e recibos dos alertas enviados pela própria conta.
- Permitir remover/restaurar da inbox sem apagar o registro de notificação; manter a remoção separada do estado de leitura.
- No mobile, deixar alvo de toque mínimo de 44 px, modal com altura máxima e scroll interno; preservar navegação e ações. Em desktop, abrir modal centralizado associado ao sino e ao diálogo compartilhado.
- Usar Tailwind nas classes dos componentes novos/alterados. A contagem deve ter nome acessível e `aria-live`; lista, sheet/popover, estados vazio, loading e erro devem funcionar com teclado e leitor de tela.

### Fluxo resumido

1. Evento de negócio inicia transação.
2. API decide tipo e destinatários segundo permissões/preferências; persiste acontecimento e acessos/read states. O canal de e-mail não cria jobs no MVP.
3. Commit libera a operação; o worker de e-mail permanece desativado até futura ativação.
4. Shell carrega a contagem. Abrir inbox pede a primeira página (10) e “Carregar mais” usa cursor; leitura atualiza somente o viewer atual.
5. A estrutura de reenvio manual fica preservada para ativação futura.
6. Gestão lista, em sua central autorizada, o escopo pessoal visível, incluindo estados lidos/arquivados; remetentes consultam recibos somente dos próprios alertas manuais.

## 6. Erros, segurança e acessibilidade

- API é autoridade para visibilidade, destinatários elegíveis, permissão de envio e alterações de leitura. Operações de e-mail permanecem sem processamento até futura ativação.
- Respostas de listagem/contagem não devem vazar título, corpo, remetente ou existência de alerta manual privado para outros admins.
- A central de Gestão usa o mesmo escopo de visibilidade por visualizador da inbox; recibos de leitura de alertas manuais só são retornados ao remetente.
- Falha ao persistir notificação automática desfaz a operação de negócio na mesma transação. Quando e-mail for futuramente ativado, falha SMTP não desfará o portal nem a operação original.
- Falha de rede ao carregar contagem/lista deve preservar o shell e mostrar estado de erro recuperável. Repetir uma chamada de leitura não cria cópias.
- Mensagem vazia exata: “Nenhuma notificação”.
- Contagem acessível com `aria-live` no sino; controles com foco/teclado e labels; modal com fechamento e foco adequados.
- Verificar browser em viewport mobile de aproximadamente 360 px e desktop de pelo menos 960 px, incluindo modal, scroll, badge no sino, menu de avatar, lista longa e fluxo de envio.

## 7. Fora de escopo

- Push do navegador, WhatsApp, polling e SSE.
- Gatilhos de notificações para música nova, mensagens da diretoria ou lembretes de ensaio (somente tipos modelados).
- Agendamento, anexos, HTML rico, esquemas de URL inseguros e reenvio de alertas do portal como novas notificações.
- Criar log de segurança independente ou retomar qualquer mock local/json-server.

## 8. Critérios de aceite acordados

- [ ] Usuário autenticado tem acesso à contagem no sino e inbox modal, segundo o layout de mobile/desktop acordado.
- [ ] Signup pendente, signup concluído e alteração efetiva de senha geram os respectivos avisos reais e links corretos.
- [ ] As preferências de avisos de cadastro aparecem somente a contas com `users:approve`; alteração de senha avisa apenas a conta afetada.
- [ ] Admin vê todos os avisos automáticos, com leitura pessoal; mensagens manuais são visíveis somente ao remetente e destinatários.
- [ ] Marcar como lida persiste no backend e afeta apenas a visualização da pessoa atual.
- [ ] Contagem fica apenas no sino, considera todas as não lidas acessíveis; inbox modal carrega 10 e pagina em blocos de 10; empty state é “Nenhuma notificação”.
- [ ] `notifications:create` é aplicada por papel e protege UI/API; admin recebe por padrão e pode delegar a papéis.
- [ ] Envio manual individual/massa valida contas ativas/aprovadas; “todos” exclui remetente; texto/link conforme regras; alertas aparecem no portal.
- [ ] Preferências aparecem em seletor múltiplo compacto por módulo, salvam em `/configuracoes` e afetam eventos futuros; e-mail e `admin_message` não aparecem como controles; mensagens manuais continuam obrigatórias no portal.
- [ ] Estrutura de outbox e reenvio fica preservada para o futuro, mas não cria jobs nem processa e-mails enquanto `NOTIFICATIONS_EMAIL_ENABLED=false`.
- [ ] Contrato documenta tipos, payload e extensão futura; não há mock local.
- [ ] UI é acessível e utilizável no browser em mobile (360 px) e desktop (>=960 px).
- [ ] O PR de `bcl-api` cita esta issue com referência não fechadora e fica separado do PR frontend.
- [ ] Gestão oferece uma central adicional à inbox do perfil, com notificações recebidas/enviadas visíveis à conta, incluindo lidas e removidas da inbox, possibilidade de reler/restaurar e recibos de leitura dos destinatários nos envios próprios.

## 9. Revisão da SPEC

- [x] Corpo original mantido integralmente, separado do escopo acordado.
- [x] Diferença de escopo para e-mail explicitada.
- [x] Visibilidade admin automática e exceção de alerta manual descritas sem conflito.
- [x] Leitura por pessoa e contagem por visualizador descritas.
- [x] Eligibility de destinatários específicos e massa igualada a contas ativas/aprovadas.
- [x] Persistência síncrona da notificação separada do envio assíncrono de e-mail.
- [x] Sem TODO/TBD; endpoint names ficam deliberadamente subordinados aos padrões existentes no `bcl-api`.
- [x] Revisão e aprovação da pessoa usuária.
