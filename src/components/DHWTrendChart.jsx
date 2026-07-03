import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

export const DHWTrendChart = ({ data, zoneName, loading, error, isDark }) => {
  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-xl p-6 border border-slate-200 dark:border-[#262626] shadow-sm h-80 transition-colors">
      <h3 className="text-slate-900 dark:text-white font-semibold mb-4 transition-colors">30-Day Degree Heating Week Trend — {zoneName}</h3>
      
      {loading ? (
        <div className="w-full h-full pb-8 flex items-end gap-2 px-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex-1 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
          ))}
        </div>
      ) : error || !data || data.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center pb-8">
          <span className="text-amber-600 dark:text-amber-500 font-semibold transition-colors">⚠ Trend data unavailable</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#262626" : "#e2e8f0"} vertical={false} />
            <XAxis dataKey="date" stroke={isDark ? "#94a3b8" : "#64748b"} tick={{ fontSize: 12 }} dy={10} />
            <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: isDark ? '#0a0a0a' : '#ffffff', borderColor: isDark ? '#262626' : '#e2e8f0', color: isDark ? '#fff' : '#0f172a' }}
              itemStyle={{ color: '#00b4d8' }}
              labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', marginBottom: '4px' }}
            />
            <ReferenceLine y={4} stroke="#f39c12" strokeDasharray="3 3" label={{ position: 'top', value: 'Bleaching', fill: '#f39c12', fontSize: 10 }} />
            <ReferenceLine y={8} stroke="#e74c3c" strokeDasharray="3 3" label={{ position: 'top', value: 'Mortality', fill: '#e74c3c', fontSize: 10 }} />
            <Line type="monotone" dataKey="dhw" stroke="#00b4d8" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="DHW" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
