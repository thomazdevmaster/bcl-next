<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Agentes — Banda Carmelitana (`front-next`)

Frontend Next.js 16 / React 19 da Banda Carmelitana Luminarense: portal público, gestão interna e modo de estudo. Idioma da interface: **pt-BR**.

Leia este arquivo antes de alterar código. Complementos: `README.md`, `docs/arquitetura-backend.md` e, para história da banda, `docs/historia-banda.md`.

## História da banda (fonte da verdade)

A memória institucional da Banda Carmelitana Luminarense **não se inventa** e **não se completa** com texto de turismo, Wikipedia ou conhecimento geral do modelo.

1. **Fonte primária:** `src/assets/A PRESENÇA DA MÚSICA NA HISTÓRIA LUMINARENSE (2023).pdf` — Hugo Nicodemos Biavati, _A Presença da Música na História Luminarense (1894 a 1978)_.
2. **Base de conhecimento para agentes:** `docs/historia-banda.md` (síntese obrigatória desse PDF). Trate o que está ali como **verdade**. Em conflito com a página Sobre, seeds, copy antiga ou sites externos, **prevalece o livro**.
3. O volume cobre **1894–1978**. Fatos posteriores só entram se já estiverem no produto (contato, CNPJ, sede atual) ou se o próprio livro os registrar (ex.: mortes de Sinhô e Nem, reformas da sede).
4. Ao escrever ou alterar Sobre, home, blog, legendas, textos de seed ou qualquer menção histórica: ler `docs/historia-banda.md` **antes**. Não usar a narrativa de “músicos solitários nas montanhas” nem a data **1910** como fundação da associação — o livro funda a corporação em **1894** (Américo José da Costa) e o primeiro estatuto em **1912**.
5. Distinguir sempre as três corporações: BCL (1894, a que permanece), Banda dos Vitorinos / Crioulos do Mata-Boi, e Euterpe Aparecida (1925).

## Produto

- Visitante: Início, Agenda, Blog, Sobre, História. Sem login.
- Após login: `/gestao` e módulos permitidos pelo perfil.
- `/study`: treino com partitura (OSMD) e MIDI. Só músicas com MusicXML. Modal escolhe instrumentos **visíveis** e instrumentos **do áudio**, de forma independente.

Perfis autenticados: `aluno`, `musico`, `maestro`, `admin`. Conta tem `roles[]`. **Permissões = união** dos perfis (o mais permissivo vence). Maestro não atribui `admin`. Aluno/músico veem dados pessoais mascarados; maestro/admin não.

## Onde o código vive

Fluxo oficial: **App Router** (`src/app/**`).

| Pasta                                | Uso                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `src/app/`                           | Rotas                                                                                                  |
| `src/domains/`                       | Entidades, catálogo, CRUD config, seed                                                                 |
| `src/core/auth/`                     | Papéis, permissões, máscara                                                                            |
| `src/core/theme/tokens.css`          | Cores, tipo, raios — não espalhar hex solto                                                            |
| `src/components/domain/`             | Workspace genérico de gestão                                                                           |
| `src/study/` (incl. `StudyPage.tsx`) | Sessão de estudo (client-only; OSMD/player usam `window`)                                              |
| `src/lib/api.ts`                     | HTTP para o backend externo `bcl-api` (`NEXT_PUBLIC_API_URL`, local Docker em `http://localhost:8080`) |

Não recriar `/students`, `src/legacy-pages` nem CRUD paralelo. IDs de registro: **só a API** (não `crypto.randomUUID()` no POST).

