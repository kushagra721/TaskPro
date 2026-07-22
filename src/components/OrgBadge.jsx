/** Org badge: an uploaded photo takes priority over the emoji `icon`, which
 *  in turn falls back to the name's first letter. `size` mirrors `.org-badge`'s
 *  modifier classes ('', 'sm', 'lg'). */
export default function OrgBadge({ name, icon, photoUrl, size = '' }) {
  const cls = `org-badge ${size}`.trim();
  if (photoUrl) {
    return <img className={`${cls} org-badge--img`} src={photoUrl} alt={name || 'Organization'} />;
  }
  return <span className={cls}>{icon || (name || '?')[0].toUpperCase()}</span>;
}
