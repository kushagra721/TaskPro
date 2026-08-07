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
  CopyIcon,
  ChevronDownIcon,
} from '../../components/icons.jsx';
import DocIcon from '../../components/DocIcon.jsx';
import MessageQuote, { DeletedQuote } from '../../components/MessageQuote.jsx';
import { clockTime } from '../../utils/time.js';
import { sanitizeHtml, textToHtml, htmlToPlainText } from '../../utils/sanitizeHtml.js';

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

/** Ceiling for the auto-growing composer. Mirrors `.composer__input`'s
 *  `max-height` — keep the two equal, or the scrollbar appears at the wrong
 *  point (or never). */
const COMPOSER_MAX_HEIGHT = 160;

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
  // Plain text, not HTML. The composer is a textarea now; `textToHtml` turns
  // this into the stored shape at send time.
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  // { messageId, scope: 'me' | 'everyone' } — the confirm modal's copy and the
  // action it fires both key off `scope`.
  const [infoTarget, setInfoTarget] = useState(null);
  // The message currently being edited, or null for the normal "new message"
  // composer. Editing reuses the same composer rather than opening a modal.
  const [editing, setEditing] = useState(null);
  const [menu, setMenu] = useState(null); // { messageId, x, y }
  /**
   * Selection mode — WhatsApp's model, and the reason the menu now offers one
   * "Delete" instead of two.
   *
   * Choosing the scope (for me / for everyone) up front made the menu ask a
   * question before the user had said what they were deleting, and it only ever
   * acted on one message. Delete now switches the whole thread into selection
   * mode with that message ticked; the scope is asked once, at the end, for
   * everything selected.
   */
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [copied, setCopied] = useState(false);
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
  const inputRef = useRef(null);
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

  /**
   * Grow the composer with its content, up to a ceiling.
   *
   * `rows={1}` keeps it a single line at rest; a textarea does not resize
   * itself, so a long message would otherwise scroll inside two lines. Height
   * is reset to `auto` first — `scrollHeight` never shrinks below the current
   * height, so measuring without that makes the box grow and never come back
   * down after deleting text.
   */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Measure BEFORE clamping — once `height` is set the element is
    // constrained, and deciding the overflow from a re-read is ambiguous.
    const natural = el.scrollHeight;
    el.style.height = `${Math.min(natural, COMPOSER_MAX_HEIGHT)}px`;
    // Only allow a scrollbar once the box can no longer grow. Left on `auto`
    // in CSS this put scroll buttons on a one-line field: the height above
    // matches the content to the pixel, and sub-pixel rounding does the rest.
    el.style.overflowY = natural > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden';
  }, [text]);

  const onInputChange = (e) => {
    setText(e.target.value);
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
    // `htmlToPlainText`, NOT `htmlToText` — messages sent before the composer
    // was plain text still hold real markup, and `textContent` would drop every
    // <br> and block boundary, silently joining a multi-line message into one.
    setText(htmlToPlainText(message.content || ''));
  };

  const cancelEdit = () => {
    setEditing(null);
    setText('');
  };

  const saveEdit = () => {
    const body = text.trim();
    if (!body) return;
    dispatch(
      editMessage({ groupId, messageId: editing.id, content: sanitizeHtml(textToHtml(body)) })
    );
    cancelEdit();
  };

  const send = (e) => {
    e?.preventDefault();
    if (editing) {
      saveEdit();
      return;
    }
    if (!text.trim() && attachments.length === 0) return;
    // Sending is an explicit request to be at the bottom, even if the user had
    // scrolled up to read history first.
    follow.current = true;
    // `sanitizeHtml` on top of `textToHtml` is belt-and-braces: the text is
    // already escaped, so this can only be a no-op — but it keeps every path
    // that writes message content going through the same guard.
    const content = text.trim() ? sanitizeHtml(textToHtml(text.trim())) : '';
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setText('');
    setAttachments([]);
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

  /** Enter selection mode with one message already ticked. */
  const beginSelect = useCallback((messageId) => {
    setMenu(null);
    setSelectMode(true);
    setSelectedIds(new Set([messageId]));
  }, []);

  const exitSelect = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((messageId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  /**
   * Apply the chosen scope to every selected message.
   *
   * There is no bulk endpoint — the API deletes and hides one message at a
   * time — so this fans out. `allSettled`, not `all`: one refusal must not
   * abandon the rest, which is exactly what would happen on a mixed selection
   * the guard above somehow let through.
   */
  const applyBulkDelete = async (scope) => {
    setBulkBusy(true);
    const ids = [...selectedIds];
    await Promise.allSettled(
      ids.map((messageId) =>
        dispatch(
          scope === 'everyone'
            ? deleteMessage({ groupId, messageId })
            : hideMessage({ groupId, messageId })
        )
      )
    );
    setBulkBusy(false);
    setBulkOpen(false);
    exitSelect();
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
    // No `canDelete` flag any more — the menu's single Delete just starts a
    // selection, and eligibility is decided once, over the whole selection.
    setMenu({ messageId, x, y, mine });
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

  /* The two below read `allItems`, so they MUST stay under it. A `useMemo`/
     `useCallback` dependency array is evaluated during render, so referencing a
     `const` declared further down throws "Cannot access 'allItems' before
     initialization" — a blank chat page, and a runtime-only failure that a
     clean build says nothing about. */

  /**
   * May EVERY selected message be deleted for everyone?
   *
   * The server allows that only for your own message, or any message if you
   * manage the channel. A mixed selection would otherwise offer a button that
   * half-succeeds and leaves the rest in place with no explanation — so the
   * option is withheld unless it applies to all of them. "Delete for me" is
   * always available: it only ever hides rows from the caller.
   */
  const canDeleteAllForEveryone = useMemo(() => {
    if (selectedIds.size === 0) return false;
    return [...selectedIds].every((id) => {
      const m = allItems.find((x) => x.id === id);
      // A message that has scrolled out of the loaded window cannot be judged;
      // treat that as "not allowed" rather than assuming.
      return Boolean(m) && (m.author.id === user?.id || canManage);
    });
  }, [selectedIds, allItems, user?.id, canManage]);

  /**
   * Copy a message's text to the clipboard.
   *
   * `htmlToPlainText`, not `htmlToText` — the latter drops <br> with no
   * separator, so a two-line message would be copied as one run-on word.
   * `navigator.clipboard` needs a secure context; the catch keeps a failure
   * silent rather than throwing at a user who just wanted to copy something.
   */
  const copyMessage = useCallback((messageId) => {
    const target = allItems.find((m) => m.id === messageId);
    setMenu(null);
    if (!target?.content) return;
    navigator.clipboard
      ?.writeText(htmlToPlainText(target.content))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }, [allItems]);


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
                } ${selectMode ? 'msg--selectable' : ''} ${
                  selectMode && selectedIds.has(m.id) ? 'msg--selected' : ''
                }`}
                onClick={selectMode ? () => toggleSelected(m.id) : undefined}
              >
                {/* In selection mode the WHOLE row is the hit target — a
                    checkbox alone is a small thing to aim at on a phone. */}
                {selectMode && (
                  <span className={`msg__check ${selectedIds.has(m.id) ? 'msg__check--on' : ''}`} aria-hidden="true">
                    {selectedIds.has(m.id) && <CheckIcon size={13} />}
                  </span>
                )}
                {!mine && <Avatar name={m.author.name} email={m.author.email} src={m.author.avatarUrl} size={32} />}
                <div className="msg__body">
                  <div
                    className="msg__bubble"
                    onContextMenu={selectMode ? undefined : (e) => onBubbleContextMenu(e, m.id, mine)}
                    onTouchStart={selectMode ? undefined : (e) => onPressStart(e, m.id, mine)}
                    onTouchEnd={selectMode ? undefined : onPressEnd}
                    onTouchMove={selectMode ? undefined : onPressEnd}
                    onMouseDown={selectMode ? undefined : (e) => e.button === 0 && onPressStart(e, m.id, mine)}
                    onMouseUp={selectMode ? undefined : onPressEnd}
                    onMouseLeave={selectMode ? undefined : onPressEnd}
                    onClick={selectMode ? undefined : onBubbleClick}
                  >
                    {/* Hover affordance (desktop) — long-press still opens the
                        same menu on touch, where there is no hover to reveal
                        it. Hidden entirely in selection mode, where a tap
                        means "tick this", not "open a menu". */}
                    {!selectMode && (
                      <button
                        type="button"
                        className="msg__menu-btn"
                        aria-label="Message options"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMenu(e, m.id, mine);
                        }}
                      >
                        <ChevronDownIcon size={14} />
                      </button>
                    )}
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
    // `selectMode`/`selectedIds` belong here: the rows render checkboxes and a
    // selected state, so leaving them out would memoise a stale tick.
    [allItems, dayBreaks, user?.id, group?.members, highlightId, react, jumpToMessage,
     onBubbleContextMenu, onPressStart, onPressEnd, onBubbleClick,
     selectMode, selectedIds, toggleSelected, openMenu]
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

      {/* Selection bar — replaces the composer's role while choosing what to
          delete: a count, a way out, and the action. */}
      {selectMode && (
        <div className="chat__selectbar">
          <button type="button" className="icon-btn" onClick={exitSelect} aria-label="Cancel selection">
            <XIcon size={18} />
          </button>
          <span className="chat__selectbar-count">{selectedIds.size} selected</span>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            onClick={() => setBulkOpen(true)}
            disabled={selectedIds.size === 0}
            aria-label="Delete selected"
          >
            <TrashIcon size={18} />
          </button>
        </div>
      )}

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
            {/* A plain textarea, not a rich-text editor.
                Enter inserts a NEWLINE and never sends — that is the whole
                point of a textarea here, and it needs no key handler at all:
                the form only submits from the send button, so there is nothing
                to suppress. It is controlled (unlike the contenteditable it
                replaced, which had to be remounted via `key` to reseed), so
                editing a message is just setting state.
                `rows={1}` plus the auto-grow effect keeps it one line until
                the text actually needs more. */}
            <textarea
              ref={inputRef}
              className="composer__input"
              rows={1}
              value={text}
              onChange={onInputChange}
              placeholder={editing ? 'Edit your message…' : 'Message this group…'}
            />
          </div>
          <button
            className="btn composer__send"
            type="submit"
            aria-label={editing ? 'Save changes' : 'Send'}
            disabled={editing ? !text.trim() : !text.trim() && attachments.length === 0}
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
                  inputRef.current?.focus();
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
            {/* Copy only appears when there is text to copy — an
                attachment-only message would silently do nothing. */}
            {!!allItems.find((m) => m.id === menu.messageId)?.content && (
              <button className="msg-menu__item" onClick={() => copyMessage(menu.messageId)}>
                <CopyIcon size={16} /> Copy
              </button>
            )}
            {/* ONE Delete, not two.
                It no longer deletes anything by itself — it starts a selection
                with this message ticked, and the scope (for me / for everyone)
                is asked once at the end, for everything chosen. Picking the
                scope first meant answering a question before saying what you
                were deleting, and could only ever act on a single message. */}
            <button className="msg-menu__item msg-menu__item--danger" onClick={() => beginSelect(menu.messageId)}>
              <TrashIcon size={16} /> Delete
            </button>
          </div>,
          document.body
        )}

      {/* The scope is asked ONCE, at the end, for everything selected —
          matching the reference: Delete for everyone / Delete for me / Cancel. */}
      {bulkOpen && (
        <Modal title={selectedIds.size === 1 ? 'Delete message?' : `Delete ${selectedIds.size} messages?`} onClose={() => !bulkBusy && setBulkOpen(false)}>
          <div className="msg-delete-choices">
            {/* Withheld unless EVERY selected message qualifies — see
                `canDeleteAllForEveryone`. Offering it on a mixed selection
                would half-succeed and leave the rest with no explanation. */}
            {canDeleteAllForEveryone && (
              <button className="btn btn--danger" disabled={bulkBusy} onClick={() => applyBulkDelete('everyone')}>
                {bulkBusy ? <span className="spinner" /> : 'Delete for everyone'}
              </button>
            )}
            <button className="btn btn--ghost" disabled={bulkBusy} onClick={() => applyBulkDelete('me')}>
              Delete for me
            </button>
            <button className="btn btn--ghost" disabled={bulkBusy} onClick={() => setBulkOpen(false)}>
              Cancel
            </button>
          </div>
          {!canDeleteAllForEveryone && (
            <p className="modal__intro" style={{ marginTop: 12 }}>
              Some of these were sent by other people, so they can only be removed from your own view.
            </p>
          )}
        </Modal>
      )}

      {copied && <div className="chat__toast" role="status">Copied</div>}

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
