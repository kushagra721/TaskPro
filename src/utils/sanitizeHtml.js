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
