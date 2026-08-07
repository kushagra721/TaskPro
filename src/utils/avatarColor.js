/**
 * The one palette for identity badges, and the hash that picks from it.
 *
 * Extracted from `Avatar` so `OrgBadge` can tint group/workspace initials from
 * the SAME set: two palettes would mean the same name could be teal as a person
 * and pink as a channel, which reads as a bug rather than as decoration.
 *
 * The hash is deliberately a plain deterministic string hash — the colour has
 * to be stable across reloads, devices and users, so it can't come from an
 * index in a list (which changes as rows are added) or from anything random.
 */
export const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#14b8a6',
];

export const colorFor = (key = '') => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
