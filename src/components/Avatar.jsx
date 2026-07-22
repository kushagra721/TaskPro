const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#14b8a6',
];

const initials = (name = '', email = '') => {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

const colorFor = (key = '') => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};

export default function Avatar({ name, email, size = 36, src }) {
  if (src) {
    return (
      <img
        className="avatar avatar--img"
        style={{ width: size, height: size }}
        src={src}
        alt={name || email || 'Avatar'}
        title={name || email}
      />
    );
  }
  const bg = colorFor(email || name || '');
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}
      title={name || email}
    >
      {initials(name, email)}
    </span>
  );
}
