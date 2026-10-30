'use client';

import { DomainGuard } from '@/components/domain/DomainGuard';
import { GamesAdminWorkspace } from '@/components/games/GamesAdminWorkspace';

export default function GestaoJogosPage() {
  return (
    <DomainGuard resource="games" action="read">
      <GamesAdminWorkspace />
    </DomainGuard>
  );
}
