import { createColumnHelper } from '@tanstack/react-table';
import type { CrudColumn } from '@/domains/crudConfig';
import { getValue } from '@/domains/crudConfig';
import type { CrudResource } from '@/core/auth/permissions';
import { tableFeatures } from '@/components/tables/core/table-features';
import type { TableColumnDef } from '@/components/tables/core/table-features';

type TableRecord = Record<string, unknown>;
type CellFormatter = (row: TableRecord, column: CrudColumn) => string;

const columnHelper = createColumnHelper<typeof tableFeatures, TableRecord>();

/** Adapta as colunas CRUD para a tabela compartilhada sem acoplar a tabela aos domínios. */
export function createDomainTableColumns(
  columns: CrudColumn[],
  formatCell: CellFormatter,
  resource: CrudResource,
): TableColumnDef<TableRecord>[] {
  return columns.map((column) => {
    const filterVariant = getFilterVariant(column, resource);
    const definition = columnHelper.accessor(
      (row) => getColumnValue(row, column, formatCell),
      {
        id: column.path,
        header: column.label,
        meta: { filterVariant },
        cell: ({ row }) => formatCell(row.original, column),
      },
    );
    if (column.format === 'count') {
      definition.aggregationFn = 'sum';
      definition.aggregatedCell = ({ getValue }) => Number(getValue()).toLocaleString('pt-BR');
    }
    return definition;
  });
}

function getFilterVariant(column: CrudColumn, resource: CrudResource): 'text' | 'range' | 'date' | 'datetime' | 'select' {
  if (resource === 'songs' && (column.path === 'genre' || column.path === 'key')) return 'select';
  if (column.format === 'date') return 'date';
  if (column.format === 'datetime') return 'datetime';
  if (column.format === 'count' || column.format === 'currency') {
    return 'range';
  }
  if (column.format === 'boolean' || column.format === 'roles' || column.format === 'status') {
    return 'select';
  }
  return 'text';
}

function getColumnValue(row: TableRecord, column: CrudColumn, formatCell: CellFormatter): unknown {
  const value = getValue(row, column.path);
  if (column.format === 'count') return Array.isArray(value) ? value.length : 0;
  if (column.format === 'currency') return typeof value === 'number' ? value : undefined;
  if (column.format === 'date' || column.format === 'datetime') {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date.getTime();
  }
  if (column.format) return formatCell(row, column);
  return value == null ? '' : String(value);
}
