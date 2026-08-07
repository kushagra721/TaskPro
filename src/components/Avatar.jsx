import { colorFor } from '../utils/avatarColor.js';

const initials = (name = '', email = '') => {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

/** `viewable`: when true and a photo is set, clicking it opens the full image
 *  in a new tab instead of (or in addition to) whatever the surrounding row
 *  does — used on profile pages / member lists so people can actually see
 *  someone's photo. Stops the click from bubbling to a clickable parent row. */
export default function Avatar({ name, email, size = 36, src, viewable = false }) {
  if (src) {
    const img = (
      <img
        className="avatar avatar--img"
        style={{ width: size, height: size }}
        src={src}
        alt={name || email || 'Avatar'}
        title={name || email}
      />
    );
    if (viewable) {
      return (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={`View ${name || email || 'photo'}`}
        >
          {img}
        </a>
      );
    }
    return img;
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
