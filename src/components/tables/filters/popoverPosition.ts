export interface PopoverPositionInput {
  triggerLeft: number;
  triggerTop: number;
  triggerBottom: number;
  popoverWidth: number;
  popoverHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
}

export interface PopoverPosition {
  left: number;
  top: number;
}

export function calculatePopoverPosition({
  triggerLeft,
  triggerTop,
  triggerBottom,
  popoverWidth,
  popoverHeight,
  viewportWidth,
  viewportHeight,
  padding = 8,
}: PopoverPositionInput): PopoverPosition {
  const rightmostLeft = Math.max(
    padding,
    viewportWidth - popoverWidth - padding,
  );
  const left = Math.min(Math.max(padding, triggerLeft), rightmostLeft);
  const below = triggerBottom + padding;
  const top =
    below + popoverHeight <= viewportHeight - padding
      ? below
      : Math.max(padding, triggerTop - popoverHeight - padding);
  return { left, top };
}
