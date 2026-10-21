import { STRIP_ROLES, STRIP_STYLES, type FieldStripProps, type StripTone } from "../core";

export type FieldStateStripProps = FieldStripProps & { tone: StripTone };

export function FormFieldStateStrip({ id, children, tone }: FieldStateStripProps) {
  return (
    <p
      id={id}
      role={STRIP_ROLES[tone]}
      className={`rounded-b-xl border border-t-0 px-3 py-2 text-sm font-medium leading-5 transition-[opacity,transform,color,background-color,border-color] duration-200 ease-[cubic-bezier(0.2,0,0,1)] starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100 ${STRIP_STYLES[tone]}`}
    >
      {children}
    </p>
  );
}
