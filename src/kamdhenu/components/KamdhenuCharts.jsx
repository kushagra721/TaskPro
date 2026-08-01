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

/** Thin recharts wrappers following DashboardHome.jsx's patterns, so every
 *  ERP chart (dashboard now, reports later) looks identical. */

const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.12)',
  borderRadius: 10,
  color: '#0f172a',
  boxShadow: '0 8px 24px -12px rgba(15,23,42,0.25)',
};

const AXIS_TICK = { fill: '#64748b', fontSize: 12 };

export function KerpBarChart({ data, xKey, yKey, color = '#6366f1', height = 220, formatter }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -14 }}>
          <XAxis dataKey={xKey} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={60} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
            formatter={formatter}
          />
          <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KerpAreaChart({ data, xKey, yKey, color = '#8b5cf6', height = 220, formatter }) {
  const gradientId = `kerpAreaFill-${yKey}`;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey={xKey} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={60} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ stroke: 'rgba(15,23,42,0.15)' }}
            formatter={formatter}
          />
          <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** `data`: [{ name, value, color }]. Renders the donut + a legend list. */
export function KerpDonut({ data, height = 180 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="panel__empty">No data yet.</div>;
  return (
    <div className="donut-wrap">
      <div className="donut">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="legend">
        {data.map((d) => (
          <li key={d.name}>
            <span className="legend__dot" style={{ background: d.color }} /> {d.name}
            <span className="legend__val">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
