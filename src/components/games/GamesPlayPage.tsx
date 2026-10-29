"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import { getCategoryBySlug, getGameBySlug } from "@/domains/games/catalog";
import {
  visibleCategoryForUser,
  visibleGamesInCategory,
} from "@/domains/games/gameAccess";
import { useGameCatalog } from "@/domains/games/useGameCatalog";

const gameLoading = (
  <p className="px-4 py-12 text-center text-sm text-[var(--muted)]">
    Carregando jogo…
  </p>
);

const TrebleNaturals1Game = dynamic(
  () =>
    import("@/components/games/notas/TrebleNaturals1Game").then((module) => ({
      default: module.TrebleNaturals1Game,
    })),
  { ssr: false, loading: () => gameLoading },
);

const TrebleNaturals2Game = dynamic(
  () =>
    import("@/components/games/notas/TrebleNaturals2Game").then((module) => ({
      default: module.TrebleNaturals2Game,
    })),
  { ssr: false, loading: () => gameLoading },
);

const TrebleHigherNoteGame = dynamic(
  () =>
    import("@/components/games/notas/TrebleHigherNoteGame").then((module) => ({
      default: module.TrebleHigherNoteGame,
    })),
  { ssr: false, loading: () => gameLoading },
);

const TrebleRotateStaffGame = dynamic(
  () =>
    import("@/components/games/notas/TrebleRotateStaffGame").then((module) => ({
      default: module.TrebleRotateStaffGame,
    })),
  { ssr: false, loading: () => gameLoading },
);

const TrebleListenWriteGame = dynamic(
  () =>
    import("@/components/games/notas/TrebleNaturals2Game").then((module) => ({
      default: module.TrebleListenWriteGame,
    })),
  { ssr: false, loading: () => gameLoading },
);

const RhythmFiguresGame = dynamic(
  () =>
    import("@/components/games/ritmos/RhythmFiguresGame").then((module) => ({
      default: module.RhythmFiguresGame,
    })),
  { ssr: false, loading: () => gameLoading },
);

const RhythmDurationGame = dynamic(
  () =>
    import("@/components/games/ritmos/RhythmDurationGame").then((module) => ({
      default: module.RhythmDurationGame,
    })),
  { ssr: false, loading: () => gameLoading },
);

const RhythmBarGame = dynamic(
  () =>
    import("@/components/games/ritmos/RhythmBarGame").then((module) => ({
      default: module.RhythmBarGame,
    })),
  { ssr: false, loading: () => gameLoading },
);

const RhythmHoldGame = dynamic(
  () =>
    import("@/components/games/ritmos/RhythmHoldGame").then((module) => ({
      default: module.RhythmHoldGame,
    })),
  { ssr: false, loading: () => gameLoading },
);

const RhythmDictationGame = dynamic(
  () =>
    import("@/components/games/ritmos/RhythmDictationGame").then((module) => ({
      default: module.RhythmDictationGame,
    })),
  { ssr: false, loading: () => gameLoading },
);

const IntervalNameGame = dynamic(
  () =>
    import("@/components/games/intervalos/IntervalNameGame").then((module) => ({
      default: module.IntervalNameGame,
    })),
  { ssr: false, loading: () => gameLoading },
);

const IntervalCompareGame = dynamic(
  () =>
    import("@/components/games/intervalos/IntervalCompareGame").then(
      (module) => ({
        default: module.IntervalCompareGame,
      }),
    ),
  { ssr: false, loading: () => gameLoading },
);

const IntervalListenGame = dynamic(
  () =>
    import("@/components/games/intervalos/IntervalListenGame").then(
      (module) => ({
        default: module.IntervalListenGame,
      }),
    ),
  { ssr: false, loading: () => gameLoading },
);

const IntervalWriteGame = dynamic(
  () =>
    import("@/components/games/intervalos/IntervalWriteGame").then(
      (module) => ({
        default: module.IntervalWriteGame,
      }),
    ),
  { ssr: false, loading: () => gameLoading },
);

const InstrumentFamilyGame = dynamic(
  () =>
    import("@/components/games/instrumentos/InstrumentFamilyGame").then(
      (module) => ({
        default: module.InstrumentFamilyGame,
      }),
    ),
  { ssr: false, loading: () => gameLoading },
);

