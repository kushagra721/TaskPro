/** Shared display formatters for the Kamdhenu ERP pages. */

// en-GB gives "01 Aug 26" style parts ("Aug" not "Aug." / "aug"); joined with
// hyphens below for the required dd-MMM-yy display (e.g. "01-Aug-26").
const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

/** ISO string/Date → "01-Aug-26" (dd-MMM-yy; em-dash for empty values). */
export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const parts = { day: '', month: '', year: '' };
  DATE_FMT.formatToParts(d).forEach((p) => {
    if (p.type in parts) parts[p.type] = p.value;
  });
  return `${parts.day}-${parts.month}-${parts.year}`;
};

const MONEY_FMT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

/** number → "₹1,23,456.78" with Indian digit grouping. */
export const fmtMoney = (n) => MONEY_FMT.format(Number(n) || 0);

const QTY_FMT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });

/** number → quantity string with Indian grouping, up to 3 decimals. */
export const fmtQty = (n) => QTY_FMT.format(Number(n) || 0);
