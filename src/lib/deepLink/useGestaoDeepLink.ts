"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

function gestaoModeFromQuery(value: string | null): "edit" | "view" {
  if (value === "ver" || value === "view") return "view";
  return "edit";
}

type Options = {
  param: string | null;
  items: Record<string, unknown>[];
  loading: boolean;
  onOpen: (
    item: Record<string, unknown>,
    mode: "view" | "edit",
  ) => void | Promise<void>;
};

/** Abre registro da gestão a partir de query (?conta=, ?evento=, ?musica=). */
export function useGestaoDeepLink({
  param,
  items,
  loading,
  onOpen,
}: Options) {
  const router = useRouter();
  const pathname = usePathname();
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const consumedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!param || loading) return;

    const params = new URLSearchParams(window.location.search);
    const recordId = params.get(param);
    if (!recordId?.trim()) return;

    const modo = params.get("modo");
    const key = `${param}:${recordId}:${modo ?? ""}`;
    if (consumedKeyRef.current === key) return;

    const item = items.find((row) => String(row.id) === recordId.trim());
    if (!item) return;

    consumedKeyRef.current = key;
    const mode = gestaoModeFromQuery(modo);

    void Promise.resolve(onOpenRef.current(item, mode)).finally(() => {
      params.delete(param);
      params.delete("modo");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [param, items, loading, pathname, router]);
}
