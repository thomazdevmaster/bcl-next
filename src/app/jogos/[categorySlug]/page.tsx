'use client';

import { use } from 'react';
import { DomainGuard } from '@/components/domain/DomainGuard';
import { GamesCategoryPage } from '@/components/games/GamesCategoryPage';

interface PageProps {
  params: Promise<{ categorySlug: string }>;
}

export default function JogosCategoryRoutePage({ params }: PageProps) {
  const { categorySlug } = use(params);
  return (
    <DomainGuard resource="games" requireLogin>
      <GamesCategoryPage categorySlug={categorySlug} />
    </DomainGuard>
  );
}
