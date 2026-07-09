/**
 * MetricCards.jsx
 * Shows 4 summary cards. When live NOAA data is available for the selected
 * zone it displays live values with a pulsing LIVE badge; otherwise it falls
 * back to the historical CSV averages with a grey HIST badge.
 */

import React from 'react';
import { Database, Droplets, Calendar, Globe, Thermometer, TrendingUp, Flame, Bell } from 'lucide-react';

/* ── Badge: LIVE or HIST ─────────────────────────────────────────────────── */
function DataBadge({ quality }) {
  if (quality === 'complete' || quality === 'partial') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span className="live-pulse-dot" style={{
          width: '6px', height: '6px', borderRadius: '50%',
          backgroundColor: quality === 'complete' ? '#2ecc71' : '#f39c12',
          display: 'inline-block',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '10px', color: '#00b4d8', fontWeight: 700, letterSpacing: '0.05em' }}>
          LIVE
        </span>
      </span>
    );
  }
  return (
    <span style={{
      fontSize: '10px', color: '#64748b', fontWeight: 700,
      letterSpacing: '0.05em', background: 'rgba(100,116,139,0.15)',
      padding: '1px 5px', borderRadius: '4px',
    }}>
      HIST
    </span>
  );
}

/* ── Single card ─────────────────────────────────────────────────────────── */
function Card({ icon: Icon, label, value, sub, color, loading, dataBadge }) {
  return (
    <div className="rounded-xl p-5 border flex flex-col gap-3 relative overflow-hidden transition-all"
         style={{ background: 'var(--d2)', borderColor: 'var(--bd)' }}>

      {/* Decorative glow blob */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 pointer-events-none"
           style={{ background: color, transform: 'translate(30%,-30%)' }} />

      {/* Label row */}
      <div className="flex items-center justify-between text-sm" style={{ color: 'var(--tx2)' }}>
        <span className="flex items-center gap-2">
          <Icon size={16} style={{ color }} />
          {label}
        </span>
        {dataBadge && <DataBadge quality={dataBadge} />}
      </div>

      {/* Value */}
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

/* ── Export ──────────────────────────────────────────────────────────────── */
export function MetricCards({
  // Historical / CSV props
  totalRecords, avgBleaching, worstYear, worstOcean,
  loading,
  // Live data props
  liveData   = null,
  liveStatus = 'unavailable',
  selectedZone = 'Great Barrier Reef',
}) {
  const zone    = liveData?.[selectedZone];
  const hasLive = zone && zone.data_quality !== 'unavailable';
  const q       = hasLive ? zone.data_quality : null;  // 'complete' | 'partial' | null

  // ── When live data is available, swap in live values for the zone cards ───
  if (hasLive) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

        {/* SST */}
        <Card
          icon={Thermometer} label="Sea Surface Temp"
          value={zone.sst != null ? `${zone.sst.toFixed(1)}°C` : '—'}
          sub={`${selectedZone} · live`}
          color="#00b4d8" loading={loading}
          dataBadge={q}
        />

        {/* SST Anomaly */}
        <Card
          icon={TrendingUp} label="SST Anomaly"
          value={zone.sst_anomaly != null
            ? `${zone.sst_anomaly >= 0 ? '+' : ''}${zone.sst_anomaly.toFixed(2)}°C`
            : '—'}
          sub="Deviation from climatology"
          color="#2ecc71" loading={loading}
          dataBadge={q}
        />

        {/* DHW */}
        <Card
          icon={Flame} label="Degree Heating Weeks"
          value={zone.dhw != null ? `${zone.dhw.toFixed(1)} °C-wks` : '—'}
          sub="Accumulated thermal stress"
          color="#e74c3c" loading={loading}
          dataBadge={q}
        />

        {/* Alert Level */}
        <Card
          icon={Bell} label="Bleaching Alert"
          value={zone.alert_label ?? '—'}
          sub={`Risk: ${zone.risk} · BAA ${zone.alert_level ?? '—'}`}
          color={zone.risk_color ?? '#64748b'} loading={loading}
          dataBadge={q}
        />
      </div>
    );
  }

  // ── Historical fallback ───────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <Card icon={Database} label="Total Survey Records"
        value={loading ? '' : totalRecords?.toLocaleString()}
        sub="Reef surveys 1980–2020" color="#00b4d8" loading={loading}
        dataBadge={null} />
      <Card icon={Droplets} label="Global Avg Bleaching"
        value={loading ? '' : `${avgBleaching}%`}
        sub="Across all oceans" color="#2ecc71" loading={loading}
        dataBadge={null} />
      <Card icon={Calendar} label="Worst Recorded Year"
        value={loading ? '' : worstYear?.year}
        sub={worstYear ? `Avg ${worstYear.avg_bleaching.toFixed(1)}% bleaching` : ''}
        color="#e74c3c" loading={loading}
        dataBadge={null} />
      <Card icon={Globe} label="Most Affected Ocean"
        value={loading ? '' : worstOcean?.ocean}
        sub={worstOcean ? `Avg ${worstOcean.avg_bleaching.toFixed(1)}% bleaching` : ''}
        color="#f39c12" loading={loading}
        dataBadge={null} />
    </div>
  );
}
