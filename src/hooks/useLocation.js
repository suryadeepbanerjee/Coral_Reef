/**
 * useLocation.js
 * 4-step fallback chain for user location detection.
 * Runs automatically on mount — no user interaction required.
 * All failures are caught silently; user always gets a usable state.
 *
 * Steps:
 *   1. Browser Geolocation API  → high accuracy, requires permission
 *   2. ipapi.co                 → IP-based, city-level, no key required
 *   3. ipgeolocation.io         → IP-based, city-level, VITE_IPGEO_KEY required
 *   4. Default fallback         → null lat/lon, no reef selected
 */

import { useState, useEffect } from 'react';
import { buildLocationResult } from '../utils/geoUtils';

// ── Nominatim reverse geocoder ────────────────────────────────────────────────
// Used after Step 1 to convert lat/lon → city/state/country.
// OSM usage policy requires a meaningful User-Agent header.
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':       'CoralReefDashboard/1.0 (coralreef.suryadeepbanerjee.in)',
        'Accept-Language':  'en',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return {
      city:    data.address?.city
            || data.address?.town
            || data.address?.village
            || data.address?.county
            || null,
      state:   data.address?.state   || null,
      country: data.address?.country || null,
    };
  } catch {
    return {};
  }
}

// ── Step 1: Browser Geolocation API ──────────────────────────────────────────
async function tryBrowserGeolocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }

    // Hard ceiling: if the browser API stalls past 8 s, bail out
    const timeout = setTimeout(() => resolve(null), 8000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(timeout);
        const lat      = pos.coords.latitude;
        const lon      = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        const confidence = accuracy <= 100  ? 0.95
                         : accuracy <= 1000 ? 0.80
                         : 0.65;

        // Reverse geocode (best-effort — failure returns {})
        const geo = await reverseGeocode(lat, lon);

        resolve(buildLocationResult(
          lat, lon, Math.round(accuracy), confidence,
          ['browser', 'nominatim'],
          geo.city, geo.state, geo.country,
        ));
      },
      () => { clearTimeout(timeout); resolve(null); },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 300000 },
    );
  });
}

// ── Step 2: ipapi.co (free, no key) ──────────────────────────────────────────
async function tryIpApi() {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.latitude || !d.longitude) return null;
    return buildLocationResult(
      parseFloat(d.latitude),
      parseFloat(d.longitude),
      10000, 0.45,
      ['ipapi'],
      d.city, d.region, d.country_name,
    );
  } catch {
    return null;
  }
}

// ── Step 3: ipgeolocation.io (requires VITE_IPGEO_KEY) ───────────────────────
async function tryIpGeolocation() {
  try {
    const key = import.meta.env.VITE_IPGEO_KEY;
    if (!key) return null;                         // skip cleanly if key absent
    const res = await fetch(
      `https://api.ipgeolocation.io/v3/ipgeo?apiKey=${key}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.latitude || !d.longitude) return null;
    return buildLocationResult(
      parseFloat(d.latitude),
      parseFloat(d.longitude),
      10000, 0.45,
      ['ipgeolocation'],
      d.city, d.state_prov, d.country_name,
    );
  } catch {
    return null;
  }
}

// ── Step 4: Default fallback ──────────────────────────────────────────────────
function getDefaultFallback() {
  return {
    lat:              null,
    lon:              null,
    accuracy_m:       null,
    confidence:       0.10,
    sources:          ['default'],
    city:             null,
    state:            null,
    country:          null,
    nearest_reef:     null,
    reef_distance_km: null,
    location_display: null,
    detected_at:      new Date().toISOString(),
  };
}

// ── Main hook ─────────────────────────────────────────────────────────────────
const SESSION_KEY = 'reef_location_cache';

export function useLocation() {
  const [location,       setLocation]       = useState(null);
  const [locationStatus, setLocationStatus] = useState('detecting');
  // 'detecting' | 'confirmed' | 'approximate' | 'unavailable'

  useEffect(() => {
    let cancelled = false;

    // ── Return cached result from this browser session immediately ─────────
    try {
      const cached = sessionStorage.getItem(SESSION_KEY);
      if (cached) {
        const { result, status } = JSON.parse(cached);
        if (!cancelled) {
          setLocation(result);
          setLocationStatus(status);
        }
        return;  // ← no API calls at all
      }
    } catch { /* ignore sessionStorage errors */ }

    async function detect() {
      setLocationStatus('detecting');

      // Step 1 — Browser GPS
      let result = await tryBrowserGeolocation();
      if (result && !cancelled) {
        setLocation(result);
        setLocationStatus('confirmed');
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ result, status: 'confirmed' })); } catch {}
        return;
      }

      // Step 2 — ipapi.co
      result = await tryIpApi();
      if (result && !cancelled) {
        setLocation(result);
        setLocationStatus('approximate');
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ result, status: 'approximate' })); } catch {}
        return;
      }

      // Step 3 — ipgeolocation.io (only if ipapi.co fully unavailable)
      result = await tryIpGeolocation();
      if (result && !cancelled) {
        setLocation(result);
        setLocationStatus('approximate');
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ result, status: 'approximate' })); } catch {}
        return;
      }

      // Step 4 — Default (no location, no zone auto-select)
      if (!cancelled) {
        const fallback = getDefaultFallback();
        setLocation(fallback);
        setLocationStatus('unavailable');
        // Don't cache unavailable — let next reload retry
      }
    }

    detect();
    return () => { cancelled = true; };
  }, []);

  return { location, locationStatus };
}
