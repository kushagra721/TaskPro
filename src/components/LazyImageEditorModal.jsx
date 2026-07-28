import { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';

/**
 * Code-split wrapper for `ImageEditorModal`. The editor pulls in fabric.js
 * (~300KB), which nothing else in the app needs and which most sessions never
 * open — so it loads on first use instead of riding in the main bundle.
 *
 * Import this, never `ImageEditorModal` directly; the props are identical.
 */
const ImageEditorModal = lazy(() => import('./ImageEditorModal.jsx'));

/** Full-screen placeholder while the editor chunk downloads — portaled and
 *  styled like the editor itself so the transition isn't a blank flash. */
const Loading = () =>
  createPortal(
    <div className="image-editor-overlay">
      <div className="image-editor" style={{ display: 'grid', placeItems: 'center' }}>
        <span className="spinner" />
      </div>
    </div>,
    document.body
  );

export default function LazyImageEditorModal(props) {
  return (
    <Suspense fallback={<Loading />}>
      <ImageEditorModal {...props} />
    </Suspense>
  );
}
