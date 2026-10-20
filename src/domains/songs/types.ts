import type { Auditable, EntityId, RecordStatus } from '../shared';

export interface SongScore {
  fileName: string;
  mimeType: 'application/vnd.recordare.musicxml+xml' | 'application/xml' | 'text/xml';
  url: string;
}

export type StudyScoreStatus = 'none' | 'processing' | 'ready' | 'failed';
export type StudyAudioStatus = 'none' | 'processing' | 'ready' | 'failed' | 'skipped';

export interface Song extends Auditable {
  id: EntityId;
  title: string;
  composer: string;
  arranger?: string;
  genre?: string;
  key?: string;
  durationSeconds?: number;
  scores: SongScore[];
  studyScoreStatus?: StudyScoreStatus;
  studyAudioStatus?: StudyAudioStatus;
  studyScoreReady?: boolean;
  studyAudioReady?: boolean;
  visibility: 'public' | 'private';
  visibleToStudents?: boolean;
  visibleToMusicians?: boolean;
  videoUrl?: string;
  status: RecordStatus;
}
