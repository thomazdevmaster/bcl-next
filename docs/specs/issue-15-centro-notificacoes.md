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
- A página de preferências existente é `/settings`. Rotas de gestão ficam sob `/gestao`.
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
12. Uma conta autorizada envia título, corpo em texto simples e link interno opcional, imediatamente; sem anexos nem agendamento.
13. Criar a permissão `notifications:create`, atribuída ao papel admin por padrão e delegável a outros papéis. A concessão é feita ao papel; todas as contas desse papel recebem a permissão efetiva pela união de papéis.
14. Alertas manuais enviados por uma conta autorizada são obrigatórios no portal, independentemente da preferência do destinatário; a preferência controla o canal de e-mail. Para demais tipos, cada conta configura canais e tipos que deseja receber.
15. Preferências ficam em `/settings`; tipos e canais começam ligados. Mudanças nas preferências aplicam-se a notificações futuras.
16. E-mail usa outbox persistida, com até cinco tentativas em intervalos crescentes. Após a falha final, a pessoa remetente vê o estado de falha e pode reenviar o e-mail manualmente sem duplicar o aviso no portal.
17. No mobile, sino independente à esquerda do avatar, contador no sino e abertura direta da inbox. No desktop, contador sobreposto ao avatar; o avatar abre o menu de conta com “Notificações (X)” junto de Perfil, Configurações e Sair, e não abre a inbox diretamente.
18. A inbox abre como popover no desktop e sheet de largura total no mobile. O sheet não deve cobrir navegação crítica.
19. Modelo aprovado: um registro por acontecimento com acesso/leitura independentes por pessoa; estado de leitura global de admin é próprio. A outbox de e-mail é separada.
20. `notifications:create` pode ser delegada a outros papéis, não a contas individuais, conforme o modelo de autorização vigente.

### Ampliação acordada em relação à issue original

- Inclui alertas manuais em massa ou a destinatários específicos e a tela `/gestao/notificacao` para contas com `notifications:create`.
- Inclui preferências por tipo e canal em `/settings`.
- Inclui entrega de e-mail com outbox, retry e reenvio manual. Isso diverge explicitamente de “e-mail” fora do escopo no corpo original.
- A área de envio aceita apenas contas ativas e aprovadas; autor não é incluído automaticamente como destinatário.

## 4. Desenho funcional

### 4.1 Tipos e gatilhos

| Tipo                      | Gatilho e público                                                                           | Link                  | Preferências                                 |
| ------------------------- | ------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------- |
| `signup_approval_pending` | Signup cria uma conta pendente; entregar aos usuários com permissão efetiva `users:approve` | `/gestao/usuarios`    | Preferência individual por tipo/canal        |
| `signup_completed`        | Signup é concluído; entregar a admins                                                       | `/gestao/usuarios`    | Preferência individual por tipo/canal        |
| `password_changed`        | A senha é efetivamente atualizada; entregar somente à conta afetada                         | `/profile`            | Preferência individual por tipo/canal        |
| `admin_message`           | Pessoa com `notifications:create` envia a contas escolhidas ou a todas as elegíveis         | Link interno opcional | Portal obrigatório; e-mail segue preferência |

Tipos futuros ficam modelados sem gatilhos neste MVP: `repertoire_song_created`, `board_message` e `rehearsal_reminder`.

### 4.2 Visibilidade e leitura

- Uma notificação automática é um acontecimento lógico único; cada conta destinatária tem estado de leitura independente.
- Admin pode consultar todos os acontecimentos automáticos. Sua própria leitura é registrada separadamente da leitura de destinatários.
- Uma notificação manual é acessível apenas ao remetente e destinatários, incluindo quando o remetente não é admin. Outros admins não a veem por privilégio administrativo.
- Cada pessoa marca como lida somente sua própria visualização. A API valida visibilidade e identidade do visualizador; esconder controles no cliente não é controle de segurança.
- O badge conta itens não lidos pelo visualizador dentro das notificações acessíveis a ele. Para admin isso inclui automáticas globalmente visíveis e mensagens manuais que enviou ou recebeu; exclui alertas privados de outros remetentes.
- Carregar mais e marcar como lida não devem mudar a leitura de outra conta. Uma operação de leitura repetida é idempotente.

