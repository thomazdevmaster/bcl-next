"use client";

import type { InputHTMLAttributes } from "react";
import { useTableDebouncedInput } from "./useTableDebouncedInput";
import { tableControlMotion } from "../core/tableMotion";

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
  className,
  ...props
}: TableDebouncedInputProps) {
  const { value, setValue } = useTableDebouncedInput({
    value: externalValue,
    onDebouncedChange: onChange,
    delay,
    resetKey,
  });

  return <input {...props} className={`${className ?? ""} ${tableControlMotion}`} value={value} onChange={(event) => setValue(event.target.value)} />;
}
