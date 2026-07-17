export const TASK_STATUSES = ['OPEN', 'COMPLETED', 'CANCELLED'];

export const STATUS_META = {
  OPEN: { label: 'Open', color: '#6366f1' },
  COMPLETED: { label: 'Completed', color: '#10b981' },
  CANCELLED: { label: 'Cancelled', color: '#f43f5e' },
};

export const statusLabel = (s) => STATUS_META[s]?.label || s;

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
