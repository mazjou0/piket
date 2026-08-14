import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/* ── DataTable ── */
export function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'Tidak ada data',
  className,
  tableStyle,
}) {
  if (loading) {
    return (
      <div className={cn('table-container', className)}>
        <table className="table" style={tableStyle}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={col.headerClass} style={col.headerStyle}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, ri) => (
              <tr key={ri}>
                {columns.map((_, ci) => (
                  <td key={ci}>
                    <div className="h-4 bg-surface-hover rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={cn('table-container', className)}>
      <table className="table" style={tableStyle}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={col.headerClass} style={col.headerStyle}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!data || data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-14 text-center text-muted text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, ri) => (
              <tr key={row.id || ri}>
                {columns.map((col, ci) => (
                  <td key={ci} className={col.cellClass}>
                    {col.cell ? col.cell(row, ri) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Pagination ── */
export function Pagination({ page, totalPages, total, limit, onPageChange }) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  // Window of page buttons
  const maxBtns = 5;
  let startPage = Math.max(1, page - Math.floor(maxBtns / 2));
  let endPage   = Math.min(totalPages, startPage + maxBtns - 1);
  if (endPage - startPage + 1 < maxBtns) {
    startPage = Math.max(1, endPage - maxBtns + 1);
  }

  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <p className="text-sm text-muted">
        Menampilkan{' '}
        <span className="text-foreground font-medium">{from}–{to}</span>{' '}
        dari <span className="text-foreground font-medium">{total}</span> data
      </p>

      <div className="flex items-center gap-1">
        <PageBtn onClick={() => onPageChange(1)}         disabled={page === 1}         title="Halaman pertama">
          <ChevronsLeft className="w-3.5 h-3.5" />
        </PageBtn>
        <PageBtn onClick={() => onPageChange(page - 1)}  disabled={page === 1}         title="Sebelumnya">
          <ChevronLeft className="w-3.5 h-3.5" />
        </PageBtn>

        {startPage > 1 && (
          <>
            <PageBtn onClick={() => onPageChange(1)}>1</PageBtn>
            {startPage > 2 && <span className="px-1 text-muted">…</span>}
          </>
        )}

        {pages.map(p => (
          <PageBtn key={p} onClick={() => onPageChange(p)} active={p === page}>
            {p}
          </PageBtn>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-muted">…</span>}
            <PageBtn onClick={() => onPageChange(totalPages)}>{totalPages}</PageBtn>
          </>
        )}

        <PageBtn onClick={() => onPageChange(page + 1)}  disabled={page >= totalPages} title="Berikutnya">
          <ChevronRight className="w-3.5 h-3.5" />
        </PageBtn>
        <PageBtn onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} title="Halaman terakhir">
          <ChevronsRight className="w-3.5 h-3.5" />
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({ children, onClick, disabled, active, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-white shadow-sm'
          : 'text-muted hover:bg-surface-hover hover:text-foreground',
        disabled && 'opacity-30 cursor-not-allowed pointer-events-none'
      )}
    >
      {children}
    </button>
  );
}
