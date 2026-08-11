import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { organizationsApi } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import OrgBadge from '../components/OrgBadge.jsx';
import DateRangeControl from '../components/DateRangeControl.jsx';
import StatusBar from '../components/StatusBar.jsx';
import { ReportsIcon } from '../components/icons.jsx';
import { STATUS_META } from '../utils/status.js';
import { isAdminRole, isClientRole } from '../utils/role.js';

const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.12)',
  borderRadius: 10,
  color: '#0f172a',
  boxShadow: '0 8px 24px -12px rgba(15,23,42,0.25)',
};

/**
 * The three things a report can be *about*. `key` doubles as the key into the
 * API payload (`data.groups` / `.projects` / `.clients`), which is what lets
 * every panel below read `rows` without knowing which tab is open.
 */
const ENTITY_TABS = [
  { key: 'groups', label: 'Groups', noun: 'group', plural: 'groups' },
  { key: 'projects', label: 'Projects', noun: 'project', plural: 'projects' },
  { key: 'clients', label: 'Clients Space', noun: 'client space', plural: 'client spaces' },
  /*
   * ADMIN/OWNER ONLY. Not a styling choice: this tab ranks named people by how
   * much work they have open, finished and cancelled, which is a management
   * view of colleagues rather than a report on the work itself. The other three
   * tabs are about channels, projects and customers; this one is about
   * individuals, and putting it in front of every member turns the reports page
   * into a leaderboard nobody asked to be on.
   *
   * `adminOnly` is honoured in two places below — which tabs render, and which
   * `?tab=` values the URL will accept — because hiding the button alone leaves
   * the view one hand-typed query string away.
   */
  { key: 'members', label: 'Members', noun: 'member', plural: 'members', adminOnly: true },
];

/** `field` is the lowercase key the API shapes each row with (`withRate`). */
const STATUS_TABS = [
  { key: 'OPEN', field: 'open', accent: 'indigo' },
  { key: 'COMPLETED', field: 'completed', accent: 'emerald' },
  { key: 'CANCELLED', field: 'cancelled', accent: 'rose' },
];

/** Charts stop being readable long before a list does, so the bar chart shows
 *  the leaders and the panel below it carries every row. */
const CHART_ROWS = 8;

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

