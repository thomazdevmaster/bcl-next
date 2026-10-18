"use client";

import { useState } from "react";
import { useDebouncedCallback } from "@tanstack/react-pacer/debouncer";

type InputValue = string | number;

interface UseTableDebouncedInputOptions {
  value: InputValue;
  onDebouncedChange: (value: InputValue) => void;
  delay?: number;
}

export function useTableDebouncedInput({
  value: externalValue,
  onDebouncedChange,
  delay = 300,
}: UseTableDebouncedInputOptions) {
  const [draft, setDraft] = useState({ source: externalValue, value: externalValue });
  const value = Object.is(draft.source, externalValue) ? draft.value : externalValue;
  const debouncedOnChange = useDebouncedCallback(onDebouncedChange, { wait: delay });

  const setValue = (nextValue: InputValue) => {
    setDraft({ source: externalValue, value: nextValue });
    debouncedOnChange(nextValue);
  };

  return { value, setValue };
}
