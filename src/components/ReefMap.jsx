import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const getBleachColor = b => b == null ? '#94a3b8' : b > 10 ? '#e74c3c' : b > 0 ? '#f39c12' : '#2ecc71';

function CanvasRenderer() {
  const map = useMap();
  useMemo(() => { if (!map._coralCanvas) map._coralCanvas = L.canvas({ padding: 0.5 }); }, [map]);
  return null;
}

export function ReefMap({ points, loading }) {
  const sample = useMemo(() => {
    if (!points.length) return [];
    const step = Math.max(1, Math.floor(points.length / 8000));
    return points.filter((_, i) => i % step === 0);
  }, [points]);

  return (
    <div className="rounded-xl border relative overflow-hidden transition-all"
         style={{ height: 500, borderColor: 'var(--bd)', background: 'var(--d2)' }}>
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
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
          />
          {sample.map((pt, i) => (
            <CircleMarker key={i} center={[pt.lat, pt.lon]} radius={4}
              fillColor={getBleachColor(pt.bleaching)} fillOpacity={0.75} color="transparent" weight={0}>
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <p className="font-bold border-b pb-1 mb-2">{pt.site_name || 'Reef Site'}</p>
                  <table className="w-full text-xs"><tbody>
                    {[['Country', pt.country], ['Ocean', pt.ocean], ['Year', pt.year],
                      ['Bleaching', pt.bleaching != null ? `${pt.bleaching.toFixed(1)}%` : 'N/A'],
                      ['SST', pt.sst != null ? `${pt.sst.toFixed(1)}°C` : 'N/A'],
                      ['SSTA', pt.ssta != null ? pt.ssta.toFixed(2) : 'N/A'],
                      ['DHW', pt.dhw != null ? pt.dhw.toFixed(2) : 'N/A'],
                      ['Depth', pt.depth != null ? `${pt.depth}m` : 'N/A'],
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
        </MapContainer>
      )}
      <div className="absolute bottom-6 right-4 z-[1000] rounded-lg px-3 py-2 text-xs border"
           style={{ background: 'var(--d2)', borderColor: 'var(--bd)', color: 'var(--tx1)' }}>
        <div className="font-semibold mb-2 text-[#00b4d8]">Bleaching %</div>
        {[['#2ecc71','0% — None'], ['#f39c12','1–10% — Moderate'], ['#e74c3c','>10% — Severe']].map(([c, l]) => (
          <div key={l} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ background: c }} />
            <span style={{ color: 'var(--tx2)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
