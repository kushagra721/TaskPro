import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  selectNextCursor,
  selectLoadingOlder,
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
  ReplyIcon,
  DoubleCheckIcon,
  CheckIcon,
  EditIcon,
  XIcon,
} from '../../components/icons.jsx';
import DocIcon from '../../components/DocIcon.jsx';
import MessageQuote, { DeletedQuote } from '../../components/MessageQuote.jsx';
import { clockTime } from '../../utils/time.js';
import { sanitizeHtml, htmlToText } from '../../utils/sanitizeHtml.js';

/** Local calendar day, as `YYYY-M-D`. Deliberately built from the local getters
 *  rather than `toISOString()`: ISO is UTC, so a message sent at 1am IST would
 *  be filed under the previous day and the badge would name the wrong date. */
const dayKey = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * The date badge's text: "Today", "Yesterday", or `5 August 26`.
 *
 * Compared by calendar day, not by elapsed hours — 23:59 and 00:01 are a day
 * apart to a reader even though they are two minutes apart in time.
 */
const dayLabel = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const key = dayKey(iso);
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'long' })} ${String(d.getFullYear()).slice(-2)}`;
};

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
  const nextCursor = useSelector(selectNextCursor(groupId));
  const loadingOlder = useSelector(selectLoadingOlder(groupId));
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
  // The message being replied to, or null. Cleared on send/cancel.
  const [replyTo, setReplyTo] = useState(null);
  // Briefly set after jumping to a quoted message, so the destination flashes
  // and the eye can find it — landing silently in the middle of a wall of text
  // leaves you unsure whether anything happened.
  const [highlightId, setHighlightId] = useState(null);
  // Shown when the quoted message is older than what has been paged in.
  const [jumpMiss, setJumpMiss] = useState(false);
  const endRef = useRef(null);
  const scrollRef = useRef(null);
  // Set while a history page is loading so the scroll handler can restore the
  // reading position once the taller list has rendered.
  const restoreRef = useRef(null);
  // Suppresses the "stick to bottom" effect for one render after older
  // messages are prepended, which would otherwise yank the user back down.
  const skipAutoScroll = useRef(false);
  const editorRef = useRef(null);
  const pressTimer = useRef(null);
  const suppressClickRef = useRef(false);
  const typingActive = useRef(false);
  const typingStopTimer = useRef(null);
  // The channel the initial scroll-to-bottom has already run for. Keyed on the
  // channel, not on a message count, so switching between two chats that happen
  // to hold the same number of messages still scrolls.
  const openedFor = useRef(null);
  // Whether to keep following new messages: true while the user is at the
  // bottom, false once they scroll up to read history.
  const follow = useRef(true);

  useEffect(() => {
    dispatch(fetchMessages({ groupId }));
  }, [groupId, dispatch]);

  /**
   * Load the previous page when the user reaches the top.
   *
   * The scroll position has to be restored by hand: prepending older messages
   * grows the list upward, so the browser keeps the same `scrollTop` and the
   * content the user was reading jumps off-screen. Recording
   * `scrollHeight - scrollTop` before the fetch and re-applying it afterwards
   * pins that content in place, which is what makes the paging invisible.
   */
  const loadOlder = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !nextCursor || loadingOlder) return;
    restoreRef.current = el.scrollHeight - el.scrollTop;
    skipAutoScroll.current = true;
    dispatch(fetchMessages({ groupId, cursor: nextCursor }));
  }, [dispatch, groupId, nextCursor, loadingOlder]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Follow new messages only while the user is parked at the bottom. 120px of
    // slack so a small nudge, or the rounding browsers apply to scrollHeight on
    // a zoomed display, does not read as "scrolled away".
    follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    // 80px of slack rather than exactly 0: momentum scrolling on a phone rarely
    // lands on the top pixel, and waiting for it makes the loader feel broken.
    if (el.scrollTop <= 80) loadOlder();
  }, [loadOlder]);

  /**
   * Scroll to the message a quote refers to and flash it.
   *
   * The original may be older than everything paged in so far, in which case
   * there is nothing to scroll to. That says so instead of appearing to ignore
   * the tap — the honest answer, and cheaper than paging backwards an unknown
   * number of times hunting for one id.
   */
  const jumpToMessage = useCallback((id) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) {
      setJumpMiss(true);
      setTimeout(() => setJumpMiss(false), 2600);
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(id);
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1600);
  }, []);

  // Restore the reading position the moment the taller list is laid out.
  // useLayoutEffect, not useEffect: after paint the jump is already visible.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || restoreRef.current == null) return;
    el.scrollTop = el.scrollHeight - restoreRef.current;
    restoreRef.current = null;
  }, [messages.length]);

  /**
   * Keep the conversation pinned to the newest message.
   *
   * THREE THINGS MADE THIS UNRELIABLE, and all three had to go:
   *
   * 1. **It keyed on `messages.length`.** Opening a channel with the same number
   *    of messages as the last one changed no dependency, so the effect never
   *    ran and the new conversation opened wherever the old one had been left.
   *    `openedFor` tracks the channel instead, so opening one is always a fresh
   *    scroll regardless of how many messages it happens to hold.
   *
   * 2. **The first scroll was animated.** A smooth scroll is a request, not a
   *    guarantee — it is interrupted by a touch and it targets the height as it
   *    was when it started. Opening a channel now jumps instantly (assigning
   *    `scrollTop` rather than `scrollIntoView`, which cannot be interrupted or
   *    land short); only later messages animate, where the motion tells the user
   *    something arrived.
   *
   * 3. **Images load after the scroll.** Every attachment and avatar that
   *    resolves *after* layout grows the list underneath and pushes the bottom
   *    away — which is precisely why this failed intermittently rather than
   *    always: it worked whenever the images happened to be cached. See the
   *    load listener below.
   */
  const scrollToBottom = useCallback((smooth) => {
    const el = scrollRef.current;
    if (!el) return;
    if (smooth) endRef.current?.scrollIntoView({ behavior: 'smooth' });
    else el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (skipAutoScroll.current) {
      skipAutoScroll.current = false;
      return;
    }
    const firstOpen = openedFor.current !== groupId;
    if (firstOpen) {
      if (!messages.length) return; // nothing laid out yet — wait for the fetch
      openedFor.current = groupId;
      follow.current = true;
      scrollToBottom(false);
      return;
    }
    // Afterwards, only follow someone who is already at the bottom. Yanking a
    // user who has scrolled up to read history back down because someone else
    // typed is worse than letting them miss the newest line.
    if (follow.current) scrollToBottom(true);
  }, [groupId, messages, pending.length, typingEntries.length, scrollToBottom]);

  /**
   * Re-pin once a late-loading image or video has taken up its space.
   *
   * `load` does not bubble, hence the capture-phase listener on the container:
   * one handler covers every current and future attachment without per-image
   * wiring. Guarded by `follow` so it can never drag someone reading history.
   */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onLoad = () => {
      if (follow.current) el.scrollTop = el.scrollHeight;
    };
    el.addEventListener('load', onLoad, true);
    return () => el.removeEventListener('load', onLoad, true);
  }, []);

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
    // Sending is an explicit request to be at the bottom, even if the user had
    // scrolled up to read history first.
    follow.current = true;
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
    dispatch(sendMessage({ groupId, content, attachments, clientId, replyToId: replyTo?.id || null }));
    setReplyTo(null);
  };

  // Stable identity so the memoised message list below is not invalidated on
  // every keystroke — see the `rows` useMemo for why that matters.
  const react = useCallback(
    (messageId, emoji) => {
      setMenu(null);
      groupsApi.react(groupId, messageId, emoji).catch(() => {});
    },
    [groupId]
  );

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

  const onBubbleContextMenu = useCallback(
    (e, messageId, mine) => {
      e.preventDefault();
      openMenu(e, messageId, mine);
    },
    [openMenu]
  );

  const onPressStart = useCallback(
    (e, messageId, mine) => {
      clearTimeout(pressTimer.current);
      // The event is pooled no longer in React 17+, but the touch list is read
      // inside the timeout, so the coordinates are captured up front.
      const point = e.touches?.[0] || e;
      const snapshot = { clientX: point.clientX, clientY: point.clientY };
      pressTimer.current = setTimeout(() => openMenu(snapshot, messageId, mine), LONG_PRESS_MS);
    },
    [openMenu]
  );

  const onPressEnd = useCallback(() => clearTimeout(pressTimer.current), []);

  // A long-press that opens the menu still ends in a native mouseup → click
  // on the same bubble; without this it bubbles straight to the document
  // listener below and closes the menu the instant it opened.
  const onBubbleClick = useCallback((e) => {
    if (suppressClickRef.current) {
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  }, []);

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

  const allItems = useMemo(() => [...messages, ...pending], [messages, pending]);

  // Which items need a date badge above them: the first, and any whose day
  // differs from the previous one. Computed once per render rather than inside
  // the map so each row does not re-derive its neighbour's date.
  const dayBreaks = useMemo(() => {
    const set = new Set();
    let lastDay = null;
    for (const m of allItems) {
      const d = dayKey(m.createdAt);
      if (d !== lastDay) {
        set.add(m.id);
        lastDay = d;
      }
    }
    return set;
  }, [allItems]);

  /**
   * The rendered message rows, memoised.
   *
   * Typing in the composer calls setState on every keystroke (the send button's
   * disabled state depends on it), and a typing indicator arriving over the
   * socket re-renders too. Without this, each of those rebuilt the entire
   * conversation's element tree — a hundred bubbles, their attachments and
   * their reaction rows — for a change that touched none of them. Returning the
   * same element references lets React skip those subtrees outright.
   *
   * Every handler below is wrapped in useCallback for exactly this reason: one
   * unstable function reference here would defeat the whole memo.
   */
  const rows = useMemo(
    () =>
      allItems.map((m) => {
            const mine = m.author.id === user?.id;
            return (
              <Fragment key={m.id}>
                {dayBreaks.has(m.id) && (
                  <div className="chat__day">
                    <span className="chat__day-badge">{dayLabel(m.createdAt)}</span>
                  </div>
                )}
              <div
                id={`msg-${m.id}`}
                className={`msg ${mine ? 'msg--mine' : 'msg--theirs'} ${
                  highlightId === m.id ? 'msg--highlight' : ''
                }`}
              >
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
                    {/* The quoted message.
                        Deleting the original nulls `replyToId` itself (the FK is
                        `onDelete: SetNull`), so a reply to a deleted message
                        simply becomes an ordinary message — verified on live
                        data. `DeletedQuote` is therefore a defensive fallback for
                        "flagged as a reply but the quote did not come through",
                        not the delete path. */}
                    {m.replyToId &&
                      (m.replyTo ? (
                        <MessageQuote
                          author={
                            m.replyTo.authorId && m.replyTo.authorId === user?.id
                              ? 'You'
                              : m.replyTo.authorName
                          }
                          content={m.replyTo.content}
                          attachmentKind={m.replyTo.attachmentKind}
                          attachmentUrl={m.replyTo.attachmentUrl}
                          attachmentName={m.replyTo.attachmentName}
                          onJump={() => jumpToMessage(m.replyTo.id)}
                        />
                      ) : (
                        <DeletedQuote />
                      ))}
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
              </Fragment>
            );
      }),
    [allItems, dayBreaks, user?.id, group?.members, highlightId, react, jumpToMessage,
     onBubbleContextMenu, onPressStart, onPressEnd, onBubbleClick]
  );

  return (
    <div className="chat">
      {jumpMiss && (
        <div className="chat__jump-miss" role="status">
          That message is further back — scroll up to load it.
        </div>
      )}
      <div className="chat__messages" ref={scrollRef} onScroll={onScroll}>
        {/* History affordances at the top of the list. "Beginning" only shows
            once there is something above it — an empty channel says so below
            instead, and printing both would be contradictory. */}
        {loadingOlder && (
          <div className="chat__loading-older">
            <span className="spinner" /> Loading earlier messages…
          </div>
        )}
        {!loadingOlder && !nextCursor && allItems.length > 0 && (
          <div className="chat__history-start">Beginning of the conversation</div>
        )}
        {allItems.length === 0 && <div className="chat__empty">No messages yet — say hello 👋</div>}
        {rows}
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
        {/* Quoted message being replied to. Mutually exclusive with the editing
            strip — you cannot edit and reply in one action, and both claim the
            same slot above the input. */}
        {replyTo && !editing && (
          <MessageQuote
            variant="composer"
            author={
              replyTo.author?.id === user?.id ? 'You' : replyTo.author?.name || replyTo.author?.email
            }
            content={replyTo.content}
            attachmentKind={replyTo.attachments?.[0]?.kind}
            attachmentUrl={replyTo.attachments?.[0]?.url}
            attachmentName={replyTo.attachments?.[0]?.fileName}
            onCancel={() => setReplyTo(null)}
          />
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
            {/* Reply leads the list: it is the action people reach for most,
                and unlike Edit/Info it applies to ANY message, yours or not. */}
            <button
              className="msg-menu__item"
              onClick={() => {
                const target = allItems.find((m) => m.id === menu.messageId);
                // Never quote a message that is still sending — it has no
                // server id yet, so the reply would reference nothing.
                if (target && !target.pending) {
                  setReplyTo(target);
                  cancelEdit();
                  editorRef.current?.focus?.();
                }
                setMenu(null);
              }}
            >
              <ReplyIcon size={16} /> Reply
            </button>
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
