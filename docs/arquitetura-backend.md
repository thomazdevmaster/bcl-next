# Integração do frontend com o backend BCL

**Status:** arquitetura atual
**Última revisão:** 2026-10-24
**Backend oficial:** [`thomazdevmaster/bcl-api`](https://github.com/thomazdevmaster/bcl-api)

Este repositório contém o frontend Next.js. A API, a persistência e os arquivos são responsabilidade do projeto separado `bcl-api`. O README do backend é a fonte de verdade para sua stack, endpoints, variáveis, operação e implantação; este documento registra somente a integração necessária ao frontend.

## Desenvolvimento local

O desenvolvimento integrado requer Docker e Docker Compose. No repositório `bcl-api`, inicie a API completa com Postgres e MinIO:

```bash
docker compose --profile api up -d --build
```

Confirme a saúde em `http://localhost:8080/health`. No frontend, configure `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Depois inicie o Next:

```bash
npm run dev
```

O site fica em `http://localhost:3000`. Não existe backend de desenvolvimento neste repositório: o frontend não inclui json-server, banco local, dados seed de API ou rotas mock.

### Acesso pelo celular na rede local

Quando o site é aberto pelo IP da máquina de desenvolvimento, o browser não consegue usar `localhost:8080` para alcançar o computador. O frontend reescreve `/dev-api/*` para a API local em `127.0.0.1:8080`; o Next faz o encaminhamento e o backend continua sendo o serviço Dockerizado do `bcl-api`. Esse rewrite não implementa endpoints nem armazena dados.

## Produção

O frontend é publicado na Vercel e consome a URL HTTPS pública da API implantada pelo `bcl-api`. Configure `NEXT_PUBLIC_API_URL` no build do frontend com a mesma origem pública definida por `PUBLIC_API_URL` no backend. As variáveis com prefixo `NEXT_PUBLIC_` são incorporadas ao bundle do browser durante o build; uma alteração exige novo deploy do frontend.

Não configure um fallback para API mock. Se a URL estiver ausente localmente, o frontend usa `http://127.0.0.1:8080`; em produção, usa `https://api.bandacarmelitana.org`.

## Contrato consumido pelo frontend

- A API é acessada por `src/lib/api.ts`; o cliente inclui o Bearer armazenado na sessão.
- Login local recebe usuário ou e-mail e senha cifrada com a chave pública entregue por `GET /auth/public-key`. O fluxo de Google também é validado pela API.
- Contas carregam `roles[]`; as permissões do frontend são a união dos papéis. A autorização real deve ser aplicada pelo backend.
- IDs são gerados pela API; o frontend não cria IDs para registros enviados em `POST`.
- Partituras são referenciadas em `songs.scores[].url`. Upload e leitura de arquivos usam os endpoints autenticados da API, como `POST /uploads` e `GET /files/**`.
- O domínio e os requisitos de payload pertencem ao backend; consulte seu README e OpenAPI antes de mudar chamadas do frontend.

## Responsabilidades por repositório

| Repositório                                               | Responsabilidade                                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [`bcl-next`](https://github.com/thomazdevmaster/bcl-next) | Portal, gestão, autenticação no browser, cliente HTTP e modo de estudo. Não mantém servidor de API, persistência nem endpoints mock. |
| [`bcl-api`](https://github.com/thomazdevmaster/bcl-api)   | API monolítica, autenticação, regras no servidor, PostgreSQL, bucket S3/MinIO, arquivos e worker de MIDI no mesmo projeto.           |

Use o [README do `bcl-api`](https://github.com/thomazdevmaster/bcl-api#readme) para ver a stack atual, o Compose, seeds de desenvolvimento, documentação OpenAPI, variáveis e implantação. Este frontend não mantém uma cópia do plano de infraestrutura do backend.
