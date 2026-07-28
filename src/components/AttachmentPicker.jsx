import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { uploadsApi } from '../api/client.js';
import { PaperclipIcon, VideoIcon, XIcon, CameraIcon, FileIcon, FolderIcon } from './icons.jsx';
import DocIcon from './DocIcon.jsx';
import LazyImageEditorModal from './LazyImageEditorModal.jsx';
import { prettySize } from '../utils/fileSize.js';

const LIMITS = { image: 3, video: 20, document: 20 }; // MB, matches the backend

const DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar';
const ALL_ACCEPT = `image/*,video/*,${DOC_ACCEPT}`;

// WhatsApp-style attach menu — **mobile only**. Its whole point is `capture`,
// which opens the device camera/camcorder; on desktop there is no camera step
// and every row would just open the same file dialog, so the trigger skips the
// menu entirely there and opens the picker (all types) directly.
const ATTACH_MENU = [
  {
    key: 'image',
    label: 'Image',
    Icon: CameraIcon,
    choices: [
      { label: 'Take photo', accept: 'image/*', capture: 'environment', Icon: CameraIcon },
      { label: 'Choose from gallery', accept: 'image/*', Icon: FolderIcon },
    ],
  },
  {
    key: 'video',
    label: 'Video',
    Icon: VideoIcon,
    choices: [
      { label: 'Record video', accept: 'video/*', capture: 'environment', Icon: VideoIcon },
      { label: 'Choose from gallery', accept: 'video/*', Icon: FolderIcon },
    ],
  },
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
  const [menu, setMenu] = useState(null); // null | 'root' | 'image' | 'video'
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => {
      if (!wrapRef.current?.contains(e.target)) setMenu(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menu]);

  // One shared hidden input serves every entry point, so its accept/capture are
  // set imperatively right before `.click()`. Deliberately NOT React props: a
  // state round-trip would push the click into a later tick, and a file dialog
  // needs to open inside the user gesture that asked for it.
  const openFileDialog = (accept, capture) => {
    const el = inputRef.current;
    if (!el) return;
    el.accept = accept || '';
    if (capture) el.setAttribute('capture', capture);
    else el.removeAttribute('capture');
    setMenu(null);
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
    setMenu((m) => (m ? null : 'root'));
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

  const submenu = menu && menu !== 'root' ? ATTACH_MENU.find((o) => o.key === menu) : null;

  return (
    <div ref={wrapRef} className={variant === 'icon' ? 'attach-picker attach-picker--icon' : 'attach-picker'}>
      {error && <div className="alert alert--error">{error}</div>}

      {trigger}
      {variant !== 'icon' && (
        <p className="field__hint">Images up to {LIMITS.image}MB · Videos &amp; docs up to {LIMITS.video}MB each</p>
      )}

      {menu && (
        <div className="attach-menu">
          {submenu ? (
            <>
              <button type="button" className="attach-menu__back" onClick={() => setMenu('root')}>
                ← {submenu.label}
              </button>
              {submenu.choices.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  className="attach-menu__item"
                  onClick={() => openFileDialog(c.accept, c.capture)}
                >
                  <c.Icon size={17} /> {c.label}
                </button>
              ))}
            </>
          ) : (
            ATTACH_MENU.map((o) => (
              <button
                key={o.key}
                type="button"
                className="attach-menu__item"
                onClick={() => (o.choices ? setMenu(o.key) : openFileDialog(o.accept))}
              >
                <o.Icon size={17} /> {o.label}
              </button>
            ))
          )}
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
