"use client";

import { useCallback, useEffect, useState } from "react";

import type { PresentationType } from "@/domains/presentations/types";
import { apiFetch } from "@/lib/api";
import { userFacingError } from "@/lib/userMessages";

export function usePresentationTypes() {
  const [types, setTypes] = useState<PresentationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTypes = useCallback(
    () => loadPresentationTypes(setTypes, setLoading, setError),
    [],
  );

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  return { types, setTypes, loading, error, setError, loadTypes };
}

async function loadPresentationTypes(
  setTypes: (types: PresentationType[]) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
) {
  setLoading(true);
  setError(null);
  try {
    setTypes(await apiFetch<PresentationType[]>("/presentation-types"));
  } catch (caught) {
    setError(
      userFacingError(caught, "Não foi possível carregar os tipos de evento."),
    );
  } finally {
    setLoading(false);
  }
}
