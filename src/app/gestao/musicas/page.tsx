'use client';

import { DomainWorkspace } from '@/components/domain/DomainWorkspace';

export default function MusicasPage() {
  return (
    <DomainWorkspace
      resource="songs"
      entityFields={['title', 'composer', 'arranger', 'key', 'visibility', 'hasScore', 'status']}
    />
  );
}
