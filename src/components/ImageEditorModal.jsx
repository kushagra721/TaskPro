import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  XIcon,
  CheckIcon,
  RotateIcon,
  CropIcon,
  PencilIcon,
  TypeIcon,
  UndoIcon,
} from './icons.jsx';

const MAX_DISPLAY = 460;
const HANDLE_HIT = 16;
const MIN_CROP = 30;
const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ffffff', '#000000'];
const SIZES = [3, 6, 10];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * A WhatsApp-style pre-upload image editor: rotate, crop, freehand draw, and
 * add text, all baked into a single output file before the caller's normal
 * upload flow runs. Rotation is baked into an offscreen canvas first so crop/
 * draw/text math never has to reason about rotated coordinate spaces.
 *
 * `onSave(File)` receives the edited image; `onCancel()` discards edits and
 * uses the original file (or skips it, depending on the caller).
 */
export default function ImageEditorModal({ file, label, onCancel, onSave }) {
  const canvasRef = useRef(null);
  const rotatedRef = useRef(null); // offscreen canvas, rotation baked in, natural resolution
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const displayRef = useRef({ w: 0, h: 0, scale: 1 });

  const [ready, setReady] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [tool, setTool] = useState(null); // 'crop' | 'draw' | 'text'
  const [cropRect, setCropRect] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [texts, setTexts] = useState([]);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(SIZES[1]);
  const [history, setHistory] = useState([]);
  const [textEditor, setTextEditor] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load the source file into an <img> once.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Bake rotation into an offscreen canvas, size the visible canvas to fit,
  // and reset edits whenever the rotation changes (dimensions may swap).
  useEffect(() => {
    if (!ready || !imgRef.current) return;
    const img = imgRef.current;
    const swapped = rotation % 180 !== 0;
    const natW = swapped ? img.naturalHeight : img.naturalWidth;
    const natH = swapped ? img.naturalWidth : img.naturalHeight;

    const rotated = document.createElement('canvas');
    rotated.width = natW;
    rotated.height = natH;
    const rctx = rotated.getContext('2d');
    rctx.save();
    rctx.translate(natW / 2, natH / 2);
    rctx.rotate((rotation * Math.PI) / 180);
    rctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    rctx.restore();
    rotatedRef.current = rotated;

    const scale = Math.min(1, MAX_DISPLAY / Math.max(natW, natH));
    const dispW = Math.max(1, Math.round(natW * scale));
    const dispH = Math.max(1, Math.round(natH * scale));
    displayRef.current = { w: dispW, h: dispH, scale };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = dispW;
      canvas.height = dispH;
    }

    setCropRect({ x: 0, y: 0, w: dispW, h: dispH });
    setStrokes([]);
    setTexts([]);
    setHistory([]);
  }, [ready, rotation]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rotatedRef.current) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(rotatedRef.current, 0, 0, canvas.width, canvas.height);

    strokes.forEach((s) => {
      if (s.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    texts.forEach((t) => {
      ctx.font = `700 ${t.size}px Arial, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textBaseline = 'top';
      ctx.fillText(t.text, t.x, t.y);
    });

    if (tool === 'crop' && cropRect) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, cropRect.y);
      ctx.fillRect(0, cropRect.y + cropRect.h, canvas.width, canvas.height - cropRect.y - cropRect.h);
      ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h);
      ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, canvas.width - cropRect.x - cropRect.w, cropRect.h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropRect.x + 1, cropRect.y + 1, cropRect.w - 2, cropRect.h - 2);
      ctx.fillStyle = '#ffffff';
      [
        [cropRect.x, cropRect.y],
        [cropRect.x + cropRect.w, cropRect.y],
        [cropRect.x, cropRect.y + cropRect.h],
        [cropRect.x + cropRect.w, cropRect.y + cropRect.h],
      ].forEach(([hx, hy]) => {
        ctx.beginPath();
        ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }, [strokes, texts, tool, cropRect]);

  useEffect(() => {
    render();
  }, [render]);

  const pushHistory = () => {
    setHistory((h) => [...h, { rotation, cropRect, strokes, texts }].slice(-20));
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      if (prev.rotation !== rotation) {
        setRotation(prev.rotation); // triggers the rotation effect, which resets edits
        return h.slice(0, -1);
      }
      setCropRect(prev.cropRect);
      setStrokes(prev.strokes);
      setTexts(prev.texts);
      return h.slice(0, -1);
    });
  };

  const rotate = () => {
    pushHistory();
    setRotation((r) => (r + 90) % 360);
  };

  const selectTool = (t) => setTool((cur) => (cur === t ? null : t));

  const pointFromEvent = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - rect.left) * canvas.width) / rect.width, 0, canvas.width),
      y: clamp(((e.clientY - rect.top) * canvas.height) / rect.height, 0, canvas.height),
    };
  };

  const hitHandle = (pt) => {
    if (!cropRect) return null;
    const corners = {
      nw: { x: cropRect.x, y: cropRect.y },
      ne: { x: cropRect.x + cropRect.w, y: cropRect.y },
      sw: { x: cropRect.x, y: cropRect.y + cropRect.h },
      se: { x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h },
    };
    for (const [k, c] of Object.entries(corners)) {
      if (Math.hypot(pt.x - c.x, pt.y - c.y) <= HANDLE_HIT) return k;
    }
    if (pt.x >= cropRect.x && pt.x <= cropRect.x + cropRect.w && pt.y >= cropRect.y && pt.y <= cropRect.y + cropRect.h) {
      return 'move';
    }
    return null;
  };

  const openTextInput = (pt) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    setTextEditor({
      canvasPt: pt,
      screenX: rect.left + pt.x * scaleX,
      screenY: rect.top + pt.y * scaleY,
      value: '',
    });
  };

  const onPointerDown = (e) => {
    if (!cropRect) return;
    canvasRef.current.setPointerCapture(e.pointerId);
    const pt = pointFromEvent(e);
    if (tool === 'crop') {
      const handle = hitHandle(pt);
      if (!handle) return;
      pushHistory();
      dragRef.current = { mode: handle, start: pt, rect: { ...cropRect } };
    } else if (tool === 'draw') {
      pushHistory();
      setStrokes((s) => [...s, { color, size: brushSize, points: [pt] }]);
      dragRef.current = { mode: 'draw' };
    } else if (tool === 'text') {
      const idx = texts.findIndex(
        (t) =>
          pt.x >= t.x - 4 &&
          pt.x <= t.x + t.size * t.text.length * 0.62 + 4 &&
          pt.y >= t.y - 4 &&
          pt.y <= t.y + t.size * 1.3
      );
      if (idx >= 0) {
        pushHistory();
        dragRef.current = { mode: 'move-text', idx, offset: { x: pt.x - texts[idx].x, y: pt.y - texts[idx].y } };
      } else {
        openTextInput(pt);
      }
    }
  };

  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    const pt = pointFromEvent(e);
    const d = dragRef.current;

    if (d.mode === 'draw') {
      setStrokes((s) => {
        const next = s.slice();
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, points: [...last.points, pt] };
        return next;
      });
    } else if (d.mode === 'move') {
      const dx = pt.x - d.start.x;
      const dy = pt.y - d.start.y;
      setCropRect({
        x: clamp(d.rect.x + dx, 0, canvas.width - d.rect.w),
        y: clamp(d.rect.y + dy, 0, canvas.height - d.rect.h),
        w: d.rect.w,
        h: d.rect.h,
      });
    } else if (d.mode === 'move-text') {
      setTexts((t) => {
        const next = t.slice();
        next[d.idx] = { ...next[d.idx], x: pt.x - d.offset.x, y: pt.y - d.offset.y };
        return next;
      });
    } else {
      // Corner resize (mode is one of nw/ne/sw/se).
      const r = d.rect;
      let { x, y, w, h } = r;
      if (d.mode.includes('n')) {
        const ny = clamp(pt.y, 0, r.y + r.h - MIN_CROP);
        h = r.h + (r.y - ny);
        y = ny;
      }
      if (d.mode.includes('s')) {
        h = clamp(pt.y - r.y, MIN_CROP, canvas.height - r.y);
      }
      if (d.mode.includes('w')) {
        const nx = clamp(pt.x, 0, r.x + r.w - MIN_CROP);
        w = r.w + (r.x - nx);
        x = nx;
      }
      if (d.mode.includes('e')) {
        w = clamp(pt.x - r.x, MIN_CROP, canvas.width - r.x);
      }
      setCropRect({ x, y, w, h });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const commitText = () => {
    const value = textEditor?.value.trim();
    if (value) {
      pushHistory();
      setTexts((t) => [...t, { x: textEditor.canvasPt.x, y: textEditor.canvasPt.y, text: value, color, size: brushSize * 6 }]);
    }
    setTextEditor(null);
  };

  const handleSave = async () => {
    if (!rotatedRef.current || !cropRect) return;
    setSaving(true);
    try {
      const invScale = 1 / displayRef.current.scale;
      const outW = Math.max(1, Math.round(cropRect.w * invScale));
      const outH = Math.max(1, Math.round(cropRect.h * invScale));
      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const octx = out.getContext('2d');
      octx.drawImage(
        rotatedRef.current,
        cropRect.x * invScale,
        cropRect.y * invScale,
        cropRect.w * invScale,
        cropRect.h * invScale,
        0,
        0,
        outW,
        outH
      );

      strokes.forEach((s) => {
        if (s.points.length < 2) return;
        octx.beginPath();
        octx.strokeStyle = s.color;
        octx.lineWidth = s.size * invScale;
        octx.lineCap = 'round';
        octx.lineJoin = 'round';
        const first = s.points[0];
        octx.moveTo((first.x - cropRect.x) * invScale, (first.y - cropRect.y) * invScale);
        s.points.slice(1).forEach((p) => octx.lineTo((p.x - cropRect.x) * invScale, (p.y - cropRect.y) * invScale));
        octx.stroke();
      });

      texts.forEach((t) => {
        octx.font = `700 ${t.size * invScale}px Arial, sans-serif`;
        octx.fillStyle = t.color;
        octx.textBaseline = 'top';
        octx.fillText(t.text, (t.x - cropRect.x) * invScale, (t.y - cropRect.y) * invScale);
      });

      const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.9));
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
      onSave(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="image-editor-overlay">
      <div className="image-editor">
        <div className="image-editor__head">
          <button type="button" className="icon-btn image-editor__icon-btn" onClick={onCancel} aria-label="Cancel">
            <XIcon size={20} />
          </button>
          <span className="image-editor__title">{label || 'Edit photo'}</span>
          <button
            type="button"
            className="icon-btn icon-btn--primary image-editor__icon-btn"
            onClick={handleSave}
            disabled={!ready || saving}
            aria-label="Done"
          >
            {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <CheckIcon size={20} />}
          </button>
        </div>

        <div className="image-editor__canvas-wrap">
          {!ready ? (
            <span className="spinner" />
          ) : (
            <canvas
              ref={canvasRef}
              className="image-editor__canvas"
              style={{ touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          )}
          {textEditor && (
            <input
              autoFocus
              className="image-editor__text-input"
              style={{ left: textEditor.screenX, top: textEditor.screenY, color, fontSize: brushSize * 6 }}
              value={textEditor.value}
              onChange={(e) => setTextEditor((t) => ({ ...t, value: e.target.value }))}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitText();
                if (e.key === 'Escape') setTextEditor(null);
              }}
            />
          )}
        </div>

        {(tool === 'draw' || tool === 'text') && (
          <div className="image-editor__subrow">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`image-editor__swatch ${color === c ? 'image-editor__swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
            <span className="image-editor__sep" />
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={`image-editor__size ${brushSize === s ? 'image-editor__size--active' : ''}`}
                onClick={() => setBrushSize(s)}
                aria-label={`Size ${s}`}
              >
                <span style={{ width: s + 4, height: s + 4 }} />
              </button>
            ))}
          </div>
        )}

        <div className="image-editor__toolbar">
          <button type="button" className="image-editor__tool" onClick={rotate} disabled={!ready}>
            <RotateIcon size={20} />
            <span>Rotate</span>
          </button>
          <button
            type="button"
            className={`image-editor__tool ${tool === 'crop' ? 'image-editor__tool--active' : ''}`}
            onClick={() => selectTool('crop')}
            disabled={!ready}
          >
            <CropIcon size={20} />
            <span>Crop</span>
          </button>
          <button
            type="button"
            className={`image-editor__tool ${tool === 'draw' ? 'image-editor__tool--active' : ''}`}
            onClick={() => selectTool('draw')}
            disabled={!ready}
          >
            <PencilIcon size={20} />
            <span>Draw</span>
          </button>
          <button
            type="button"
            className={`image-editor__tool ${tool === 'text' ? 'image-editor__tool--active' : ''}`}
            onClick={() => selectTool('text')}
            disabled={!ready}
          >
            <TypeIcon size={20} />
            <span>Text</span>
          </button>
          <button type="button" className="image-editor__tool" onClick={undo} disabled={!ready || history.length === 0}>
            <UndoIcon size={20} />
            <span>Undo</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
