'use client';

import { DomainWorkspace } from '@/components/domain/DomainWorkspace';

export default function InstrumentosPage() {
  return (
    <DomainWorkspace
      resource="instruments"
      entityFields={['name', 'family', 'subclass', 'tuning', 'tessitura', 'signalType', 'status']}
    />
  );
}
