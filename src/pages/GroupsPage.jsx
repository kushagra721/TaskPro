import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { fetchGroups, selectGroups } from '../store/slices/groupSlice.js';
import EmptyState from '../components/EmptyState.jsx';
import CreateChannelModal from '../components/CreateChannelModal.jsx';
import DateRangeControl from '../components/DateRangeControl.jsx';
import { GroupsIcon, PlusIcon } from '../components/icons.jsx';

export default function GroupsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const groups = useSelector(selectGroups);
  const isAdmin = org?.role === 'ADMIN';
  const [createOpen, setCreateOpen] = useState(false);
  const [urlParams] = useSearchParams();
  const [period, setPeriod] = useState({ from: '', to: '' });
  const initialPeriod = { from: urlParams.get('from') || '', to: urlParams.get('to') || '' };

  useEffect(() => {
    if (orgId) dispatch(fetchGroups({ orgId, params: period }));
  }, [orgId, period, dispatch]);

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
        <div>
          <h1 className="page__title">Groups</h1>
          <p className="page__subtitle">Chat and manage tasks with your team.</p>
        </div>
        <div className="head-actions">
          <DateRangeControl onChange={setPeriod} initial={initialPeriod} defaultMode="all" />
          {isAdmin && (
            <button className="btn" style={{ width: 'auto', padding: '0 16px' }} onClick={() => setCreateOpen(true)}>
              <PlusIcon size={16} /> New group
            </button>
          )}
        </div>
      </div>

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
                  {g.memberCount ?? 0} member{g.memberCount === 1 ? '' : 's'} · {g.messageCount ?? 0} messages
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateChannelModal
          onClose={() => setCreateOpen(false)}
          onCreated={(g) => navigate(`/groups/${g.id}`)}
        />
      )}
    </div>
  );
}
