'use client';

import dynamic from 'next/dynamic';
import { DomainGuard } from '@/components/domain/DomainGuard';

const ScorePlaygroundPage = dynamic(
  () => import('@/score-playground/ScorePlaygroundPage'),
  { ssr: false },
);

export default function ScorePlaygroundRoute() {
  return (
    <DomainGuard resource="study">
      <ScorePlaygroundPage />
    </DomainGuard>
  );
}
