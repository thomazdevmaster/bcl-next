export const LEGACY_ROUTE_REDIRECTS = [
  {
    source: "/gestao/apresentacoes",
    destination: "/gestao/agenda",
    permanent: false,
  },
  {
    // O treino passou a ser o score playground; `/study` e `/study/:id` caem lá.
    source: "/study/:path*",
    destination: "/score_playground",
    permanent: false,
  },
] as const;
