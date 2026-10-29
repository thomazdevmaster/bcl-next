# Issue #20 — Home com conteúdo dinâmico (blog e agenda publicados)

- Issue: [#20](https://github.com/thomazdevmaster/bcl-next/issues/20)
- SPEC: [design da issue 20](../superpowers/specs/2026-10-29-home-conteudo-dinamico-design.md).
- Status real: **Parcial** (código implementado; exibição contra API com seed e conteúdo persistido ainda não verificados).
- Última verificação: 2026-10-29.
- Branch preparada: `feat/issue-20-home-conteudo-dinamico`, base `180365fe1c695b6da97817a387430318548f6cee`.

## Dados observados no GitHub

- Título: `[Melhoria] Home com conteúdo dinâmico (blog e agenda publicados)`.
- Estado GitHub: aberta.
- Prioridade explicitada no corpo: P1.
- Estimativa PERT declarada: O=2, M=4, P=8 dias; Te=4,33 pessoa-dias.
- Responsável: `kjunda01` (Sinval Silva Junior), conta autenticada.
- Label: `enhancement`.
- Milestone: nenhum.
- Campos de projeto retornados por `gh issue view`: nenhum. A timeline registra inclusão em projeto e alteração de status, mas valores dos campos não foram expostos.
- Comentários: nenhum.
- Eventos relevantes: criação com label `enhancement` (2026-10-21); inclusão em projeto (2026-10-21), mudança de status do projeto (2026-10-21 e 2026-10-27), atribuição a `kjunda01` (2026-10-27).
- PRs encontradas pela busca `gh pr list --state all --search "#20"`: nenhuma. A busca textual não expõe necessariamente toda relação inversa de PR; nenhum PR foi apresentado como vinculado pela issue.

## Evidência de código verificada em 2026-10-29

| Requisito original                                                      | Status atualizado       | Evidência no código ou pendência                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Posts publicados com título, capa, data e link                          | Atendido                | `src/components/public/HomePageContent.tsx:213-238` exibe posts; `src/components/public/BlogPostCard.tsx` usa `next/image`. A home usa agora `latestPublishedMediaPosts` em `src/lib/publicPortal.ts:74-81`.                                                                                                    |
| Próximos eventos com data, local e tipo                                 | Atendido                | `src/components/public/HomePageContent.tsx:181-208` exibe apresentações; `src/components/public/PresentationEventCard.tsx` apresenta seus dados.                                                                                                                                                                |
| Configurar quantidade, ordem, título e ocultar se vazio                 | Atendido                | `src/components/homepage/HomepageEditor.tsx:49-145,303-321` oferece ordem, título, limite 1–6 e checkbox `hideWhenEmpty`; `src/domains/homepage/types.ts:62-69,159-173,304-317` define defaults e normaliza documentos antigos para `true`.                                                                     |
| Fallback gracioso se API falhar                                         | Atendido                | `src/app/page.tsx:17-57` trata homepage, apresentações e mídias de forma independente; usa defaults para homepage e atualiza cada feed ao concluir sua chamada. No browser, a home abriu mesmo sem API em `localhost:8080`, ocultando feeds com falha e mantendo as demais seções.                              |
| Respeitar `isPublic` e estado publicado                                 | Atendido                | `src/lib/publicPortal.ts:34-47,74-81` filtra apresentações públicas futuras e posts publicados.                                                                                                                                                                                                                 |
| Texto de cadastro sobre partitura dinâmica e jogos                      | Parcial                 | `src/domains/homepage/types.ts:208-215` atualiza o texto e botão padrão; `src/components/public/HomePageContent.tsx:45` direciona visitante a `/cadastro`. A API local estava indisponível e não foi possível verificar/alterar o texto de documentos já persistidos; o conteúdo continua editável pela gestão. |
| Home exibe seção demo (post + evento do seed)                           | Não verificável         | `bcl-api/src/main/resources/db/seed/demo.sql` contém um post publicado e evento público futuro, mas a API não estava ativa em `localhost:8080`; não foi possível verificar a exibição dos registros seed.                                                                                                       |
| Admin edita quantidade/ordem sem redeploy                               | Atendido                | `src/components/homepage/HomepageEditor.tsx:49-88,108-145,303-321` salva configuração pela API e edita ordem, limite e `hideWhenEmpty`.                                                                                                                                                                         |
| Mobile: cards empilhados, `next/image`, toque amplo                     | Parcial                 | `src/components/public/HomePageContent.tsx:204-208,232-238` empilha grids e `BlogPostCard` usa `next/image`. A home de fallback foi verificada em 360 px e 1280 px; os feeds não carregaram sem API, então os cards e seus alvos de toque não foram conferidos em browser.                                      |
| “Feed infinito ou algoritmo de recomendação.” (fora de escopo original) | Fora do escopo acordado | Exclusão declarada no texto original da issue.                                                                                                                                                                                                                                                                  |

## Acordos adicionais da entrevista

- Q1–Q4: posts e eventos obrigatórios; CTA leva ao cadastro; ordem entre seções configurável, posts em ordem de publicação e eventos cronológicos; ocultar seção que falhou sem afetar as demais.
- Q5–Q7: opção configurável “ocultar se vazio” ligada por padrão; se configuração falhar, usar defaults e buscar seções independentemente; nenhum aviso técnico ao visitante.
- Testes Vitest: solicitados inicialmente para cada componente alterado; adiados por orientação posterior até atualização desta branch com `main`, que deverá trazer a infraestrutura. Nenhum teste foi adicionado ou executado nesta rodada.
- Q8–Q9: reutilizar a seção CTA atual; visitantes vão a `/cadastro`; preservar CTA logado. O texto é conteúdo do documento `homepage`, editável pela gestão. Seguir o escopo da issue sem acrescentar migração ou mudança de seed.
- Contrato da API: `bcl-api/src/main/java/com/bcl/api/catalog/pages/HomepageService.java` persiste o documento como JSONB e valida a presença de `sections`; o campo `hideWhenEmpty` pode ser armazenado sem mudança de endpoint no backend.

## Contexto e pendências

O snapshot integral do texto inicial, comentários, metadados e eventos está na SPEC, preservado sem edição. O código foi inspecionado nas evidências acima. Lint e checagem TypeScript passaram; testes foram adiados por instrução do usuário. A consulta de PRs foi por busca textual; relações de PR não apareceram na issue nem nos resultados.

### Corpo integral observado da issue

```md
## Metadado

- **Código plano:** `FEAT-20`
- **Prioridade produto:** P1

## Priorização (PERT — person-days)

|                              | Dias     |
| ---------------------------- | -------- |
| Otimista (O)                 | 2        |
| Mais provável (M)            | 4        |
| Pessimista (P)               | 8        |
| **Esperado Te = (O+4M+P)/6** | **4.33** |

_Te serve para ordenar o backlog; ajuste O/M/P quando refinarem._

---

## Problema ou oportunidade

A **home** (`/`, `HomePageContent`, documento `homepage`) mistura seções estáticas editáveis com conteúdo que já vive no **blog** e na **agenda**. Visitante não vê automaticamente “o que há de novo” sem ir a `/blog` ou `/agenda`.

## Proposta

- Seções dinâmicas na home alimentadas por API:
  - **Últimos posts publicados** (mídias/blog): N cards com título, capa, data, link.
  - **Próximos eventos** (agenda/apresentações públicas): data, local, tipo.
- Configuração em **gestão da página inicial** (`/gestao/home`): quantos itens, ordem, título da seção, ocultar se vazio.
- Fallback gracioso se API falhar (não derrubar a home).
- Respeitar `isPublic` / status de publicação.

## Outras informações para a home

Adicionar um texto informativo, dizendo para usuário se cadastrar, para ter acesso ao aprendizado, com partitura dinâmica e jogos para educação musical

## Área

- [x] Portal (home)
- [x] Gestão (homepage + mídias + eventos)

## Critérios de aceite

- [ ] Home exibe pelo menos uma seção dinâmica demo (post + evento do seed).
- [ ] Admin edita quantidade/ordem sem redeploy.
- [ ] Mobile: cards empilhados, imagens `next/image`, toque amplo.

## Fora de escopo

- Feed infinito ou algoritmo de recomendação.

## Referências

- `src/app/page.tsx`, `src/domains/homepage/types.ts`, `/agenda`, gestão mídias
```
