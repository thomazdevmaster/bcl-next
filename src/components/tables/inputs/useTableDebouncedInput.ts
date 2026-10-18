"use client";

import { useLayoutEffect, useState } from "react";
import { useDebouncer } from "@tanstack/react-pacer/debouncer";

type InputValue = string | number;

interface UseTableDebouncedInputOptions {
  value: InputValue;
  onDebouncedChange: (value: InputValue) => void;
  delay?: number;
  resetKey?: number;
}

export function useTableDebouncedInput({
  value: externalValue,
  onDebouncedChange,
  delay = 300,
  resetKey = 0,
}: UseTableDebouncedInputOptions) {
  const [draft, setDraft] = useState({ source: externalValue, resetKey, value: externalValue });
  if (!Object.is(draft.source, externalValue) || draft.resetKey !== resetKey) {
    setDraft({ source: externalValue, resetKey, value: externalValue });
  }
  const value = Object.is(draft.source, externalValue) && draft.resetKey === resetKey ? draft.value : externalValue;
  const debouncer = useDebouncer(onDebouncedChange, { wait: delay });

  useLayoutEffect(() => {
    debouncer.cancel();
  }, [debouncer, externalValue, resetKey]);

  const setValue = (nextValue: InputValue) => {
    setDraft({ source: externalValue, resetKey, value: nextValue });
    debouncer.maybeExecute(nextValue);
  };

  return { value, setValue };
}
