"use client";

import { useCallback, useEffect, useState } from "react";

import { getUnreadNotificationCount } from "@/domains/notifications/api";

export function useUnreadNotifications(
  enabled: boolean,
  userId?: string | number,
) {
  const [count, setCount] = useState(0);
  const [countError, setCountError] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      setCountError(null);
      return;
    }
    setCountError(null);
    try {
      const response = await getUnreadNotificationCount();
      setCount(Math.max(0, response.count));
    } catch {
      setCountError("Não foi possível atualizar a contagem de notificações.");
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getUnreadNotificationCount()
      .then((response) => {
        if (cancelled) return;
        setCount(Math.max(0, response.count));
        setCountError(null);
      })
      .catch(() => {
        if (!cancelled)
          setCountError(
            "Não foi possível atualizar a contagem de notificações.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  return { count, countError, refreshCount };
}