export default function ReportsPage() {
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  /*
   * Seeded to match what `DateRangeControl defaultMode="all"` emits on mount,
   * exactly as the dashboard does. Without the seed the first request carries
   * no range, the API applies its own 'month' fallback for Reports, and the
   * page paints a month of data before the control announces "all" a tick later
   * and it all refetches — a visible flash and a wasted round trip.
   */
  const [period, setPeriod] = useState({ from: '', to: '', range: 'all' });

  /*
   * Both selections live in the URL, exactly as the Hub's tabs do. This page
   * unmounts whenever the user follows a link out and back, so local state
   * would silently reset to Groups/Open — and it makes a particular view
   * ("cancelled work by client space") something you can send to someone.
   * `replace` so flipping tabs does not fill the back button with history.
   */
  const isAdmin = isAdminRole(org?.role);
  const entityTabs = useMemo(() => ENTITY_TABS.filter((t) => !t.adminOnly || isAdmin), [isAdmin]);

  const [searchParams, setSearchParams] = useSearchParams();
  // Validated against the tabs THIS ROLE has, so `?tab=members` as a regular
  // member falls back to Groups rather than rendering a tab with no button.
  const entityKey = entityTabs.some((t) => t.key === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'groups';
  const statusKey = STATUS_TABS.some((t) => t.key === searchParams.get('status'))
    ? searchParams.get('status')
    : 'OPEN';

  const setTabs = (next) => {
    const merged = { tab: entityKey, status: statusKey, ...next };
    const params = {};
    // Defaults are omitted so the clean URL is the default view.
    if (merged.tab !== 'groups') params.tab = merged.tab;
    if (merged.status !== 'OPEN') params.status = merged.status;
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setLoading(true);
    organizationsApi
      .reports(orgId, period)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    // A slow reply for one range must not land after a newer one and leave the
    // page disagreeing with the control that asked for it.
    return () => {
      cancelled = true;
    };
  }, [orgId, period]);

  const entity = entityTabs.find((t) => t.key === entityKey);
  const status = STATUS_TABS.find((t) => t.key === statusKey);
  const meta = STATUS_META[statusKey];

  /**
   * Everything the page renders is derived here from one slice of the payload,
   * so no two panels can disagree about a number.
   *
   * The status counts are summed from the SAME rows the list renders rather
   * than taken from `overall`. That matters and is not pedantry: every task has
   * a group, but a task need not have a project or a client, so the Projects
   * tab legitimately totals less than the workspace does. Reading the headline
   * from `overall` would show a figure the rows below could never add up to.
   */
  const slice = useMemo(() => {
    const rows = data?.[entityKey] || [];
    const totals = rows.reduce(
      (acc, r) => ({
        open: acc.open + r.open,
        completed: acc.completed + r.completed,
        cancelled: acc.cancelled + r.cancelled,
        total: acc.total + r.total,
      }),
      { open: 0, completed: 0, cancelled: 0, total: 0 }
    );
    const sorted = [...rows].sort(
      (a, b) =>
        b[status.field] - a[status.field] ||
        b.total - a.total ||
        // A member may have no name yet (an OTP account that never set one), and
        // localeCompare on null throws — which the other three tabs never hit.
        (a.name || a.email || '').localeCompare(b.name || b.email || '')
    );
    /*
     * `active` is what the list renders: entities that carry at least one task
     * in this period. Projects and client spaces are listed org-wide by the API
     * while their task COUNTS are scoped to what the caller may see, so a
     * regular member legitimately gets 23 client spaces of which 22 are all
     * zeroes — a wall of empty rows that buries the one that matters. The panel
     * head states how many were set aside, so nothing disappears silently.
     */
    const active = sorted.filter((r) => r.total > 0);
    return {
      rows: sorted,
      active,
      totals,
      selected: totals[status.field],
      withAny: sorted.filter((r) => r[status.field] > 0).length,
      chart: active.filter((r) => r[status.field] > 0).slice(0, CHART_ROWS),
    };
  }, [data, entityKey, status.field]);

  /*
   * The More menu withholds Reports from a CLIENT; this closes the hand-typed
   * URL behind it, so the entry and the route agree. Not a security boundary —
   * `report.service.js` already scopes every figure by channel membership, and
   * a client belongs to one channel — but landing an external party on a page
   * headed "Progress across <supplier>" is confusing whether or not the numbers
   * are theirs to see.
   *
   * Declared after the hooks above so the hook order never varies by role,
   * which is what an early return placed higher would do.
   */
  if (isClientRole(org?.role)) return <Navigate to="/dashboard" replace />;

  if (!org) {
    return (
      <div className="page">
        <EmptyState
          icon={<ReportsIcon size={30} />}
          title="No workspace selected"
          description="Pick a workspace to see its reports."
        />
      </div>
    );
  }

  const header = (
    <div className="page__head page__head--row">
      <div className="page__head-text">
        <h1 className="page__title">Reports</h1>
        <p className="page__subtitle">Progress across {org.name}.</p>
      </div>
      <DateRangeControl onChange={setPeriod} defaultMode="all" />
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

  const { trend, members } = data;
  const { rows, active, totals, selected, withAny, chart } = slice;

  // The donut shows the slice's own mix, not the workspace's — so it always
  // adds up to the rows on screen.
  const mix = STATUS_TABS.map((s) => ({
    key: s.key,
    name: STATUS_META[s.key].label,
    value: totals[s.field],
    color: STATUS_META[s.key].color,
  })).filter((d) => d.value > 0);

  const memberRows = [...members]
    .filter((m) => m[status.field] > 0)
    .sort((a, b) => b[status.field] - a[status.field])
    .slice(0, 8);

  const cards = [
    { label: `${meta.label} tasks`, value: selected, accent: status.accent },
    { label: `Tasks in ${entity.plural}`, value: totals.total, accent: 'violet' },
    { label: `Share that is ${meta.label.toLowerCase()}`, value: `${pct(selected, totals.total)}%`, accent: 'amber' },
    {
      label: `${entity.plural[0].toUpperCase()}${entity.plural.slice(1)} with ${meta.label.toLowerCase()}`,
      value: `${withAny}/${rows.length}`,
      accent: 'emerald',
    },
  ];

  return (
    <div className="page">
      {header}

      {/* Two rows, deliberately distinct: the first chooses WHAT the report is
          about, the second WHICH tasks. Same `.tab` vocabulary as the Hub so
          they read as tabs rather than as a new control to learn. */}
      <div className="groups-tabbar">
        {entityTabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${entityKey === t.key ? 'tab--active' : ''}`}
            onClick={() => setTabs({ tab: t.key })}
          >
            {t.label} <span className="tab__count">{(data[t.key] || []).length}</span>
          </button>
        ))}
      </div>

      {/* The tasks page's own status control: `.filter-tab` pills with counts,
          so the two screens ask the same question the same way. The one
          addition is colour — an active pill takes ITS status's colour rather
          than the shared brand gradient, because those three colours already
          identify the same statuses in the donut, the bars and every mix bar on
          this page, and a single indigo for all three would break that thread. */}
      <div className="filter-tabs filter-tabs--status">
        {STATUS_TABS.map((t) => {
          const on = statusKey === t.key;
          const color = STATUS_META[t.key].color;
          return (
            <button
              key={t.key}
              className={`filter-tab ${on ? 'filter-tab--active filter-tab--status-on' : ''}`}
              style={on ? { background: color, borderColor: color } : undefined}
              onClick={() => setTabs({ status: t.key })}
            >
              <span className="filter-tab__dot" style={{ background: on ? '#fff' : color }} />
              {STATUS_META[t.key].label}
              <span className="filter-tab__count">{totals[t.field]}</span>
            </button>
          );
        })}
      </div>

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
          <div className="panel__head">
            <h2 className="panel__title">
              {meta.label} by {entity.noun}
            </h2>
            {rows.length > CHART_ROWS && <span className="panel__hint">Top {CHART_ROWS}</span>}
          </div>
          {chart.length === 0 ? (
            <div className="panel__empty">No {meta.label.toLowerCase()} tasks in this period.</div>
          ) : (
            <div style={{ height: Math.max(180, chart.length * 34) }}>
              <ResponsiveContainer width="100%" height="100%">
                {/* Horizontal bars: entity names are words, and words on a
                    vertical axis stay readable where rotated tick labels do not. */}
                <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={116}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                  <Bar dataKey={status.field} name={meta.label} fill={meta.color} radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Status mix</h2>
          </div>
          {mix.length === 0 ? (
            <div className="panel__empty">No tasks in this period.</div>
          ) : (
            <div className="donut-wrap">
              <div className="donut">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={mix} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
                      {mix.map((d) => (
                        <Cell
                          key={d.name}
                          fill={d.color}
                          /* Dimming the other slices ties the donut to the
                             selected tab instead of leaving it a second,
                             unrelated summary. */
                          opacity={d.key === statusKey ? 1 : 0.35}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* The legend doubles as the status switcher — the obvious thing
                  to do with a slice you want to look at is click it. */}
              <ul className="legend">
                {mix.map((d) => (
                  <li key={d.name}>
                    <button type="button" className="legend__btn" onClick={() => setTabs({ status: d.key })}>
                      <span className="legend__dot" style={{ background: d.color }} /> {d.name}
                      <span className="legend__val">{d.value}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Breakdown by {entity.noun}</h2>
          <span className="panel__hint">
            {active.length} of {rows.length} with tasks · sorted by {meta.label.toLowerCase()}
          </span>
        </div>
        {active.length === 0 ? (
          <div className="panel__empty">
            {rows.length === 0
              ? `No ${entity.plural} yet.`
              : `None of your ${entity.plural} have tasks in this period.`}
          </div>
        ) : (
          <ul className="rep-list">
            {active.map((r) => (
              <li key={r.id} className="rep-row">
                <div className="rep-row__head">
                  <div className="rep-row__label">
                    {/* A person gets their avatar (and its initials fallback);
                        a channel/project/space gets the name-tinted badge. */}
                    {entityKey === 'members' ? (
                      <Avatar name={r.name} email={r.email} src={r.avatarUrl} size={28} />
                    ) : (
                      <OrgBadge name={r.name} size="sm" />
                    )}
                    <div className="rep-row__text">
                      <div className="rep-row__name">
                        {entityKey === 'groups' ? `#${r.name}` : r.name || r.email}
                      </div>
                      <div className="rep-row__sub">
                        {r.open} open · {r.completed} completed · {r.cancelled} cancelled
                      </div>
                    </div>
                  </div>
                  <div className="rep-row__stat">
                    <span className="rep-row__count" style={{ color: meta.color }}>
                      {r[status.field]}
                    </span>
                    <span className="rep-row__of">of {r.total}</span>
                  </div>
                </div>
                <StatusBar open={r.open} completed={r.completed} cancelled={r.cancelled} emphasis={statusKey} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* On the Members tab the "by member" panel below would be a shorter,
          top-8 copy of the breakdown already filling the page, so it is dropped
          and the trend runs full width instead of sitting beside a gap. */}
      {entityKey === 'members' ? (
        <section className="panel">

          <div className="panel__head">
            <h2 className="panel__title">Tasks created</h2>
            {/* Said plainly, because this chart is the one thing on the page
                that does NOT follow the two tabs — it counts every task raised
                in the period regardless of status or where it was filed. */}
            <span className="panel__hint">All statuses</span>
          </div>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="repTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(15,23,42,0.15)' }} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#repTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : (
        <div className="dash-grid">
          <section className="panel">

          <div className="panel__head">
            <h2 className="panel__title">Tasks created</h2>
            {/* Said plainly, because this chart is the one thing on the page
                that does NOT follow the two tabs — it counts every task raised
                in the period regardless of status or where it was filed. */}
            <span className="panel__hint">All statuses</span>
          </div>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="repTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(15,23,42,0.15)' }} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#repTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          </section>
          <section className="panel">

          <div className="panel__head">
            <h2 className="panel__title">{meta.label} by member</h2>
            <span className="panel__hint">By assignee</span>
          </div>
          {memberRows.length === 0 ? (
            <div className="panel__empty">Nobody has {meta.label.toLowerCase()} tasks in this period.</div>
          ) : (
            <ul className="rep-list rep-list--compact">
              {memberRows.map((m) => (
                <li key={m.id} className="rep-row">
                  <div className="rep-row__head">
                    <div className="rep-row__label">
                      <Avatar name={m.name} email={m.email} src={m.avatarUrl} size={28} />
                      <div className="rep-row__text">
                        <div className="rep-row__name">{m.name || m.email}</div>
                        <div className="rep-row__sub">{m.total} total</div>
                      </div>
                    </div>
                    <div className="rep-row__stat">
                      <span className="rep-row__count" style={{ color: meta.color }}>
                        {m[status.field]}
                      </span>
                    </div>
                  </div>
                  <StatusBar open={m.open} completed={m.completed} cancelled={m.cancelled} emphasis={statusKey} />
                </li>
              ))}
            </ul>
          )}
          </section>
        </div>
      )}

    </div>
  );
}
