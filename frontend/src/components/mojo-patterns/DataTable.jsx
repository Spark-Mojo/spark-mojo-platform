/* eslint-disable react/prop-types */
import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS = {
  Urgent: 'var(--sm-priority-urgent)',
  High: 'var(--sm-priority-high)',
  Medium: 'var(--sm-priority-medium)',
  Low: 'var(--sm-priority-low)',
};

export default function DataTable({
  columns = [],
  data = [],
  onRowClick,
  priorityField,
  emptyState,
  loading,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (col) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const sortedData = [...data];
  if (sortKey) {
    const col = columns.find((c) => c.key === sortKey);
    if (col) {
      sortedData.sort((a, b) => {
        const aVal = typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor || col.key];
        const bVal = typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor || col.key];
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <div className="py-12 text-center">{emptyState}</div>;
  }

  return (
    <div className="rounded-lg border border-[var(--sm-glass-border)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {priorityField && <TableHead className="w-1 p-0" />}
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  'text-[11px] uppercase font-bold text-gray-500 tracking-wide',
                  col.sortable && 'cursor-pointer select-none hover:text-[var(--sm-primary)]'
                )}
                style={{
                  fontFamily: 'var(--sm-font-ui)',
                  width: col.width,
                }}
                onClick={() => handleSort(col)}
              >
                {col.header}
                {col.sortable && sortKey === col.key && (
                  <span className="ml-1 text-[var(--sm-primary)]">
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </TableHead>
            ))}
            {onRowClick && <TableHead className="w-16" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, rowIdx) => {
            const priority = priorityField ? row[priorityField] : null;
            const isUnassigned = !row.assignedUser && !row.assignedRole;
            return (
              <TableRow
                key={row.id || rowIdx}
                className={cn(
                  'h-[52px] transition-colors cursor-pointer hover:bg-[var(--sm-glass-teal)]',
                  isUnassigned && 'animate-[pulse-unassigned-bg_2s_ease-in-out_infinite]'
                )}
                onClick={() => onRowClick?.(row)}
                style={
                  isUnassigned
                    ? { borderLeft: '8px solid var(--sm-danger)' }
                    : undefined
                }
              >
                {priorityField && (
                  <TableCell className="w-1 p-0">
                    <span
                      className="block w-1 h-full"
                      style={{
                        backgroundColor: PRIORITY_COLORS[priority] || 'transparent',
                      }}
                    />
                  </TableCell>
                )}
                {columns.map((col) => {
                  const val =
                    typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : row[col.accessor || col.key];
                  return (
                    <TableCell key={col.key} className="text-sm text-[var(--sm-slate)]">
                      {col.render ? col.render(val, row) : val}
                    </TableCell>
                  );
                })}
                {onRowClick && (
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[var(--sm-primary)] border-[var(--sm-primary)]"
                    >
                      View
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
