import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LabelList,
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
 * The four things the page reports on. `key` doubles as the key into the API
 * payload (`data.groups` / `.projects` / `.clients` / `.members`), which is what
 * lets one chart component serve all four.
 *
 * THEY ARE NO LONGER TABS. Every one renders, stacked, so the whole picture is
 * on the page at once — a report you have to click through four times to read
 * is four reports.
 */
const ENTITIES = [
  { key: 'groups', noun: 'group', plural: 'groups' },
  { key: 'projects', noun: 'project', plural: 'projects' },
  { key: 'clients', noun: 'client space', plural: 'client spaces' },
  /*
   * ADMIN/OWNER ONLY, and this survived the tabs being removed because the
   * reason has nothing to do with navigation: this section ranks named people by
   * how much work they have open, finished and cancelled. That is a management
   * view of colleagues rather than a report on the work, and putting it in front
   * of every member turns the page into a leaderboard nobody asked to be on.
   */
  { key: 'members', noun: 'member', plural: 'members', adminOnly: true },
];

/** `field` is the lowercase key the API shapes each row with (`withRate`). */
const STATUS_TABS = [
  { key: 'OPEN', field: 'open', accent: 'indigo' },
  { key: 'COMPLETED', field: 'completed', accent: 'emerald' },
  { key: 'CANCELLED', field: 'cancelled', accent: 'rose' },
];

/** How many bars a section shows before "View all". Not a cap — every row is
 *  one click away, and the count on the button says how many are waiting. */
const CHART_ROWS = 8;

/**
 * TEMPORARILY HIDDEN, at the product owner's request. Flip either to `true` to
 * bring the panel back — the layout below already accounts for both states.
 *
 * Deliberately flags rather than commented-out JSX. The Status mix panel
 * contains its own `/* … *\/` comment, which would close an enclosing JSX
 * comment early and leave a syntax error; and a flag keeps this code compiling,
 * scope-checked and honest about still existing, where a comment block quietly
 * rots until someone tries to restore it.
 */
const SHOW_STATUS_MIX = false;
const SHOW_GROUP_BREAKDOWN = false;

/**
 * Narrower than this many pixels and the percentage MOVES OUTSIDE the bar,
 * joining the count, rather than being dropped.
 *
 * A bar's width is proportional to its count against the biggest count, not to
 * its percentage — the two are unrelated, and live data has a bar 38% of the
 * widest carrying a 75% label. So a short bar cannot hold its own text: "0.2%"
 * centred on twenty pixels spills over both ends. Every bar still states its
 * share; only where the text sits changes.
 */
const MIN_INNER_LABEL_PX = 34;

/**
 * A share, never rounded away to nothing.
 *
 * Plain rounding prints "0%" for 1 open task out of 500 — which is not what the
 * bar says and reads as an error. So a share BELOW 1% keeps a decimal, and one
 * below a tenth of a percent says "<0.1%" rather than claiming a precision it
 * does not have.
 *
 * ONE PERCENT IS THE THRESHOLD, not ten. Decimals exist here to stop a real
 * value being rounded away to nothing; at 7.6% nothing is lost by showing 8%,
 * and a column of "7.6% / 43.2% / 34.9%" is harder to scan than the whole
 * numbers it replaces for no gain in meaning.
 *
 * These are counts of tasks, so the value can never be negative; 0 only ever
 * means genuinely none.
 */
const share = (part, whole) => {
  if (!whole || !part) return '0%';
  const v = (part / whole) * 100;
  if (v >= 1) return `${Math.round(v)}%`;
  if (v < 0.1) return '<0.1%';
  // Trims a trailing ".0", so 0.50 shows as "0.5%".
  return `${Number((Math.round(v * 10) / 10).toFixed(1))}%`;
};

/**
 * One entity's numbers for the selected status.
 *
 * The totals are summed from the SAME rows the section renders rather than
 * taken from `overall`. That matters and is not pedantry: every task has a
 * group, but a task need not have a project or a client, so the Projects
 * section legitimately totals less than the workspace does. Reading a headline
 * from `overall` would print a figure its own rows could never add up to.
 */
