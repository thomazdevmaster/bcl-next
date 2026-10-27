'use client';

import { use } from 'react';
import { DomainGuard } from '@/components/domain/DomainGuard';
import { GamesPlayPage } from '@/components/games/GamesPlayPage';

interface PageProps {
  params: Promise<{ categorySlug: string; gameSlug: string }>;
}

export default function JogosGameRoutePage({ params }: PageProps) {
  const { categorySlug, gameSlug } = use(params);
  return (
    <DomainGuard resource="games" requireLogin>
      <GamesPlayPage categorySlug={categorySlug} gameSlug={gameSlug} />
    </DomainGuard>
  );
}
