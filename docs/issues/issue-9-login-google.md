# Issue #9 — Login Google: modal completar cadastro e dados do perfil

- Issue: [#9](https://github.com/thomazdevmaster/bcl-next/issues/9)
- SPEC: [issue-9-login-google.md](../specs/issue-9-login-google.md)
- Status real: **Implementada**
- Última verificação: 2026-10-22
- Evidência mais recente: o usuário confirmou login e complemento Google, retorno ao login e limpeza da sessão ao voltar, dados Google visíveis em Gestão, edição de propriedades e ativação/inativação refletidas, e cadastro marcado incompleto sem data de nascimento. O usuário também confirmou que o texto dos campos somente leitura ficou legível após usar `--color-ink` no tema claro e `--color-white` no tema escuro.

| Requisito do texto inicial / escopo acordado | Status | Evidência no código ou validação |
| --- | --- | --- |
| Login Google fecha o fluxo sem exigir reload | Atendido | O modal citado no texto original foi mantido como a página `/completar-cadastro`, conforme decisão do usuário. Voltar em um clique retorna a `/login` e limpa a sessão; o usuário confirmou o comportamento. `src/app/completar-cadastro/page.tsx`, `src/contexts/AuthContext.tsx`. |
| Nome e foto do Google refletem quando disponíveis | Atendido | API valida as claims e a sessão/UI refletem os dados; o usuário confirmou ver os dados corretos do Google na Gestão. Frontend: `src/contexts/AuthContext.tsx`; backend: `GoogleAuthService.java`, `PersonService.java`. |
| Lista de usuários destaca cadastro incompleto | Atendido | O usuário confirmou que a conta aparece incompleta após `birthDate` passar a `null`. A regra classifica nascimento ausente como incompleto: `src/domains/users/administrativeCompletion.ts`; backend: `V13__google_signup_birth_date_nullable.sql`, `GoogleAuthService.java`. |
| Complemento administrativo por admin/maestro, sem confundir com aprovação manual | Atendido | API ajustou a visibilidade de pessoas vinculadas a contas para admin e maestro autorizado. O usuário confirmou abertura e alteração dos dados em Gestão e mudança de ativo/inativo refletida na tabela. Backend: `AccessPolicy.java`, `PersonVisibility.java`, `PersonService.java`; frontend: `src/components/domain/users/UserManagementWorkspace.tsx`. |
| Copy explica complemento básico e administrativo | Atendido | A tela solicita telefone e nome de usuário; a orientação explica que os demais dados e perfis são completados pela equipe em Gestão. `src/app/completar-cadastro/page.tsx`. |

## Melhorias complementares solicitadas durante a validação

- Nome, sobrenome, data de cadastro, telefone e e-mail preenchidos são validados visualmente ao montar o formulário; nascimento nulo permanece pendente. `src/components/forms/FormStageField.tsx`, `src/components/domain/users/UserPersonalContactStage.tsx`.
- No mobile, as etapas de edição/visualização usam `IconSelect`; campos de documento e foto ficam em coluna. `src/components/domain/users/UserManagementWorkspace.tsx`, `src/components/domain/users/UserPersonalContactStage.tsx`.
- Campos desabilitados usam `--color-ink` no tema claro e `--color-white` no escuro, incluindo `-webkit-text-fill-color`; o rótulo flutuante tem cantos arredondados. `src/core/theme/tokens.css`, `src/components/forms/core/styles.ts`, `src/components/forms/validations/FormFieldValidationShell.tsx`.
- Verificações de lint e TypeScript passaram nas alterações recentes. A apresentação final do seletor de etapas em dispositivo móvel ainda não foi confirmada manualmente, mas não há requisito de implementação pendente no escopo acordado.

## Próxima atualização

Nenhum requisito de implementação da Issue #9 está pendente. Não houve pedido para fechar a issue no GitHub; o status acima descreve somente a implementação real no código.
