/**
 * Header.jsx — Professional 3-row layout.
 *
 * Desktop (sm+):
 *   Row 1: 🪸 Logo + Title (left)  |  Location badge + ThemeToggle (right)
 *   Row 2: Subtitle (left)         |  Stats pills (right)
 *
 * Mobile (<sm):
 *   Row 1: 🪸 Logo + Title (left)  |  ThemeToggle (right, top corner — always fixed)
 *   Row 2: Location badge (full width below title)
 *   Row 3: Subtitle
 *   Row 4: Stats pills (wrap)
 *
 * Typography:
 *   Title    → Alegreya 400    (--font-title, user-specified)
 *   Subtitle → Barlow          (--font-heading, ≈ Graublau Sans Pro)
 *   Pills    → Sora            (--font-body, ≈ Sofia Pro)
 *   Numbers  → JetBrains Mono  (auto via unicode-range @font-face)
 */

import React from 'react';
import { ThemeToggle } from './ThemeToggle';

/* ── Pulse dot ─────────────────────────────────────────────────────────────── */
const Dot = ({ color, pulse = false, size = 8 }) => (
  <span
    className={pulse ? 'live-pulse-dot' : ''}
    style={{
      display:         'inline-block',
      width:           size,
      height:          size,
      borderRadius:    '50%',
      backgroundColor: color,
      flexShrink:      0,
    }}
  />
);

/* ── Vertical separator ────────────────────────────────────────────────────── */
const Sep = () => (
  <span style={{
    display:       'inline-block',
    width:         1,
    height:        13,
    background:    'rgba(128,145,170,0.3)',
    margin:        '0 7px',
    flexShrink:    0,
    verticalAlign: 'middle',
  }} />
);

/* ── Location badge ──────────────────────────────────────────────────────────
   Used in both mobile (full-width row) and desktop (beside ThemeToggle).
   On mobile it wraps to show country + reef only to stay compact.           */
