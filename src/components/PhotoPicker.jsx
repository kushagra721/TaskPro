import { useRef, useState } from 'react';
import { uploadsApi } from '../api/client.js';
import { CameraIcon } from './icons.jsx';

const LIMIT_MB = 3; // matches the shared /uploads image limit

/**
 * Wraps an avatar/badge with a small camera button that uploads a single
 * image (via the common /uploads endpoint, which also logs it to storage)
 * and reports the resulting URL back through `onUploaded`.
 */
export default function PhotoPicker({ children, onUploaded, disabled }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    if (file.size > LIMIT_MB * 1024 * 1024) {
      setError(`Image must be under ${LIMIT_MB}MB`);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await uploadsApi.upload([file]);
      onUploaded(res.files[0].url);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="photo-picker">
      <div className="photo-picker__frame">
        {children}
        <button
          type="button"
          className="photo-picker__edit"
          onClick={() => inputRef.current?.click()}
          disabled={busy || disabled}
          aria-label="Change photo"
          title="Change photo"
        >
          {busy ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : <CameraIcon size={13} />}
        </button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
      </div>
      {error && <div className="field__error">{error}</div>}
    </div>
  );
}
