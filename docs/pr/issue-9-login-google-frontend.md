# PR do frontend — Issue #9

Execute no terminal. O comando cria o PR de `fix/issue-9-login-google-cadastro` para `main` no repositório `bcl-next`.

````bash
gh pr create \
  --repo thomazdevmaster/bcl-next \
  --base main \
  --head fix/issue-9-login-google-cadastro \
  --title 'Conclui o fluxo de cadastro com Google — Issue #9' \
  --body-file - <<'PR_BODY'
## Summary

```text
Login com Google
  autentica e abre o complemento básico quando necessário
  permite cancelar e retornar ao login limpando a sessão
Gestão > Usuários
  carrega e edita os dados da pessoa vinculada
  mostra quando o cadastro permanece incompleto
```

- Ajusta validação visual dos dados pré-preenchidos, layout mobile por etapas e legibilidade dos campos desabilitados.
- Não inventa data de nascimento quando o Google não a fornece; o perfil continua incompleto até a equipe preencher esse dado.
- O frontend usa os dados de pessoa devolvidos pela API e permite administradores editarem o cadastro em Gestão.

## Evidence

- **Antes:** a conta Google aparecia sem os dados da pessoa na Gestão; `GET /people/2` retornava `404`. A data de nascimento também chegou a aparecer com um valor fictício.
- **Depois:** o usuário confirmou que os dados corretos do Google aparecem na Gestão, que as alterações e o estado ativo/inativo são refletidos, que Voltar encerra a sessão em um clique e que a data ausente mantém o cadastro incompleto.
- **Validação visual:** o usuário confirmou a legibilidade dos campos desabilitados nos temas claro e escuro.

## Merge Danger

**Door:** two-way

**Blast Radius:** autenticação

O fluxo de login, complemento e edição de usuários é afetado. O PR depende da API permitir leitura administrativa dos dados da pessoa e aceitar nascimento ausente em cadastros Google; essa implementação está no PR correspondente do backend.

Relacionado à issue #9 — Login Google: modal completar cadastro e dados do perfil (`thomazdevmaster/bcl-next#9`).
PR_BODY
````
