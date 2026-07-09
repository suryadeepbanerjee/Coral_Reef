/**
 * geoUtils.js
 * Pure utility functions — no React, no side effects, no fetch calls.
 * Haversine distance, nearest reef lookup, and result shape builder.
 */

// ── Haversine great-circle distance (km) ─────────────────────────────────────
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── The 5 tracked reef zones (mirrors ZONES in backend/main.py) ───────────────
const REEF_ZONES = [
  { name: 'Great Barrier Reef', lat: -18.0, lon: 147.0 },
  { name: 'Coral Triangle',     lat:  0.0,  lon: 125.0 },
  { name: 'Caribbean',          lat: 15.0,  lon: -66.0 },
  { name: 'Red Sea',            lat: 21.0,  lon:  38.0 },
  { name: 'Indian Ocean',       lat: -5.0,  lon:  73.0 },
];

// ── Find closest reef zone to a lat/lon ───────────────────────────────────────
export function getNearestReef(lat, lon) {
  let nearest = null;
  let minDist = Infinity;
  REEF_ZONES.forEach(zone => {
    const dist = haversineDistance(lat, lon, zone.lat, zone.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = zone;
    }
  });
  return {
    zone:        nearest.name,
    distance_km: Math.round(minDist),
  };
}

// ── Assemble a normalised location result object ──────────────────────────────
export function buildLocationResult(lat, lon, accuracy, confidence, sources, city, state, country) {
  const { zone, distance_km } = getNearestReef(lat, lon);
  return {
    lat,
    lon,
    accuracy_m:       accuracy,
    confidence,
    sources,
    city:             city    || null,
    state:            state   || null,
    country:          country || null,
    nearest_reef:     zone,
    reef_distance_km: distance_km,
    location_display: [city, state, country].filter(Boolean).join(', ') || country || 'Unknown location',
    detected_at:      new Date().toISOString(),
  };
}
