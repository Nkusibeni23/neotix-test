"use client";

import {
  createColumnHelper,
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type OnChangeFn,
  type RowData,
  type RowSelectionState,
} from "@tanstack/react-table";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Filtering and paging happen on the server, so the only client-side feature is selection
// (used when an operator picks episodes to assign).
const features = tableFeatures({ rowSelectionFeature });
type Features = typeof features;

export type DataTableColumn<TData extends RowData> = ColumnDef<Features, TData>;

/** Typed column helper for DataTable: `const col = columnHelper<Episode>()`. */
export const columnHelper = <TData extends RowData>() => createColumnHelper<Features, TData>();

// Stable empty array so a loading table does not get new data on every render.
const EMPTY: never[] = [];

interface DataTableProps<TData extends RowData> {
  columns: DataTableColumn<TData>[];
  data: TData[] | undefined;
  isLoading?: boolean;
  emptyMessage?: string;
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  // Pass both to enable row selection.
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  canSelectRow?: (row: TData) => boolean;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  isLoading,
  emptyMessage = "Nothing here yet.",
  getRowId,
  onRowClick,
  rowSelection,
  onRowSelectionChange,
  canSelectRow,
}: DataTableProps<TData>) {
  const selectable = Boolean(rowSelection && onRowSelectionChange);
  const table = useTable({
    features,
    columns,
    data: data ?? EMPTY,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: selectable ? { rowSelection } : undefined,
    onRowSelectionChange,
    enableRowSelection: selectable
      ? canSelectRow
        ? (row) => canSelectRow(row.original)
        : true
      : false,
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="min-w-0 rounded-xl border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }, (_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
