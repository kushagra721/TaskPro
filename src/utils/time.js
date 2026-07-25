export const timeAgo = (date) => {
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d ago`;
  return d.toLocaleDateString();
};

const startOfDay = (dt) => {
  const c = new Date(dt);
  c.setHours(0, 0, 0, 0);
  return c;
};

/**
 * Calendar-day relative label: Today, Yesterday, "N days ago" up to 10 days;
 * beyond that, an absolute date (e.g. "16 Jul 2026").
 */
export const relativeDay = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  const diffDays = Math.round((startOfDay(Date.now()) - startOfDay(d)) / 86400000);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 10) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/** WhatsApp-style chat list timestamp: a clock time today, "Yesterday",
 *  a weekday name within the last week, else a short date. */
export const chatTimestamp = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const diffDays = Math.round((startOfDay(Date.now()) - startOfDay(d)) / 86400000);
  if (diffDays <= 0) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
