import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts';

const getColor = p => p > 15 ? '#e74c3c' : p > 5 ? '#f39c12' : '#2ecc71';

const TT = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg px-3 py-2 text-sm border"
         style={{ background: 'var(--d2)', borderColor: 'var(--bd)', color: 'var(--tx1)' }}>
      <p className="text-[#00b4d8] font-semibold">{d.ocean}</p>
      <p>Avg Bleaching: <strong>{d.avg_bleaching}%</strong></p>
      <p style={{ color: 'var(--tx2)' }}>Surveys: {d.count?.toLocaleString()}</p>
    </div>
  );
};

export function OceanZoneChart({ data, loading }) {
  return (
    <div className="rounded-xl p-4 sm:p-6 border h-80 transition-all"
         style={{ background: 'var(--d2)', borderColor: 'var(--bd)' }}>
      <h3 className="font-semibold mb-4" style={{ color: 'var(--tx1)' }}>🌊 Bleaching by Ocean Zone</h3>
      {loading ? <div className="w-full h-56 rounded animate-pulse" style={{ background: 'var(--d3)' }} /> : (
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 45, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gd)" horizontal={false} />
            <XAxis type="number" stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="ocean" stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }} width={80} />
            <Tooltip content={<TT />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="avg_bleaching" radius={[0, 4, 4, 0]} barSize={22}>
              <LabelList dataKey="avg_bleaching" position="right" formatter={v => `${v}%`}
                style={{ fill: 'var(--tx2)', fontSize: 11 }} />
              {data.map((d, i) => <Cell key={i} fill={getColor(d.avg_bleaching)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
