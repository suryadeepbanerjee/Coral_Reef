/**
 * ReefMap.jsx
 * Renders:
 *   1. Historical CSV point cloud (8 000-point sample, canvas-accelerated)
 *   2. 5 live NOAA zone overlay markers (risk-coloured when liveData present)
 *   3. User location marker (pulsing teal dot, appears when location resolves)
 *
 * Map auto-pans once on first location detection via fitBounds().
 * After that the user has full control — no further auto-centering.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const getBleachColor = b =>
  b == null ? '#94a3b8' : b > 10 ? '#e74c3c' : b > 0 ? '#f39c12' : '#2ecc71';

// The 5 NOAA zones — coordinates must match ZONES in backend/main.py exactly
const ZONE_COORDS = {
  'Great Barrier Reef': { lat: -18.0, lon: 147.0 },
  'Coral Triangle':     { lat:  0.0,  lon: 125.0 },
  'Caribbean':          { lat: 15.0,  lon: -66.0 },
  'Red Sea':            { lat: 21.0,  lon:  38.0 },
  'Indian Ocean':       { lat: -5.0,  lon:  73.0 },
};

/** Format UTC ISO string as "Jul 9, 10:30 UTC" */
function fmtUtc(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC', hour12: false,
    }).replace(',', '') + ' UTC';
  } catch {
    return isoStr;
  }
}

// ── Canvas layer initialiser ──────────────────────────────────────────────────
function CanvasRenderer() {
  const map = useMap();
  useMemo(() => { if (!map._coralCanvas) map._coralCanvas = L.canvas({ padding: 0.5 }); }, [map]);
  return null;
}

