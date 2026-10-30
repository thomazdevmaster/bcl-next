"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getNotifications,
  getUnreadNotificationCount,
} from "@/domains/notifications/api";

const POLL_INTERVAL_MS = 30_000;
const ALERT_VISIBLE_MS = 10_000;

export function useUnreadNotifications(
  enabled: boolean,
  userId?: string | number,
) {
  const [count, setCount] = useState(0);
  const [countError, setCountError] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState<string | null>(null);
  const previousCountRef = useRef<number | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedRef = useRef(false);

  const dismissNewAlert = useCallback(() => {
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = null;
    setNewAlert(null);
  }, []);

  const showNewAlert = useCallback(async (delta: number) => {
    let message =
      delta === 1
        ? "Você tem 1 nova notificação."
        : `Você tem ${delta} novas notificações.`;
    try {
      const page = await getNotifications();
      const latestUnread = page.items.find((item) => !item.readAt);
      if (latestUnread?.title?.trim()) {
        message = latestUnread.title.trim();
      }
    } catch {
      /* mantém mensagem genérica */
    }
    setNewAlert(message);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => {
      setNewAlert(null);
      alertTimerRef.current = null;
    }, ALERT_VISIBLE_MS);
  }, []);

  const applyCount = useCallback(
    async (nextCount: number, options?: { announce?: boolean }) => {
      const safeCount = Math.max(0, nextCount);
      const previous = previousCountRef.current;
      setCount(safeCount);

      if (
        options?.announce &&
        previous != null &&
        safeCount > previous
      ) {
        await showNewAlert(safeCount - previous);
      }

      previousCountRef.current = safeCount;
    },
    [showNewAlert],
  );

  const fetchCount = useCallback(
    async (announce: boolean) => {
      if (!enabled) return;
      setCountError(null);
      try {
        const response = await getUnreadNotificationCount();
        await applyCount(response.count, { announce });
      } catch {
        setCountError("Não foi possível atualizar a contagem de notificações.");
      }
    },
    [applyCount, enabled],
  );

  const refreshCount = useCallback(async () => {
    if (!enabled) {
      previousCountRef.current = 0;
      setCount(0);
      setCountError(null);
      dismissNewAlert();
      return;
    }
    await fetchCount(hasInitializedRef.current);
    hasInitializedRef.current = true;
  }, [dismissNewAlert, enabled, fetchCount]);

  useEffect(() => {
    if (!enabled) {
      hasInitializedRef.current = false;
      previousCountRef.current = null;
      setCount(0);
      setCountError(null);
      dismissNewAlert();
      return;
    }

    let cancelled = false;

    void (async () => {
      await fetchCount(false);
      if (!cancelled) hasInitializedRef.current = true;
    })();

    const intervalId = window.setInterval(() => {
      void fetchCount(true);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [dismissNewAlert, enabled, fetchCount, userId]);

  useEffect(
    () => () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    },
    [],
  );

  return {
    count,
    countError,
    refreshCount,
    newAlert,
    dismissNewAlert,
  };
}
