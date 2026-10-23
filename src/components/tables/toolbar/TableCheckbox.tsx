"use client";

import { useEffect, useRef } from "react";
import type { HTMLProps } from "react";

export function TableCheckbox({
  indeterminate,
  hideOnMobile = false,
  ...props
}: {
  indeterminate?: boolean;
  hideOnMobile?: boolean;
} & HTMLProps<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current)
      ref.current.indeterminate = Boolean(indeterminate && !props.checked);
  }, [indeterminate, props.checked]);

  return (
    <span
      className={
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ring)] " +
        (hideOnMobile ? "max-[959px]:hidden" : "")
      }
    >
      <input
        {...props}
        ref={ref}
        type="checkbox"
        className={`peer absolute inset-0 z-10 size-11 cursor-pointer opacity-0 disabled:cursor-not-allowed ${props.className ?? ""}`}
      />
      <span
        className="material-icons text-2xl text-[var(--info)] transition-transform duration-150 ease-out peer-active:scale-75 peer-checked:scale-110 motion-reduce:transition-none motion-reduce:peer-active:scale-100 motion-reduce:peer-checked:scale-100"
        aria-hidden="true"
      >
        {props.checked
          ? "check_box"
          : indeterminate
            ? "indeterminate_check_box"
            : "check_box_outline_blank"}
      </span>
    </span>
  );
}
