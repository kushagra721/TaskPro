import { useRef, useState } from 'react';
import { uploadsApi } from '../api/client.js';
import { PaperclipIcon, VideoIcon, XIcon } from './icons.jsx';
import DocIcon from './DocIcon.jsx';
import ImageEditorModal from './ImageEditorModal.jsx';
import { prettySize } from '../utils/fileSize.js';

const LIMITS = { image: 3, video: 10, document: 10 }; // MB, matches the backend

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState(null); // { images, index, others, edited }

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

  const trigger =
    variant === 'icon' ? (
      <button
        type="button"
        className="icon-btn composer__attach-btn"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Attach files"
        title="Attach files"
      >
        {busy ? <span className="spinner" /> : <PaperclipIcon size={20} />}
      </button>
    ) : (
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? <span className="spinner" /> : (<><PaperclipIcon size={14} /> Attach files</>)}
      </button>
    );

  return (
    <div className={variant === 'icon' ? 'attach-picker attach-picker--icon' : 'attach-picker'}>
      {error && <div className="alert alert--error">{error}</div>}

      {trigger}
      {variant !== 'icon' && (
        <p className="field__hint">Images up to {LIMITS.image}MB · Videos &amp; docs up to {LIMITS.video}MB each</p>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
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
        <ImageEditorModal
          file={queue.images[queue.index]}
          label={queue.images.length > 1 ? `Edit photo ${queue.index + 1} of ${queue.images.length}` : 'Edit photo'}
          onCancel={() => advanceQueue(null)}
          onSave={advanceQueue}
        />
      )}
    </div>
  );
}
