export type PresentationPublicationState = {
  status?: unknown;
  isPublic?: unknown;
};

export function shouldNotifyOnPresentationSave(
  notifyAll: boolean,
  current: PresentationPublicationState | null,
  isCreating: boolean,
): boolean {
  const alreadyPublished =
    !isCreating && current?.status === "scheduled" && current.isPublic === true;
  return notifyAll && !alreadyPublished;
}
