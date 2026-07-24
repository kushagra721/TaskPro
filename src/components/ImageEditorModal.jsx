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
  StickerIcon,
  SearchIcon,
} from './icons.jsx';

const HANDLE_HIT = 20;
const MIN_CROP = 30;
const MAX_UPSCALE = 2.5; // don't blow up a tiny source image beyond this
const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ffffff', '#000000'];
const SIZES = [3, 6, 10];
const STICKERS = [
  { emoji: '😀', tags: ['smile', 'happy', 'grin'] },
  { emoji: '😂', tags: ['laugh', 'lol', 'funny', 'joy'] },
  { emoji: '😍', tags: ['love', 'heart eyes', 'crush'] },
  { emoji: '😎', tags: ['cool', 'sunglasses', 'swag'] },
  { emoji: '😢', tags: ['sad', 'cry', 'tear'] },
  { emoji: '😡', tags: ['angry', 'mad', 'rage'] },
  { emoji: '😮', tags: ['wow', 'surprised', 'shock'] },
  { emoji: '🥳', tags: ['party', 'celebrate', 'birthday'] },
  { emoji: '❤️', tags: ['love', 'heart', 'red'] },
  { emoji: '🔥', tags: ['fire', 'lit', 'hot', 'flame'] },
  { emoji: '⭐', tags: ['star', 'favorite', 'rating'] },
  { emoji: '✅', tags: ['check', 'done', 'tick', 'complete'] },
  { emoji: '👍', tags: ['thumbs up', 'like', 'good', 'approve'] },
  { emoji: '👎', tags: ['thumbs down', 'dislike', 'bad'] },
  { emoji: '👏', tags: ['clap', 'applause', 'congrats'] },
  { emoji: '🙌', tags: ['praise', 'yay', 'hands up'] },
  { emoji: '🙏', tags: ['thanks', 'please', 'pray'] },
  { emoji: '💯', tags: ['100', 'perfect', 'score'] },
  { emoji: '🎉', tags: ['party', 'celebrate', 'confetti'] },
  { emoji: '🎊', tags: ['party', 'confetti', 'celebrate'] },
  { emoji: '💡', tags: ['idea', 'bulb', 'light'] },
  { emoji: '⚡', tags: ['bolt', 'lightning', 'fast', 'energy'] },
  { emoji: '🚀', tags: ['rocket', 'launch', 'fast'] },
  { emoji: '💰', tags: ['money', 'cash', 'rich'] },
  { emoji: '📌', tags: ['pin', 'important', 'note'] },
  { emoji: '🎯', tags: ['target', 'goal', 'aim'] },
  { emoji: '🕒', tags: ['clock', 'time', 'deadline'] },
  { emoji: '⚠️', tags: ['warning', 'alert', 'caution'] },
  { emoji: '❌', tags: ['cross', 'no', 'wrong', 'cancel'] },
  { emoji: '❓', tags: ['question', 'confused', 'doubt'] },
];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * A WhatsApp-style pre-upload image editor: rotate, crop, freehand draw, add
 * text, and add stickers. Cropping is its own mini flow (its own Apply/Cancel,
 * separate from the top-right Done): tapping Apply bakes the crop (plus any
 * strokes/text/stickers added so far) into a new working image immediately,
 * then returns to the main toolbar so Draw/Text/Stickers can keep going and
 * a *later* crop or Done isn't fighting over one deferred rectangle — this
 * is what previously made "crop, then also add a sticker" feel broken.
 *
 * The visible canvas is sized to fill the available viewport (measured live,
 * recalculated on resize) rather than a fixed cap, so cropping/drawing
 * precision doesn't collapse on mobile.
 *
 * `onSave(File)` receives the edited image; `onCancel()` discards edits.
 */
