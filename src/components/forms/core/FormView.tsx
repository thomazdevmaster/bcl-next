"use client";

import { useEffect, useId, useRef, type FormEventHandler, type ReactNode } from "react";

export type FormViewProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  noValidate?: boolean;
  className?: string;
  formClassName?: string;
};

export function FormView({
  eyebrow,
  title,
  description,
  children,
  onSubmit,
  noValidate = false,
  className = "",
  formClassName = "",
}: FormViewProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = description == null ? undefined : `${id}-description`;
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!Element.prototype.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const isCompactViewport = window.matchMedia("(max-width: 400px)").matches;
    const distance = isCompactViewport ? 6 : 8;
    const contentDistance = isCompactViewport ? 3 : 4;
    const surfaceDuration = isCompactViewport ? 290 : 360;
    const contentDuration = isCompactViewport ? 225 : 280;
    const headingDelay = isCompactViewport ? 40 : 60;
    const formDelay = isCompactViewport ? 90 : 120;
    const easing = "cubic-bezier(0.2, 0, 0, 1)";

    const animations = [
      sectionRef.current?.animate(
        [
          { opacity: 0, transform: `translateY(${distance}px)` },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: surfaceDuration, easing, fill: "both" },
      ),
      headingRef.current?.animate(
        [
          { opacity: 0, transform: `translateY(${contentDistance}px)` },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: contentDuration, delay: headingDelay, easing, fill: "both" },
      ),
      formRef.current?.animate(
        [
          { opacity: 0, transform: `translateY(${contentDistance}px)` },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: contentDuration, delay: formDelay, easing, fill: "both" },
      ),
    ].filter((animation): animation is Animation => animation != null);

    animations.forEach((animation) => {
      animation.onfinish = () => animation.cancel();
    });

    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8 ${className}`}
    >
      <div ref={headingRef}>
        {eyebrow ? <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{eyebrow}</p> : null}
        <h1 id={titleId} className="mt-3 text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        {description != null ? (
          <p id={descriptionId} className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>

      <form
        ref={formRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`mt-8 space-y-8 ${formClassName}`}
        onSubmit={onSubmit}
        noValidate={noValidate}
      >
        {children}
      </form>
    </section>
  );
}
