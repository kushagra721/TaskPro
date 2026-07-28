import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  hideMessage,
  messagePending,
  selectMessages,
  selectPendingMessages,
  selectTyping,
} from '../../store/slices/messageSlice.js';
import { selectUser } from '../../store/slices/authSlice.js';
import { selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { groupsApi } from '../../api/client.js';
import { sendTypingStart, sendTypingStop } from '../../realtime/socket.js';
import Avatar from '../../components/Avatar.jsx';
import RichTextEditor from '../../components/RichTextEditor.jsx';
import AttachmentPicker from '../../components/AttachmentPicker.jsx';
import Modal from '../../components/Modal.jsx';
import {
  DownloadIcon,
  TrashIcon,
  InfoIcon,
  DoubleCheckIcon,
  CheckIcon,
  EditIcon,
  XIcon,
} from '../../components/icons.jsx';
import DocIcon from '../../components/DocIcon.jsx';
import { clockTime } from '../../utils/time.js';
import { sanitizeHtml, htmlToText } from '../../utils/sanitizeHtml.js';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '✅'];
const LONG_PRESS_MS = 450;

const isReadByAll = (message, members) => {
  const others = (members || []).filter((m) => m.id !== message.author.id);
  if (!others.length) return false;
  return others.every((m) => m.lastReadAt && new Date(m.lastReadAt) >= new Date(message.createdAt));
};

function Ticks({ message, members }) {
  const read = isReadByAll(message, members);
  return (
    <span className={`msg__ticks ${read ? 'msg__ticks--read' : ''}`}>
      <DoubleCheckIcon size={15} />
    </span>
  );
}

