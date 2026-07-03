import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';

const MAJOR_EVENTS = [1998, 2005, 2010, 2016];

function CustomDot(props) {
  const { cx, cy, payload } = props;
  if (!MAJOR_EVENTS.includes(payload.year)) return null;
  return <circle cx={cx} cy={cy} r={6} fill="#e74c3c" stroke="#fff" strokeWidth={2} />;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg px-3 py-2 text-sm border"
         style={{ background: 'var(--d2)', borderColor: 'var(--bd)', color: 'var(--tx1)' }}>
      <p className="text-[#00b4d8] font-semibold">{d.year}</p>
      <p>Avg Bleaching: <strong>{d.avg_bleaching}%</strong></p>
      <p style={{ color: 'var(--tx2)' }}>Surveys: {d.count}</p>
      {MAJOR_EVENTS.includes(d.year) && <p className="text-red-500 font-bold mt-1">⚠ Major Event</p>}
    </div>
  );
};

export function YearlyTrendChart({ data, loading }) {
  return (
    <div className="rounded-xl p-6 border h-80 transition-all"
         style={{ background: 'var(--d2)', borderColor: 'var(--bd)' }}>
      <h3 className="font-semibold mb-4" style={{ color: 'var(--tx1)' }}>
        📈 Yearly Bleaching Trend — 1980–2020
      </h3>
      {loading ? (
        <div className="w-full h-56 rounded animate-pulse" style={{ background: 'var(--d3)' }} />
      ) : (
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gd)" vertical={false} />
            <XAxis dataKey="year" stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }} />
            <YAxis stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={10} stroke="#e74c3c" strokeDasharray="4 4"
              label={{ value: 'High Risk', fill: '#e74c3c', fontSize: 11, position: 'insideTopRight' }} />
            {MAJOR_EVENTS.map(y => (
              <ReferenceLine key={y} x={y} stroke="#f39c12" strokeDasharray="3 3"
                label={{ value: 'Event', fill: '#f39c12', fontSize: 9, position: 'top' }} />
            ))}
            <Line type="monotone" dataKey="avg_bleaching" stroke="#00b4d8" strokeWidth={2.5}
              dot={<CustomDot />} activeDot={{ r: 5, fill: '#00b4d8' }} name="Avg Bleaching %" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
