"use client";

import type { InputHTMLAttributes } from "react";
import { useTableDebouncedInput } from "./useTableDebouncedInput";

type TableDebouncedInputProps = {
  value: string | number;
  onChange: (value: string | number) => void;
  delay?: number;
  resetKey?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

export function TableDebouncedInput({
  value: externalValue,
  onChange,
  delay,
  resetKey,
  ...props
}: TableDebouncedInputProps) {
  const { value, setValue } = useTableDebouncedInput({
    value: externalValue,
    onDebouncedChange: onChange,
    delay,
    resetKey,
  });

  return <input {...props} value={value} onChange={(event) => setValue(event.target.value)} />;
}