// ── fitBounds controller — fires ONCE when location first arrives ─────────────
function LocationBoundsController({ location }) {
  const map     = useMap();
  const didFit  = useRef(false);

  useEffect(() => {
    if (didFit.current || !location?.lat || !location?.lon || !location?.nearest_reef) return;

    const reefCoords = ZONE_COORDS[location.nearest_reef];
    if (!reefCoords) return;

    const bounds = L.latLngBounds(
      [location.lat,    location.lon],
      [reefCoords.lat,  reefCoords.lon],
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
    didFit.current = true;
  }, [location, map]);

  return null;
}

// ── Live zone popup ───────────────────────────────────────────────────────────
function LivePopup({ zoneName, zone, fetchedAt }) {
  return (
    <div style={{ minWidth: 200, fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 8 }}>
        {zoneName}
      </p>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <tbody>
          {[
            ['🌡️ SST',     zone.sst     != null ? `${zone.sst.toFixed(1)}°C`       : '—'],
            ['📈 Anomaly',  zone.sst_anomaly != null
              ? `${zone.sst_anomaly >= 0 ? '+' : ''}${zone.sst_anomaly.toFixed(1)}°C` : '—'],
            ['🔥 DHW',     zone.dhw     != null ? `${zone.dhw.toFixed(1)} °C-weeks`  : '—'],
            ['⚠️ Alert',    zone.alert_label ?? '—'],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={{ color: '#64748b', paddingRight: 8, paddingBottom: 4, verticalAlign: 'top' }}>{k}</td>
              <td style={{ fontWeight: 600, paddingBottom: 4 }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{
        display: 'inline-block', marginTop: 6,
        background: zone.risk_color, color: '#fff',
        borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700,
      }}>
        {zone.risk} RISK
      </div>

      <hr style={{ margin: '8px 0', borderColor: '#e2e8f0' }} />
      <div style={{ color: '#64748b', fontSize: 10 }}>
        🛰️ Live · NOAA CRW
        {fetchedAt && <><br />{fmtUtc(fetchedAt)}</>}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ReefMap({
  points,
  loading,
  liveData     = null,
  fetchedAt    = null,
  location     = null,
  locationStatus = 'detecting',
}) {
  const sample = useMemo(() => {
    if (!points.length) return [];
    const step = Math.max(1, Math.floor(points.length / 8000));
    return points.filter((_, i) => i % step === 0);
  }, [points]);

  const hasUserLocation = location?.lat != null && location?.lon != null;

  return (
    <div className="rounded-xl border relative overflow-hidden transition-all"
         style={{ height: 500, borderColor: 'var(--bd)', background: 'var(--d2)' }}>

      {/* Top-left label */}
      <div className="absolute top-4 left-4 z-[1000] rounded-lg px-3 py-1.5 text-sm text-[#00b4d8] font-medium border"
           style={{ background: 'var(--d2)', borderColor: 'var(--bd)' }}>
        🗺️ Global Reef Survey Sites · {sample.length.toLocaleString()} plotted
      </div>

      {loading ? (
        <div className="w-full h-full animate-pulse flex items-center justify-center"
             style={{ background: 'var(--d3)' }}>
          <p className="text-[#00b4d8] animate-pulse">Loading map data…</p>
        </div>
      ) : (
        <MapContainer center={[10, 20]} zoom={2} minZoom={1} style={{ height: '100%', width: '100%' }}>
          <CanvasRenderer />

          {/* Auto-fit bounds when location first arrives */}
          <LocationBoundsController location={location} />

          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
          />

          {/* ── 1. Historical CSV point cloud ─────────────────────────── */}
          {sample.map((pt, i) => (
            <CircleMarker key={i} center={[pt.lat, pt.lon]} radius={4}
              fillColor={getBleachColor(pt.bleaching)} fillOpacity={0.75}
              color="transparent" weight={0}>
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <p className="font-bold border-b pb-1 mb-2">{pt.site_name || 'Reef Site'}</p>
                  <table className="w-full text-xs"><tbody>
                    {[['Country', pt.country], ['Ocean', pt.ocean], ['Year', pt.year],
                      ['Bleaching', pt.bleaching != null ? `${pt.bleaching.toFixed(1)}%` : 'N/A'],
                      ['SST', pt.sst   != null ? `${pt.sst.toFixed(1)}°C`  : 'N/A'],
                      ['SSTA', pt.ssta != null ? pt.ssta.toFixed(2) : 'N/A'],
                      ['DHW',  pt.dhw  != null ? pt.dhw.toFixed(2)  : 'N/A'],
                      ['Depth', pt.depth != null ? `${pt.depth}m`   : 'N/A'],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td className="text-gray-500 pr-2 py-0.5">{k}</td>
                        <td className="font-medium">{v || '–'}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* ── 2. Live NOAA zone overlay markers ─────────────────────── */}
          {Object.entries(ZONE_COORDS).map(([zoneName, { lat, lon }]) => {
            const zone      = liveData?.[zoneName];
            const fillColor = zone ? zone.risk_color : '#00b4d8';
            const isNearest = location?.nearest_reef === zoneName;
            return (
              <CircleMarker
                key={zoneName}
                center={[lat, lon]}
                radius={isNearest ? 13 : 10}
                fillColor={fillColor}
                fillOpacity={0.85}
                color={isNearest ? '#fff' : '#fff'}
                weight={isNearest ? 3 : 2}
              >
                <Popup>
                  {zone
                    ? <LivePopup zoneName={zoneName} zone={zone} fetchedAt={fetchedAt} />
                    : (
                      <div style={{ minWidth: 160, fontSize: 13 }}>
                        <p style={{ fontWeight: 700, marginBottom: 6 }}>{zoneName}</p>
                        {isNearest && location && (
                          <p style={{ color: '#00b4d8', fontSize: 11, marginBottom: 4 }}>
                            📍 Your nearest reef zone<br />
                            ~{location.reef_distance_km?.toLocaleString()} km away
                          </p>
                        )}
                        <p style={{ color: '#64748b', fontSize: 11 }}>
                          📊 Historical data only<br />Live satellite feed offline
                        </p>
                      </div>
                    )
                  }
                </Popup>
              </CircleMarker>
            );
          })}

          {/* ── 3. User location marker (sonar-pulse teal dot) ────────── */}
          {hasUserLocation && (
            <CircleMarker
              center={[location.lat, location.lon]}
              radius={8}
              fillColor="rgba(0,180,216,0.3)"
              fillOpacity={1}
              color="#00b4d8"
              weight={2}
              className="user-location-marker"
            >
              <Popup>
                <div style={{ minWidth: 170, fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>
                  <p style={{ fontWeight: 700, marginBottom: 6 }}>📍 You are here</p>
                  {location.location_display && (
                    <p style={{ color: '#475569', fontSize: 12, marginBottom: 4 }}>
                      {location.location_display}
                    </p>
                  )}
                  {location.accuracy_m != null && (
                    <p style={{ color: '#94a3b8', fontSize: 11 }}>
                      Accuracy: ~{location.accuracy_m.toLocaleString()}m
                    </p>
                  )}
                  {location.nearest_reef && (
                    <p style={{ color: '#00b4d8', fontSize: 11, marginTop: 4 }}>
                      Nearest reef: {location.nearest_reef}<br />
                      ~{location.reef_distance_km?.toLocaleString()} km away
                    </p>
                  )}
                  <p style={{ color: '#94a3b8', fontSize: 10, marginTop: 6 }}>
                    {locationStatus === 'confirmed' ? '🛰️ GPS · high accuracy' : '🌐 IP-based · city-level'}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 right-4 z-[1000] rounded-lg px-3 py-2 text-xs border"
           style={{ background: 'var(--d2)', borderColor: 'var(--bd)', color: 'var(--tx1)' }}>
        <div className="font-semibold mb-2 text-[#00b4d8]">
          {liveData ? '🛰️ Live Risk' : 'Bleaching %'}
        </div>
        {liveData
          ? [['#2ecc71','LOW'], ['#f39c12','MODERATE'], ['#e74c3c','HIGH'], ['#64748b','UNKNOWN']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ background: c }} />
                <span style={{ color: 'var(--tx2)' }}>{l}</span>
              </div>
            ))
          : [['#2ecc71','0% — None'], ['#f39c12','1–10% — Moderate'], ['#e74c3c','>10% — Severe']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ background: c }} />
                <span style={{ color: 'var(--tx2)' }}>{l}</span>
              </div>
            ))
        }
        {/* User location legend entry */}
        {hasUserLocation && (
          <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--bd)' }}>
            <div className="w-3 h-3 rounded-full user-location-marker"
                 style={{ background: 'rgba(0,180,216,0.4)', border: '1.5px solid #00b4d8' }} />
            <span style={{ color: 'var(--tx2)' }}>You</span>
          </div>
        )}
      </div>
    </div>
  );
}
