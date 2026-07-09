import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { getRiskLevel } from '../utils/riskLogic';

export const RiskPanel = ({ data, loading, error, isDark }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#0a0a0a] rounded-xl p-6 border border-slate-200 dark:border-[#262626] shadow-sm h-full flex items-center justify-center transition-colors">
        <div className="w-48 h-48 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-[#0a0a0a] rounded-xl p-6 border border-slate-200 dark:border-[#262626] shadow-sm h-full flex flex-col items-center justify-center transition-colors">
        <span className="text-amber-600 dark:text-amber-500 font-semibold">⚠ Data unavailable to calculate risk</span>
      </div>
    );
  }

  const risk = getRiskLevel(data.dhw, data.baa);
  const probValue = Math.min((data.dhw / 12) * 100, 99);
  
  const chartData = [{
    name: 'Probability',
    value: probValue,
    fill: probValue > 66 ? '#e74c3c' : probValue > 33 ? '#f39c12' : '#2ecc71'
  }];

  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-xl p-6 border border-slate-200 dark:border-[#262626] shadow-sm h-full flex flex-col items-center transition-colors">
      <div 
        className="px-6 py-2 rounded-full font-bold text-lg mb-4 text-white dark:text-[#000000]"
        style={{ backgroundColor: risk.color }}
      >
        {risk.label}
      </div>
      
      <div className="w-full h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="70%" 
            outerRadius="100%" 
            barSize={20} 
            data={chartData}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar minAngle={15} background={{ fill: isDark ? '#262626' : '#e2e8f0' }} clockWise dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-4 text-center">
          <span className="text-4xl font-bold text-slate-900 dark:text-white transition-colors">{probValue.toFixed(1)}%</span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 transition-colors">Bleaching Prob.</p>
        </div>
      </div>
      
      <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 text-center transition-colors">
        {risk.label === "HIGH RISK" 
          ? "Immediate action recommended. Severe stress detected."
          : risk.label === "MODERATE"
          ? "Conditions are warming. Monitor closely."
          : "Conditions are currently within safe baseline levels."}
      </p>
    </div>
  );
};
