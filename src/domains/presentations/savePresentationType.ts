import { apiFetch } from "@/lib/api";

import type { EventTypeFormValues } from "./schemas/event-type.schema";
import type { PresentationType } from "./types";

export async function savePresentationType(
  values: EventTypeFormValues,
  editingType: PresentationType | null,
): Promise<PresentationType> {
  const payload = {
    name: values.name,
    icon: values.icon?.trim() || null,
    isPublicByDefault: values.isPublicByDefault,
    isActive: editingType?.isSystem ? true : values.isActive,
  };

  return editingType
    ? apiFetch<PresentationType>(`/presentation-types/${editingType.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    : apiFetch<PresentationType>("/presentation-types", {
        method: "POST",
        body: JSON.stringify(payload),
      });
}

export function replaceOrAppendPresentationType(
  current: PresentationType[],
  saved: PresentationType,
  editing: boolean,
): PresentationType[] {
  return editing
    ? current.map((type) => (type.id === saved.id ? saved : type))
    : [...current, saved];
}
