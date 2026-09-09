/** Shared presentation formatters for the MPLADS dashboard. */
export function formatCrore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '₹ --';
  return `₹${(value / 10_000_000).toFixed(2)} Cr`;
}

/** Backward-compatible alias: all dashboard currency is displayed in crore. */
export function formatCurrency(value: number | null | undefined): string {
  return formatCrore(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-- %';
  return `${value.toFixed(1)} %`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function safeString(value: string | null | undefined, fallback = '--'): string {
  return value ?? fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
