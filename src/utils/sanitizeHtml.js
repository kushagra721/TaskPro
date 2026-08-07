const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'UL', 'OL', 'LI', 'A', 'DIV', 'SPAN']);

const isSafeHref = (href) => /^(https?:)?\/\//i.test(href) || /^mailto:/i.test(href);

/**
 * Strips a chat message's HTML down to a small allow-list (bold/italic/
 * underline/lists/links/line breaks) so stored rich-text content can be
 * rendered with dangerouslySetInnerHTML without opening up stored XSS —
 * every attribute is dropped except a validated `href` on `<a>`.
 */
export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');

  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE || !ALLOWED_TAGS.has(child.tagName)) {
        // Unwrap disallowed elements (keep their text/children) instead of
        // dropping content entirely.
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        node.removeChild(child);
        return;
      }
      const href = child.tagName === 'A' ? child.getAttribute('href') || '' : '';
      [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
      if (child.tagName === 'A' && isSafeHref(href)) {
        child.setAttribute('href', href);
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }
      clean(child);
    });
  };

  clean(doc.body);
  return doc.body.innerHTML;
}

/** Plain-text length of rendered HTML — used to detect an "empty" rich message. */
export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return (doc.body.textContent || '').trim();
}

/**
 * Plain text -> the stored HTML shape, for the chat composer.
 *
 * Messages are stored as HTML and rendered with `dangerouslySetInnerHTML`, so a
 * plain-text composer still has to hand over HTML. Escaping happens HERE, at
 * the point the text becomes markup: typing `<b>hi` must show those characters,
 * not turn bold. `&` must be replaced first, or the escapes we introduce would
 * themselves be escaped again.
 *
 * Newlines become `<br>` (which `sanitizeHtml` allows) — without that they
 * collapse and every multi-line message renders as one run-on line.
 */
export function textToHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n|\r|\n/g, '<br>');
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'UL', 'OL']);

/**
 * Stored HTML -> plain text, PRESERVING line breaks. For editing a message in
 * the plain-text composer.
 *
 * Deliberately not `htmlToText` above, which uses `textContent` and therefore
 * drops `<br>` and block boundaries entirely — editing a two-line message with
 * that would silently join the lines into one. This exists because messages
 * sent before the composer became plain text still contain real markup
 * (`<p>`, `<ul>`, `<b>`); formatting is lost on edit, which is expected, but
 * the line structure must not be.
 */
export function htmlToPlainText(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  let out = '';
  const nl = () => {
    if (out && !out.endsWith('\n')) out += '\n';
  };
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.nodeValue;
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      if (child.tagName === 'BR') {
        out += '\n';
        return;
      }
      const isBlock = BLOCK_TAGS.has(child.tagName);
      if (isBlock) nl();
      walk(child);
      if (isBlock) nl();
    });
  };
  walk(doc.body);
  // Collapse the runs of blank lines that nested blocks produce.
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
