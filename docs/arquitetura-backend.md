# Arquitetura de backend — Banda Carmelitana Luminarense

**Status:** proposta para decisão  
**Data:** 2026-09-24  
**Contexto:** o frontend (`front-next`) já existe com portal, gestão e modo estudo; a API ainda é `json-server` + `db.json`. Não há backend de produção.

Este documento responde: um serviço ou dois; o que precisa existir em arquitetura e infra; qual banco; se usamos bucket. Serve como base — não como implementação imediata.

---

## 1. Decisão recomendada (agora)

**Começar com um único backend (monólito modular), não com dois microserviços.**

Separar “gestão” e “partituras/MIDI” em APIs distintas **neste momento** aumenta custo operacional sem ganho: não há tráfego, não há time de plataforma, e as entidades são as mesmas (`songs`, `users`, `people`, permissões).

O que **não** deve ser misturado no mesmo *processo HTTP* no futuro é a **geração pesada de MIDI** (CPU, timeout, MuseScore/Verovio). Isso se desenha desde o dia 1 como **módulo + fila + worker**, ainda no mesmo repositório. Só vira um serviço separado quando a CPU do worker competir com a API de CRUD.

| Opção | Quando faz sentido | Custo agora |
| --- | --- | --- |
| Dois backends (gestão + scores) | Times diferentes, SLAs diferentes, escala de conversão MIDI já medida | Alto: dois deploys, auth duplicada, contratos, observabilidade |
| Um backend “god service” que gera MIDI no request HTTP | Nunca, para partituras de 16 naipes | Médio: API trava no primeiro hino grande |
| **Monólito modular + worker de jobs (recomendado)** | Time pequeno, produto único, MIDI pontual e cacheável | Baixo e evolutivo |

**Regra:** um *produto* (API da banda). Dois *processos* só quando o job de partitura precisar de máquina/fila própria. Até lá, API e worker podem ser o mesmo binário com papéis diferentes (`api` vs `worker`).

---

## 2. O que o sistema precisa fazer

Três cargas distintas:

1. **Gestão e portal** — CRUD, autenticação, permissões (união de `roles[]`), listagens, máscara de dados. Latência baixa, I/O de banco.
2. **Arquivos musicais e mídia** — MusicXML original, fotos, capas, MIDI gerado. Objetos grandes; não cabem bem como BLOB principal no banco.
3. **Estudo** — listar músicas com partitura, listar partes (instrumentos), devolver XML filtrado e MIDI filtrado. A **renderização visual** (OSMD, cursor, zoom) permanece no browser. O backend entrega *arquivos*, não SVG interativo.

Isso já existe no front de forma embrionária: o estudo filtra XML no cliente e tenta MIDI no Verovio (e quebra em XML grande). O backend deve assumir filtro + MIDI; o front continua desenhando.

---

## 3. Arquitetura alvo (lógica)

```
[Browser Next.js]
    │  HTTPS + JWT/sessão
    ▼
[API BCL]  ← único ponto de entrada
    │  CRUD, auth, metadados
    │  enfileira "gerar midi" se cache miss
    ▼
[PostgreSQL]          [Object storage / bucket]
    usuários, pessoas,     originais MusicXML
    músicas (metadados),   MIDI cache
    patrimônio, agenda,    fotos / blog
    jobs, permissões
    │
    ▼
[Worker de scores]  (mesmo repo; processo separado quando necessário)
    lê XML do bucket → filtra partes → MuseScore/Verovio → grava MIDI no bucket
```

Módulos internos da API (pacotes/pastas, não repositórios):

| Módulo | Responsabilidade |
| --- | --- |
| Identidade | login, sessão/JWT, `roles[]`, união de permissões no servidor |
| Cadastros | people, users, patrimony, presentations, media |
| Catálogo musical | songs, metadados de `scores`, lista de partes extraída do XML |
| Estudo | endpoints de preparação: partes, XML recortado, MIDI |
| Jobs | fila, status (`pending` / `ready` / `failed`), retry |

Contrato mínimo que o front de estudo precisará (quando o mock sair):

- `GET /songs?hasScore=true`
- `GET /songs/{id}/parts`
- `GET /songs/{id}/musicxml?parts=P1,P2` — XML filtrado para OSMD
- `GET /songs/{id}/midi?parts=P3,P4` — `200` + arquivo **ou** `202` + `jobId` se ainda estiver gerando
- `GET /jobs/{id}` — polling simples

