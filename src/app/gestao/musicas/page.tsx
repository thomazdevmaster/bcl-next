'use client';

import { DomainWorkspace } from '@/components/domain/DomainWorkspace';
import { StudyPublicRepertoireNotice } from '@/components/study/StudyPublicRepertoireNotice';

export default function MusicasPage() {
  return (
    <div className="mx-auto space-y-4">
      <StudyPublicRepertoireNotice context="songs" />
      <DomainWorkspace
        resource="songs"
        entityFields={['title', 'composer', 'arranger', 'key', 'visibility', 'hasScore', 'status']}
      />
    </div>
  );
}