function LocationBadge({ location, locationStatus, fullWidth = false }) {
  const base = {
    display:       'inline-flex',
    alignItems:    'center',
    gap:           '7px',
    padding:       '6px 14px',
    borderRadius:  '999px',
    fontSize:      '14px',
    fontFamily:    'var(--font-body)',
    fontWeight:    500,
    whiteSpace:    'nowrap',
    userSelect:    'none',
    cursor:        'default',
    letterSpacing: '0.1px',
    flexShrink:    fullWidth ? 1 : 0,
    maxWidth:      fullWidth ? '100%' : 340,
    overflow:      'hidden',
  };

  if (locationStatus === 'detecting') {
    return (
      <span style={{ ...base,
        background: 'rgba(100,116,139,0.10)',
        border:     '1px solid rgba(100,116,139,0.20)',
        color:      '#64748b',
        fontStyle:  'italic',
      }}>
        <Dot color="#64748b" pulse size={7} />
        Detecting…
      </span>
    );
  }

  if (locationStatus === 'unavailable' || !location?.nearest_reef) {
    return (
      <span style={{ ...base,
        background: 'rgba(71,85,105,0.07)',
        border:     '1px solid rgba(71,85,105,0.15)',
        color:      'var(--tx2)',
      }}>
        <Dot color="#64748b" size={7} />
        Select reef zone
      </span>
    );
  }

  const isGPS    = locationStatus === 'confirmed';
  const dotColor = isGPS ? '#2ecc71' : '#f39c12';
  const { city, country, nearest_reef, reef_distance_km, confidence, accuracy_m } = location;

  const pct     = Math.round((confidence ?? 0) * 100);
  const acc     = accuracy_m != null ? `~${accuracy_m.toLocaleString()}m` : 'city-level';
  const distStr = reef_distance_km != null ? `${reef_distance_km.toLocaleString()} km` : null;

  const tooltip = isGPS
    ? `GPS confirmed · ${acc} · Confidence ${pct}%\nNearest reef auto-selected`
    : `IP geolocation · city-level · Confidence ${pct}%`;

  const locFull  = [city, country].filter(Boolean).join(', ') || country || 'Unknown';
  const locShort = country ?? 'Unknown';

  return (
    <span title={tooltip} style={{ ...base,
      background: isGPS ? 'rgba(0,180,216,0.10)' : 'rgba(148,163,184,0.08)',
      border:     isGPS ? '1px solid rgba(0,180,216,0.28)' : '1px solid rgba(148,163,184,0.22)',
      boxShadow:  isGPS ? '0 0 18px rgba(0,180,216,0.12)' : 'none',
    }}>
      <Dot color={dotColor} pulse={isGPS} size={8} />

      {/* Location text */}
      <span style={{ color: isGPS ? 'var(--tx1)' : 'var(--tx2)', fontWeight: 500,
                     overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {/* Mobile: country only */}
        <span className="inline sm:hidden">{locShort}</span>
        {/* sm+: city + country */}
        <span className="hidden sm:inline">{locFull}</span>
      </span>

      <Sep />

      {/* Reef zone */}
      <span style={{ color: '#00b4d8', fontWeight: 700, letterSpacing: '-0.1px',
                     overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {nearest_reef}
      </span>

      {/* Distance — desktop only */}
      {distStr && (
        <span className="hidden lg:inline" style={{
          fontSize: '12px', color: 'var(--tx2)', fontWeight: 400, flexShrink: 0,
        }}>
          {distStr}
        </span>
      )}
    </span>
  );
}

/* ── Header ────────────────────────────────────────────────────────────────── */
export function Header({
  totalRecords, avgBleaching, worstYear, worstOcean,
  location = null, locationStatus = 'detecting',
}) {
  return (
    <header style={{
      borderBottom: '1px solid rgba(0,180,216,0.15)',
      paddingBottom: 0,
      marginBottom: 0,
    }}>

      {/* ── Row 1: Logo + Title  |  [Badge (desktop)] + Toggle ──────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            12,
        paddingBottom:  8,
      }}>

        {/* LEFT — brand (fills remaining space, clips if too narrow) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>🪸</span>
          <h1 style={{
            margin:        0,
            fontFamily:    'var(--font-title)',
            fontSize:      'clamp(18px, 2.8vw, 30px)',
            fontWeight:    400,
            color:         'var(--tx1)',
            letterSpacing: '0px',
            lineHeight:    1.2,
          }}>
            Coral Reef Bleaching Prediction Dashboard
          </h1>
        </div>

        {/* RIGHT — location badge (desktop only) + ThemeToggle (always) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

          {/* Location badge — hidden on mobile, visible on sm+ */}
          <span className="hidden sm:inline-flex">
            <LocationBadge location={location} locationStatus={locationStatus} />
          </span>

          {/* ThemeToggle — always top-right, mobile and desktop */}
          <div style={{
            borderRadius: '50%',
            border:       '1px solid rgba(128,145,170,0.25)',
            padding:      3,
            flexShrink:   0,
          }}>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* ── Row 1b (mobile only): Location badge full width ─────────────── */}
      <div className="block sm:hidden" style={{ paddingBottom: 8 }}>
        <LocationBadge location={location} locationStatus={locationStatus} fullWidth />
      </div>

      {/* ── Row 2: Subtitle  |  Stats pills ─────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexWrap:       'wrap',
        gap:            '8px 16px',
        paddingBottom:  14,
      }}>

        {/* Subtitle */}
        <p style={{
          margin:     0,
          fontFamily: 'var(--font-heading)',
          fontSize:   14,
          fontWeight: 400,
          color:      '#00b4d8',
          lineHeight: 1.4,
          flexShrink: 1,
          minWidth:   0,
        }}>
          40 years of global reef data · 1980–2020 · 41,361 surveys · Powered by Random Forest ML
        </p>

        {/* Stats pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flexShrink: 0 }}>
          {[
            { label: 'Records',     value: totalRecords ? totalRecords.toLocaleString() : '…' },
            { label: 'Avg Bleach',  value: avgBleaching ? `${avgBleaching}%` : '…' },
            { label: 'Worst Year',  value: worstYear ? `${worstYear.year}` : '…' },
            { label: 'Worst Ocean', value: worstOcean ? worstOcean.ocean : '…' },
          ].map(p => (
            <div key={p.label} style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          5,
              padding:      '4px 12px',
              borderRadius: '999px',
              background:   'var(--d3)',
              border:       '1px solid var(--bd)',
              fontSize:     '12px',
              fontFamily:   'var(--font-body)',
              whiteSpace:   'nowrap',
            }}>
              <span style={{ color: 'var(--tx2)', fontWeight: 400 }}>{p.label}:</span>
              <span style={{ color: '#00b4d8', fontWeight: 600 }}>{p.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* LiveStatusBar (Row 3) rendered as sibling in App.jsx */}
    </header>
  );
}
