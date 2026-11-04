"use client";

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  Children,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  rememberFocusReturn: (element: HTMLElement | null) => void;
  getFocusReturn: () => HTMLElement | null;
}

interface SheetProps extends PropsWithChildren {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface SheetContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: SheetSide;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

const SheetContext = createContext<SheetContextValue | null>(null);

const sideClasses: Record<SheetSide, string> = {
  top: "rounded-b-2xl border-b",
  right: "border-l",
  bottom: "rounded-t-2xl border-t pb-[max(1rem,env(safe-area-inset-bottom))]",
  left: "border-r",
};

function getPositionStyle(side: SheetSide, open: boolean): CSSProperties {
  const transform = open ? "translate3d(0, 0, 0)" : hiddenTransform(side);

  if (side === "top" || side === "bottom") {
    return {
      position: "fixed",
      left: 0,
      right: 0,
      width: "100vw",
      maxWidth: "100vw",
      maxHeight: "min(92dvh, 48rem)",
      top: side === "top" ? 0 : undefined,
      bottom: side === "bottom" ? 0 : undefined,
      transform,
    };
  }

  return {
    position: "fixed",
    top: 0,
    bottom: 0,
    height: "100dvh",
    width: "min(85vw, 24rem)",
    maxWidth: "calc(100vw - 1rem)",
    left: side === "left" ? 0 : undefined,
    right: side === "right" ? 0 : undefined,
    transform,
  };
}

function hiddenTransform(side: SheetSide): string {
  const transforms: Record<SheetSide, string> = {
    top: "translate3d(0, -100%, 0)",
    right: "translate3d(100%, 0, 0)",
    bottom: "translate3d(0, 100%, 0)",
    left: "translate3d(-100%, 0, 0)",
  };
  return transforms[side];
}

const focusableSelector = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let activeDocumentScrollLocks = 0;
let previousDocumentOverflow: { body: string; root: string } | null = null;

function acquireDocumentScrollLock(): () => void {
  if (activeDocumentScrollLocks === 0) {
    previousDocumentOverflow = {
      body: document.body.style.overflow,
      root: document.documentElement.style.overflow,
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  activeDocumentScrollLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeDocumentScrollLocks = Math.max(0, activeDocumentScrollLocks - 1);
    if (activeDocumentScrollLocks !== 0 || !previousDocumentOverflow) return;

    document.body.style.overflow = previousDocumentOverflow.body;
    document.documentElement.style.overflow = previousDocumentOverflow.root;
    previousDocumentOverflow = null;
  };
}

function useSheetContext(componentName: string): SheetContextValue {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error(`${componentName} deve ser usado dentro de <Sheet>.`);
  }
  return context;
}

function containsSheetDescription(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return false;
    if (child.type === SheetDescription) return true;
    return containsSheetDescription(child.props.children);
  });
}

function handleSheetTabKeyDown(event: KeyboardEvent, panel: HTMLDivElement) {
  const focusable = Array.from(
    panel.querySelectorAll<HTMLElement>(focusableSelector),
  );
  if (focusable.length === 0) {
    event.preventDefault();
    panel.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const focusOutsidePanel = !panel.contains(document.activeElement);
  if (
    event.shiftKey &&
    (document.activeElement === first || focusOutsidePanel)
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || focusOutsidePanel)
  ) {
    event.preventDefault();
    first.focus();
  }
}

function handleSheetKeyDown(
  event: KeyboardEvent,
  panel: HTMLDivElement,
  onOpenChange: (open: boolean) => void,
): void {
  if (event.key === "Escape" && !event.defaultPrevented) {
    event.preventDefault();
    onOpenChange(false);
  } else if (event.key === "Tab") {
    handleSheetTabKeyDown(event, panel);
  }
}

function useSheetFocusTrap(
  open: boolean,
  panelRef: React.RefObject<HTMLDivElement | null>,
  context: SheetContextValue,
): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const releaseScrollLock = acquireDocumentScrollLock();
    const firstFocusable = panel.querySelector<HTMLElement>(focusableSelector);
    (firstFocusable ?? panel).focus();
    const onKeyDown = (event: KeyboardEvent) =>
      handleSheetKeyDown(event, panel, context.onOpenChange);

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      releaseScrollLock();
      const focusTarget = context.getFocusReturn() ?? previousFocusRef.current;
      if (focusTarget) window.requestAnimationFrame(() => focusTarget.focus());
      context.rememberFocusReturn(null);
    };
  }, [context, open, panelRef]);
}

