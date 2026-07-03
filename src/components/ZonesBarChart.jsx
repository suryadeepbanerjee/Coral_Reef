import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getRiskLevel } from '../utils/riskLogic';

export const ZonesBarChart = ({ allData, loading, errors, isDark }) => {
  const data = Object.entries(allData)
    .filter(([zoneName]) => !errors[zoneName])
    .map(([zoneName, zoneData]) => ({
      name: zoneName,
      dhw: zoneData.dhw || 0,
      riskInfo: getRiskLevel(zoneData.dhw || 0, zoneData.baa || 0)
    }))
    .sort((a, b) => b.dhw - a.dhw);

  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-xl p-6 border border-slate-200 dark:border-[#262626] shadow-sm h-80 transition-colors">
      <h3 className="text-slate-900 dark:text-white font-semibold mb-4 transition-colors">Current DHW — All Zones</h3>
      
      {loading ? (
        <div className="w-full h-full pb-8 flex flex-col gap-3 px-4 justify-center">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" style={{ width: `${Math.random() * 60 + 30}%` }}></div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center pb-8">
          <span className="text-amber-600 dark:text-amber-500 font-semibold transition-colors">⚠ Data unavailable</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#262626" : "#e2e8f0"} horizontal={true} vertical={false} />
            <XAxis type="number" stroke={isDark ? "#94a3b8" : "#64748b"} tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" stroke={isDark ? "#94a3b8" : "#64748b"} tick={{ fontSize: 11 }} width={100} />
            <Tooltip 
              cursor={{fill: isDark ? '#262626' : '#f1f5f9'}}
              contentStyle={{ backgroundColor: isDark ? '#0a0a0a' : '#ffffff', borderColor: isDark ? '#262626' : '#e2e8f0', color: isDark ? '#fff' : '#0f172a' }}
              labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', marginBottom: '4px' }}
            />
            <Bar dataKey="dhw" radius={[0, 4, 4, 0]} barSize={20} name="DHW">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.riskInfo.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
