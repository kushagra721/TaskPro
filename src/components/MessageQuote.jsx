import { CameraIcon, VideoIcon, PaperclipIcon } from './icons.jsx';
import { htmlToText } from '../utils/sanitizeHtml.js';

/**
 * The quoted-message block: an accent rule, who wrote it, and a one-glance
 * preview of what they said.
 *
 * ONE COMPONENT, TWO PLACES — inside a sent bubble and above the composer while
 * you are still typing the reply. They previously had separate markup and
 * separate CSS, which is how the two drifted: the composer preview handled
 * attachments and the bubble did not. A reply must look like the message it
 * will become.
 *
 * The caller normalises its own data into these flat props because the two
 * sources genuinely differ — the bubble gets the API's flattened `replyTo`, the
 * composer holds a whole message object it has in memory.
 */
export default function MessageQuote({
  author,
  content,
  attachmentKind,
  attachmentUrl,
  attachmentName,
  variant = 'bubble',
  onJump,
  onCancel,
}) {
  const text = content ? htmlToText(content) : '';
  const isImage = attachmentKind === 'image';
  const isVideo = attachmentKind === 'video';
  // A media message with no caption still has to say something; falling through
  // to an empty line is what makes a photo reply look broken.
  const label = text || (isImage ? 'Photo' : isVideo ? 'Video' : attachmentName || 'Attachment');
  const Icon = isImage ? CameraIcon : isVideo ? VideoIcon : attachmentKind ? PaperclipIcon : null;
  const thumb = (isImage || isVideo) && attachmentUrl ? attachmentUrl : null;

  // Interactive only when it can actually go somewhere: a plain <div> otherwise,
  // so a keyboard user is not offered a button that does nothing.
  const Tag = onJump ? 'button' : 'div';

  return (
    <Tag
      className={`msg-quote msg-quote--${variant}`}
      {...(onJump ? { type: 'button', onClick: onJump, title: 'Go to the original message' } : {})}
    >
      <span className="msg-quote__bar" aria-hidden="true" />
      <span className="msg-quote__body">
        <span className="msg-quote__author">{author || 'Unknown'}</span>
        <span className="msg-quote__text">
          {Icon && !text && <Icon size={13} />}
          {label}
        </span>
      </span>
      {thumb && (
        <span className="msg-quote__thumb">
          {isVideo ? <video src={thumb} muted /> : <img src={thumb} alt="" loading="lazy" />}
        </span>
      )}
      {onCancel && (
        <button
          type="button"
          className="msg-quote__cancel"
          onClick={onCancel}
          aria-label="Cancel reply"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </Tag>
  );
}

/** Fallback for a message flagged as a reply whose quote did not come through.
 *  NOT the delete path: deleting the original nulls `replyToId` as well, so such
 *  a reply reads as an ordinary message. This exists so a missing quote degrades
 *  to a line of text instead of an empty panel. */
export function DeletedQuote() {
  return (
    <div className="msg-quote msg-quote--bubble msg-quote--gone">
      <span className="msg-quote__bar" aria-hidden="true" />
      <span className="msg-quote__body">
        <span className="msg-quote__text">Message deleted</span>
      </span>
    </div>
  );
}