### 4.3 Preferências e canais

- Preferências são próprias de cada conta e organizadas por tipo e canal (`portal`, `email`), com defaults ligados.
- Para eventos automáticos, aplicar as preferências da pessoa destinatária no momento do evento. Desativar portal impede o item de aparecer no inbox/badge dessa pessoa; e-mail desligado impede criar job de e-mail para ela. Admin mantém visibilidade global dos avisos automáticos conforme regra acima.
- Para `admin_message`, sempre criar a visualização no portal para cada destinatário; somente e-mail respeita a preferência.
- Não enviar a eventos passados retroativamente quando uma pessoa altera suas preferências.

### 4.4 Envio manual

- A tela `/gestao/notificacao` exige `notifications:create`, tanto no frontend quanto na API.
- O autor seleciona destinatários específicos ou “todos”. “Todos” resolve contas ativas e aprovadas na hora do envio e exclui o autor. Destinatários específicos obedecem à mesma elegibilidade.
- Validar título, corpo simples, limites de tamanho e link interno permitido no cliente e no servidor. Não aceitar HTML arbitrário ou URL externa como link interno.
- Persistir a notificação e todos os destinatários no mesmo commit. Se a seleção contiver ID inexistente ou inelegível, rejeitar o envio integral e não entregar parcialmente.
- Ao concluir, mostrar confirmação do número de contas destinatárias. Erros gerais devem ser acessíveis. O autor pode consultar estado de e-mail com falha e solicitar reenvio, sem recriar a notificação nem resetar leituras.

## 5. Desenho técnico e contrato

### `bcl-api`

- Adicionar domínio, persistência, migration Flyway, serviço, controller/DTOs e autorização para notificações, preferências e outbox de e-mail, seguindo os módulos e convenções existentes.
- Estrutura lógica: `Notification` contém tipo, ator opcional, título/corpo ou payload tipado, link interno opcional e instante de criação; registros de acesso identificam remetente/destinatários e guardam `readAt` por visualizador. Para leitura de automáticas globais por admins, registrar leitura por viewer sem conceder acesso a notificações manuais de outras pessoas.
- Preferências persistidas por conta, tipo e canal. Ausência de linha significa default habilitado.
- Outbox persiste destinatário, referência à notificação, status, contador de tentativas, próximo horário, última falha e metadados de auditoria. Processamento fora do request de signup/alteração de senha; tentativas limitadas a cinco com espera crescente. Falha final é visível ao remetente autorizado e permite reenvio manual.
- Criar chaves no catálogo backend para `notifications:create`, associadas a admin por padrão e delegáveis via gestão de papéis.
- Expor operações para: listar notificações visíveis com cursor/limite; obter contagem não lida; marcar a visualização atual como lida; ler/atualizar preferências; enviar aviso manual; consultar falhas de e-mail do autor e reenviar. Os nomes finais dos endpoints e DTOs devem seguir o padrão já usado no `bcl-api`, sem mudar a semântica deste contrato.
- Disparos automáticos participam da transação da operação de negócio. A outbox de e-mail é registrada transacionalmente com a notificação; envio SMTP é assíncrono e não reverte signup/troca de senha após commit.

### `bcl-next`

- Estender o catálogo de permissões e tela de gestão de papéis com `notifications:create`; seguir o modelo de permissões já existente.
- Criar `/gestao/notificacao` usando as composições e validações de formulário compartilhadas definidas em `AGENTS.md`.
- Integrar shell autenticado, inbox e preferências via API real. Estado de leitura não fica em `localStorage`.
- No mobile, deixar alvo de toque mínimo de 44 px, sheet com altura máxima e scroll interno; preservar navegação e ações. Em desktop, popover associado ao menu de conta conforme decisão visual.
- Usar Tailwind nas classes dos componentes novos/alterados. A contagem deve ter nome acessível e `aria-live`; lista, sheet/popover, estados vazio, loading e erro devem funcionar com teclado e leitor de tela.

### Fluxo resumido

