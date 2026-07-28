import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { uploadsApi } from '../api/client.js';
import { PaperclipIcon, VideoIcon, XIcon, CameraIcon, FileIcon } from './icons.jsx';
import DocIcon from './DocIcon.jsx';
import LazyImageEditorModal from './LazyImageEditorModal.jsx';
import { prettySize } from '../utils/fileSize.js';

const LIMITS = { image: 3, video: 20, document: 20 }; // MB, matches the backend

const DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar';
const ALL_ACCEPT = `image/*,video/*,${DOC_ACCEPT}`;

// WhatsApp-style attach menu — **mobile only** (see `onTriggerClick`). Each row
// is a single tap that opens the file input with just `accept` set — no
// `capture` attribute. Deliberately: `accept="image/*"`/`"video/*"` alone
// already makes iOS/Android show their own native action sheet offering
// "Take Photo/Video" alongside "Photo Library"/"Browse", which is exactly the
// image/choose-from-gallery split this menu used to implement by hand as a
// second-tap submenu. That submenu (tap Image → tap Take Photo/Choose from
// Gallery) was found to silently do nothing on iOS Safari for both its rows —
// only the always-single-tap Document row worked. Rather than chase the exact
// WebKit cause, flattening to one tap per row removes the extra state
// transition between the gesture and `input.click()` entirely, and matches
// the reference design (WhatsApp's own menu has no such submenu either).
const ATTACH_MENU = [
  { key: 'image', label: 'Image', Icon: CameraIcon, accept: 'image/*' },
  { key: 'video', label: 'Video', Icon: VideoIcon, accept: 'video/*' },
  { key: 'document', label: 'Document', Icon: FileIcon, accept: DOC_ACCEPT },
];

const kindOf = (mimeType = '') => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
};

/**
 * Multi-file picker for images/videos/docs. Uploads immediately on selection
 * (via the common /uploads endpoint) and reports the accumulated attachment
 * list up through `onChange` — callers just send that array with the task.
 * Any selected images are routed through `ImageEditorModal` first, one at a
 * time (crop/rotate/draw/text) — videos/docs upload as-is.
 */
export default function AttachmentPicker({ value = [], onChange, variant = 'default' }) {
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState(null); // { images, index, others, edited }
  const [menu, setMenu] = useState(false); // whether the mobile attach menu is open
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => {
      if (!wrapRef.current?.contains(e.target)) setMenu(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menu]);

  // One shared hidden input serves every entry point, so its `accept` is set
  // imperatively right before `.click()`. Deliberately NOT a React prop: a
  // state round-trip would push the click into a later tick, and a file dialog
  // needs to open inside the user gesture that asked for it.
  const openFileDialog = (accept) => {
    const el = inputRef.current;
    if (!el) return;
    el.accept = accept || '';
    setMenu(false);
    el.click();
  };

  const finalizeUpload = async (files) => {
    if (!files.length) return;
    setBusy(true);
    try {
      const res = await uploadsApi.upload(files);
      onChange([...value, ...res.files]);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const advanceQueue = (edited) => {
    if (!queue) return;
    const nextEdited = edited ? [...queue.edited, edited] : queue.edited;
    const nextIndex = queue.index + 1;
    if (nextIndex >= queue.images.length) {
      setQueue(null);
      finalizeUpload([...nextEdited, ...queue.others]);
    } else {
      setQueue({ ...queue, index: nextIndex, edited: nextEdited });
    }
  };

  const pick = (e) => {
    const files = [...e.target.files];
    e.target.value = ''; // allow picking the same file again later
    if (!files.length) return;

    const oversized = files.find((f) => f.size > LIMITS[kindOf(f.type)] * 1024 * 1024);
    if (oversized) {
      setError(`"${oversized.name}" exceeds the ${LIMITS[kindOf(oversized.type)]}MB limit for ${kindOf(oversized.type)}s`);
      return;
    }

    setError('');
    const images = files.filter((f) => kindOf(f.type) === 'image');
    const others = files.filter((f) => kindOf(f.type) !== 'image');
    if (images.length === 0) {
      finalizeUpload(others);
      return;
    }
    setQueue({ images, index: 0, others, edited: [] });
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  // Desktop has no camera step, so the menu would be three rows that all do the
  // same thing — go straight to the file dialog instead.
  const onTriggerClick = () => {
    if (!isMobile) {
      openFileDialog(ALL_ACCEPT);
      return;
    }
    setMenu((m) => !m);
  };

  const trigger =
    variant === 'icon' ? (
      <button
        type="button"
        className="icon-btn composer__attach-btn"
        onClick={onTriggerClick}
        disabled={busy}
        aria-label="Attach files"
        title="Attach files"
      >
        {busy ? <span className="spinner" /> : <PaperclipIcon size={20} />}
      </button>
    ) : (
      <button type="button" className="btn btn--ghost btn--sm" onClick={onTriggerClick} disabled={busy}>
        {busy ? <span className="spinner" /> : (<><PaperclipIcon size={14} /> Attach files</>)}
      </button>
    );

  return (
    <div ref={wrapRef} className={variant === 'icon' ? 'attach-picker attach-picker--icon' : 'attach-picker'}>
      {error && <div className="alert alert--error">{error}</div>}

      {trigger}
      {variant !== 'icon' && (
        <p className="field__hint">Images up to {LIMITS.image}MB · Videos &amp; docs up to {LIMITS.video}MB each</p>
      )}

      {menu && (
        <div className="attach-menu">
          {ATTACH_MENU.map((o) => (
            <button
              key={o.key}
              type="button"
              className="attach-menu__item"
              onClick={() => openFileDialog(o.accept)}
            >
              <o.Icon size={17} /> {o.label}
            </button>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={pick}
      />

      {value.length > 0 && (
        <ul className="attach-list">
          {value.map((a, i) => (
            <li key={`${a.url}-${i}`} className="attach-item">
              {a.kind === 'image' ? (
                <img className="attach-item__thumb" src={a.url} alt={a.fileName} />
              ) : (
                <span className="attach-item__icon">
                  {a.kind === 'video' ? <VideoIcon size={16} /> : <DocIcon fileName={a.fileName} mimeType={a.mimeType} />}
                </span>
              )}
              <div className="attach-item__info">
                <span className="attach-item__name">{a.fileName}</span>
                <span className="attach-item__size">{prettySize(a.size)}</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => remove(i)} aria-label="Remove attachment">
                <XIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {queue && (
        <LazyImageEditorModal
          file={queue.images[queue.index]}
          label={queue.images.length > 1 ? `Edit photo ${queue.index + 1} of ${queue.images.length}` : 'Edit photo'}
          onCancel={() => advanceQueue(null)}
          onSave={advanceQueue}
        />
      )}
    </div>
  );
}
