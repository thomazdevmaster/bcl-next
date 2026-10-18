export interface FlexibleColumnSize {
  id: string;
  size: number;
  maxSize: number;
  canResize: boolean;
  manuallySized: boolean;
}

export function getExpandedColumnSizes(
  columns: FlexibleColumnSize[],
  availableWidth: number,
): Record<string, number> {
  const sizes = Object.fromEntries(columns.map((column) => [column.id, column.size]));
  let remainingWidth = Math.max(0, availableWidth - columns.reduce((total, column) => total + column.size, 0));
  let flexibleColumns = columns.filter(
    (column) => column.canResize && !column.manuallySized && column.size < column.maxSize,
  );

  while (remainingWidth > 0.5 && flexibleColumns.length > 0) {
    const widthPerColumn = remainingWidth / flexibleColumns.length;
    let distributedWidth = 0;

    for (const column of flexibleColumns) {
      const currentSize = sizes[column.id];
      const increase = Math.min(widthPerColumn, column.maxSize - currentSize);
      sizes[column.id] = currentSize + increase;
      distributedWidth += increase;
    }

    if (distributedWidth === 0) break;
    remainingWidth -= distributedWidth;
    flexibleColumns = flexibleColumns.filter((column) => sizes[column.id] < column.maxSize);
  }

  return sizes;
}
