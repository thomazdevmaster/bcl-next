export const LEGACY_ROUTE_REDIRECTS = [
  {
    source: "/gestao/apresentacoes",
    destination: "/gestao/agenda",
    permanent: false,
  },
  {
    // O treino passou a ser o score playground. Só as rotas de página:
    // `/study` e `/study/<id numérico>`. Arquivos estáticos em `/study/*`
    // (ex.: `unroll.sef.json`) precisam continuar sendo servidos.
    source: "/study",
    destination: "/score_playground",
    permanent: false,
  },
  {
    source: "/study/:id(\\d+)",
    destination: "/score_playground",
    permanent: false,
  },
] as const;
