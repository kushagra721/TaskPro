import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMessages, sendMessage, selectMessages } from '../../store/slices/messageSlice.js';
import { selectUser } from '../../store/slices/authSlice.js';
import { groupsApi } from '../../api/client.js';
import Avatar from '../../components/Avatar.jsx';
import { timeAgo } from '../../utils/time.js';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '✅'];

export default function ChannelChat({ groupId }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const messages = useSelector(selectMessages(groupId));
  const [text, setText] = useState('');
  const [pickerFor, setPickerFor] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    dispatch(fetchMessages({ groupId }));
  }, [groupId, dispatch]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText('');
    dispatch(sendMessage({ groupId, content }));
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
              <div className="msg__content">{m.content}</div>
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

      <form className="composer" onSubmit={send}>
        <input
          className="input"
          placeholder="Message this group…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn" type="submit" style={{ width: 'auto', padding: '0 18px' }} disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
