"use client";

import { useCallback, useEffect, useState } from "react";
import { getUnreadNotificationCount } from "@/domains/notifications/api";

export function useUnreadNotifications(enabled: boolean, userId?: string | number) {
  const [count, setCount] = useState(0);

  const refreshCount = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      return;
    }
    try {
      const response = await getUnreadNotificationCount();
      setCount(Math.max(0, response.count));
    } catch {
      // Falha de contagem não deve bloquear a navegação autenticada.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getUnreadNotificationCount()
      .then((response) => {
        if (!cancelled) setCount(Math.max(0, response.count));
      })
      .catch(() => {
        // Falha de contagem não deve bloquear a navegação autenticada.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  return { count, refreshCount };
}
