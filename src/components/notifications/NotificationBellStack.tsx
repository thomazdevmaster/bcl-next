"use client";

import type { Ref } from "react";

import { NotificationBell } from "./NotificationBell";
import { NotificationNewAlert } from "./NotificationNewAlert";

type Props = {
  count: number;
  countError: string | null;
  expanded: boolean;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
  newAlert: string | null;
  onDismissNewAlert: () => void;
  onOpenInbox: () => void;
};

export function NotificationBellStack({
  newAlert,
  onDismissNewAlert,
  onOpenInbox,
  ...bellProps
}: Props) {
  return (
    <div className="relative shrink-0">
      <NotificationBell {...bellProps} />
      {newAlert ? (
        <NotificationNewAlert
          message={newAlert}
          onDismiss={onDismissNewAlert}
          onOpen={onOpenInbox}
        />
      ) : null}
    </div>
  );
}
