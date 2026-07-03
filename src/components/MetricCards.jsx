import React from 'react';
import { Database, Droplets, Calendar, Globe } from 'lucide-react';

function Card({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="rounded-xl p-5 border flex flex-col gap-3 relative overflow-hidden transition-all"
         style={{ background: 'var(--d2)', borderColor: 'var(--bd)' }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 pointer-events-none"
           style={{ background: color, transform: 'translate(30%,-30%)' }} />
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--tx2)' }}>
        <Icon size={16} style={{ color }} />
        {label}
      </div>
      {loading ? (
        <div className="h-8 w-32 rounded animate-pulse" style={{ background: 'var(--d3)' }} />
      ) : (
        <>
          <div className="text-2xl font-bold" style={{ color: 'var(--tx1)' }}>{value}</div>
          {sub && <div className="text-xs" style={{ color: 'var(--tx2)' }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

export function MetricCards({ totalRecords, avgBleaching, worstYear, worstOcean, loading }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <Card icon={Database} label="Total Survey Records"
        value={loading ? '' : totalRecords?.toLocaleString()}
        sub="Reef surveys 1980–2020" color="#00b4d8" loading={loading} />
      <Card icon={Droplets} label="Global Avg Bleaching"
        value={loading ? '' : `${avgBleaching}%`}
        sub="Across all oceans" color="#2ecc71" loading={loading} />
      <Card icon={Calendar} label="Worst Recorded Year"
        value={loading ? '' : worstYear?.year}
        sub={worstYear ? `Avg ${worstYear.avg_bleaching.toFixed(1)}% bleaching` : ''}
        color="#e74c3c" loading={loading} />
      <Card icon={Globe} label="Most Affected Ocean"
        value={loading ? '' : worstOcean?.ocean}
        sub={worstOcean ? `Avg ${worstOcean.avg_bleaching.toFixed(1)}% bleaching` : ''}
        color="#f39c12" loading={loading} />
    </div>
  );
}
