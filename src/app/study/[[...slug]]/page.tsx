'use client';

import dynamic from 'next/dynamic';
import { DomainGuard } from '@/components/domain/DomainGuard';

const StudyRouteClient = dynamic(() => import('@/study/StudyRouteClient'), { ssr: false });

export default function StudyRoutePage() {
  return (
    <DomainGuard resource="songs" requireLogin>
      <StudyRouteClient />
    </DomainGuard>
  );
}
