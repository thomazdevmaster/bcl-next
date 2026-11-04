import type { Auditable, EntityId } from "../shared";

export type PresentationStatus = "draft" | "scheduled" | "done" | "cancelled";

export interface PresentationType {
  id: number;
  name: string;
  icon?: string | null;
  isPublicByDefault: boolean;
  isActive: boolean;
  isSystem: boolean;
}

export interface Presentation extends Auditable {
  id: EntityId;
  title: string;
  venue: string;
  startsAt: string;
  endsAt?: string;
  description?: string;
  repertoireIds: EntityId[];
  coverUrl?: string;
  isPublic: boolean;
  status: PresentationStatus;
  eventType?: { id: number | null; name: string; icon?: string | null } | null;
}