export default function ImageEditorModal({ file, label, onCancel, onSave }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const workingRef = useRef(null); // current baseline canvas (rotation-baked, then re-baked on each crop Apply)
  const dragRef = useRef(null);
  const cropEntryRef = useRef(null); // cropRect snapshot taken when entering the crop tool, for Cancel
  const displayRef = useRef({ w: 0, h: 0, scale: 1 });

  const [ready, setReady] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [tool, setTool] = useState(null); // 'crop' | 'draw' | 'text' | 'sticker'
  const [cropRect, setCropRect] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [texts, setTexts] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(SIZES[1]);
  const [history, setHistory] = useState([]);
  const [textEditor, setTextEditor] = useState(null);
  const [stickerQuery, setStickerQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [availableSize, setAvailableSize] = useState({ w: 0, h: 0 });

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

  // Track how much space the canvas actually has to work with, live.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => setAvailableSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitCanvasTo = (natW, natH) => {
    const fitScale = Math.min(availableSize.w / natW, availableSize.h / natH);
    const scale = Math.min(fitScale, MAX_UPSCALE);
    const dispW = Math.max(1, Math.round(natW * scale));
    const dispH = Math.max(1, Math.round(natH * scale));
    displayRef.current = { w: dispW, h: dispH, scale };
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = dispW;
      canvas.height = dispH;
    }
    return { dispW, dispH };
  };

  // Bake rotation into the working canvas at natural resolution, size the
  // visible canvas to fill the available area, and reset edits whenever the
  // rotation changes (dimensions may swap and any prior crop is superseded).
  useEffect(() => {
    if (!ready || !imgRef.current || !availableSize.w || !availableSize.h) return;
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
    workingRef.current = rotated;

    const { dispW, dispH } = fitCanvasTo(natW, natH);

    setCropRect({ x: 0, y: 0, w: dispW, h: dispH });
    setStrokes([]);
    setTexts([]);
    setStickers([]);
    setHistory([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, rotation, availableSize]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !workingRef.current) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(workingRef.current, 0, 0, canvas.width, canvas.height);

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

    stickers.forEach((s) => {
      ctx.font = `${s.size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(s.emoji, s.x, s.y);
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
        ctx.arc(hx, hy, 8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }, [strokes, texts, stickers, tool, cropRect]);

  useEffect(() => {
    render();
  }, [render]);

  const pushHistory = () => {
    setHistory((h) => [...h, { cropRect, strokes, texts, stickers }].slice(-20));
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCropRect(prev.cropRect);
      setStrokes(prev.strokes);
      setTexts(prev.texts);
      setStickers(prev.stickers || []);
      return h.slice(0, -1);
    });
  };

  const rotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const selectTool = (t) => {
    setTool((cur) => {
      if (cur === t) return null;
      if (t === 'crop') cropEntryRef.current = cropRect;
      return t;
    });
  };

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

  const hitSticker = (pt) =>
    stickers.findIndex(
      (s) => pt.x >= s.x - 4 && pt.x <= s.x + s.size + 4 && pt.y >= s.y - 4 && pt.y <= s.y + s.size + 4
    );

  const onPointerDown = (e) => {
    if (!cropRect || textEditor) return;
    canvasRef.current.setPointerCapture(e.pointerId);
    const pt = pointFromEvent(e);
    if (tool === 'crop') {
      const handle = hitHandle(pt);
      if (!handle) return;
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
    } else if (tool === 'sticker') {
      const idx = hitSticker(pt);
      if (idx >= 0) {
        pushHistory();
        dragRef.current = { mode: 'move-sticker', idx, offset: { x: pt.x - stickers[idx].x, y: pt.y - stickers[idx].y } };
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
    } else if (d.mode === 'move-sticker') {
      setStickers((s) => {
        const next = s.slice();
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

  const addSticker = (emoji) => {
    if (!cropRect) return;
    pushHistory();
    const size = brushSize * 10 + 20;
    setStickers((s) => [
      ...s,
      { emoji, size, x: cropRect.x + cropRect.w / 2 - size / 2, y: cropRect.y + cropRect.h / 2 - size / 2 },
    ]);
  };

  // Draws the current working canvas + strokes/texts/stickers, cropped to
  // `cropRect`, into a fresh canvas at natural resolution. Shared by "Apply
  // crop" (bakes into a new working image, editing continues) and "Done"
  // (bakes into the final upload, also covering a crop the user never
  // explicitly applied).
  const flatten = () => {
    const invScale = 1 / displayRef.current.scale;
    const outW = Math.max(1, Math.round(cropRect.w * invScale));
    const outH = Math.max(1, Math.round(cropRect.h * invScale));
    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const octx = out.getContext('2d');
    octx.drawImage(
      workingRef.current,
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

    stickers.forEach((s) => {
      octx.font = `${s.size * invScale}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      octx.textBaseline = 'top';
      octx.fillText(s.emoji, (s.x - cropRect.x) * invScale, (s.y - cropRect.y) * invScale);
    });

    return { canvas: out, outW, outH };
  };

  const applyCrop = () => {
    const { canvas: out, outW, outH } = flatten();
    workingRef.current = out;
    fitCanvasTo(outW, outH);
    setStrokes([]);
    setTexts([]);
    setStickers([]);
    setHistory([]);
    setCropRect({ x: 0, y: 0, w: displayRef.current.w, h: displayRef.current.h });
    setTool(null);
  };

  const cancelCrop = () => {
    setCropRect(cropEntryRef.current || cropRect);
    setTool(null);
  };

  const handleSave = async () => {
    if (!workingRef.current || !cropRect) return;
    setSaving(true);
    try {
      const { canvas: out } = flatten();
      const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.92));
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
      onSave(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
    } finally {
      setSaving(false);
    }
  };

  const filteredStickers = stickerQuery.trim()
    ? STICKERS.filter((s) => s.tags.some((tag) => tag.includes(stickerQuery.trim().toLowerCase())))
    : STICKERS;

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
            disabled={!ready || saving || tool === 'crop'}
            aria-label="Done"
          >
            {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <CheckIcon size={20} />}
          </button>
        </div>

        <div className="image-editor__canvas-wrap" ref={wrapRef}>
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
            <div className="image-editor__text-editor" style={{ left: textEditor.screenX, top: textEditor.screenY }}>
              <input
                autoFocus
                className="image-editor__text-input"
                style={{ color, fontSize: brushSize * 6 }}
                value={textEditor.value}
                onChange={(e) => setTextEditor((t) => ({ ...t, value: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitText();
                  if (e.key === 'Escape') setTextEditor(null);
                }}
              />
              <button type="button" className="image-editor__text-confirm" onClick={commitText} aria-label="Add text">
                <CheckIcon size={14} />
              </button>
              <button type="button" className="image-editor__text-cancel" onClick={() => setTextEditor(null)} aria-label="Discard text">
                <XIcon size={14} />
              </button>
            </div>
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

        {tool === 'sticker' && (
          <div className="image-editor__sticker-panel">
            <div className="image-editor__sticker-search">
              <SearchIcon size={15} />
              <input
                className="image-editor__sticker-search-input"
                placeholder="Search stickers…"
                value={stickerQuery}
                onChange={(e) => setStickerQuery(e.target.value)}
              />
            </div>
            <div className="image-editor__subrow image-editor__subrow--stickers">
              {filteredStickers.length === 0 ? (
                <span className="image-editor__sticker-empty">No stickers found</span>
              ) : (
                filteredStickers.map(({ emoji }) => (
                  <button key={emoji} type="button" className="image-editor__sticker-pick" onClick={() => addSticker(emoji)}>
                    {emoji}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {tool === 'crop' ? (
          <div className="image-editor__toolbar">
            <button type="button" className="image-editor__tool image-editor__tool--cancel" onClick={cancelCrop}>
              <XIcon size={20} />
              <span>Cancel</span>
            </button>
            <span className="image-editor__crop-hint">Drag the corners to crop</span>
            <button type="button" className="image-editor__tool image-editor__tool--apply" onClick={applyCrop}>
              <CheckIcon size={20} />
              <span>Apply</span>
            </button>
          </div>
        ) : (
          <div className="image-editor__toolbar">
            <button type="button" className="image-editor__tool" onClick={rotate} disabled={!ready}>
              <RotateIcon size={20} />
              <span>Rotate</span>
            </button>
            <button type="button" className="image-editor__tool" onClick={() => selectTool('crop')} disabled={!ready}>
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
            <button
              type="button"
              className={`image-editor__tool ${tool === 'sticker' ? 'image-editor__tool--active' : ''}`}
              onClick={() => selectTool('sticker')}
              disabled={!ready}
            >
              <StickerIcon size={20} />
              <span>Stickers</span>
            </button>
            <button type="button" className="image-editor__tool" onClick={undo} disabled={!ready || history.length === 0}>
              <UndoIcon size={20} />
              <span>Undo</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
