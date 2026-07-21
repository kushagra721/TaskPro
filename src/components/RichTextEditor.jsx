import { forwardRef, useImperativeHandle, useRef } from 'react';
import { BoldIcon, ItalicIcon, UnderlineIcon, ListIcon, ListOrderedIcon, LinkIcon } from './icons.jsx';

/**
 * Minimal contentEditable rich-text editor (bold/italic/underline/lists/link)
 * for the chat composer. Uses execCommand — deprecated but still supported by
 * every browser this app targets, and it avoids pulling in an editor library.
 * `onChange` fires with the current innerHTML; `onSubmitKey` fires on Enter
 * (without Shift) so the caller can send the message.
 */
const RichTextEditor = forwardRef(function RichTextEditor(
  { onChange, onSubmitKey, placeholder = 'Message this group…' },
  ref
) {
  const editorRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clear() {
      if (editorRef.current) editorRef.current.innerHTML = '';
    },
    focus() {
      editorRef.current?.focus();
    },
  }));

  const exec = (command, value) => (e) => {
    e.preventDefault();
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    onChange?.(editorRef.current?.innerHTML || '');
  };

  const link = (e) => {
    e.preventDefault();
    const url = window.prompt('Link URL');
    if (!url) return;
    editorRef.current?.focus();
    document.execCommand('createLink', false, url);
    onChange?.(editorRef.current?.innerHTML || '');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmitKey?.();
    }
  };

  return (
    <div className="rte">
      <div className="rte__toolbar">
        <button type="button" className="rte__btn" onMouseDown={exec('bold')} title="Bold" aria-label="Bold">
          <BoldIcon size={15} />
        </button>
        <button type="button" className="rte__btn" onMouseDown={exec('italic')} title="Italic" aria-label="Italic">
          <ItalicIcon size={15} />
        </button>
        <button type="button" className="rte__btn" onMouseDown={exec('underline')} title="Underline" aria-label="Underline">
          <UnderlineIcon size={15} />
        </button>
        <button
          type="button"
          className="rte__btn"
          onMouseDown={exec('insertUnorderedList')}
          title="Bullet list"
          aria-label="Bullet list"
        >
          <ListIcon size={15} />
        </button>
        <button
          type="button"
          className="rte__btn"
          onMouseDown={exec('insertOrderedList')}
          title="Numbered list"
          aria-label="Numbered list"
        >
          <ListOrderedIcon size={15} />
        </button>
        <button type="button" className="rte__btn" onMouseDown={link} title="Add link" aria-label="Add link">
          <LinkIcon size={15} />
        </button>
      </div>
      <div
        ref={editorRef}
        className="rte__input"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
      />
    </div>
  );
});

export default RichTextEditor;
