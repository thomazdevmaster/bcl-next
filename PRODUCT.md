# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Visitantes** acessam o portal institucional sem login para consultar início, agenda pública, blog, página Sobre e história da banda.
- **Alunos** consultam músicas, instrumentos, apresentações e dados de alunos com informações pessoais mascaradas; também usam o modo de estudo com partitura e MIDI.
- **Músicos** consultam músicas, patrimônio, instrumentos, alunos, músicos e apresentações, com informações pessoais mascaradas; também usam o modo de estudo.
- **Maestro** administra os módulos permitidos e pode gerir perfis, mas não pode atribuir o papel `admin`.
- **Admin** tem acesso a todos os módulos e pode promover outro usuário a admin.
- Uma pessoa pode ser aluna, musicista ou ambas. Uma conta pode combinar papéis. As fontes não estabelecem uma prioridade única entre os públicos do produto.

## Product Purpose

Reunir no frontend da Banda Carmelitana Luminarense o portal público institucional, a gestão interna e o modo de estudo musical. O produto permite que visitantes acompanhem a banda, que a equipe mantenha cadastros e atividades e que alunos e músicos treinem com músicas que têm partitura MusicXML.

## Positioning

O produto reúne comunicação pública, gestão da associação e estudo de música com partitura e MIDI em um mesmo frontend, com navegação e dados da área interna ajustados aos papéis da conta. Esta integração é o mecanismo distintivo documentado; não há alegação comparativa em relação a outros produtos.

## Operating Context

- O idioma da interface é pt-BR.
- O visitante usa as rotas públicas sem autenticação. Após login, acessa `/gestao` e os módulos permitidos pelos papéis da conta.
- O login atual é simulado. A sessão pode ser mantida em `localStorage` quando a pessoa escolhe “Manter conectado”; a hidratação da sessão segue o padrão de `AuthContext` para não depender de `localStorage` no SSR.
- Alunos e músicos estudam frequentemente no telefone, em tela estreita, com uma mão e conexão 4G. A interface precisa funcionar em cerca de 360 px e em desktop a partir de cerca de 960 px; o modo de estudo também atende tela cheia móvel em cerca de 600 px.
- Não assumir mouse, tela larga nem Wi-Fi estável.

## Capabilities and Constraints

### Portal e gestão

- Portal público: `/` (início), `/agenda`, `/blog`, `/blog/[slug]`, `/sobre` e `/historia`. O botão Entrar leva à autenticação.
- Área interna: `/gestao`, com módulos de usuários, pessoas, músicas, patrimônio, instrumentos, apresentações, blog e mídias; o acesso a ações e módulos depende das permissões.
- Também existem `/profile` para dados da sessão e `/settings` para tema e preferências.
- A gestão é organizada por domínios e usa workspace genérico. Instrumentos são registros de patrimônio com `category: "instrument"`, não uma coleção independente.
- Cadastros de pessoas aceitam aluno, músico ou os dois. Menores de idade exigem responsável cadastrado. Telefone usa máscara; e-mail e documento são únicos onde a regra estiver implementada.

### Papéis, permissões e privacidade

- Perfis autenticados: `aluno`, `musico`, `maestro` e `admin`. A conta guarda `roles[]`; permissões são a união de todos os papéis, e o mais permissivo determina as ações disponíveis.
- Maestro pode gerir perfis, mas não atribuir `admin`. Admin pode promover outra conta a admin.
- Aluno e músico veem mascarados e-mail, telefone, endereço, data de nascimento, documento e dados do responsável. Maestro e admin veem esses dados sem máscara.
- Permissões são aplicadas no cliente e precisam ser repetidas no servidor quando a API real for usada; esconder controles na interface não substitui autorização no backend.

### Estudo musical

- `/study` apresenta músicas que possuem MusicXML e oferece estudo com partitura, player MIDI, andamento, volume, metrônomo e loop.
- A pessoa escolhe separadamente quais instrumentos aparecem na partitura e quais instrumentos são reproduzidos pelo áudio.
- OSMD e o player dependem de APIs do navegador; a sessão de estudo é client-side.
- A partitura deve permanecer rolável. O player deve continuar acessível sem cobrir a partitura; a sessão deve pausar ao trocar de aba. O fullscreen móvel existente deve continuar utilizável.
- Mostrar estados claros de carregamento e erro; falha do mock não deve deixar a página inutilizável.
- Evitar baixar a mesma partitura completa de muitos naipes mais de uma vez sem necessidade. Quando houver backend com worker, não repetir conversões pesadas de MusicXML/MIDI no React nem gerar MIDI sincronamente no clique de início.

### Plataforma e arquitetura