const InstrumentMethodGame = dynamic(
  () =>
    import("@/components/games/instrumentos/InstrumentMethodGame").then(
      (module) => ({
        default: module.InstrumentMethodGame,
      }),
    ),
  { ssr: false, loading: () => gameLoading },
);

const InstrumentRegisterGame = dynamic(
  () =>
    import("@/components/games/instrumentos/InstrumentRegisterGame").then(
      (module) => ({
        default: module.InstrumentRegisterGame,
      }),
    ),
  { ssr: false, loading: () => gameLoading },
);

const InstrumentClueGame = dynamic(
  () =>
    import("@/components/games/instrumentos/InstrumentClueGame").then(
      (module) => ({
        default: module.InstrumentClueGame,
      }),
    ),
  { ssr: false, loading: () => gameLoading },
);

interface GamesPlayPageProps {
  categorySlug: string;
  gameSlug: string;
}

function GameRenderer({ gameId }: { gameId: string }) {
  switch (gameId) {
    case "notas-clave-sol-naturais-1":
      return <TrebleNaturals1Game />;
    case "notas-clave-sol-naturais-2":
      return <TrebleNaturals2Game />;
    case "notas-clave-sol-mais-aguda":
      return <TrebleHigherNoteGame />;
    case "notas-clave-sol-ouca-escreva":
      return <TrebleListenWriteGame />;
    case "notas-clave-sol-gire-a-pauta":
      return <TrebleRotateStaffGame />;
    case "ritmos-figuras":
      return <RhythmFiguresGame />;
    case "ritmos-qual-dura-mais":
      return <RhythmDurationGame />;
    case "ritmos-complete-o-compasso":
      return <RhythmBarGame />;
    case "ritmos-ouca-o-ritmo":
      return <RhythmDictationGame />;
    case "ritmos-segure-o-tempo":
      return <RhythmHoldGame />;
    case "intervalos-nomeie":
      return <IntervalNameGame />;
    case "intervalos-qual-e-maior":
      return <IntervalCompareGame />;
    case "intervalos-ouca":
      return <IntervalListenGame />;
    case "intervalos-escreva":
      return <IntervalWriteGame />;
    case "instrumentos-familia":
      return <InstrumentFamilyGame />;
    case "instrumentos-como-se-toca":
      return <InstrumentMethodGame />;
    case "instrumentos-mais-agudo":
      return <InstrumentRegisterGame />;
    case "instrumentos-quem-e":
      return <InstrumentClueGame />;
    default:
      return (
        <div className="mx-auto max-w-xl px-4 py-12 text-sm text-[var(--muted)]">
          Este jogo ainda não está disponível nesta versão do app.
        </div>
      );
  }
}

export function GamesPlayPage({ categorySlug, gameSlug }: GamesPlayPageProps) {
  const { roles, isHydrated } = useAuth();
  const { catalog, loading } = useGameCatalog(isHydrated);
  const category = getCategoryBySlug(categorySlug);
  const game = getGameBySlug(categorySlug, gameSlug);

  if (!category || !game) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-xl font-semibold">Jogo não encontrado</h1>
        <p className="mt-4 text-sm">
          <Link
            href="/jogos"
            className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
          >
            Voltar aos jogos
          </Link>
        </p>
      </div>
    );
  }

  const categoryVisible = visibleCategoryForUser(roles, categorySlug, catalog);
  const visibleGames = categoryVisible
    ? visibleGamesInCategory(roles, category.id, catalog)
    : [];
  const gameVisible = visibleGames.some((entry) => entry.id === game.id);

  if (!loading && (!categoryVisible || !gameVisible)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-xl font-semibold">Jogo indisponível</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Este jogo não está visível para os seus perfis ativos.
        </p>
        <p className="mt-4 text-sm">
          <Link
            href={`/jogos/${categorySlug}`}
            className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
          >
            Ver categoria {category.label}
          </Link>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <p
        className="px-4 py-12 text-center text-sm text-[var(--muted)]"
        aria-live="polite"
      >
        Carregando…
      </p>
    );
  }

  return <GameRenderer gameId={game.id} />;
}
