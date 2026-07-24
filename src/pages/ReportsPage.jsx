import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
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
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { organizationsApi } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import DateRangeControl from '../components/DateRangeControl.jsx';
import ProgressRow from '../components/ProgressRow.jsx';
import { ReportsIcon } from '../components/icons.jsx';
import { STATUS_META } from '../utils/status.js';

const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.12)',
  borderRadius: 10,
  color: '#0f172a',
  boxShadow: '0 8px 24px -12px rgba(15,23,42,0.25)',
};

export default function ReportsPage() {
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({ from: '', to: '' });

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    organizationsApi
      .reports(orgId, period)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [orgId, period]);

  if (!org) {
    return (
      <div className="page">
        <EmptyState icon={<ReportsIcon size={30} />} title="No workspace selected" description="Pick a workspace to see its reports." />
      </div>
    );
  }

  const header = (
    <div className="page__head page__head--row">
      <div className="page__head-text">
        <h1 className="page__title">Reports</h1>
        <p className="page__subtitle">Progress across {org.name} — overall, by member and by group.</p>
      </div>
      <DateRangeControl onChange={setPeriod} />
    </div>
  );

  if (loading || !data) {
    return (
      <div className="page">
        {header}
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      </div>
    );
  }

  const { overall, trend, members, groups } = data;
  const statusData = [
    { name: STATUS_META.OPEN.label, value: overall.open, color: STATUS_META.OPEN.color },
    { name: STATUS_META.COMPLETED.label, value: overall.completed, color: STATUS_META.COMPLETED.color },
    { name: STATUS_META.CANCELLED.label, value: overall.cancelled, color: STATUS_META.CANCELLED.color },
  ].filter((d) => d.value > 0);

  const cards = [
    { label: 'Total tasks', value: overall.total, accent: 'indigo' },
    { label: 'Completed', value: overall.completed, accent: 'emerald' },
    { label: 'Open', value: overall.open, accent: 'amber' },
    { label: 'Completion rate', value: `${overall.completionRate}%`, accent: 'violet' },
  ];

  return (
    <div className="page">
      {header}

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card stat-card--${c.accent}`}>
            <div className="stat-card__value">{c.value}</div>
            <div className="stat-card__label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel__head"><h2 className="panel__title">Task creation (14 days)</h2></div>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="repTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(15,23,42,0.15)' }} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#repTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head"><h2 className="panel__title">Tasks by status</h2></div>
          {statusData.length === 0 ? (
            <div className="panel__empty">No tasks yet.</div>
          ) : (
            <div className="donut-wrap">
              <div className="donut">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
                      {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="legend">
                {statusData.map((d) => (
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
          <div className="panel__head"><h2 className="panel__title">Progress by member</h2></div>
          {members.length === 0 ? (
            <div className="panel__empty">No members yet.</div>
          ) : (
            <ul className="progress-list">
              {members.map((m) => (
                <ProgressRow
                  key={m.id}
                  avatar={<Avatar name={m.name} email={m.email} src={m.avatarUrl} size={30} />}
                  label={m.name || m.email}
                  sub={`${m.open} open · ${m.completed} completed · ${m.cancelled} cancelled`}
                  rate={m.completionRate}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel__head"><h2 className="panel__title">Progress by group</h2></div>
          {groups.length === 0 ? (
            <div className="panel__empty">No groups yet.</div>
          ) : (
            <ul className="progress-list">
              {groups.map((g) => (
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
      </div>
    </div>
  );
}
