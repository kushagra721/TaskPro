import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, FabricImage, IText, PencilBrush, Rect, util } from 'fabric';
import { stickersApi } from '../api/client.js';
import {
  XIcon,
  CheckIcon,
  RotateIcon,
  CropIcon,
  PencilIcon,
  TypeIcon,
  UndoIcon,
  TrashIcon,
  StickerIcon,
  SearchIcon,
  SmileIcon,
} from './icons.jsx';

const MAX_UPSCALE = 2.5; // don't blow up a tiny source image beyond this
const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ffffff', '#000000'];
const SIZES = [3, 6, 10];
const HISTORY_LIMIT = 15;

// Offline fallback set — always available, and the only set on offer when no
// GIPHY key is configured server-side (see sticker.service.js).
const EMOJI_STICKERS = [
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
  { emoji: '➡️', tags: ['arrow', 'right', 'next', 'point'] },
  { emoji: '⬅️', tags: ['arrow', 'left', 'back', 'point'] },
  { emoji: '⬆️', tags: ['arrow', 'up', 'top'] },
  { emoji: '⬇️', tags: ['arrow', 'down', 'below'] },
];

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

/**
 * WhatsApp-style pre-upload image editor, built on **fabric.js**.
 *
 * The engine choice is the point: everything added to the photo (drawings,
 * text, stickers) is a real fabric object, so selecting, dragging, scaling,
 * rotating and deleting it all come from the library. The previous version
 * hand-rolled these on a raw 2D context and had no selection handles at all,
 * which is what made editing feel broken.
 *
 * Model: a single "baseline" raster (`base`, at natural resolution) is the
 * canvas background; annotations float above it as live objects. The two
 * destructive tools — Rotate and Crop — flatten everything into a new baseline
 * and clear the object layer, so later edits never have to reason about an
 * un-applied transform. Undo snapshots {baseline, objects} before each change.
 *
 * `onSave(File)` receives the edited image; `onCancel()` discards edits.
 */
