import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { fetchGroups, selectGroups } from '../store/slices/groupSlice.js';
import { organizationsApi } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import CreateChannelModal from '../components/CreateChannelModal.jsx';
import Fab from '../components/Fab.jsx';
import ProgressRow from '../components/ProgressRow.jsx';
import Avatar from '../components/Avatar.jsx';
import ManageProjectsPage from './more/ManageProjectsPage.jsx';
import ManageOrgPage from './more/ManageOrgPage.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { GroupsIcon, FolderIcon, PlusIcon } from '../components/icons.jsx';

const TAB_META = {
  groups: { title: 'Groups', subtitle: 'Chat and manage tasks with your team.' },
  projects: { title: 'Projects', subtitle: 'Organize tasks into projects. Anyone can add one.' },
  members: { title: 'Members', subtitle: 'Members, roles and invitations for this organization.' },
};

export default function GroupsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const groups = useSelector(selectGroups);
  const isAdmin = org?.role === 'ADMIN';
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState('groups'); // 'groups' | 'projects' | 'members'
  // Progress-by-group/project/member — one fetch feeds every tab's panel.
  // `reports` already applies the same role-based scoping used elsewhere
  // (admins see everything, members only their co-membership slice).
  const [progress, setProgress] = useState({ groups: [], projects: [], members: [] });
  const isMobile = useIsMobile();

  // Members tab is admin-only — if role changes away from admin while it's
  // selected (or a non-admin somehow lands here), fall back to Groups.
  useEffect(() => {
    if (tab === 'members' && !isAdmin) setTab('groups');
  }, [tab, isAdmin]);

  useEffect(() => {
    if (orgId) dispatch(fetchGroups(orgId));
  }, [orgId, dispatch]);

  useEffect(() => {
    if (!orgId) return;
    organizationsApi
      .reports(orgId)
      .then((r) => setProgress({ groups: r.groups, projects: r.projects, members: r.members }))
      .catch(() => setProgress({ groups: [], projects: [], members: [] }));
  }, [orgId]);

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
          <h1 className="page__title">{TAB_META[tab].title}</h1>
          <p className="page__subtitle">{TAB_META[tab].subtitle}</p>
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
        {isAdmin && (
          <button className={`tab ${tab === 'members' ? 'tab--active' : ''}`} onClick={() => setTab('members')}>
            Members
          </button>
        )}
      </div>

      {tab === 'groups' ? (
        <>
          <div className="dash-grid">
            <section>
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
                        <div className="channel-card__meta">
                          {g.memberCount ?? 0} member{g.memberCount === 1 ? '' : 's'} ·{' '}
                          {g.openTaskCount ?? 0} open task{g.openTaskCount === 1 ? '' : 's'} · {g.messageCount ?? 0} messages
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {groups.length > 0 && (
              <section className="panel">
                <div className="panel__head"><h2 className="panel__title">Progress by group</h2></div>
                {progress.groups.length === 0 ? (
                  <div className="panel__empty">No tasks yet.</div>
                ) : (
                  <ul className="progress-list">
                    {progress.groups.map((g) => (
                      <ProgressRow
                        key={g.id}
                        avatar={<span className="org-badge sm">{g.name[0].toUpperCase()}</span>}
                        label={`#${g.name}`}
                        sub={`${g.open} open · ${g.completed} completed`}
                        rate={g.completionRate}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>

          {/* Groups is a root page — raise the FAB above the bottom nav. */}
          {isAdmin && <Fab raised label="New group" onClick={() => setCreateOpen(true)} />}

          {createOpen && (
            <CreateChannelModal
              onClose={() => setCreateOpen(false)}
              onCreated={(g) => navigate(`/groups/${g.id}`)}
            />
          )}
        </>
      ) : tab === 'projects' ? (
        <div className="dash-grid">
          <section><ManageProjectsPage raiseFab embedded /></section>
          <section className="panel">
            <div className="panel__head"><h2 className="panel__title">Progress by project</h2></div>
            {progress.projects.length === 0 ? (
              <div className="panel__empty">No projects yet.</div>
            ) : (
              <ul className="progress-list">
                {progress.projects.map((p) => (
                  <ProgressRow
                    key={p.id}
                    avatar={<span className="org-badge sm"><FolderIcon size={14} /></span>}
                    label={p.name}
                    sub={`${p.open} open · ${p.completed} completed`}
                    rate={p.completionRate}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div className="dash-grid">
          <section><ManageOrgPage /></section>
          <section className="panel">
            <div className="panel__head"><h2 className="panel__title">Progress by member</h2></div>
            {progress.members.length === 0 ? (
              <div className="panel__empty">No members yet.</div>
            ) : (
              <ul className="progress-list">
                {progress.members.map((m) => (
                  <ProgressRow
                    key={m.id}
                    avatar={<Avatar name={m.name} email={m.email} size={30} />}
                    label={m.name || m.email}
                    sub={`${m.open} open · ${m.completed} completed · ${m.cancelled} cancelled`}
                    rate={m.completionRate}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
