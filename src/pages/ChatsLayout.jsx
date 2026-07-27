import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchChats, selectChats, selectChatsLoaded } from '../store/slices/chatSlice.js';
import { selectAllTyping } from '../store/slices/messageSlice.js';
import { selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { useRegisterHeaderActions } from '../layout/HeaderActions.jsx';
import EmptyState from '../components/EmptyState.jsx';
import OrgBadge from '../components/OrgBadge.jsx';
import { ChatIcon, SearchIcon, XIcon } from '../components/icons.jsx';
import { chatTimestamp } from '../utils/time.js';
import { htmlToText } from '../utils/sanitizeHtml.js';

const ATTACHMENT_LABEL = { image: '📷 Photo', video: '🎥 Video', document: '📄 Document' };

const previewText = (chat) => {
  if (!chat.lastMessage) return 'No messages yet';
  const { content, attachmentKind, mine } = chat.lastMessage;
  const text = (content && htmlToText(content)) || ATTACHMENT_LABEL[attachmentKind] || 'Attachment';
  return mine ? `You: ${text}` : text;
};

/** Chats — WhatsApp-style: list (left) + conversation (right) side by side
 *  on desktop via a nested `:groupId` route rendered through `<Outlet/>`;
 *  on mobile, CSS shows one pane at a time based on whether a chat is open. */
export default function ChatsLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { groupId } = useParams();
  const orgId = useSelector(selectCurrentOrgId);
  const chats = useSelector(selectChats);
  const loaded = useSelector(selectChatsLoaded);
  const typingByGroup = useSelector(selectAllTyping);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  useEffect(() => {
    if (orgId) dispatch(fetchChats(orgId));
  }, [orgId, dispatch]);

  const onSearch = useCallback((v) => setSearch(v), []);
  useRegisterHeaderActions({ search, onSearch });

  const filtered = chats
    .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((c) => filter !== 'unread' || c.unreadCount > 0)
    .slice()
    .sort((a, b) => {
      const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bt - at;
    });

  return (
    <div className="page page--full">
      <div className="page__head">
        {/* <div className="page__head-text">
          <h1 className="page__title">Chats</h1>
          <p className="page__subtitle">Every group you're a part of, in one place.</p>
        </div> */}
      </div>

      <div className={`chats-layout ${groupId ? 'chats-layout--detail' : ''}`}>
        <div className="chats-layout__list">
          <div className="search-box chat-search">
            <SearchIcon className="search-box__icon" size={16} />
            <input
              className="search-box__input"
              placeholder="Search chats"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-box__clear" onClick={() => setSearch('')} aria-label="Clear search">
                <XIcon size={14} />
              </button>
            )}
          </div>

          <div className="chat-filters">
            <button
              className={`chat-filter-btn ${filter === 'all' ? 'chat-filter-btn--active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`chat-filter-btn ${filter === 'unread' ? 'chat-filter-btn--active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread
            </button>
          </div>

          <div className="chats-layout__list-scroll">
            {!loaded ? (
              <div className="screen-center" style={{ minHeight: '40vh' }}>
                <span className="spinner" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<ChatIcon size={30} />}
                title={chats.length === 0 ? 'No chats yet' : 'No chats found'}
                description={
                  chats.length === 0
                    ? "You'll see a chat here for every group you belong to."
                    : filter === 'unread'
                      ? 'No unread chats.'
                      : 'Nothing matches your search.'
                }
              />
            ) : (
              <div className="chat-list">
                {filtered.map((c) => {
                  const typingNames = Object.values(typingByGroup[c.id] || {});
                  return (
                    <button
                      key={c.id}
                      className={`chat-row ${c.unreadCount > 0 ? 'chat-row--unread' : ''} ${
                        c.id === groupId ? 'chat-row--active' : ''
                      }`}
                      onClick={() => navigate(`/chats/${c.id}`)}
                    >
                      <OrgBadge name={c.name} size="lg" />
                      <div className="chat-row__body">
                        <div className="chat-row__top">
                          <span className="chat-row__name">#{c.name}</span>
                          {c.lastMessage && (
                            <span className="chat-row__time">{chatTimestamp(c.lastMessage.createdAt)}</span>
                          )}
                        </div>
                        <div className="chat-row__bottom">
                          {typingNames.length > 0 ? (
                            <span className="chat-row__preview chat-row__preview--typing">
                              {typingNames.length === 1
                                ? `${typingNames[0]} is typing…`
                                : `${typingNames.slice(0, 2).join(', ')}${typingNames.length > 2 ? ' and others' : ''} are typing…`}
                            </span>
                          ) : (
                            <span className="chat-row__preview">{previewText(c)}</span>
                          )}
                          {c.unreadCount > 0 && (
                            <span className="chat-row__badge">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="chats-layout__detail">
          {groupId ? (
            <Outlet />
          ) : (
            <div className="chats-layout__empty hide-mobile">
              <ChatIcon size={40} />
              <p style={{ marginTop: 8 }}>Select a chat to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
