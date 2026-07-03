import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TT = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg px-3 py-2 text-sm border"
         style={{ background: 'var(--d2)', borderColor: 'var(--bd)', color: 'var(--tx1)' }}>
      <p>SSTA: <strong>{d.ssta?.toFixed(2)}</strong></p>
      <p>Bleaching: <strong>{d.bleaching?.toFixed(1)}%</strong></p>
    </div>
  );
};

export function SSTAScatterChart({ data, trendLine, loading }) {
  const trendPoints = useMemo(() => {
    if (!data.length || !trendLine) return [];
    const xs = data.map(d => d.ssta);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    return [
      { ssta: minX, bleaching: trendLine.slope * minX + trendLine.intercept },
      { ssta: maxX, bleaching: trendLine.slope * maxX + trendLine.intercept },
    ];
  }, [data, trendLine]);

  return (
    <div className="rounded-xl p-4 sm:p-6 border transition-all"
         style={{ background: 'var(--d2)', borderColor: 'var(--bd)' }}>
      <h3 className="font-semibold mb-4" style={{ color: 'var(--tx1)' }}>📈 SSTA vs Bleaching %</h3>
      {loading ? <div className="w-full h-56 rounded animate-pulse" style={{ background: 'var(--d3)' }} /> : (
        <ResponsiveContainer width="100%" height={230}>
          <ScatterChart margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gd)" />
            <XAxis dataKey="ssta" type="number" stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }} />
            <YAxis dataKey="bleaching" type="number" stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }} unit="%" />
            <Tooltip content={<TT />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} shape={({ cx, cy, payload }) => {
              const c = payload.bleaching > 10 ? '#e74c3c' : payload.bleaching > 0 ? '#f39c12' : '#2ecc71';
              return <circle cx={cx} cy={cy} r={3} fill={c} fillOpacity={0.6} />;
            }} />
            {trendPoints.length === 2 && (
              <Scatter data={trendPoints}
                line={{ stroke: '#00b4d8', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                shape={() => null} legendType="none" />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
