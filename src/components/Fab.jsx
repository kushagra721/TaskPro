import { createPortal } from 'react-dom';
import { PlusIcon } from './icons.jsx';

/**
 * Floating action button, bottom-right. Portaled to document.body so a
 * transformed ancestor (e.g. `.page`'s rise animation) can't capture the
 * fixed positioning and pin it mid-page. `raised` lifts it above the mobile
 * bottom-nav (use on root pages that keep the nav); sub-pages omit it.
 */
export default function Fab({ onClick, label = 'Add', raised = false }) {
  return createPortal(
    <button
      className={`fab ${raised ? 'fab--raised' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <PlusIcon size={24} />
    </button>,
    document.body
  );
}