Cache key sugerida: `sha256(songId + ":" + xmlVersion + ":" + sorted(partIds) + ":" + kind)` com `kind` ∈ `{xml, midi}`.

---

## 4. Um backend vs dois serviços — critérios para mudar de ideia

Manter **um** deploy enquanto:

- geração de MIDI < alguns minutos de CPU por dia;
- um único time altera gestão e estudo;
- não há necessidade de escalar o worker independentemente.

**Extrair o worker** (ainda não uma “API de partituras” pública) quando:

- jobs de MIDI atrasarem CRUD (CPU 100% no mesmo processo);
- MuseScore exigir imagem Docker / binários que não devem ir no pod da API.

**Dois HTTP services** só se aparecer um segundo consumidor (app mobile nativo, site estático só de estudo) *e* o worker já estiver isolado. Até lá, duplicar auth e `songs` é desperdício.

Python vs Java **não decide** a topologia. Escolha a linguagem da API de gestão (o que o time mantém melhor). O worker pode, mais tarde, ser o mesmo runtime chamando CLI (`mscore`, Verovio). Evite dois idiomas no dia 1.

---

## 5. Banco de dados

**Sistema de registro: PostgreSQL.**

Motivos alinhados a este produto:

- Relacionamentos reais: usuário ↔ pessoa, pessoa ↔ instrumentos, apresentação ↔ repertório, mídia do blog.
- `roles[]` e metadados de partitura cabem em `JSONB` / arrays nativos.
- Transações no CRUD (criar pessoa + perfil aluno/músico).
- Evolução para RLS ou views se a máscara de dados sensíveis for para o servidor (hoje está só no front — **não é segurança**, é UX).

**Não usar** MongoDB como banco principal: o modelo já é relacional.  
**Não usar** o `db.json` em produção.  
**Não armazenar** o MusicXML completo nem o MIDI como coluna BYTEA de primeiro uso: infla backup, trava autovacuum e mistura backup lógico com binários.

O que fica no Postgres:

- IDs, títulos, compositor, status, `has_score`, hash do XML original, `bucket_key` do original, lista de partes (`id`, `name`) extraída no upload.
- Jobs: `id`, `song_id`, `part_ids`, `kind`, `status`, `result_key`, `error`.
- Usuários, pessoas, patrimônio, apresentações, mídia (campos + `cover_key`).

Opcional depois: Redis só para fila/cache de sessão se a fila in-process não bastar. Não é requisito do MVP.

### 5.1 Modelo mental (tabelas)

Não é schema SQL final; é o recorte que o front já pressupõe:

- `users` (`email` único, `roles text[]`, `person_id`, `is_active`)
- `people` (`is_student`, `is_musician`, JSON de `student` / `musician`)
- `patrimony` (`category`, JSON `instrument` se instrumento)
- `songs` + `song_parts` (derivado do MusicXML no upload)
- `presentations`, `media`
- `score_assets` (kind original | filtered_xml | midi, `object_key`, `part_set_hash`)
- `generation_jobs`

IDs: UUID gerados **pela API**, nunca pelo cliente (já combinado no front).

---

## 6. Bucket (object storage)

**Sim. Precisamos de object storage compatível com S3.**

O bucket não é “cloud demais” para uma banda: é o lugar certo para XML, MIDI e imagens. Em desenvolvimento isso é **MinIO** (API S3 local). Em produção: Cloudflare R2, AWS S3, ou disco S3-compatible do provedor.

Prefixos sugeridos:

```
songs/{songId}/original.musicxml
songs/{songId}/cache/{hash}/filtered.musicxml
songs/{songId}/cache/{hash}/ensemble.mid
media/{mediaId}/cover.webp
people/{personId}/photo.webp
```

Política:

- Upload autenticado (maestro/admin) via URL pré-assinada **ou** proxy na API (MVP: proxy na API é mais simples).
- Objetos de estudo: leitura autenticada (aluno/músico) ou URL assinada de curta duração.
- Cache de MIDI: imutável por hash; invalidar quando o XML original mudar (`xml_version` / ETag).
- Backup: versionamento no bucket + dump diário do Postgres. São dois backups diferentes.

Arquivos pequenos de config não vão para o bucket. XML/MIDI/fotos sim.

---

