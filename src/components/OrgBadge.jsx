import { colorFor } from '../utils/avatarColor.js';

/**
 * Org / channel badge: an uploaded photo takes priority over the emoji `icon`,
 * which in turn falls back to the name's first letter. `size` mirrors
 * `.org-badge`'s modifier classes ('', 'sm', 'lg').
 *
 * **The letter fallback is tinted from the name**, using the same palette and
 * hash as `Avatar`. `.org-badge`'s CSS gradient is a single brand indigo, so
 * every channel in the Chats list rendered as the same violet circle and the
 * avatar column carried no information at all — the only thing distinguishing
 * one row from the next was the text beside it. A name-derived colour makes the
 * column scannable, and being a hash rather than a list index it stays stable
 * as channels are added, and matches across devices and users.
 *
 * An explicit **emoji `icon` keeps the brand gradient**: that is an identity
 * somebody deliberately chose, so it does not need a generated one, and
 * recolouring behind it would fight the emoji's own colours.
 */
export default function OrgBadge({ name, icon, photoUrl, size = '' }) {
  const cls = `org-badge ${size}`.trim();
  if (photoUrl) {
    return <img className={`${cls} org-badge--img`} src={photoUrl} alt={name || 'Workspace'} />;
  }
  if (icon) {
    return <span className={cls}>{icon}</span>;
  }
  return (
    // `background` (not `background-color`) so it REPLACES the stylesheet's
    // gradient rather than sitting behind it, where it would never be seen.
    <span className={cls} style={{ background: colorFor(name || '') }}>
      {(name || '?')[0].toUpperCase()}
    </span>
  );
}
