import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { fetchGroups, selectGroups } from '../store/slices/groupSlice.js';
import EmptyState from '../components/EmptyState.jsx';
import CreateChannelModal from '../components/CreateChannelModal.jsx';
import Fab from '../components/Fab.jsx';
import ManageProjectsPage from './more/ManageProjectsPage.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { GroupsIcon, PlusIcon } from '../components/icons.jsx';

export default function GroupsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const groups = useSelector(selectGroups);
  const isAdmin = org?.role === 'ADMIN';
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState('groups'); // 'groups' | 'projects'
  const isMobile = useIsMobile();

  useEffect(() => {
    if (orgId) dispatch(fetchGroups(orgId));
  }, [orgId, dispatch]);

  if (!org) {
    return (
      <div className="page">
        <EmptyState icon={<GroupsIcon size={30} />} title="No organization selected" description="Create or pick an organization to start adding groups." />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">{tab === 'groups' ? 'Groups' : 'Projects'}</h1>
          <p className="page__subtitle">
            {tab === 'groups' ? 'Chat and manage tasks with your team.' : 'Organize tasks into projects. Anyone can add one.'}
          </p>
        </div>
        {/* Desktop keeps the inline button; mobile uses the FAB below. */}
        {tab === 'groups' && isAdmin && !isMobile && (
          <div className="head-actions">
            <button className="btn btn--sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon size={16} /> New group
            </button>
          </div>
        )}
      </div>

      <div className="groups-tabbar">
        <button className={`tab ${tab === 'groups' ? 'tab--active' : ''}`} onClick={() => setTab('groups')}>
          Groups
        </button>
        <button className={`tab ${tab === 'projects' ? 'tab--active' : ''}`} onClick={() => setTab('projects')}>
          Projects
        </button>
      </div>

      {tab === 'groups' ? (
        <>
          {groups.length === 0 ? (
            <EmptyState
              icon={<GroupsIcon size={30} />}
              title="No groups yet"
              description={isAdmin ? 'Create your first group to start chatting and tracking tasks.' : 'An admin hasn’t created any groups yet.'}
              action={
                isAdmin && (
                  <button className="btn" style={{ width: 'auto', padding: '0 18px' }} onClick={() => setCreateOpen(true)}>
                    <PlusIcon size={16} /> New group
                  </button>
                )
              }
            />
          ) : (
            <div className="channel-grid">
              {groups.map((g) => (
                <button key={g.id} className="channel-card" onClick={() => navigate(`/groups/${g.id}`)}>
                  <div className="channel-card__hash">#</div>
                  <div className="channel-card__body">
                    <div className="channel-card__name">{g.name}</div>
                    <div className="channel-card__desc">{g.description || 'No description'}</div>
                    <div className="channel-card__meta">
                      {g.memberCount ?? 0} member{g.memberCount === 1 ? '' : 's'} · {g.taskCount ?? 0} task{g.taskCount === 1 ? '' : 's'} · {g.messageCount ?? 0} messages
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Groups is a root page — raise the FAB above the bottom nav. */}
          {isAdmin && <Fab raised label="New group" onClick={() => setCreateOpen(true)} />}

          {createOpen && (
            <CreateChannelModal
              onClose={() => setCreateOpen(false)}
              onCreated={(g) => navigate(`/groups/${g.id}`)}
            />
          )}
        </>
      ) : (
        <ManageProjectsPage raiseFab embedded />
      )}
    </div>
  );
}
