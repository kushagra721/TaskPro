export const TASK_STATUSES = ['OPEN', 'COMPLETED', 'CANCELLED'];

export const STATUS_META = {
  OPEN: { label: 'Open', color: '#6366f1' },
  COMPLETED: { label: 'Completed', color: '#10b981' },
  CANCELLED: { label: 'Cancelled', color: '#f43f5e' },
};

export const statusLabel = (s) => STATUS_META[s]?.label || s;

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// "21 Jul 2026, 02:30 PM"
export const formatDateTime = (d) =>
  d
    ? `${formatDate(d)}, ${new Date(d).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}`
    : '—';