export default function ImageEditorModal({ file, label, onCancel, onSave }) {
  const wrapRef = useRef(null);
  const canvasElRef = useRef(null);
  const fcRef = useRef(null); // fabric.Canvas
  const cropRectRef = useRef(null);
  const baseRef = useRef(null); // mirrors `base` for use inside callbacks
  const dispRef = useRef({ w: 0, h: 0 }); // last applied display size, for resize rescaling

  const [base, setBase] = useState(null); // { url, w, h } — natural-resolution baseline
  const [availableSize, setAvailableSize] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState(null); // null | 'crop' | 'draw' | 'text' | 'sticker'
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(SIZES[1]);
  const [history, setHistory] = useState([]);
  const [hasSelection, setHasSelection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sticker panel
  const [stickerTab, setStickerTab] = useState('emoji'); // 'emoji' | 'online'
  const [stickerQuery, setStickerQuery] = useState('');
  const [onlineStickers, setOnlineStickers] = useState([]);
  const [stickersLoading, setStickersLoading] = useState(false);
  const [stickersConfigured, setStickersConfigured] = useState(true);

  baseRef.current = base;

  // ---- Load the source file as a data URL (not a blob URL: a data URL keeps
  // the canvas same-origin, so exporting can never hit a tainted-canvas error).
  useEffect(() => {
    let cancelled = false;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const img = await loadImage(reader.result);
        if (!cancelled) setBase({ url: reader.result, w: img.naturalWidth, h: img.naturalHeight });
      } catch {
        if (!cancelled) setError('That image could not be opened.');
      }
    };
    reader.onerror = () => !cancelled && setError('That image could not be read.');
    reader.readAsDataURL(file);
    return () => {
      cancelled = true;
    };
  }, [file]);

  // ---- Track the space the canvas actually has, live.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => setAvailableSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Create the fabric canvas once.
  useEffect(() => {
    const fc = new Canvas(canvasElRef.current, {
      preserveObjectStacking: true,
      // Fabric renders selection handles itself; these just match the app's look.
      selectionColor: 'rgba(99,102,241,0.2)',
      selectionBorderColor: '#6366f1',
    });
    fcRef.current = fc;

    const sync = () => setHasSelection(!!fc.getActiveObject());
    fc.on('selection:created', sync);
    fc.on('selection:updated', sync);
    fc.on('selection:cleared', sync);

    return () => {
      fc.dispose();
      fcRef.current = null;
    };
  }, []);

  // ---- Fit the canvas to the baseline + available space. Also rescales any
  // live objects when the *viewport* changes (orientation flip, keyboard) so
  // annotations keep their position relative to the photo.
  useEffect(() => {
    const fc = fcRef.current;
    if (!fc || !base || !availableSize.w || !availableSize.h) return;
    let cancelled = false;

    (async () => {
      const scale = Math.min(availableSize.w / base.w, availableSize.h / base.h, MAX_UPSCALE);
      const dispW = Math.max(1, Math.round(base.w * scale));
      const dispH = Math.max(1, Math.round(base.h * scale));

      const prev = dispRef.current;
      const ratio = prev.w ? dispW / prev.w : 1;

      const img = await FabricImage.fromURL(base.url);
      if (cancelled || !fcRef.current) return;

      fc.setDimensions({ width: dispW, height: dispH });
      img.set({
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0,
        scaleX: dispW / base.w,
        scaleY: dispH / base.h,
        selectable: false,
        evented: false,
      });
      fc.backgroundImage = img;

      if (ratio !== 1) {
        fc.getObjects().forEach((o) => {
          o.set({
            left: o.left * ratio,
            top: o.top * ratio,
            scaleX: o.scaleX * ratio,
            scaleY: o.scaleY * ratio,
          });
          o.setCoords();
        });
      }

      dispRef.current = { w: dispW, h: dispH };
      fc.requestRenderAll();
    })();

    return () => {
      cancelled = true;
    };
  }, [base, availableSize]);

  // ---- Drawing mode follows the selected tool.
  useEffect(() => {
    const fc = fcRef.current;
    if (!fc) return;
    fc.isDrawingMode = tool === 'draw';
    if (fc.isDrawingMode) {
      if (!(fc.freeDrawingBrush instanceof PencilBrush)) fc.freeDrawingBrush = new PencilBrush(fc);
      fc.freeDrawingBrush.color = color;
      fc.freeDrawingBrush.width = brushSize;
    }
  }, [tool, color, brushSize]);

  // ---- Online sticker search (debounced). Runs only while the panel's
  // "Stickers" tab is open, so the editor never calls the API unprompted.
  useEffect(() => {
    if (tool !== 'sticker' || stickerTab !== 'online') return undefined;
    let cancelled = false;
    setStickersLoading(true);
    const t = setTimeout(() => {
      stickersApi
        .search(stickerQuery.trim())
        .then((res) => {
          if (cancelled) return;
          setStickersConfigured(res.configured);
          setOnlineStickers(res.stickers || []);
        })
        .catch(() => !cancelled && setOnlineStickers([]))
        .finally(() => !cancelled && setStickersLoading(false));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tool, stickerTab, stickerQuery]);

  const pushHistory = useCallback(() => {
    const fc = fcRef.current;
    if (!fc) return;
    setHistory((h) =>
      [...h, { base: baseRef.current, objects: fc.toObject().objects || [] }].slice(-HISTORY_LIMIT)
    );
  }, []);

  // Snapshot *before* a freehand stroke lands, so undo removes the whole stroke.
  useEffect(() => {
    const fc = fcRef.current;
    if (!fc) return undefined;
    const before = () => pushHistory();
    fc.on('before:path:created', before);
    return () => fc.off('before:path:created', before);
  }, [pushHistory]);

  /** Exports the canvas back at the baseline's natural resolution. `region`
   *  (left/top/width/height, in display coords) crops the export. */
  const exportDataUrl = (region, format = 'png') => {
    const fc = fcRef.current;
    const multiplier = base.w / fc.getWidth();
    return fc.toDataURL({ format, quality: 0.92, multiplier, ...(region || {}) });
  };

  const clearObjects = () => {
    const fc = fcRef.current;
    fc.discardActiveObject();
    fc.remove(...fc.getObjects());
  };

  const undo = async () => {
    const fc = fcRef.current;
    if (!fc || history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    clearObjects();
    if (prev.base !== baseRef.current) {
      dispRef.current = { w: 0, h: 0 }; // dimensions change with the baseline; don't rescale objects
      setBase(prev.base);
    }
    const objects = await util.enlivenObjects(prev.objects);
    objects.forEach((o) => fc.add(o));
    fc.requestRenderAll();
  };

  const deleteSelected = () => {
    const fc = fcRef.current;
    const active = fc.getActiveObjects();
    if (!active.length) return;
    pushHistory();
    fc.discardActiveObject();
    fc.remove(...active);
    fc.requestRenderAll();
  };

  const rotate = async () => {
    const fc = fcRef.current;
    if (!fc || !base) return;
    pushHistory();
    const url = exportDataUrl();
    const img = await loadImage(url);
    const out = document.createElement('canvas');
    out.width = img.height;
    out.height = img.width;
    const ctx = out.getContext('2d');
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    clearObjects();
    dispRef.current = { w: 0, h: 0 };
    setBase({ url: out.toDataURL('image/png'), w: out.width, h: out.height });
  };

  // ---- Crop is its own mini-mode with Apply/Cancel, so the user can crop,
  // apply, and keep editing (add a sticker, draw) rather than having one
  // deferred rectangle fight with everything else.
  const enterCrop = () => {
    const fc = fcRef.current;
    if (!fc) return;
    fc.isDrawingMode = false;
    fc.discardActiveObject();
    const inset = Math.round(Math.min(fc.getWidth(), fc.getHeight()) * 0.08);
    const rect = new Rect({
      left: inset,
      top: inset,
      width: fc.getWidth() - inset * 2,
      height: fc.getHeight() - inset * 2,
      fill: 'rgba(0,0,0,0.12)',
      stroke: '#ffffff',
      strokeWidth: 2,
      strokeDashArray: [6, 4],
      strokeUniform: true,
      cornerColor: '#ffffff',
      cornerStrokeColor: '#6366f1',
      cornerSize: 14,
      transparentCorners: false,
      borderColor: '#ffffff',
      lockRotation: true,
      hasRotatingPoint: false,
      excludeFromExport: true,
    });
    rect.setControlsVisibility({ mtr: false });
    // Other annotations stay visible but aren't grabbable while cropping.
    fc.getObjects().forEach((o) => o.set({ selectable: false, evented: false }));
    cropRectRef.current = rect;
    fc.add(rect);
    fc.setActiveObject(rect);
    fc.requestRenderAll();
    setTool('crop');
  };

  const exitCrop = () => {
    const fc = fcRef.current;
    if (cropRectRef.current) {
      fc.remove(cropRectRef.current);
      cropRectRef.current = null;
    }
    fc.getObjects().forEach((o) => o.set({ selectable: true, evented: true }));
    fc.discardActiveObject();
    fc.requestRenderAll();
    setTool(null);
  };

  const applyCrop = async () => {
    const fc = fcRef.current;
    const rect = cropRectRef.current;
    if (!fc || !rect) return;
    pushHistory();

    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const width = Math.min(rect.getScaledWidth(), fc.getWidth() - left);
    const height = Math.min(rect.getScaledHeight(), fc.getHeight() - top);
    const multiplier = base.w / fc.getWidth();

    fc.remove(rect);
    cropRectRef.current = null;
    fc.discardActiveObject();

    const url = fc.toDataURL({ format: 'png', multiplier, left, top, width, height });
    clearObjects();
    dispRef.current = { w: 0, h: 0 };
    setBase({
      url,
      w: Math.max(1, Math.round(width * multiplier)),
      h: Math.max(1, Math.round(height * multiplier)),
    });
    setTool(null);
  };

  const selectTool = (t) => {
    if (tool === 'crop' && t !== 'crop') exitCrop();
    if (t === 'crop') {
      if (tool === 'crop') exitCrop();
      else enterCrop();
      return;
    }
    setTool((cur) => (cur === t ? null : t));
  };

  const addText = () => {
    const fc = fcRef.current;
    if (!fc) return;
    pushHistory();
    const text = new IText('Your text', {
      left: fc.getWidth() / 2,
      top: fc.getHeight() / 2,
      originX: 'center',
      originY: 'center',
      fill: color,
      fontSize: Math.max(18, Math.round(fc.getWidth() * 0.08)),
      fontWeight: '700',
      fontFamily: 'Arial, sans-serif',
      // A dark halo keeps light text readable over a bright photo.
      stroke: 'rgba(0,0,0,0.35)',
      strokeWidth: 1,
      paintFirst: 'stroke',
    });
    fc.add(text);
    fc.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    fc.requestRenderAll();
    setTool('text');
  };

  const addEmojiSticker = (emoji) => {
    const fc = fcRef.current;
    if (!fc) return;
    pushHistory();
    const sticker = new IText(emoji, {
      left: fc.getWidth() / 2,
      top: fc.getHeight() / 2,
      originX: 'center',
      originY: 'center',
      fontSize: Math.max(40, Math.round(fc.getWidth() * 0.22)),
      fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
      editable: false,
    });
    fc.add(sticker);
    fc.setActiveObject(sticker);
    fc.requestRenderAll();
  };

  const addImageSticker = async (path) => {
    const fc = fcRef.current;
    if (!fc) return;
    try {
      // Goes through our own proxy and lands as a data URL, so the canvas
      // stays same-origin — a cross-origin sticker would taint it and make
      // every later export throw a SecurityError (i.e. silently unsaveable).
      const dataUrl = await stickersApi.imageDataUrl(path);
      const img = await FabricImage.fromURL(dataUrl);
      pushHistory();
      const target = fc.getWidth() * 0.4;
      const scale = target / (img.width || target);
      img.set({
        originX: 'center',
        originY: 'center',
        left: fc.getWidth() / 2,
        top: fc.getHeight() / 2,
        scaleX: scale,
        scaleY: scale,
      });
      fc.add(img);
      fc.setActiveObject(img);
      fc.requestRenderAll();
    } catch {
      setError("That sticker couldn't be loaded. Try another one.");
    }
  };

  const handleSave = async () => {
    const fc = fcRef.current;
    if (!fc || !base) return;
    if (tool === 'crop') exitCrop();
    setSaving(true);
    setError('');
    try {
      fc.discardActiveObject();
      fc.requestRenderAll();
      const dataUrl = exportDataUrl(null, 'jpeg');
      const blob = await dataUrlToBlob(dataUrl);
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
      onSave(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
    } catch {
      setError('Could not save the edited image.');
      setSaving(false);
    }
  };

  const emojiResults = stickerQuery.trim()
    ? EMOJI_STICKERS.filter((s) => s.tags.some((t) => t.includes(stickerQuery.trim().toLowerCase())))
    : EMOJI_STICKERS;

  const ready = !!base;

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

        {error && <div className="image-editor__error">{error}</div>}

        <div className="image-editor__canvas-wrap" ref={wrapRef}>
          {!ready && <span className="spinner" />}
          <canvas ref={canvasElRef} className="image-editor__canvas" />
        </div>

        {(tool === 'draw' || tool === 'text') && (
          <div className="image-editor__subrow">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`image-editor__swatch ${color === c ? 'image-editor__swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => {
                  setColor(c);
                  // Recolour whatever's selected, so the swatches also work as
                  // an edit control, not just a "next thing I draw" setting.
                  const active = fcRef.current?.getActiveObject();
                  if (active && tool === 'text') {
                    active.set({ fill: c });
                    fcRef.current.requestRenderAll();
                  }
                }}
                aria-label={`Color ${c}`}
              />
            ))}
            {tool === 'draw' && (
              <>
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
              </>
            )}
          </div>
        )}

        {tool === 'sticker' && (
          <div className="image-editor__sticker-panel">
            <div className="image-editor__sticker-search">
              <SearchIcon size={15} />
              <input
                className="image-editor__sticker-search-input"
                placeholder={stickerTab === 'online' ? 'Search stickers online…' : 'Search emoji…'}
                value={stickerQuery}
                onChange={(e) => setStickerQuery(e.target.value)}
              />
            </div>

            <div className="image-editor__sticker-tabs">
              <button
                type="button"
                className={`image-editor__sticker-tab ${stickerTab === 'emoji' ? 'image-editor__sticker-tab--active' : ''}`}
                onClick={() => setStickerTab('emoji')}
              >
                <SmileIcon size={16} /> Emoji
              </button>
              <button
                type="button"
                className={`image-editor__sticker-tab ${stickerTab === 'online' ? 'image-editor__sticker-tab--active' : ''}`}
                onClick={() => setStickerTab('online')}
              >
                <StickerIcon size={16} /> Stickers
              </button>
            </div>

            {stickerTab === 'emoji' ? (
              <div className="image-editor__sticker-grid">
                {emojiResults.length === 0 ? (
                  <span className="image-editor__sticker-empty">No emoji found</span>
                ) : (
                  emojiResults.map(({ emoji }) => (
                    <button key={emoji} type="button" className="image-editor__sticker-pick" onClick={() => addEmojiSticker(emoji)}>
                      {emoji}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="image-editor__sticker-grid">
                {!stickersConfigured ? (
                  <span className="image-editor__sticker-empty">
                    Online stickers aren&apos;t set up yet — add a GIPHY API key to <code>GIPHY_API_KEY</code> in the
                    backend config to switch this on. Emoji stickers work either way.
                  </span>
                ) : stickersLoading ? (
                  <span className="spinner" />
                ) : onlineStickers.length === 0 ? (
                  <span className="image-editor__sticker-empty">No stickers found</span>
                ) : (
                  onlineStickers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="image-editor__sticker-pick image-editor__sticker-pick--img"
                      onClick={() => addImageSticker(s.url)}
                      title={s.title}
                    >
                      <img src={s.preview} alt={s.title} loading="lazy" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {tool === 'crop' ? (
          <div className="image-editor__toolbar">
            <button type="button" className="image-editor__tool image-editor__tool--cancel" onClick={exitCrop}>
              <XIcon size={20} />
              <span>Cancel</span>
            </button>
            <span className="image-editor__crop-hint">Drag the box to crop</span>
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
            <button type="button" className="image-editor__tool" onClick={addText} disabled={!ready}>
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
            <button type="button" className="image-editor__tool" onClick={deleteSelected} disabled={!hasSelection}>
              <TrashIcon size={20} />
              <span>Delete</span>
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
