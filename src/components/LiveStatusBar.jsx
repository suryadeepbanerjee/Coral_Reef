/**
 * LiveStatusBar.jsx
 * Row 4 of the header — sits flush against the header's bottom border.
 * Symmetric 6px top/bottom padding, full width, centered text.
 * No border-radius — designed to be edge-to-edge.
 */

import React, { useState, useEffect } from 'react';

function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return 'just now';
  const mins = Math.floor(diff / 60);
  return `${mins} min ago`;
}

function minutesUntilRefresh(isoString) {
  if (!isoString) return null;
  const elapsed   = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  const remaining = Math.max(0, 61 * 60 - elapsed);
  return Math.ceil(remaining / 60);
}

// Shared container style — flush row, no radius
const barBase = {
  width:          '100%',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  padding:        '6px 24px',
  boxSizing:      'border-box',
  fontSize:       '13px',
  letterSpacing:  '0.3px',
  marginBottom:   '16px',
  borderTop:      '1px solid rgba(0,180,216,0.10)',
  textAlign:      'center',
  position:       'relative',
};

export function LiveStatusBar({ liveStatus, fetchedAt, zonesFailed }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const ago     = timeAgo(fetchedAt);
  const refresh = minutesUntilRefresh(fetchedAt);

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (liveStatus === 'loading') {
    return (
      <div style={{ ...barBase, background: 'rgba(0,180,216,0.04)', color: '#64748b' }}>
        ⏳ Connecting to NOAA satellite feed…
      </div>
    );
  }

  // ── UNAVAILABLE ──────────────────────────────────────────────────────────────
  if (liveStatus === 'unavailable') {
    return (
      <div style={{ ...barBase, background: 'transparent', color: '#475569', borderTopColor: 'rgba(255,255,255,0.05)' }}>
        {/* Desktop */}
        <span className="hidden sm:inline">
          📊 Historical data 1980–2020 · Live satellite feed offline
        </span>
        {/* Mobile */}
        <span className="block sm:hidden">
          📊 Historical data
        </span>
      </div>
    );
  }

  // ── PARTIAL ──────────────────────────────────────────────────────────────────
  if (liveStatus === 'partial') {
    const loaded = 5 - zonesFailed;
    return (
      <div style={{ ...barBase, background: 'rgba(243,156,18,0.06)', color: '#f39c12', borderTopColor: 'rgba(243,156,18,0.15)' }}>
        <span className="hidden sm:inline">
          ⚠️ Live data partial — {loaded}/5 zones loaded · {zonesFailed} zone{zonesFailed !== 1 ? 's' : ''} using historical fallback
        </span>
        <span className="block sm:hidden">
          ⚠️ {loaded}/5 zones live
        </span>
      </div>
    );
  }

  // ── LIVE or CACHED ────────────────────────────────────────────────────────────
  const isCached = liveStatus === 'cached';
  const dotColor = isCached ? '#f39c12' : '#2ecc71';

  return (
    <div style={{ ...barBase, background: 'rgba(0,180,216,0.05)', color: '#00b4d8' }}>

      {/* Desktop — full text with 3 segments */}
      <span className="hidden sm:flex" style={{ alignItems: 'center', gap: 6, justifyContent: 'center' }}>
        <span className="live-pulse-dot" style={{
          display: 'inline-block', width: 6, height: 6,
          borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0,
        }} />
        {isCached ? (
          <>🛰️ Satellite data · cached · {ago} · Next refresh in {refresh} min</>
        ) : (
          <>
            🛰️ Live · NOAA Coral Reef Watch
            {ago && <><span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>Updated {ago}</>}
            {refresh != null && <><span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>Next refresh in {refresh} min</>}
          </>
        )}
      </span>

      {/* Mobile — short */}
      <span className="flex sm:hidden" style={{ alignItems: 'center', gap: 6, justifyContent: 'center' }}>
        <span className="live-pulse-dot" style={{
          display: 'inline-block', width: 6, height: 6,
          borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0,
        }} />
        🛰️ Live{ago ? ` · ${ago}` : ''}
      </span>
    </div>
  );
}