const sliceFor = (rows, field) => {
  const list = rows || [];
  const totals = list.reduce(
    (acc, r) => ({
      open: acc.open + r.open,
      completed: acc.completed + r.completed,
      cancelled: acc.cancelled + r.cancelled,
      total: acc.total + r.total,
    }),
    { open: 0, completed: 0, cancelled: 0, total: 0 }
  );
  const sorted = [...list].sort(
    (a, b) =>
      b[field] - a[field] ||
      b.total - a.total ||
      // A member may have no name yet (an OTP account that never set one), and
      // localeCompare on null throws — which the other three never hit.
      (a.name || a.email || '').localeCompare(b.name || b.email || '')
  );
  /*
   * `active` is what a list renders: entities carrying at least one task in this
   * period. Projects and client spaces are listed org-wide by the API while
   * their task COUNTS are scoped to what the caller may see, so a regular member
   * legitimately gets 23 client spaces of which 22 are all zeroes — a wall of
   * empty rows that buries the one that matters.
   */
  const active = sorted.filter((r) => r.total > 0);

  return {
    rows: sorted,
    active,
    totals,
    selected: totals[field],
    withAny: sorted.filter((r) => r[field] > 0).length,
    /*
     * EVERY row that carries at least one task of this status, ranked — not a
     * top-N. The section decides how many to draw and offers the rest behind
     * "View all", so the data for that expansion has to be here.
     */
    ranked: active
      .filter((r) => r[field] > 0)
      .map((r) => ({ ...r, chartName: r.name || r.email || '—', countLabel: String(r[field]) })),
  };
};

/**
 * Draws BOTH labels for one bar, so their placement can depend on each other.
 *
 * Two separate `LabelList`s cannot do this: `position` is a property of the
 * list, not of a datum, so the percentage could only be always-inside (spilling
 * off short bars) or always-outside (colliding with the count). One renderer
 * measures the bar it is given and decides:
 *
 *   wide enough — percentage inside in white, count just past the end
 *   too narrow  — both outside together, "0.2% · 1"
 *
 * Either way the share is always stated, which is the point.
 */
