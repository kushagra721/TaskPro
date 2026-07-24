import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { selectUser } from '../store/slices/authSlice.js';
import {
  selectOrgs,
  selectCurrentOrg,
  selectCurrentOrgId,
  selectDashboard,
  fetchDashboard,
} from '../store/slices/orgSlice.js';
import EmptyState from '../components/EmptyState.jsx';
import DateRangeControl from '../components/DateRangeControl.jsx';
import { BuildingIcon, PlusIcon } from '../components/icons.jsx';
import { timeAgo } from '../utils/time.js';
import { STATUS_META } from '../utils/status.js';

const STAT_CARDS = [
  { key: 'members', label: 'Members', accent: 'indigo', to: '/more/members' },
  { key: 'groups', label: 'Groups', accent: 'violet', to: '/groups' },
  { key: 'openTasks', label: 'Open tasks', accent: 'amber', to: '/tasks?status=OPEN' },
  { key: 'myOpenTasks', label: 'Assigned to me', accent: 'emerald', to: '/tasks?assignee=me' },
];

// Append the current period so the destination page filters identically.
const withPeriod = (to, period) => {
  if (!period.from && !period.to) return to;
  const sep = to.includes('?') ? '&' : '?';
  const parts = [];
  if (period.from) parts.push(`from=${period.from}`);
  if (period.to) parts.push(`to=${period.to}`);
  return `${to}${sep}${parts.join('&')}`;
};

export default function DashboardHome() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { openCreateOrg } = useOutletContext();
  const user = useSelector(selectUser);
  const orgs = useSelector(selectOrgs);
  const currentOrg = useSelector(selectCurrentOrg);
  const currentId = useSelector(selectCurrentOrgId);
  const dashboard = useSelector(selectDashboard);
  const [period, setPeriod] = useState({ from: '', to: '' });

  useEffect(() => {
    if (currentId) dispatch(fetchDashboard({ orgId: currentId, params: period }));
  }, [currentId, period, dispatch]);

  if (orgs.length === 0) {
    return (
      <EmptyState
        icon={<BuildingIcon size={30} />}
        title="Create your first workspace"
        description="Workspaces are where your team collaborates. Create one to start inviting members, opening groups and tracking tasks."
        action={
          <button className="btn" style={{ width: 'auto', padding: '0 20px' }} onClick={openCreateOrg}>
            <PlusIcon size={16} /> New workspace
          </button>
        }
      />
    );
  }

  const stats = dashboard?.stats || {};
  const activity = dashboard?.recentActivity || [];
  const trend = dashboard?.trend || [];
  const byStatus = dashboard?.tasksByStatus || { OPEN: 0, COMPLETED: 0, CANCELLED: 0 };
  const openList = dashboard?.openTaskList || [];
  const firstName = (user?.name || '').split(' ')[0];

  const pieData = Object.entries(byStatus)
    .filter(([k, v]) => STATUS_META[k] && v > 0)
    .map(([k, v]) => ({ name: STATUS_META[k].label, value: v, color: STATUS_META[k].color }));
  const totalTasks = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Welcome back{firstName ? `, ${firstName}` : ''} 👋</h1>
          <p className="page__subtitle">Here&apos;s what&apos;s happening in {currentOrg?.name}.</p>
        </div>
        <DateRangeControl onChange={setPeriod} />
      </div>

      <div className="stat-grid">
        {STAT_CARDS.map((c) => (
          <button
            key={c.key}
            className={`stat-card stat-card--${c.accent} stat-card--link`}
            onClick={() => navigate(withPeriod(c.to, period))}
          >
            <div className="stat-card__value">{stats[c.key] ?? 0}</div>
            <div className="stat-card__label">{c.label}</div>
          </button>
        ))}
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Tasks created (last 7 days)</h2>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 10, color: '#0f172a', boxShadow: '0 8px 24px -12px rgba(15,23,42,0.25)' }}
                  cursor={{ stroke: 'rgba(15,23,42,0.15)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#trendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Tasks by status</h2>
          </div>
          {totalTasks === 0 ? (
            <div className="panel__empty">No tasks yet. Create a group and add some tasks.</div>
          ) : (
            <div className="donut-wrap">
              <div className="donut">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
                      {pieData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 10, color: '#0f172a', boxShadow: '0 8px 24px -12px rgba(15,23,42,0.25)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="legend">
                {pieData.map((d) => (
                  <li key={d.name}>
                    <span className="legend__dot" style={{ background: d.color }} /> {d.name}
                    <span className="legend__val">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Open tasks</h2>
            {openList.length > 0 && (
              <button className="link-btn" onClick={() => navigate('/tasks?status=OPEN')}>View all</button>
            )}
          </div>
          {openList.length === 0 ? (
            <div className="panel__empty">No open tasks 🎉</div>
          ) : (
            <ul className="open-tasks">
              {openList.slice(0, 5).map((t) => (
                <li key={t.id} className="open-task" onClick={() => navigate(`/groups/${t.groupId}`)}>
                  <span className={`prio prio--${t.priority.toLowerCase()}`}>{t.priority}</span>
                  <span className="open-task__title">{t.title}</span>
                  <span className="open-task__assignee">{t.assignee ? (t.assignee.name || t.assignee.email).split(' ')[0] : 'Unassigned'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Recent activity</h2>
            {activity.length > 0 && (
              <button className="link-btn" onClick={() => navigate('/more/activities')}>View all</button>
            )}
          </div>
          {activity.length === 0 ? (
            <div className="panel__empty">No activity yet — invite members or create a group.</div>
          ) : (
            <ul className="activity">
              {activity.slice(0, 5).map((a) => (
                <li key={a.id} className="activity__item">
                  <span className="activity__dot" />
                  <div className="activity__body">
                    <span className="activity__actor">{a.actor}</span> {a.summary}
                    <div className="activity__time">{timeAgo(a.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
