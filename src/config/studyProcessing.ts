export type StudyScoreStatus = 'none' | 'processing' | 'ready' | 'failed';
export type StudyAudioStatus = 'none' | 'processing' | 'ready' | 'failed' | 'skipped';

/** Rollback: defina `NEXT_PUBLIC_STUDY_PROCESSING_GATE=false` (e `STUDY_PROCESSING_GATE=false` na API). */
export function studyProcessingGateEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STUDY_PROCESSING_GATE !== 'false';
}

export function studyScoreReady(song: {
  studyScoreReady?: boolean;
  studyScoreStatus?: StudyScoreStatus;
}): boolean {
  if (!studyProcessingGateEnabled()) return true;
  if (typeof song.studyScoreReady === 'boolean') return song.studyScoreReady;
  return song.studyScoreStatus === 'ready';
}

export function studyAudioReady(song: {
  studyAudioReady?: boolean;
  studyAudioStatus?: StudyAudioStatus;
}): boolean {
  if (!studyProcessingGateEnabled()) return true;
  if (typeof song.studyAudioReady === 'boolean') return song.studyAudioReady;
  const status = song.studyAudioStatus;
  return status === 'ready' || status === 'skipped';
}

export function studyProcessingLabel(song: {
  studyScoreStatus?: StudyScoreStatus;
  studyAudioStatus?: StudyAudioStatus;
}): string | null {
  if (!studyProcessingGateEnabled()) return null;
  if (song.studyScoreStatus === 'processing') {
    return 'Preparando partitura…';
  }
  if (song.studyScoreStatus === 'failed') {
    return 'Falha na partitura';
  }
  if (song.studyScoreStatus === 'ready' && song.studyAudioStatus === 'processing') {
    return 'Gerando áudio…';
  }
  if (song.studyAudioStatus === 'failed') {
    return 'Áudio indisponível';
  }
  return null;
}