- Frontend existente: Next.js 16, React 19, TypeScript, Sass e Tailwind CSS. O fluxo oficial de rotas é o App Router em `src/app/**`.
- Domínios vivem em `src/domains/`; autenticação, papéis, permissões e máscara em `src/core/auth/`; tokens de tema em `src/core/theme/tokens.css`; workspace genérico em `src/components/domain/`; sessão de estudo em `src/study/`; cliente HTTP em `src/lib/api.ts`.
- API mock local disponível: rotas do Next em `/bcl-api`, alimentadas por `src/domains/seed/mock-api.json`; `db.json` também pode ser usado pelo `json-server` legado na porta 3001. A URL é configurada por `NEXT_PUBLIC_API_URL`.
- O README informa que a produção atual usa o mock em `/bcl-api`; também documenta a opção de API Spring remota (`NEXT_PUBLIC_USE_REMOTE_API=true` e `NEXT_PUBLIC_API_URL`). A arquitetura backend detalhada está em `docs/arquitetura-backend.md`; esta descrição deve acompanhar o estado real de cada ambiente.
- Contrato a preservar: contas com `roles[]`, IDs gerados pela API, e partituras em `songs.scores[].url`. O frontend não envia IDs gerados localmente em POST.
- O backend alvo descrito em `docs/arquitetura-backend.md` é um monólito modular com PostgreSQL, object storage S3/MinIO e geração de MIDI em worker/job. Não implementar essa arquitetura sem solicitação própria.
- Não recriar `/students`, `src/legacy-pages`, CRUD paralelo ou um segundo CRUD para estudo. Não introduzir microserviços ou BFF adicional sem decisão explícita.
- TypeScript estrito: não adicionar `any`; declarar tipos de domínio. Usar `'use client'` apenas quando necessário por estado, eventos ou APIs do navegador.
- Imagens devem usar `next/image`. Não versionar XML/MIDI de produção em `public/` como fonte da verdade e não commitar segredos.

### Formulários e implementação acessível

- Validar formulários no cliente e preservar as regras de telefone, responsável de menor e unicidade já implementadas.
- Usar `label` associado aos campos, atributos `aria-*` em diálogos, suporte a foco e teclado. Ícones Material sem texto devem ter `aria-label`.
- Alvos de toque devem ter pelo menos 44 px; controles de estudo devem ser utilizáveis com o polegar e não depender de hover.
- Tabelas podem ter scroll horizontal; em telas estreitas, preferir cartões ou ações no fim da linha a muitas colunas comprimidas.
- Diálogos devem caber na viewport, com limite de altura e scroll interno. O teclado virtual não deve ocultar ações de salvar ou continuar.
- Evitar `position: fixed` que conflite com a barra de endereço do iOS; considerar `dvh` e safe areas.
- UI nova ou alterada deve ser verificada em browser em desktop e largura mobile, incluindo o fluxo funcional, além de inspecionar screenshot.
- Rodar lint e checagem de tipos nos arquivos tocados. O ESLint global pode falhar em código legado do player; não ampliar correções para áreas não solicitadas.

## Brand Commitments

- Nome institucional: Banda Carmelitana Luminarense (BCL); interface e conteúdo em português brasileiro.
- A memória institucional não deve ser inventada nem completada com fontes turísticas, Wikipedia ou conhecimento geral.
- A fonte primária é *A Presença da Música na História Luminarense (1894 a 1978)*, de Hugo Nicodemos Biavati, em `src/assets/A PRESENÇA DA MÚSICA NA HISTÓRIA LUMINARENSE (2023).pdf`. `docs/historia-banda.md` é a síntese obrigatória e fonte de trabalho para agentes; em conflito com copy antiga ou outras fontes, prevalece o livro.
- Distinguir BCL (fundada em 1894 por Américo José da Costa), Banda dos Vitorinos / Crioulos do Mata-Boi e Euterpe Aparecida (1925). O primeiro estatuto da BCL é de 1912. Não apresentar 1910 como fundação da associação nem usar a narrativa de músicos solitários nas montanhas como fato fundador.
- O livro cobre 1894–1978. Depois desse recorte, só incluir fatos que o próprio livro registra ou dados atuais já mantidos pelo produto, como contato, CNPJ e sede.
- Em conteúdo histórico, ler `docs/historia-banda.md` antes de alterar Sobre, início, blog, legendas ou textos de seed.

## Evidence on Hand

- `AGENTS.md`: regras de produto, papéis, mobile, acessibilidade, arquitetura e limites para agentes.
- `README.md`: visão geral, funcionalidades, stack, rotas, contas demo, domínios e fluxos atuais.
- `docs/arquitetura-backend.md`: contrato atual e arquitetura alvo do backend.
- `docs/historia-banda.md`: base factual obrigatória para conteúdo histórico.
- `src/assets/A PRESENÇA DA MÚSICA NA HISTÓRIA LUMINARENSE (2023).pdf`: fonte histórica primária.
- `src/core/theme/tokens.css`: tokens de tema existentes; novas interfaces devem usar os tokens em vez de espalhar cores literais.
- `public/assets/logo.png` e `public/imgs/`: ativos institucionais existentes.
- Contas demo e credenciais de desenvolvimento estão documentadas no README e no código de autenticação demo; não tratá-las como credenciais de produção.
- Não há depoimentos, métricas de uso nem estudos de usuário documentados; não inventá-los.

## Product Principles

- Manter portal, gestão e estudo coerentes com os fluxos reais da banda.
- Aplicar permissões e proteção de dados conforme a união de papéis da conta.
- Fazer os fluxos de estudo funcionarem em celular, com rede móvel e controles acessíveis.
- Preservar os contratos da API e a separação entre mock atual e backend alvo.
- Tratar o livro como fonte de verdade para história institucional e distinguir as três corporações.
- Priorizar interfaces compreensíveis, acessíveis e operáveis por teclado, toque e viewport estreita.
