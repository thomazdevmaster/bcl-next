'use client';

import { DomainGuard } from '@/components/domain/DomainGuard';
import { GamesHub } from '@/components/games/GamesHub';

export default function JogosPage() {
  return (
    <DomainGuard resource="games" requireLogin>
      <GamesHub />
    </DomainGuard>
  );
}