## 7. Infraestrutura por fase

### Fase 0 — agora (sem backend)

- Next.js + `json-server`.
- MIDI e filtro XML no browser (limitação conhecida).
- Nada a provisionar além do que já roda local.

### Fase 1 — primeiro backend real (MVP)

Um `docker compose` na VM (pasta `bcl/`):

| Peça | Papel |
| --- | --- |
| API Spring | CRUD + auth + arquivos em `/files/**` |
| PostgreSQL 16 | dados |
| MinIO | bucket S3 (só na rede interna) |
| Caddy | HTTPS 80/443 na frente da API |
| (opcional) worker no mesmo compose | geração MIDI; pode ser o mesmo image com `CMD worker` |

O site Next fica na **Vercel** e chama a API pelo `NEXT_PUBLIC_API_URL` público (HTTPS). Infra mínima: **1 VM** Oracle (Always Free Ampere com ≥ 4 GB RAM) + volume Postgres + volume MinIO. Sem Kubernetes no dia 1.

Observabilidade mínima: logs estruturados, health `/health`, métrica de duração de job.

### Fase 2 — estudo de verdade

- Worker sempre ligado (mesmo host, segundo processo).
- Fila: tabela `generation_jobs` no Postgres (LISTEN/NOTIFY ou polling). Redis só se a tabela não aguentar.
- Motor: **MuseScore CLI** ou **Verovio** na imagem do worker (não no laptop do aluno).
- Front deixa de converter MIDI; OSMD continua no cliente.
- Cache hit: `GET midi` em dezenas de ms (redirect/assinatura do objeto).

### Fase 3 — só se a medição pedir

- Worker em máquina/fila separada.
- CDN na frente do bucket para MIDI/XML cacheados (leitores autenticados via cookie/token assinado).
- Kubernetes apenas se houver mais de um app ou HA formal.

---

## 8. Segurança e permissões

O front já aplica união de `roles[]` e máscara. O backend **deve repetir as mesmas regras**. Qualquer GET de people/MIDI sem checagem no servidor é vazamento.

- Auth: sessão httpOnly **ou** JWT curto + refresh; não repetir senha demo em produção.
- Estudo: quem tem `songs:read` (aluno, músico, maestro, admin).
- Upload de XML / regenerar cache: `songs:update`.
- Dados de menor (responsável): persistir, mas só exibir completo a maestro/admin.

LGPD: fotos e documentos no bucket com acesso controlado; backup com retenção definida (ex.: 90 dias de binários antigos, dump Postgres 30 dias).

---

## 9. Estratégia enquanto não há backend

Ordem prática:

1. **Congelar o contrato** deste documento no front (`songs.scores[].url`, IDs pela API, `roles[]`).
2. **Não** criar um segundo Next.js “BFF de partituras”. O `json-server` continua até a Fase 1.
3. Subir Fase 1 com **CRUD + upload XML para MinIO**, ainda gerando MIDI no browser se o worker não estiver pronto — melhor que dois serviços vazios.
4. Ligar o worker e desligar a conversão pesada no React.
5. Só então discutir split de serviços, com números (latência de job, CPU).

Anti-padrões:

- Microserviços “porque MIDI é diferente”.
- Guardar partituras no Git (`public/assets`) como fonte da verdade em produção.
- Gerar MIDI síncrono no POST de “iniciar estudo”.
- Dois bancos (um para gestão, um para scores) sem necessidade.

---

## 10. Resumo executivo

| Pergunta | Resposta |
| --- | --- |
| Gestão e partituras no mesmo backend? | **Sim, um monólito modular.** Worker de MIDI como segundo *processo*, não segunda API, até haver carga. |
| Separar serviços agora? | **Não.** Extrair worker depois; duas APIs só com evidência. |
| Arquitetura? | API + Postgres + bucket S3 + jobs de score. Front: OSMD + player. |
| Infra? | Compose local; 1 VM + Postgres + MinIO/R2 em produção. Sem K8s no MVP. |
| Banco? | **PostgreSQL.** Metadados e relacionamentos. Sem BLOB musical como store principal. |
| Bucket? | **Sim (S3/MinIO).** XML original, cache MIDI/XML filtrado, imagens. |

**Decisão a tomar depois deste documento:** linguagem da API (Python ou Java) — irrelevante para a topologia acima; relevante só para o time que vai manter o CRUD.
