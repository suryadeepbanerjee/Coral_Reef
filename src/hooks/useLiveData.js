/**
 * useLiveData.js
 * Fetches live coral reef conditions from NOAA ERDDAP via the FastAPI backend.
 * Never crashes the app — silently falls back to historical CSV data on failure.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const FETCH_TIMEOUT_MS  = 20_000;   // 20s abort timeout for each fetch
const RETRY_DELAY_MS    = 30_000;   // 30s before one automatic retry
const AUTO_REFRESH_MS   = 61 * 60 * 1000; // 61 min auto-refresh

export function useLiveData() {
  const [liveData,    setLiveData]    = useState(null);
  const [liveStatus,  setLiveStatus]  = useState('loading');
  const [fetchedAt,   setFetchedAt]   = useState(null);
  const [zonesFailed, setZonesFailed] = useState(0);

  const retryTimerRef   = useRef(null);
  const refreshTimerRef = useRef(null);
  const mountedRef      = useRef(true);

  const doFetch = useCallback(async (isRetry = false) => {
    if (!mountedRef.current) return;

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const resp = await fetch(`${API_BASE}/live-data`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!mountedRef.current) return;

      if (resp.ok) {
        const json = await resp.json();
        setLiveData(json.zones);
        // 'live' | 'cached' — map any partial quality into 'partial'
        const hasPartial = json.zones_failed > 0;
        setLiveStatus(hasPartial ? 'partial' : (json.status || 'live'));
        setFetchedAt(json.fetched_at || null);
        setZonesFailed(json.zones_failed ?? 0);

        // Schedule next auto-refresh
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          if (mountedRef.current) doFetch(false);
        }, AUTO_REFRESH_MS);

      } else {
        // HTTP 503, 429, etc. — fall back silently
        setLiveData(null);
        setLiveStatus('unavailable');
        setZonesFailed(0);

        if (!isRetry) scheduleRetry();
      }
    } catch (_err) {
      clearTimeout(timeoutId);
      if (!mountedRef.current) return;

      // Network error or AbortError — fall back silently
      setLiveData(null);
      setLiveStatus('unavailable');
      setZonesFailed(0);

      if (!isRetry) scheduleRetry();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function scheduleRetry() {
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      if (mountedRef.current) doFetch(true); // one retry — then stop
    }, RETRY_DELAY_MS);
  }

  useEffect(() => {
    mountedRef.current = true;
    doFetch(false);

    return () => {
      mountedRef.current = false;
      clearTimeout(retryTimerRef.current);
      clearTimeout(refreshTimerRef.current);
    };
  }, [doFetch]);

  return { liveData, liveStatus, fetchedAt, zonesFailed };
}
