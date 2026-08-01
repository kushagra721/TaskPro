/** Shared display formatters for the Kamdhenu ERP pages. */

const DATE_FMT = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/** ISO string/Date → "31 Jul 2026" (em-dash for empty values). */
export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return DATE_FMT.format(d);
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
