import type {
  FocusEventHandler,
  InputHTMLAttributes,
  ReactNode,
  Ref,
} from "react";

export type StyledSize = "sm" | "md" | "lg" | "xl";
export type ValidationState = "valid" | "invalid" | "warning" | "info";

export interface FieldStripProps {
  id: string;
  children: ReactNode;
}

export type FieldErrorStripProps = FieldStripProps;

export interface FieldProps {
  className?: string;
  size?: StyledSize;
  label: ReactNode;
  description?: ReactNode;
  endAdornment?: ReactNode;
  placeholder?: string;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  name?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  step?: InputHTMLAttributes<HTMLInputElement>["step"];
  value?: string;
  onValueChange?: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  inputRef?: Ref<HTMLInputElement>;
  state?: ValidationState;
  message?: ReactNode;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoCapitalize?: string;
  spellCheck?: boolean;
  minLength?: number;
  max?: string;
  maxLength?: number;
  renderControl?: (props: {
    id: string;
    labelId: string;
    name?: string;
    describedBy?: string;
    invalid: boolean;
    className: string;
    readOnly?: boolean;
    step?: InputHTMLAttributes<HTMLInputElement>["step"];
  }) => ReactNode;
  labelForControl?: boolean;
  labelClassName?: string;
}
