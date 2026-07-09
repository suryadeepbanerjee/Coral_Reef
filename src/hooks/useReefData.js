import { useState, useEffect, useCallback } from 'react';
import { ZONES } from '../constants/zones';
import { parseSinglePointData, parseTrendData } from '../utils/erddapParser';

const isDev = import.meta.env.DEV;

const ERDDAP_SERVERS = isDev ? [
  "/erddap/griddap/NOAA_DHW.csv"
] : [
  "https://erddap.ioos.us/erddap/griddap/NOAA_DHW.csv",
  "https://pae-paha.pacioos.hawaii.edu/erddap/griddap/dhw_5km.csv",
  "https://corsproxy.io/?https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_DHW.csv",
  "https://api.allorigins.win/raw?url=https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_DHW.csv"
];

const tryFetchWithFallback = async (variable, time, lat, lon) => {
  for (const baseUrl of ERDDAP_SERVERS) {
    const url = `${baseUrl}?${variable}[${time}][(${lat}):1:(${lat})][(${lon}):1:(${lon})]`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const text = await response.text();
        // Check if it's a valid CSV and not an HTML error page
        if (text && text.trim().length > 0 && !text.trim().startsWith('<')) {
          return { text, server: baseUrl };
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch from ${baseUrl}:`, err.message);
    }
  }
  throw new Error(`All fallback servers failed for ${variable}`);
};

const fetchZoneData = async (zoneName, coords) => {
  const { lat, lon } = coords;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T12:00:00Z';

  const results = await Promise.all([
    tryFetchWithFallback('CRW_DHW', '(last)', lat, lon),
    tryFetchWithFallback('CRW_SST', '(last)', lat, lon),
    tryFetchWithFallback('CRW_SSTANOMALY', '(last)', lat, lon),
    tryFetchWithFallback('CRW_BAA', '(last)', lat, lon),
    tryFetchWithFallback('CRW_DHW', `(${thirtyDaysAgo}):(last)`, lat, lon)
  ]);

  // Extract texts from results array
  const [dhwCsv, sstCsv, anomalyCsv, baaCsv, trendCsv] = results.map(r => r.text);

  return {
    name: zoneName,
    dhw: parseSinglePointData(dhwCsv),
    sst: parseSinglePointData(sstCsv),
    sstAnomaly: parseSinglePointData(anomalyCsv),
    baa: parseSinglePointData(baaCsv),
    trend: parseTrendData(trendCsv),
    serverUsed: results[0].server
  };
};

export const useReefData = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [lastFetched, setLastFetched] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrors({});
    
    const promises = Object.entries(ZONES).map(async ([zoneName, coords]) => {
      try {
        const result = await fetchZoneData(zoneName, coords);
        setData(prev => ({ ...prev, [zoneName]: result }));
        console.log(`[${zoneName}] Successfully fetched data from ${result.serverUsed}`);
      } catch (error) {
        setErrors(prev => ({ ...prev, [zoneName]: true }));
        console.error(`[${zoneName}] Failed to fetch:`, error);
      }
    });

    await Promise.all(promises);
    
    setLoading(false);
    setLastFetched(new Date().toUTCString());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, errors, lastFetched, refetch: fetchData };
};
