import type { InputHTMLAttributes, Ref } from "react";

type IconCheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "defaultChecked" | "onChange"
> & {
  checked: boolean;
  icon?: string;
  label: string;
  inputRef?: Ref<HTMLInputElement>;
  onChange: (checked: boolean) => void;
};

export function IconCheckbox({
  checked,
  icon = "check_box",
  label,
  inputRef,
  id,
  className,
  onChange,
  ...inputProps
}: IconCheckboxProps) {
  return (
    <label
      className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors has-[:checked]:border-[var(--success)] has-[:checked]:bg-[var(--success)]/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${className ?? ""}`}
    >
      <span className="material-icons shrink-0 text-lg" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      <input
        {...inputProps}
        ref={inputRef}
        id={id}
        type="checkbox"
        checked={checked}
        className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--success)] disabled:cursor-not-allowed"
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