export default function ChannelChat({ groupId, canManage, group }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const orgId = useSelector(selectCurrentOrgId);
  const messages = useSelector(selectMessages(groupId));
  const pending = useSelector(selectPendingMessages(groupId));
  const typing = useSelector(selectTyping(groupId));
  const typingEntries = Object.entries(typing).filter(([uid]) => uid !== user?.id);
  const [html, setHtml] = useState('');
  const [attachments, setAttachments] = useState([]);
  // { messageId, scope: 'me' | 'everyone' } — the confirm modal's copy and the
  // action it fires both key off `scope`.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [infoTarget, setInfoTarget] = useState(null);
  // The message currently being edited, or null for the normal "new message"
  // composer. Editing reuses the same composer rather than opening a modal.
  const [editing, setEditing] = useState(null);
  const [menu, setMenu] = useState(null); // { messageId, x, y }
  const endRef = useRef(null);
  const editorRef = useRef(null);
  const pressTimer = useRef(null);
  const suppressClickRef = useRef(false);
  const typingActive = useRef(false);
  const typingStopTimer = useRef(null);

  useEffect(() => {
    dispatch(fetchMessages({ groupId }));
  }, [groupId, dispatch]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pending.length, typingEntries.length]);

  useEffect(() => {
    return () => {
      if (typingActive.current) sendTypingStop(groupId, orgId);
      clearTimeout(typingStopTimer.current);
    };
  }, [groupId, orgId]);

  const onEditorChange = (val) => {
    setHtml(val);
    if (!typingActive.current) {
      typingActive.current = true;
      sendTypingStart(groupId, orgId);
    }
    clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      typingActive.current = false;
      sendTypingStop(groupId, orgId);
    }, 2500);
  };

  const startEdit = (message) => {
    setEditing(message);
    setHtml(message.content || '');
  };

  const cancelEdit = () => {
    setEditing(null);
    setHtml('');
  };

  const saveEdit = () => {
    const text = htmlToText(html);
    if (!text) return;
    dispatch(
      editMessage({ groupId, messageId: editing.id, content: sanitizeHtml(html) })
    );
    cancelEdit();
  };

  const send = (e) => {
    e?.preventDefault();
    if (editing) {
      saveEdit();
      return;
    }
    if (!htmlToText(html) && attachments.length === 0) return;
    const content = htmlToText(html) ? sanitizeHtml(html) : '';
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setHtml('');
    setAttachments([]);
    editorRef.current?.clear();
    if (typingActive.current) {
      typingActive.current = false;
      clearTimeout(typingStopTimer.current);
      sendTypingStop(groupId, orgId);
    }
    dispatch(
      messagePending({
        groupId,
        clientId,
        id: clientId,
        content,
        attachments,
        author: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
        createdAt: new Date().toISOString(),
        reactions: [],
        pending: true,
      })
    );
    dispatch(sendMessage({ groupId, content, attachments, clientId }));
  };

  const react = (messageId, emoji) => {
    setMenu(null);
    groupsApi.react(groupId, messageId, emoji).catch(() => {});
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { messageId, scope } = deleteTarget;
    dispatch(
      scope === 'everyone'
        ? deleteMessage({ groupId, messageId })
        : hideMessage({ groupId, messageId })
    );
    setDeleteTarget(null);
  };

  // Every message opens the menu — the emoji row (react) is available on
  // anyone's message, yours or theirs, which is why there's no "nothing to
  // show" early return any more. Info is only meaningful for a message you
  // sent (who's read/delivered it); Delete is your own message OR any message
  // at all if you're an admin/channel creator.
  const openMenu = useCallback((e, messageId, mine) => {
    suppressClickRef.current = true;
    const point = e.touches?.[0] || e;
    const x = Math.max(8, Math.min(point.clientX, window.innerWidth - 244));
    const y = Math.max(8, Math.min(point.clientY, window.innerHeight - 280));
    setMenu({ messageId, x, y, mine, canDelete: mine || canManage });
  }, [canManage]);

  const onBubbleContextMenu = (e, messageId, mine) => {
    e.preventDefault();
    openMenu(e, messageId, mine);
  };

  const onPressStart = (e, messageId, mine) => {
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => openMenu(e, messageId, mine), LONG_PRESS_MS);
  };

  const onPressEnd = () => clearTimeout(pressTimer.current);

  // A long-press that opens the menu still ends in a native mouseup → click
  // on the same bubble; without this it bubbles straight to the document
  // listener below and closes the menu the instant it opened.
  const onBubbleClick = (e) => {
    if (suppressClickRef.current) {
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  };

  const infoMessage = infoTarget ? messages.find((m) => m.id === infoTarget) : null;

  useEffect(() => {
    if (!menu) return undefined;
    const close = () => {
      suppressClickRef.current = false;
      setMenu(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menu]);

  const allItems = [...messages, ...pending];

  return (
    <div className="chat">
      <div className="chat__messages">
        {allItems.length === 0 && <div className="chat__empty">No messages yet — say hello 👋</div>}
        {allItems.map((m) => {
          const mine = m.author.id === user?.id;
          return (
            <div key={m.id} className={`msg ${mine ? 'msg--mine' : 'msg--theirs'}`}>
              {!mine && <Avatar name={m.author.name} email={m.author.email} src={m.author.avatarUrl} size={32} />}
              <div className="msg__body">
                <div
                  className="msg__bubble"
                  onContextMenu={(e) => onBubbleContextMenu(e, m.id, mine)}
                  onTouchStart={(e) => onPressStart(e, m.id, mine)}
                  onTouchEnd={onPressEnd}
                  onTouchMove={onPressEnd}
                  onMouseDown={(e) => e.button === 0 && onPressStart(e, m.id, mine)}
                  onMouseUp={onPressEnd}
                  onMouseLeave={onPressEnd}
                  onClick={onBubbleClick}
                >
                  {!mine && <span className="msg__author">{m.author.name || m.author.email}</span>}
                  {m.content && (
                    <div className="msg__content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.content) }} />
                  )}
                  {m.attachments?.length > 0 && (
                    <div className="attach-view__grid attach-view__grid--msg">
                      {m.attachments.map((a) => (
                        <a
                          key={a.id || a.url}
                          className="attach-view__item"
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={a.kind === 'document' ? a.fileName : undefined}
                        >
                          {a.kind === 'image' ? (
                            <img className="attach-view__thumb" src={a.url} alt={a.fileName} />
                          ) : a.kind === 'video' ? (
                            <video className="attach-view__thumb" src={a.url} muted />
                          ) : (
                            <span className="attach-view__icon">
                              <DocIcon fileName={a.fileName} mimeType={a.mimeType} />
                            </span>
                          )}
                          <span className="attach-view__name">{a.fileName}</span>
                          {a.kind === 'document' && <DownloadIcon size={14} />}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="msg__foot">
                    {m.edited && <span className="msg__edited">edited</span>}
                    <span className="msg__time">{clockTime(m.createdAt)}</span>
                    {mine &&
                      (m.pending ? (
                        <span className="msg__ticks">
                          <CheckIcon size={14} />
                        </span>
                      ) : (
                        <Ticks message={m} members={group?.members} />
                      ))}
                  </div>
                </div>

                {/* Existing reactions only — adding one is a long-press/right-click
                    action on the bubble itself (see the menu below), so there's no
                    persistent "+" chip cluttering every message. */}
                {!m.pending && m.reactions?.length > 0 && (
                  <div className="msg__reactions">
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        className={`reaction ${r.userIds.includes(user?.id) ? 'reaction--mine' : ''}`}
                        onClick={() => react(m.id, r.emoji)}
                      >
                        <span>{r.emoji}</span> <span className="reaction__count">{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {typingEntries.map(([uid, name]) => {
          const member = group?.members?.find((m) => m.id === uid);
          return (
            <div className="msg msg--theirs" key={`typing-${uid}`}>
              <Avatar name={member?.name || name} email={member?.email} src={member?.avatarUrl} size={32} />
              <div className="msg__body">
                <div className="msg__bubble msg__bubble--typing">
                  <span className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form className="composer composer--column" onSubmit={send}>
        {editing && (
          <div className="composer__editing">
            <EditIcon size={14} />
            <span className="composer__editing-label">Editing message</span>
            <button type="button" className="composer__editing-cancel" onClick={cancelEdit} aria-label="Cancel edit">
              <XIcon size={14} />
            </button>
          </div>
        )}
        <div className="composer__row">
          {/* Attachments are immutable once sent — only the text is editable. */}
          {!editing && <AttachmentPicker value={attachments} onChange={setAttachments} variant="icon" />}
          <div className="composer__field">
            {/* `key` remounts the (uncontrolled) editor so `defaultValue` can
                seed it with the message being edited, and clear it again on
                cancel/save. No `onSubmitKey` — Enter inserts a newline here;
                sending is the send button only (explicit product decision). */}
            <RichTextEditor
              key={editing ? `edit-${editing.id}` : 'new'}
              ref={editorRef}
              defaultValue={editing?.content}
              onChange={onEditorChange}
              placeholder={editing ? 'Edit your message…' : undefined}
            />
          </div>
          <button
            className="btn composer__send"
            type="submit"
            aria-label={editing ? 'Save changes' : 'Send'}
            disabled={editing ? !htmlToText(html) : !htmlToText(html) && attachments.length === 0}
          >
            {editing ? (
              <CheckIcon size={18} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 3 18 9-18 9 4-9Z" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {menu &&
        createPortal(
          <div className="msg-menu" style={{ top: menu.y, left: menu.x }} onClick={(e) => e.stopPropagation()}>
            <div className="msg-menu__emojis">
              {EMOJIS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => react(menu.messageId, emoji)} aria-label={`React ${emoji}`}>
                  {emoji}
                </button>
              ))}
            </div>
            {/* Author-only, and only for a message that actually has text —
                editing an attachment-only message would open an empty composer
                whose save the server would reject as empty. */}
            {menu.mine && !!messages.find((m) => m.id === menu.messageId)?.content && (
              <button
                className="msg-menu__item"
                onClick={() => {
                  startEdit(messages.find((m) => m.id === menu.messageId));
                  setMenu(null);
                }}
              >
                <EditIcon size={16} /> Edit
              </button>
            )}
            {menu.mine && (
              <button
                className="msg-menu__item"
                onClick={() => {
                  setInfoTarget(menu.messageId);
                  setMenu(null);
                }}
              >
                <InfoIcon size={16} /> Info
              </button>
            )}
            {/* "Delete for me" is always available — it only hides the message
                from you. "Delete for everyone" is the hard delete, so it's
                gated on being the author or an admin/channel creator. */}
            <button
              className="msg-menu__item"
              onClick={() => {
                setDeleteTarget({ messageId: menu.messageId, scope: 'me' });
                setMenu(null);
              }}
            >
              <TrashIcon size={16} /> Delete for me
            </button>
            {menu.canDelete && (
              <button
                className="msg-menu__item msg-menu__item--danger"
                onClick={() => {
                  setDeleteTarget({ messageId: menu.messageId, scope: 'everyone' });
                  setMenu(null);
                }}
              >
                <TrashIcon size={16} /> Delete for everyone
              </button>
            )}
          </div>,
          document.body
        )}

      {deleteTarget && (
        <Modal
          title={deleteTarget.scope === 'everyone' ? 'Delete for everyone' : 'Delete for me'}
          onClose={() => setDeleteTarget(null)}
        >
          <p className="modal__intro">
            {deleteTarget.scope === 'everyone'
              ? "This message will be permanently deleted for everyone in this channel. This can't be undone."
              : "This message will be removed from your view only — everyone else in the channel will still see it. This can't be undone."}
          </p>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn--danger" onClick={confirmDelete}>
              <TrashIcon size={16} />{' '}
              {deleteTarget.scope === 'everyone' ? 'Delete for everyone' : 'Delete for me'}
            </button>
          </div>
        </Modal>
      )}

      {infoMessage && (
        <Modal title="Message info" onClose={() => setInfoTarget(null)}>
          <div className="msg-info__preview">
            {infoMessage.content ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(infoMessage.content) }} />
            ) : (
              <em>Attachment</em>
            )}
          </div>
          {(() => {
            const others = (group?.members || []).filter((m) => m.id !== infoMessage.author.id);
            const readRows = others.filter(
              (m) => m.lastReadAt && new Date(m.lastReadAt) >= new Date(infoMessage.createdAt)
            );
            const deliveredRows = others.filter((m) => !readRows.includes(m));
            return (
              <>
                <div className="msg-info__section-title">Read by ({readRows.length})</div>
                {readRows.length === 0 && <p className="field__hint">No one yet.</p>}
                {readRows.map((m) => (
                  <div className="msg-info__row" key={m.id}>
                    <Avatar name={m.name} email={m.email} src={m.avatarUrl} size={30} />
                    <span className="msg-info__name">{m.name || m.email}</span>
                    <span className="msg-info__status msg-info__status--read">Read {clockTime(m.lastReadAt)}</span>
                  </div>
                ))}
                <div className="msg-info__section-title">Delivered ({deliveredRows.length})</div>
                {deliveredRows.length === 0 && <p className="field__hint">Everyone has read this message.</p>}
                {deliveredRows.map((m) => (
                  <div className="msg-info__row" key={m.id}>
                    <Avatar name={m.name} email={m.email} src={m.avatarUrl} size={30} />
                    <span className="msg-info__name">{m.name || m.email}</span>
                    <span className="msg-info__status">Delivered</span>
                  </div>
                ))}
              </>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
