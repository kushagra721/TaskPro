import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMessages, sendMessage, selectMessages } from '../../store/slices/messageSlice.js';
import { selectUser } from '../../store/slices/authSlice.js';
import { groupsApi } from '../../api/client.js';
import Avatar from '../../components/Avatar.jsx';
import RichTextEditor from '../../components/RichTextEditor.jsx';
import AttachmentPicker from '../../components/AttachmentPicker.jsx';
import { DownloadIcon } from '../../components/icons.jsx';
import DocIcon from '../../components/DocIcon.jsx';
import { timeAgo } from '../../utils/time.js';
import { sanitizeHtml, htmlToText } from '../../utils/sanitizeHtml.js';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '✅'];

export default function ChannelChat({ groupId }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const messages = useSelector(selectMessages(groupId));
  const [html, setHtml] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [pickerFor, setPickerFor] = useState(null);
  const endRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    dispatch(fetchMessages({ groupId }));
  }, [groupId, dispatch]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = (e) => {
    e?.preventDefault();
    if (!htmlToText(html) && attachments.length === 0) return;
    const content = htmlToText(html) ? sanitizeHtml(html) : '';
    setHtml('');
    setAttachments([]);
    editorRef.current?.clear();
    dispatch(sendMessage({ groupId, content, attachments }));
  };

  const react = (messageId, emoji) => {
    setPickerFor(null);
    groupsApi.react(groupId, messageId, emoji).catch(() => {});
  };

  return (
    <div className="chat">
      <div className="chat__messages">
        {messages.length === 0 && <div className="chat__empty">No messages yet — say hello 👋</div>}
        {messages.map((m) => (
          <div key={m.id} className="msg">
            <Avatar name={m.author.name} email={m.author.email} size={38} />
            <div className="msg__body">
              <div className="msg__head">
                <span className="msg__author">{m.author.name || m.author.email}</span>
                <span className="msg__time">{timeAgo(m.createdAt)}</span>
              </div>
              {m.content && (
                <div className="msg__content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.content) }} />
              )}
              {m.attachments?.length > 0 && (
                <div className="attach-view__grid attach-view__grid--msg">
                  {m.attachments.map((a) => (
                    <a
                      key={a.id}
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
                <div className="reaction-add">
                  <button
                    className="reaction reaction--add"
                    onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
                    aria-label="Add reaction"
                  >
                    +
                  </button>
                  {pickerFor === m.id && (
                    <div className="emoji-picker">
                      {EMOJIS.map((e) => (
                        <button key={e} onClick={() => react(m.id, e)}>
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="composer composer--column" onSubmit={send}>
        <AttachmentPicker value={attachments} onChange={setAttachments} />
        <div className="composer__row">
          <RichTextEditor ref={editorRef} onChange={setHtml} onSubmitKey={send} />
          <button
            className="btn"
            type="submit"
            style={{ width: 'auto', padding: '0 18px', alignSelf: 'flex-end' }}
            disabled={!htmlToText(html) && attachments.length === 0}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