1. Evento de negócio inicia transação.
2. API decide o tipo, destinatários e canais segundo permissões/preferências; persiste acontecimento, acessos/read states e jobs de e-mail aplicáveis.
3. Commit libera a operação; worker tenta enviar e-mail da outbox sem bloquear a operação original.
4. Shell carrega a contagem. Abrir inbox pede a primeira página (10) e “Carregar mais” usa cursor; leitura atualiza somente o viewer atual.
5. Reenvio manual altera somente o job de e-mail associado.

## 6. Erros, segurança e acessibilidade

- API é autoridade para visibilidade, destinatários elegíveis, permissão de envio, alterações de leitura e reenvios.
- Respostas de listagem/contagem não devem vazar título, corpo, remetente ou existência de alerta manual privado para outros admins.
- Falha ao persistir notificação automática desfaz a operação de negócio na mesma transação. Falha de SMTP não desfaz o portal nem a operação original.
- Falha de rede ao carregar contagem/lista deve preservar o shell e mostrar estado de erro recuperável. Repetir uma chamada de leitura não cria cópias.
- Mensagem vazia exata: “Nenhuma notificação”.
- Contagem acessível com `aria-live`; controles com foco/teclado e labels; popover/sheet com fechamento e foco adequados.
- Verificar browser em viewport mobile de aproximadamente 360 px e desktop de pelo menos 960 px, incluindo sheet, scroll, badge, menu de avatar, lista longa e fluxo de envio.

## 7. Fora de escopo

- Push do navegador, WhatsApp, polling e SSE.
- Gatilhos de notificações para música nova, mensagens da diretoria ou lembretes de ensaio (somente tipos modelados).
- Agendamento, anexos, HTML rico, URLs externas e reenvio de alertas do portal como novas notificações.
- Criar log de segurança independente ou retomar qualquer mock local/json-server.

## 8. Critérios de aceite acordados

- [ ] Usuário autenticado tem acesso à contagem/inbox, segundo o layout de mobile/desktop acordado.
- [ ] Signup pendente, signup concluído e alteração efetiva de senha geram os respectivos avisos reais e links corretos.
- [ ] Usuários com `users:approve` recebem aviso de aprovação; apenas admins recebem aviso informativo de signup; alteração de senha avisa apenas a conta afetada.
- [ ] Admin vê todos os avisos automáticos, com leitura pessoal; mensagens manuais são visíveis somente ao remetente e destinatários.
- [ ] Marcar como lida persiste no backend e afeta apenas a visualização da pessoa atual.
- [ ] Contagem considera todas as não lidas acessíveis; inbox carrega 10 e pagina em blocos de 10; empty state é “Nenhuma notificação”.
- [ ] `notifications:create` é aplicada por papel e protege UI/API; admin recebe por padrão e pode delegar a papéis.
- [ ] Envio manual individual/massa valida contas ativas/aprovadas; “todos” exclui remetente; texto/link conforme regras; alertas aparecem no portal.
- [ ] Preferências de tipo/canal começam ligadas, salvam em `/settings`, e afetam eventos futuros; mensagens manuais continuam obrigatórias no portal.
- [ ] Jobs de e-mail são persistidos, tentam no máximo cinco vezes com intervalo crescente, mostram falha ao remetente e permitem reenvio manual sem duplicar a notificação.
- [ ] Contrato documenta tipos, payload e extensão futura; não há mock local.
- [ ] UI é acessível e utilizável no browser em mobile (360 px) e desktop (>=960 px).
- [ ] O PR de `bcl-api` cita esta issue com referência não fechadora e fica separado do PR frontend.

## 9. Revisão da SPEC

- [x] Corpo original mantido integralmente, separado do escopo acordado.
- [x] Diferença de escopo para e-mail explicitada.
- [x] Visibilidade admin automática e exceção de alerta manual descritas sem conflito.
- [x] Leitura por pessoa e contagem por visualizador descritas.
- [x] Eligibility de destinatários específicos e massa igualada a contas ativas/aprovadas.
- [x] Persistência síncrona da notificação separada do envio assíncrono de e-mail.
- [x] Sem TODO/TBD; endpoint names ficam deliberadamente subordinados aos padrões existentes no `bcl-api`.
- [x] Revisão e aprovação da pessoa usuária.
