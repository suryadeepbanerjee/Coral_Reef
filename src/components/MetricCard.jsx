import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const MetricCard = ({ title, icon, value, subtext, indicatorColor, loading, error, isAlert }) => {
  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-xl p-5 border border-slate-200 dark:border-[#262626] shadow-sm flex flex-col justify-between h-32 relative overflow-hidden transition-colors">
      <div className="flex justify-between items-start">
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2 transition-colors">
          {icon} {title}
        </h3>
        {indicatorColor && !loading && !error && (
          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: indicatorColor }} />
        )}
      </div>

      <div className="mt-2">
        {loading ? (
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-2"></div>
        ) : error ? (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mt-2 transition-colors">
            <AlertTriangle size={18} />
            <span className="font-semibold text-sm">⚠ Unavailable</span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className={`text-2xl font-bold ${isAlert ? '' : 'text-slate-900 dark:text-white transition-colors'}`} style={isAlert ? { color: indicatorColor } : {}}>
              {value}
            </span>
            {subtext && (
              <span className="text-xs mt-1 text-slate-500 dark:text-slate-400 font-medium transition-colors">
                {subtext}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