function BarLabels({ x = 0, y = 0, width = 0, height = 0, index, rows }) {
  const row = rows[index];
  if (!row) return null;
  const inside = width >= MIN_INNER_LABEL_PX;
  const midY = y + height / 2;
  return (
    <g>
      {inside && (
        <text
          x={x + width / 2}
          y={midY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={10.5}
          fontWeight={600}
        >
          {row.pctLabel}
        </text>
      )}
      <text x={x + width + 8} y={midY} dominantBaseline="central" fill="#475569" fontSize={11} fontWeight={600}>
        {inside ? row.countLabel : `${row.pctLabel} · ${row.countLabel}`}
      </text>
    </g>
  );
}

/**
 * "{Status} by {noun}" — a horizontal bar per entity, labelled with the count
 * and its share of the workspace's tasks of that status.
 *
 * ===========================================================================
 * THE PERCENTAGE IS OF `basis` — the WORKSPACE total for the selected status,
 * the same 31 the pill and the headline card show. Green Team's 6 open reads
 * as 6/31 = 19%: "this group holds 19% of all the open work".
 *
 * It used to be the row's own total (6 of Green Team's 79 tasks = 8%), which
 * answered a different question — how much of THIS group's work is open — and
 * made rows incomparable: a group with 3 tasks all open showed 100% beside a
 * group carrying most of the workspace.
 *
 * CONSEQUENCE WORTH KNOWING: only the group percentages sum to 100%. Every task
 * has a group, but a task need not have a project, a client space or an
 * assignee, so those three sections legitimately add up to less — the shortfall
 * is the work filed under none of them.
 * ===========================================================================
 *
 * PERCENTAGE INSIDE, COUNT OUTSIDE. The share belongs on the bar because it
 * *is* the proportion the bar is drawn from; the count is the absolute figure
 * and sits clear of it, where a long number cannot be clipped by a short bar.
 */
function ByEntity({ entity, slice, status, meta, basis }) {
  /*
   * Collapsed by default. Client spaces and members run to dozens of rows, and
   * a page opening at four full-height charts buries the leaders it exists to
   * surface — but a hard top-8 hides rows with no way to reach them, which is
   * what this replaced.
   */
  const [expanded, setExpanded] = useState(false);
  const { ranked } = slice;
  const hidden = Math.max(0, ranked.length - CHART_ROWS);

  const chart = (expanded ? ranked : ranked.slice(0, CHART_ROWS)).map((r) => ({
    ...r,
    // Computed here rather than in `sliceFor` because the denominator is the
    // WORKSPACE total, which belongs to a different slice than this row does.
    pctLabel: share(r[status.field], basis),
  }));

  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">
          {meta.label} by {entity.noun}
        </h2>
        <span className="panel__hint">
          share of all {meta.label.toLowerCase()}
        </span>
      </div>
      {chart.length === 0 ? (
        <div className="panel__empty">
          No {meta.label.toLowerCase()} tasks by {entity.noun} in this period.
        </div>
      ) : (
        <div style={{ height: Math.max(180, chart.length * 34) }}>
          <ResponsiveContainer width="100%" height="100%">
            {/* Horizontal bars: entity names are words, and words on a vertical
                axis stay readable where rotated tick labels do not. The right
                margin is what stops the longest label being clipped. */}
            {/* `right` has to hold the widest outside label, which on a short
                bar is the percentage AND the count together ("<0.1% · 1"). */}
            <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 78, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="chartName"
                width={116}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
              <Bar dataKey={status.field} name={meta.label} fill={meta.color} radius={[0, 6, 6, 0]} barSize={16}>
                {/* One renderer for both labels — see `BarLabels` for why they
                    cannot be two independent LabelLists. */}
                <LabelList content={(props) => <BarLabels {...props} rows={chart} />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Only when there is something to reveal. The count is on the button
          because "View all" alone does not say whether it opens two more rows
          or twenty. */}
      {hidden > 0 && (
        <button type="button" className="rep-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : `View all ${ranked.length}`}
        </button>
      )}
    </section>
  );
}

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

  const isAdmin = isAdminRole(org?.role);
  const entities = useMemo(() => ENTITIES.filter((e) => !e.adminOnly || isAdmin), [isAdmin]);

  /*
   * The status lives in the URL, exactly as the Hub's tabs do. This page
   * unmounts whenever the user follows a link out and back, so local state would
   * silently reset to Open — and it makes a particular view ("cancelled work")
   * something you can send to someone. `replace` so flipping it does not fill
   * the back button with history.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const statusKey = STATUS_TABS.some((t) => t.key === searchParams.get('status'))
    ? searchParams.get('status')
    : 'OPEN';

  const setStatus = (next) => {
    // The default is omitted so the clean URL is the default view.
    setSearchParams(next === 'OPEN' ? {} : { status: next }, { replace: true });
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

  const status = STATUS_TABS.find((t) => t.key === statusKey);
  const meta = STATUS_META[statusKey];

  /** One slice per entity, keyed the same way, so every section below reads its
   *  own numbers from one place. */
  const slices = useMemo(() => {
    const out = {};
    for (const e of ENTITIES) out[e.key] = sliceFor(data?.[e.key], status.field);
    return out;
  }, [data, status.field]);

  /*
   * The More menu withholds Reports from a CLIENT; this closes the hand-typed
   * URL behind it, so the entry and the route agree. Not a security boundary —
   * `report.service.js` already scopes every figure by channel membership — but
   * landing an external party on a page headed "Progress across <supplier>" is
   * confusing whether or not the numbers are theirs to see.
   *
   * Declared after the hooks above so the hook order never varies by role.
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

  const { trend } = data;
  /*
   * THE HEADLINE IS THE GROUPS SLICE, and that is a deliberate choice rather
   * than a leftover default: every task belongs to exactly one group, so the
   * group totals ARE the workspace totals. Projects and client spaces are
   * optional on a task, so either of those would headline a number smaller than
   * the work actually done — which is right inside its own section and wrong at
   * the top of the page.
   */
  const groups = slices.groups;
  const { rows, active, totals, selected, withAny } = groups;

  // The donut shows the workspace's own mix, so it always adds up to the
  // status pills beside it.
  const mix = STATUS_TABS.map((s) => ({
    key: s.key,
    name: STATUS_META[s.key].label,
    value: totals[s.field],
    color: STATUS_META[s.key].color,
  })).filter((d) => d.value > 0);

  const cards = [
    { label: `${meta.label} tasks`, value: selected, accent: status.accent },
    { label: 'Tasks in total', value: totals.total, accent: 'violet' },
    { label: `Share that is ${meta.label.toLowerCase()}`, value: share(selected, totals.total), accent: 'amber' },
    {
      label: `Groups with ${meta.label.toLowerCase()}`,
      value: `${withAny}/${rows.length}`,
      accent: 'emerald',
    },
  ];

  return (
    <div className="page">
      {header}

      {/* The tasks page's own status control: `.filter-tab` pills with counts,
          so the two screens ask the same question the same way. The one addition
          is colour — an active pill takes ITS status's colour rather than the
          shared brand gradient, because those three colours already identify the
          same statuses in the donut, the bars and every mix bar on this page,
          and a single indigo for all three would break that thread.

          This is now the ONLY selector on the page. The entity tabs above it are
          gone: every entity has its own section below, so there is nothing left
          to choose between. */}
      <div className="filter-tabs filter-tabs--status">
        {STATUS_TABS.map((t) => {
          const on = statusKey === t.key;
          const color = STATUS_META[t.key].color;
          return (
            <button
              key={t.key}
              className={`filter-tab ${on ? 'filter-tab--active filter-tab--status-on' : ''}`}
              style={on ? { background: color, borderColor: color } : undefined}
              onClick={() => setStatus(t.key)}
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

      {SHOW_STATUS_MIX && (
      <div className="dash-grid">
        <ByEntity entity={ENTITIES[0]} slice={groups} status={status} meta={meta} basis={selected} />

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
                             selected status instead of leaving it a second,
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
                    <button type="button" className="legend__btn" onClick={() => setStatus(d.key)}>
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
      )}

      {/* The same chart, two up.

          Groups is INCLUDED here only while the Status mix panel is hidden —
          with the donut showing it sits beside it above, and repeating it would
          be the same chart twice on one page. With the donut gone it would
          otherwise be a lone panel filling half a row beside a gap. */}
      <div className="dash-grid">
        {(SHOW_STATUS_MIX ? entities.slice(1) : entities).map((e) => (
          <ByEntity key={e.key} entity={e} slice={slices[e.key]} status={status} meta={meta} basis={selected} />
        ))}
      </div>

      {SHOW_GROUP_BREAKDOWN && (
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Breakdown by group</h2>
          <span className="panel__hint">
            {active.length} of {rows.length} with tasks · sorted by {meta.label.toLowerCase()}
          </span>
        </div>
        {active.length === 0 ? (
          <div className="panel__empty">
            {rows.length === 0 ? 'No groups yet.' : 'None of your groups have tasks in this period.'}
          </div>
        ) : (
          <ul className="rep-list">
            {active.map((r) => (
              <li key={r.id} className="rep-row">
                <div className="rep-row__head">
                  <div className="rep-row__label">
                    <OrgBadge name={r.name} size="sm" />
                    <div className="rep-row__text">
                      <div className="rep-row__name">#{r.name}</div>
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
      )}

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Tasks created</h2>
          {/* Said plainly, because this chart is the one thing on the page that
              does NOT follow the status pills — it counts every task raised in
              the period regardless of status or where it was filed. */}
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
    </div>
  );
}
