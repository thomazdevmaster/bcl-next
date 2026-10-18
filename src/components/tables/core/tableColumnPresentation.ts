export type TableColumnAlignment = "left" | "center" | "right";
export type TableColumnVerticalAlignment = "top" | "middle" | "bottom";
export type TableColumnTextTransform = "none" | "uppercase" | "lowercase";

export interface TableColumnPresentation {
  alignment: TableColumnAlignment;
  verticalAlignment: TableColumnVerticalAlignment;
  textTransform: TableColumnTextTransform;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  textColor: string | null;
  cellColor: string | null;
}

export const DEFAULT_COLUMN_PRESENTATION: TableColumnPresentation = {
  alignment: "left",
  verticalAlignment: "middle",
  textTransform: "none",
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  textColor: null,
  cellColor: null,
};

export function getColumnPresentationClasses(presentation: TableColumnPresentation): string {
  const alignmentClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[presentation.alignment];
  const verticalAlignmentClass = {
    top: "align-top",
    middle: "align-middle",
    bottom: "align-bottom",
  }[presentation.verticalAlignment];
  const transformClass = {
    none: "normal-case",
    uppercase: "uppercase",
    lowercase: "lowercase",
  }[presentation.textTransform];
  const decorationClass = presentation.underline && presentation.strikethrough
    ? "[text-decoration-line:underline_line-through]"
    : presentation.underline
      ? "underline"
      : presentation.strikethrough
        ? "line-through"
        : "";

  return [
    alignmentClass,
    verticalAlignmentClass,
    transformClass,
    presentation.bold ? "font-bold" : "",
    presentation.italic ? "italic" : "",
    decorationClass,
  ].filter(Boolean).join(" ");
}
