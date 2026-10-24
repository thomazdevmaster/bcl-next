# SPEC — Issue #9: Login Google e complemento de cadastro

**Estado:** desenho validado na entrevista; SPEC aguardando revisão/aprovação do usuário  
**Classificação do desenho:** funcional e de integração frontend — reutiliza endpoints e dados existentes, sem mudança no backend.  
**Issue:** [#9 — Login Google: modal completar cadastro e dados do perfil](https://github.com/thomazdevmaster/bcl-next/issues/9)  
**Snapshot consultado:** 2026-10-22

## 1. Contexto original integral da issue

### Título original

```text
[Bug] Login Google: modal completar cadastro e dados do perfil
```

### Corpo integral recebido do GitHub

```text
## Metadado
- **Código plano:** `BUG-09`
- **Prioridade produto:** P1

## Priorização (PERT — person-days)
| | Dias |
|---|-----|
| Otimista (O) | 1 |
| Mais provável (M) | 3 |
| Pessimista (P) | 5 |
| **Esperado Te = (O+4M+P)/6** | **3.00** |

---

## Descrição

Login com Google autentica, mas o fluxo de **completar cadastro** fica inconsistente: modal difícil de fechar (precisa reload); dados Google (nome, sobrenome, foto) não pré-preenchem como deveriam.

## Contexto produto

Complemento de cadastro por admin/maestro — **não** é aprovação igual cadastro manual; falta indicador de **usuário novo** na listagem de usuários.

## Proposta

- Fechar modal (ESC, botão, navegação) sem reload.
- Pré-preencher `people` a partir do ID token Google quando disponível.
- Badge/indicador “cadastro incompleto” em `/gestao/usuarios`.
- Alinhar copy: completar dados e perfis (aluno/músico).

## Área

- [x] Auth / Google
- [x] Gestão usuários

## Critérios de aceite

- [ ] Login Google → modal fecha corretamente.
- [ ] Nome/foto refletidos quando Google envia.
- [ ] Lista usuários destaca pendência de complemento.

## Referências

- `GOOGLE_CLIENT_ID`, `/completar-cadastro`, `AuthContext`, API `/auth/google`
```

### Comentários integrais

Nenhum comentário estava registrado na consulta da issue em 2026-10-22.

### Metadados recebidos

- Número: `9`
- URL: https://github.com/thomazdevmaster/bcl-next/issues/9
- Label: `bug`
- Responsável: `kjunda01` (Sinval Silva Junior)
- Milestone: `MVP`, vencimento 2026-10-31
- Prioridade declarada no corpo: P1
- Estimativa declarada: O=1, M=3, P=5 pessoa-dias; Te=3,00 pessoa-dias
- Campos de projeto: indisponíveis pela API GraphQL com o escopo atual do token (`read:project` ausente); valores não inferidos.

### Histórico, referências e PRs

- 2026-10-21 15:11:26 UTC — `thomazdevmaster` atribuiu a issue a `kjunda01`.
- 2026-10-21 15:11:29 UTC — issue adicionada a um projeto e houve alteração de status do item; valores dos campos de projeto indisponíveis pelo motivo registrado acima.
- 2026-10-21 17:42:32 UTC — `thomazdevmaster` alterou o título de “Corrigir, cadastro quando usuário entra com google” para o título atual e adicionou a label `bug`.
- 2026-10-21 17:42:35 UTC, 17:44:34 UTC, 17:45:50 UTC e 17:48:32 UTC — novos eventos de alteração de status no projeto; detalhes dos campos indisponíveis pelo motivo registrado acima.
- 2026-10-21 18:19:55 UTC — `thomazdevmaster` adicionou a issue ao milestone `MVP`.
- Referências literais no corpo: `GOOGLE_CLIENT_ID`, `/completar-cadastro`, `AuthContext`, API `/auth/google`.
- Nenhum PR vinculado foi encontrado na consulta por `issue:9` em 2026-10-22.

## 2. Fatos observados no repositório

- `src/app/completar-cadastro/page.tsx` implementa uma página, não um modal. Ela coleta telefone e nome de usuário, envia `PATCH /auth/me` e atualiza a sessão local após sucesso.
- `src/layouts/AppShell.tsx` redireciona a pessoa de volta para `/completar-cadastro` enquanto `needsProfileCompletion` for verdadeiro; a entrevista definiu que cancelar ou voltar encerra a sessão.
- `AuthContext.loginWithGoogle` envia a credencial para `POST /auth/google`, recebe o usuário de sessão e persiste estado/token no cliente.
- A API real valida o ID token e já grava nome/sobrenome/foto durante a criação inicial da pessoa; em contas existentes, sincroniza a foto no fluxo autenticado do Google. O objeto de sessão devolvido pela API é a fonte para nome e foto exibidos no frontend.
- As rotas genéricas `/people/{id}` exigem `people:read` para GET e `people:update` para PUT/PATCH. A role `amigos` não tem leitura de pessoas; `aluno` e `musico` não têm permissão de edição. Por isso, o frontend não deve repetir a sincronização por essas rotas nem mostrar o 403 como erro ao usuário.
- `src/domains/users/types.ts` define `needsProfileCompletion` e `pictureUrl` no modelo de usuário.
- A gestão de usuários usa `UserManagementWorkspace` e colunas configuradas por domínio. Este repositório contém o frontend; a API real não está presente. O ambiente atual descrito pelo projeto usa `json-server` e `db.json`.

## 3. Decisões confirmadas pelo usuário

Respostas dadas em 2026-10-22:

1. Manter as três frentes: pré-preenchimento de dados Google, saída correta do fluxo e indicador de pendência em Gestão > Usuários.
2. Manter `/completar-cadastro` como página. Cancelar pelo controle explícito ou pelo botão Voltar encerra a sessão e retorna a `/login`, sem reload.
3. Claims Google preenchem somente campos vazios de `Person`; dados existentes e edições feitas pela pessoa são preservados. A sessão da conta reflete os dados atualizados devolvidos pela API.
4. `Person` é o registro canônico de nome, sobrenome e foto; a conta de acesso é uma identidade ligada à pessoa.
5. Depois de concluir o complemento básico, calcular o destino com `postLoginRoute` usando a conta atualizada, respeitando `mustChangePassword`.
6. O escopo é somente frontend. Calcular a pendência administrativa no cliente a partir dos dados dos endpoints existentes `/users` e `/people`; não adicionar campo, endpoint ou mudança de backend.
7. A pendência administrativa em Gestão é distinta de `needsProfileCompletion`, que representa os dados básicos exigidos da conta Google. Complemento administrativo por admin/maestro não é aprovação manual.
8. Considerar pendente a conta sem `personId` válido ou sem pessoa associada. Se os dados necessários não forem carregados por falha ou ausência de campos na resposta, mostrar o estado neutro “Não foi possível verificar”.
9. Calcular completude com as regras atuais: nome, sobrenome, nascimento válido, situação e telefone válido; documento é opcional, mas deve ser válido se informado; e-mail/endereço são opcionais e data de cadastro vazia é aceita. Se `Person.isStudent` estiver ativo, exigir matrícula; se `Person.isMusician` estiver ativo, exigir seção. Aprovação manual e papéis de acesso da conta não entram no cálculo.

## 4. Problema e objetivo

Uma conta Google autenticada que ainda precisa completar o perfil fica presa em `/completar-cadastro`, sem um caminho claro para cancelar. Os dados já enviados pelo Google não preenchem os campos de pessoa. A gestão também não torna visível quais contas aguardam complemento.

O objetivo é permitir que a pessoa complete ou abandone esse fluxo de forma previsível, reaproveitar os dados disponíveis do Google como valores iniciais e dar à equipe um indicador claro de pendência, sem confundir complemento com aprovação manual.

## 5. Desenho proposto

1. **Entrada Google:** manter `POST /auth/google` como ponto de validação de identidade e sincronização confiável dos dados fornecidos pelo Google. O frontend usa a sessão devolvida pela API e não acessa `/people/{id}` para repetir a sincronização.
2. **Dados iniciais da pessoa:** nome, sobrenome e foto são sincronizados pela API durante o login Google e refletidos na sessão. A página de complemento básico pede telefone e nome de usuário; a ausência de claims Google não impede esse preenchimento manual.
3. **Cancelamento:** manter o fluxo como página com ação clara de cancelar/sair. A ação e Voltar do navegador chamam `auth.logout()` e navegam para `/login`, sem reload.
4. **Conclusão administrativa:** admin/maestro conclui os dados e perfis (aluno/músico) da conta em Gestão > Usuários. A conclusão não deve ser apresentada como aprovação de cadastro manual.
5. **Gestão:** calcular no frontend a pendência administrativa a partir dos registros carregados de `/users` e `/people`, associados por `personId`, e mostrar badge textual acessível. A conta sem pessoa associada está incompleta; se os dados não puderem ser verificados, mostrar estado neutro. Essa pendência é distinta de `needsProfileCompletion`, que controla o complemento básico da conta. Não alterar permissões nem o fluxo de aprovação manual.
6. **Texto:** explicar que os dados básicos foram obtidos do Google e que admin/maestro completa dados e perfis na Gestão.

## 6. Dependências dos endpoints existentes

O escopo não inclui mudanças de backend. O frontend depende dos seguintes comportamentos já existentes, que devem ser confirmados antes de implementar:

- `POST /auth/google` devolve `needsProfileCompletion`, `personId` e os dados de perfil conhecidos pela API, depois de validar o token e aplicar a sincronização de nome/foto;
- a operação autenticada já usada em `/completar-cadastro` salva telefone e nome de usuário e devolve a conta atualizada com `needsProfileCompletion: false`;
- `/users` devolve `personId` para associar conta e pessoa;
- `/people` devolve os campos necessários para avaliar as regras atuais de pessoa e perfis a quem tem acesso à Gestão; campo presente e vazio significa pendência, campo ausente significa que não foi possível verificar;
- a API valida o ID token Google no servidor. A decodificação feita no cliente serve apenas para pré-preenchimento;
- a API existente persiste nome/sobrenome na criação inicial e sincroniza a foto no fluxo de autenticação Google; o frontend usa os dados da sessão sem chamar as rotas genéricas de edição de pessoa.

Não será criado endpoint, campo ou mudança de backend nesta issue. Se algum comportamento acima não existir, não inventar um contrato: registrar a limitação e manter o indicador em estado neutro quando não puder ser calculado.

## 7. Critérios de aceite

- Login Google de uma conta com perfil incompleto abre `/completar-cadastro`.
- Nome, sobrenome e foto são pré-preenchidos quando existem nas claims; dados ausentes continuam editáveis e não são inventados.
- Cancelar encerra a sessão e retorna para `/login` sem exigir reload.
- Concluir o cadastro atualiza a sessão a partir da resposta da API e permite seguir para a área autenticada.
- Erro da API mantém a pessoa no formulário e apresenta mensagem acessível.
- A listagem de usuários identifica claramente contas com pendência de complemento administrativo, sem confundir esse estado com `needsProfileCompletion` ou aprovação manual.
- O indicador considera inválido o vínculo `personId` ausente ou sem pessoa correspondente; falha ou falta de dados na consulta aparece como “Não foi possível verificar”.
- O cálculo usa as regras existentes para dados obrigatórios da pessoa e perfis ativos, sem inventar novas regras de cadastro.
- Admin/maestro consegue concluir dados e perfis de uma conta incompleta pela Gestão, sem passar pelo fluxo de aprovação de cadastro manual.
- A copy distingue complemento administrativo de aprovação de cadastro manual.
- Permissões e fluxo de aprovação manual permanecem inalterados.

## 8. Fora de escopo

- Alterar a API/backend real, que não está neste repositório.
- Alterar o processo de aprovação de cadastro manual.
- Mudar login de provedores diferentes do Google.

## 9. Dependências e questões técnicas para validar

- Confirmar que os endpoints existentes devolvem os dados necessários ao frontend para calcular o indicador. Se não devolverem, a linha recebe estado neutro.
- A tela atual deixa a própria pessoa fornecer telefone e nome de usuário; o contexto original da issue atribui a admin/maestro a conclusão administrativa dos dados e perfis. O desenho mantém essas responsabilidades em duas etapas e não converte a conclusão administrativa em aprovação manual.

## 10. Revisão da SPEC

- O snapshot original está separado do desenho e preserva o título, corpo, metadados, comentário vazio, eventos, referências e ausência de PR.
- As decisões do usuário estão identificadas como decisões, separadas dos fatos observados e das dependências ainda a validar.
- A divergência “modal” na issue versus página no código está registrada sem alterar o texto original.
- O fluxo permanece como página, e os caminhos explícitos de saída encerram a sessão antes de voltar ao login.
- As pendências de dados básicos da conta e de complemento administrativo são estados distintos; a segunda não reutiliza `needsProfileCompletion`.
- `Person` é o registro canônico para nome, sobrenome e foto; a conta autenticada recebe a projeção atualizada devolvida pela API.
- O destino pós-complemento usa `postLoginRoute` com a conta atualizada, não com a sessão anterior.
- O indicador de complemento administrativo é calculado no frontend com dados existentes; esta issue não muda backend nem contrato de API.
- A regra de completude replica as validações atuais de dados pessoais e perfis ativos. Os papéis da conta e aprovação manual não determinam esse indicador.
- Conta sem pessoa associada é pendente; falha ou insuficiência de dados na consulta não é classificada como pendência.
- Não há mudanças de backend incluídas no escopo.
- A diferença entre dados iniciais fornecidos pela própria pessoa e conclusão administrativa por admin/maestro está explicitada no desenho.
- A entrevista `grilling` percorreu as decisões do fluxo, os dados de domínio, o cálculo do indicador e seus estados de erro; as respostas do usuário estão registradas na seção de decisões.
- A entrevista `grill-with-docs` foi concluída após o usuário confirmar o entendimento consolidado; os termos de domínio e a decisão frontend-only foram registrados no glossário e em ADR.

**Aprovação:** o usuário confirmou o entendimento consolidado do desenho. A SPEC está pendente de revisão e aprovação explícita antes da implementação.

## 11. Evidência adicional e ajuste de escopo (2026-10-22)

Ao editar a conta Google criada, o usuário observou que `GET /users` retorna `personId: 2`, mas `GET /people/2` responde `404`. O frontend dispara a rota esperada. A causa está na visibilidade da API: `AccessPolicy.peopleScope` atribuía `MEMBERS` também ao administrador, e `PersonVisibility` ocultava pessoas sem perfil de aluno/músico. Assim, uma conta Google com papel `amigos` não conseguia carregar os dados da pessoa.

O usuário autorizou corrigir também o backend. A implementação está na branch `fix/issue-9-admin-google-person-access` do repositório `bcl-api`: admin recebe escopo `ALL`; maestro que pode ler usuários e atualizar pessoas também pode listar e ler pessoas vinculadas a contas, sem ampliar a visibilidade de pessoas sem conta para os demais perfis. A matriz de permissões e o fluxo de aprovação permanecem inalterados. A API compilou com `./mvnw -q -DskipTests compile`; após reiniciá-la, o usuário confirmou que o formulário de Gestão agora exibe corretamente os dados da pessoa vindos do Google. Ainda falta confirmar o salvamento de uma edição administrativa e validar os estados do indicador de complemento.

## 11. Evidência adicional e ajuste de escopo (2026-10-22)

Ao editar a conta Google criada, o usuário observou que `GET /users` retorna `personId: 2`, mas `GET /people/2` responde `404`. O frontend dispara a rota esperada. A causa está na visibilidade da API: `AccessPolicy.peopleScope` atribuía `MEMBERS` também ao administrador, e `PersonVisibility` ocultava pessoas sem perfil de aluno/músico. Assim, uma conta Google com papel `amigos` não conseguia carregar os dados da pessoa.

O usuário autorizou corrigir também o backend. A implementação está na branch `fix/issue-9-admin-google-person-access` do repositório `bcl-api`: admin recebe escopo `ALL`; maestro que pode ler usuários e atualizar pessoas também pode listar e ler pessoas vinculadas a contas, sem ampliar a visibilidade de pessoas sem conta para os demais perfis. A matriz de permissões e o fluxo de aprovação permanecem inalterados. A correção ainda precisa ser reconstruída, reiniciada e retestada com `GET /people/2` e o formulário de Gestão.

## 12. Data de nascimento Google sem confirmação (2026-10-22)

O usuário verificou no perfil Google que a data exibida pela Gestão (`1990-01-01`) não correspondia à data real. O ID token OpenID Connect usado no fluxo não fornece data de nascimento; portanto, essa informação não deve ser inferida nem preenchida com um valor fictício. Decisão do usuário: deixar a pessoa sem data de nascimento e manter o cadastro incompleto até a equipe registrar a data correta.

Implementação no backend `bcl-api`, branch `fix/issue-9-admin-google-person-access`:

- Removido o placeholder `1990-01-01` do provisionamento de contas Google.
- `people.birth_date` agora aceita `NULL`, com migração `V13__google_signup_birth_date_nullable.sql` que também limpa o placeholder de pessoas vinculadas a uma identidade Google.
- `GET /people/{id}` serializa nascimento ausente como `birthDate: null`.
- Os endpoints de criação e edição administrativa continuam exigindo data válida; assim a equipe precisa informar a data real ao completar o perfil.
- `PersonEntity.ageAt` já trata nascimento nulo como idade desconhecida (0), sem calcular idade a partir de dado inventado.

A compilação `./mvnw -q -DskipTests compile` foi iniciada; falta confirmar seu término e retestar a migração e o indicador de incompleto com a API reiniciada. A SPEC original preserva o escopo/frontend-only acordado na entrevista; esta seção registra a extensão de backend autorizada posteriormente pelo usuário.

## 13. Situação real após retestes (2026-10-22)

As notas anteriores que diziam “falta retestar” foram superadas pelos retestes subsequentes do usuário:

- Google sign-in chegou ao complemento básico; ao continuar, seguiu para a área autenticada.
- O usuário confirmou que Voltar uma vez retorna ao login e limpa a sessão.
- Gestão carregou os dados da pessoa vinculada ao Google; o usuário alterou propriedades e confirmou a persistência visual, inclusive ativo/inativo na tabela.
- Após a migração V13, o usuário confirmou que o nascimento não foi preenchido e a conta aparece incompleta.
- Os três critérios de aceite originais estão atendidos: saída correta do fluxo, dados Google refletidos e indicador de pendência.
- Ajustes complementares de validação inicial, navegação mobile por `IconSelect`, layout em coluna, contraste de campos desabilitados e rótulos arredondados foram implementados. O usuário confirmou o contraste de texto ink/branco; ainda não confirmou visualmente a navegação mobile final em aparelho.

O rastreador classifica a implementação acordada como **Implementada**. Isso não altera nem fecha o estado da issue no GitHub. A SPEC aprovada e a implementação real incluem a extensão backend autorizada pelo usuário depois da entrevista original.