export function Sheet({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const generatedId = useId();
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const rememberFocusReturn = useCallback((element: HTMLElement | null) => {
    focusReturnRef.current = element;
  }, []);
  const getFocusReturn = useCallback(() => focusReturnRef.current, []);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const requestOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === open) return;
      if (!isControlled) setUncontrolledOpen(nextOpen);
      onOpenChangeRef.current?.(nextOpen);
    },
    [isControlled, open],
  );
  const contextValue = useMemo(
    () => ({
      open,
      onOpenChange: requestOpenChange,
      titleId: `sheet-title-${generatedId}`,
      descriptionId: `sheet-description-${generatedId}`,
      rememberFocusReturn,
      getFocusReturn,
    }),
    [generatedId, getFocusReturn, open, requestOpenChange, rememberFocusReturn],
  );

  return (
    <SheetContext.Provider value={contextValue}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  children,
  className = "",
  onClick,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useSheetContext("SheetTrigger");

  return (
    <button
      {...props}
      type={type}
      aria-haspopup="dialog"
      aria-expanded={context.open}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center ${className}`.trim()}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          context.rememberFocusReturn(event.currentTarget);
          context.onOpenChange(true);
        }
      }}
    >
      {children}
    </button>
  );
}

export function SheetClose({
  children,
  className = "",
  onClick,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useSheetContext("SheetClose");

  return (
    <button
      {...props}
      type={type}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center ${className}`.trim()}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.onOpenChange(false);
      }}
    >
      {children}
    </button>
  );
}

export function SheetContent({
  children,
  className = "",
  side = "right",
  showCloseButton = true,
  closeOnBackdropClick = true,
  ...props
}: SheetContentProps) {
  const context = useSheetContext("SheetContent");
  const hasDescription = containsSheetDescription(children);
  const panelRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    // The portal target is only available in the browser after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalContainer(document.body);
  }, []);

  useSheetFocusTrap(context.open, panelRef, context);

  if (!portalContainer) return null;

  const state = context.open ? "open" : "closed";

  return createPortal(
    <div
      aria-hidden={!context.open}
      className="pointer-events-none fixed inset-0 z-[1400]"
      data-state={state}
    >
      <div
        aria-hidden="true"
        data-sheet-overlay
        data-state={state}
        className={`pointer-events-auto absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-200 data-[state=open]:opacity-100 motion-reduce:transition-none ${context.open ? "" : "pointer-events-none"}`}
        onClick={() => {
          if (closeOnBackdropClick) context.onOpenChange(false);
        }}
      />
      <div
        {...props}
        ref={panelRef}
        role="dialog"
        aria-modal={context.open ? "true" : undefined}
        aria-hidden={!context.open}
        aria-labelledby={context.titleId}
        aria-describedby={
          hasDescription ? context.descriptionId : props["aria-describedby"]
        }
        data-side={side}
        data-state={state}
        inert={!context.open}
        tabIndex={-1}
        style={{
          ...props.style,
          ...getPositionStyle(side, context.open),
        }}
        className={`pointer-events-auto z-10 flex flex-col gap-4 overflow-y-auto overscroll-contain border border-[var(--border)] bg-[var(--popover)] bg-clip-padding text-sm text-[var(--popover-foreground)] shadow-xl transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${sideClasses[side]} ${className} ${context.open ? "" : "pointer-events-none"}`.trim()}
      >
        {children}
        {showCloseButton ? (
          <SheetClose
            aria-label="Fechar painel"
            className="group absolute top-2 right-2 rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </SheetClose>
        ) : null}
      </div>
    </div>,
    portalContainer,
  );
}

export function SheetHeader({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`flex flex-col gap-0.5 p-4 ${className}`.trim()}
    />
  );
}

export function SheetFooter({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`mt-auto flex flex-col gap-2 p-4 ${className}`.trim()}
    />
  );
}

export function SheetTitle({
  className = "",
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  const context = useSheetContext("SheetTitle");

  return (
    <h2
      {...props}
      id={context.titleId}
      className={`font-display text-base font-semibold text-[var(--foreground)] ${className}`.trim()}
    />
  );
}

export function SheetDescription({
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  const context = useSheetContext("SheetDescription");

  return (
    <p
      {...props}
      id={context.descriptionId}
      className={`text-sm text-[var(--muted)] ${className}`.trim()}
    />
  );
}
