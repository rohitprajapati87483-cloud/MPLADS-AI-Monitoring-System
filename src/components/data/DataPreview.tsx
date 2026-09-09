import { useState, useMemo, useDeferredValue } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ParsedDataset } from '@/types/dataset';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface DataPreviewProps {
  dataset: ParsedDataset;
}

export function DataPreview({ dataset }: DataPreviewProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const deferredSearch = useDeferredValue(search);

  // ──────────────────────────────────────────────────────────────────────────
  // Create:
  //
  // Original column → canonical field
  //
  // Example:
  // "Work" → "project_name"
  // "State" → "state"
  // "Amount Disbursed ( ₹ )" → "amount_disbursed"
  // ──────────────────────────────────────────────────────────────────────────

  const mappingMap = useMemo(() => {
    return Object.fromEntries(
      dataset.columnMappings.map((mapping) => [
        mapping.originalColumn,
        mapping.canonicalField,
      ]),
    );
  }, [dataset.columnMappings]);

  // ──────────────────────────────────────────────────────────────────────────
  // Search
  // ──────────────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!deferredSearch.trim()) {
      return dataset.rows;
    }

    const q = deferredSearch.toLowerCase();

    return dataset.rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [dataset.rows, deferredSearch]);

  const totalPages = Math.ceil(
    filtered.length / PAGE_SIZE,
  );

  const pageRows = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Data-type badge colours
  // ──────────────────────────────────────────────────────────────────────────

  const typeColor = (type: string) => {
    const map: Record<string, string> = {
      text: 'bg-blue-50 text-blue-600',
      numeric: 'bg-green-50 text-green-700',
      date: 'bg-purple-50 text-purple-700',
      boolean: 'bg-amber-50 text-amber-700',
      mixed: 'bg-orange-50 text-orange-700',
      empty: 'bg-red-50 text-red-600',
    };

    return (
      map[type] ??
      'bg-slate-100 text-slate-500'
    );
  };

  const profileMap = Object.fromEntries(
    dataset.columnProfiles.map((profile) => [
      profile.name,
      profile,
    ]),
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Get value from normalized row
  // ──────────────────────────────────────────────────────────────────────────

  const getDisplayValue = (
    row: Record<string, unknown>,
    originalColumn: string,
  ) => {
    const canonicalField =
      mappingMap[originalColumn];

    // If column was mapped:
    //
    // Original:
    // "Work"
    //
    // Canonical:
    // "project_name"
    //
    // Read:
    // row["project_name"]
    if (canonicalField) {
      return row[canonicalField];
    }

    // For unmapped columns, try original column name.
    //
    // Example:
    // IDA → currently unmapped
    return row[originalColumn];
  };

  return (
    <div className="space-y-3">

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Search + pagination controls */}
      {/* ──────────────────────────────────────────────────────────────── */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />

          <input
            type="search"
            placeholder="Search rows..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="h-8 w-56 rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
        </div>

        <span className="text-xs text-slate-500">
          Showing {pageRows.length} of{' '}
          {filtered.length.toLocaleString()} rows
          {search &&
            ` matching "${search}"`}
        </span>

      </div>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Table */}
      {/* ──────────────────────────────────────────────────────────────── */}

      <div
        className="overflow-auto rounded-lg border border-slate-200"
        style={{ maxHeight: '420px' }}
      >

        <table className="w-full min-w-max border-collapse text-xs">

          {/* Header */}
          <thead className="sticky top-0 z-10">

            <tr className="bg-slate-800 text-white">

              <th className="px-3 py-2 text-left font-semibold w-12 text-slate-300">
                #
              </th>

              {dataset.columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                >

                  <div className="flex items-center gap-1.5">

                    <span>{col}</span>

                    {profileMap[col] && (
                      <span
                        className={cn(
                          'rounded px-1 py-0.5 text-[9px] font-bold uppercase',
                          typeColor(
                            profileMap[col]
                              .detectedType,
                          ),
                        )}
                      >
                        {
                          profileMap[col]
                            .detectedType
                        }
                      </span>
                    )}

                  </div>

                </th>
              ))}

            </tr>

          </thead>

          {/* Body */}
          <tbody>

            {pageRows.length === 0 ? (

              <tr>

                <td
                  colSpan={
                    dataset.columns.length + 1
                  }
                  className="px-3 py-8 text-center text-slate-400 italic"
                >
                  No rows match your search.
                </td>

              </tr>

            ) : (

              pageRows.map((row, rowIdx) => {

                const globalIdx =
                  page * PAGE_SIZE + rowIdx;

                return (

                  <tr
                    key={rowIdx}
                    className={cn(
                      'border-b border-slate-100 transition-colors',
                      rowIdx % 2 === 0
                        ? 'bg-white'
                        : 'bg-slate-50',
                      'hover:bg-blue-50',
                    )}
                  >

                    {/* Row number */}
                    <td className="px-3 py-2 text-slate-400 font-mono text-[10px]">
                      {globalIdx + 1}
                    </td>

                    {/* Columns */}
                    {dataset.columns.map(
                      (col) => {

                        const val =
                          getDisplayValue(
                            row,
                            col,
                          );

                        const isEmpty =
                          val === null ||
                          val === undefined ||
                          String(val).trim() === '';

                        return (

                          <td
                            key={col}
                            className={cn(
                              'px-3 py-2 whitespace-nowrap max-w-[180px] truncate',
                              isEmpty
                                ? 'text-slate-300 italic'
                                : 'text-slate-700',
                            )}
                            title={
                              isEmpty
                                ? 'Missing'
                                : String(val)
                            }
                          >
                            {isEmpty
                              ? 'null'
                              : String(val)}
                          </td>

                        );
                      },
                    )}

                  </tr>

                );
              })

            )}

          </tbody>

        </table>

      </div>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Pagination */}
      {/* ──────────────────────────────────────────────────────────────── */}

      {totalPages > 1 && (

        <div className="flex items-center justify-between">

          <button
            onClick={() =>
              setPage((p) =>
                Math.max(0, p - 1),
              )
            }
            disabled={page === 0}
            className="flex items-center gap-1 text-xs text-slate-600 disabled:opacity-40 hover:text-slate-900"
          >
            <ChevronLeft size={14} />
            Previous
          </button>

          <span className="text-xs text-slate-500">
            Page {page + 1} of{' '}
            {totalPages}
          </span>

          <button
            onClick={() =>
              setPage((p) =>
                Math.min(
                  totalPages - 1,
                  p + 1,
                ),
              )
            }
            disabled={
              page >= totalPages - 1
            }
            className="flex items-center gap-1 text-xs text-slate-600 disabled:opacity-40 hover:text-slate-900"
          >
            Next
            <ChevronRight size={14} />
          </button>

        </div>

      )}

    </div>
  );
}