Novo domínio: tipos em `src/domains/<nome>/` → `catalog.ts` → `permissions.ts` → `crudConfig.ts` → rota em `src/app/gestao/`. Persistência, seeds e endpoints pertencem ao repositório [`bcl-api`](https://github.com/thomazdevmaster/bcl-api); não criar mock de API nem seed JSON no frontend.

## Boas práticas (obrigatório)

- **Estilização de UI: usar Tailwind CSS em 100% dos componentes e páginas novos ou alterados.** Escreva os estilos nas classes utilitárias do Tailwind; não crie arquivos CSS/SCSS por componente, módulos CSS/SCSS ou folhas separadas para implementar layout, cores, espaçamento, tipografia ou responsividade. Use folhas globais existentes somente para a importação/configuração do Tailwind, tokens do tema e estilos base realmente globais; mantenha CSS de terceiros apenas quando uma dependência exigir sua folha própria.
- TypeScript estrito: sem `any` novo; tipos de domínio explícitos.
- Client vs server: `'use client'` só quando houver estado, eventos ou APIs de browser. Não hidratar sessão do `localStorage` no SSR (usar o padrão já em `AuthContext`).
- Permissões no **cliente e no servidor `bcl-api`**. UI que esconde botão não é segurança.
- Formulários: validar no cliente; telefone com máscara; menor de idade exige responsável; e-mail/documento únicos onde já existir regra.
- Acessibilidade: `label`, `aria-*` em diálogos, foco e teclado. Ícones Material com `aria-label` quando não houver texto.
- Performance: listas virtuais só se necessário; imagens com `next/image`; MusicXML/MIDI grandes não devem ser convertidos de novo no React quando o backend existir (ver arquitetura).
- Não commitar segredos. Não versionar XML/MIDI de produção em `public/` como fonte da verdade.
- Não expandir escopo: sem microserviços, BFF extra ou segundo CRUD “só para estudo”.
- Lint/tipos nos arquivos tocados. O ESLint global ainda pode falhar em código antigo do player — não “consertar o mundo” sem pedido.
- Na dúvida de produto: perguntar.

## Padrão obrigatório para formulários

Formulários novos e formulários alterados devem seguir o mesmo fluxo de validação e composição. Reutilize `src/components/forms/`; não crie uma segunda família de campos, mensagens ou etapas por página.

1. **Schema no domínio:** crie ou mantenha o schema em `src/domains/<dominio>/schemas/<nome>.schema.ts`. Use Zod, exporte o schema e o tipo inferido (`z.infer<typeof schema>`). Coloque no schema as regras de formato, obrigatoriedade, limites e validações entre campos. Para regras de domínio existentes, reutilize funções do domínio em vez de copiá-las. Use `superRefine` para erros cruzados, como confirmação de senha. Referência: `src/domains/users/schemas/signup.schema.ts`.
2. **Estado e validação:** configure `useForm<T>` com `defaultValues` completos e `zodResolver(schema)`; envolva os campos em `FormProvider` e conecte o envio com `form.handleSubmit`. Use `noValidate` no elemento `<form>` para manter a validação sob o schema e o React Hook Form. Não duplique regras de negócio em estado manual ou validações HTML paralelas.
3. **Composição compartilhada:** use `FormView` como estrutura padrão para título, descrição e `<form>`. Agrupe campos relacionados com `FormStageBlock`; use `FormStageField` para campos de texto e demais inputs string suportados. Campos `type="date"` usam o calendário compartilhado `IconCalendar` por meio de `FormStageField`, aceitam digitação `dd/mm/aaaa` e mantêm o valor ISO no React Hook Form e no schema. Em campo customizado ou não suportado por `FormStageField`, integre o controle ao React Hook Form e reutilize `FormFieldValidationShell` para rótulo, estado visual, descrição e acessibilidade. Para seleção única em formulários novos ou alterados, use `IconSelect` com ícone contextual por opção, conectado ao React Hook Form e ao estado acessível do campo; não introduza `<select>` nativo paralelo. Todo select começa com a opção vazia “Selecione…”. Em cadastros novos, mantenha o valor inicial vazio; schemas Zod devem exigir uma escolha quando o campo for obrigatório ou obrigatório por condição. Campos opcionais podem permanecer vazios; edição e visualização preservam o valor existente. Para campos booleanos individuais, use `IconCheckbox` (`src/components/shared/IconCheckbox.tsx`) dentro de `FormFieldValidationShell`, conectado ao React Hook Form; informe um ícone contextual quando ele ajudar a identificar a opção. Não crie checkboxes nativos com apresentação própria. Para grupos de opções múltiplas, mantenha o controle de grupo e valide a coleção pelo schema. Para alternar visualizações, use `ResponsiveTabs`, que mostra `IconSelect` no mobile e abas no desktop. Exemplo: `src/app/profile/page.tsx` define Perfil (`person`), Segurança (`lock`) e Conta (`manage_accounts`) em `profileTabs` e os apresenta com `ResponsiveTabs`.
4. **Etapas:** em formulário dividido em etapas, use `FormStageProgress` para navegação e `FormStageActions` para Voltar, Continuar e Enviar. Mantenha os valores ao trocar de etapa, valide antes de avançar e limite a navegação às etapas já alcançadas. Em formulário de etapa única, não mostre progresso; use as ações compartilhadas para o envio quando o fluxo se encaixar.
5. **Mensagens e estados:** passe mensagens de orientação e opcionais pelas props `infoMessage` e `optionalMessage` do campo. Erros do schema devem aparecer no campo correspondente pela integração compartilhada (`FormFieldStatusMessage` / `FormFieldStateStrip`); erros gerais de API devem usar uma mensagem global acessível, como `role="alert"`. Não dependa apenas de cor ou animação para indicar estado.
6. **Envio:** mantenha a chamada à API no handler de envio. Desabilite ações enquanto a requisição estiver pendente, mostre o rótulo de envio e converta falhas com o tratamento de mensagens já usado no domínio. Validação cliente melhora o fluxo, mas não substitui validação no servidor.
7. **Formatação e usabilidade:** use `formatValue` para máscaras ou normalizações de apresentação, sem substituir a validação do schema. Preserve `label`, `autoComplete`, `inputMode`, `aria-describedby`, `aria-invalid` e os estados acessíveis dos componentes compartilhados. Botões e controles devem ter alvo de toque mínimo de 44 px e caber em viewport de 360 px.
8. **Exceções:** uma composição especial, como autenticação externa ou formulário em diálogo, pode exigir outro contêiner. Ainda assim, reutilize schema, React Hook Form, campos, mensagens e ações compartilhados; só amplie a biblioteca comum quando o componente atual não cobrir uma necessidade real reutilizável.

## Celular e uso real (obrigatório)

Alunos e músicos treinam **no telefone**, muitas vezes em 4G, tela estreita e uma mão.

Toda UI nova ou alterada deve funcionar em viewport ~360px **e** desktop (~960px+, breakpoint do `AppShell`). Estudo usa ~600px para tela cheia móvel.

Checklist:

1. **Toque:** alvos ≥ 44px; não depender de hover. Botões de play/pausa/estudo usáveis com o polegar.
2. **Layout:** tabela de gestão/estudo com scroll horizontal se preciso; em mobile, preferir cartão ou ações no final da linha, não oito colunas apertadas.
3. **Modais:** caber na viewport (`max-h` + scroll interno); teclado virtual não esconder Salvar/Continuar.
4. **Rede:** não baixar partitura completa de 16 naipes duas vezes sem necessidade; estados de loading/erro visíveis quando a API externa não estiver acessível.
5. **Estudo:** partitura rolável; player fixo ou acessível sem cobrir o XML inteiro; fullscreen no móvel já existente deve continuar usável; pause ao trocar de aba.
6. **Gestos:** evitar `position: fixed` que brigue com a barra de endereço do iOS sem `dvh` / safe-area.
7. **Verificar** o fluxo no browser em desktop **e** largura mobile antes de encerrar tarefa de UI (não só screenshot).

Não assumir mouse, tela larga ou Wi-Fi estável.

## API e backend

O backend oficial é o projeto separado [`bcl-api`](https://github.com/thomazdevmaster/bcl-api). A API completa (Spring, Postgres e MinIO) roda em Docker Compose. Em desenvolvimento, configure `NEXT_PUBLIC_API_URL=http://localhost:8080`; em produção, use a URL HTTPS publicada pelo backend. Os detalhes de operação e contrato pertencem ao README do `bcl-api`.

O frontend não inclui servidor de API, `json-server` ou rotas mock. `src/lib/api.ts` chama `bcl-api`; o único rewrite local `/dev-api` encaminha ao backend Dockerizado para permitir acesso por celular na rede.

Contrato a preservar: `roles[]`, IDs gerados pela API, `songs.scores[].url` e autenticação definida no `bcl-api`. A integração do frontend está em `docs/arquitetura-backend.md`.

## Como rodar

Desenvolvimento: iniciar primeiro a API completa no repositório `bcl-api` com `docker compose --profile api up -d --build`; depois iniciar o frontend com `npm run dev` (3000). Contas de demonstração são dados do seed do backend, documentadas no README do `bcl-api`.

## Issues no GitHub (`bcl-next`)

Templates em `.github/ISSUE_TEMPLATE/` (**Bug**, **Melhoria**, **Tarefa técnica**). Issues em branco estão desabilitadas — escolha o tipo.

Ao **criar issue pelo CLI** (conta `gh` com escopo `project`, board **bcl-Board**):

1. Use o template correspondente (`--template` = campo `name` do front matter).
2. Título com prefixo `[Bug]`, `[Melhoria]` ou `[Tarefa]`.
3. Preencha o corpo seguindo as seções do template (mesmo usando `-b` / `--body-file`).
4. Inclua no board: `--project "bcl-Board"`.

Exemplos (repo `thomazdevmaster/bcl-next`):

```bash
gh issue create --template "Bug" --title "[Bug] …" --project "bcl-Board"
gh issue create --template "Melhoria" --title "[Melhoria] …" --project "bcl-Board"
gh issue create --template "Tarefa técnica" --title "[Tarefa] …" --project "bcl-Board"
```

Sem `--template`, use `-l bug` ou `-l enhancement` conforme o tipo e corpo estruturado igual ao `.md` do template. Não abrir issue genérica sem tipo.

## O que não fazer

- Gerar `id` no POST do front.
- Um único `role` por usuário.
- Restaurar legado de alunos.
- OSMD/player em Server Component.
- MIDI síncrono pesado no clique “Iniciar estudo” quando existir worker.
- Ignorar mobile porque “a gestão é de desktop”.
