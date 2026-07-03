import React from 'react';
import { ThemeToggle } from './ThemeToggle';

export function Header({ totalRecords, avgBleaching, worstYear, worstOcean }) {
  return (
    <header className="mb-8">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3" style={{ color: 'var(--tx1)' }}>
            🪸 Coral Reef Bleaching Prediction Dashboard
          </h1>
          <p className="text-[#00b4d8] text-sm mt-1 font-medium">
            40 years of global reef data · 1980–2020 · 41,361 surveys · Powered by Random Forest ML
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        {[
          { label: 'Total Records', value: totalRecords ? totalRecords.toLocaleString() : '…' },
          { label: 'Avg Bleaching', value: avgBleaching ? `${avgBleaching}%` : '…' },
          { label: 'Worst Year',    value: worstYear ? `${worstYear.year} (${worstYear.avg_bleaching.toFixed(1)}%)` : '…' },
          { label: 'Most Affected', value: worstOcean ? worstOcean.ocean : '…' },
        ].map(p => (
          <div key={p.label} className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm border"
               style={{ background: 'var(--d2)', borderColor: 'var(--bd)' }}>
            <span style={{ color: 'var(--tx2)' }}>{p.label}:</span>
            <span className="text-[#00b4d8] font-semibold">{p.value}</span>
          </div>
        ))}
      </div>
    </header>
  );
}
