import React from 'react';
import { ALERT_SCALE } from '../constants/alertScale';

export const AlertTable = ({ currentLevel }) => {
  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-xl p-6 border border-slate-200 dark:border-[#262626] shadow-sm h-full overflow-x-auto transition-colors">
      <h3 className="text-slate-900 dark:text-white font-semibold mb-4 transition-colors">NOAA Bleaching Alert Scale</h3>
      <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300 transition-colors">
        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-[#000000] border-b border-slate-200 dark:border-[#262626] transition-colors">
          <tr>
            <th className="px-4 py-2">Level</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">DHW Threshold</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {ALERT_SCALE.map((row) => (
            <tr 
              key={row.level} 
              className={`border-b border-slate-200 dark:border-[#262626] transition-colors ${currentLevel === row.level ? 'bg-teal-50 dark:bg-[#00b4d8]/10 border-l-4 border-l-[#00b4d8]' : ''}`}
            >
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.level}</td>
              <td className="px-4 py-3">{row.name}</td>
              <td className="px-4 py-3">{row.dhwThreshold}</td>
              <td className="px-4 py-3">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
