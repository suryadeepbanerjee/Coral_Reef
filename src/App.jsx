import React, { useState, useEffect, useRef } from 'react';
import { useCSVData }      from './hooks/useCSVData';
import { useLiveData }     from './hooks/useLiveData';
import { useLocation }     from './hooks/useLocation';
import { Header }          from './components/Header';
import { LiveStatusBar }   from './components/LiveStatusBar';
import { MetricCards }     from './components/MetricCards';
import { YearlyTrendChart } from './components/YearlyTrendChart';
import { OceanZoneChart }  from './components/OceanZoneChart';
import { CountryChart }    from './components/CountryChart';
import { TempScatterChart } from './components/TempScatterChart';
import { SSTAScatterChart } from './components/SSTAScatterChart';
import { ReefMap }         from './components/ReefMap';
import { PredictionPanel } from './components/PredictionPanel';
import { Footer }          from './components/Footer';
import { ReefChatbot }     from './components/ReefChatbot';
import { LoadingScreen }   from './components/LoadingScreen';
import { FeedbackSection } from './components/FeedbackSection';

// The 5 zones tracked by NOAA — must match ZONES in backend/main.py
const TRACKED_ZONES = [
  'Great Barrier Reef',
  'Coral Triangle',
  'Caribbean',
  'Red Sea',
  'Indian Ocean',
];

function SectionTitle({ children }) {
  return (
    <h2 className="mb-4 flex items-center gap-2"
        style={{ color: 'var(--tx1)', fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>
      <div style={{ width: 3, height: 20, background: '#00b4d8', borderRadius: 99, flexShrink: 0 }} />
      {children}
    </h2>
  );
}

function Divider() {
  return <div className="border-t my-8" style={{ borderColor: 'var(--bd)' }} />;
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  // Selected zone for live metric cards
  const [selectedZone, setSelectedZone] = useState(TRACKED_ZONES[0]);

  const handleLoaderDone = () => setIsLoading(false);

  // ── Data hooks — start fetching immediately (even while loader shows) ────
  const {
    loading: csvLoading, error,
    yearlyTrend, oceanStats, countryStats,
    mapPoints,
    worstYear, worstOcean,
    totalRecords, avgBleaching,
    tempVsBleaching, sstaVsBleaching,
    trendLine, sstaTrendLine,
  } = useCSVData();

  // ── Live NOAA satellite data ──────────────────────────────────────────────
  const { liveData, liveStatus, fetchedAt, zonesFailed } = useLiveData();

  // ── User location detection ───────────────────────────────────────────────
  const { location, locationStatus } = useLocation();
  // ── Scroll lock while loader active ─────────────────────────────────────────
  useEffect(() => {
    if (isLoading) {
      const scrollY = window.scrollY;
      document.body.style.position   = 'fixed';
      document.body.style.top        = `-${scrollY}px`;
      document.body.style.left       = '0';
      document.body.style.right      = '0';
      document.body.style.width      = '100%';
      document.body.style.overflow   = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position   = '';
      document.body.style.top        = '';
      document.body.style.left       = '';
      document.body.style.right      = '';
      document.body.style.width      = '';
      document.body.style.overflow   = '';
      document.documentElement.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  }, [isLoading]);

  // ── Block wheel / touch / keyboard scroll events explicitly ─────────────────
  useEffect(() => {
    if (!isLoading) return;

    const preventScroll    = (e) => { e.preventDefault(); e.stopPropagation(); };
    const preventKeyScroll = (e) => {
      const keys = ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '];
      if (keys.includes(e.key)) e.preventDefault();
    };

    window.addEventListener('wheel',     preventScroll,    { passive: false });
    window.addEventListener('touchmove', preventScroll,    { passive: false });
    window.addEventListener('keydown',   preventKeyScroll, { passive: false });

    return () => {
      window.removeEventListener('wheel',     preventScroll);
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('keydown',   preventKeyScroll);
    };
  }, [isLoading]);


  // Auto-select nearest reef zone ONCE when location resolves.
  // hasAutoSelected prevents overriding a manual user selection afterwards.
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (
      location?.nearest_reef &&
      !hasAutoSelected.current &&
      locationStatus !== 'unavailable'
    ) {
      setSelectedZone(location.nearest_reef);
      hasAutoSelected.current = true;
    }
  }, [location, locationStatus]);

  // Fallback: if no location auto-select happened, pick first zone with live data
  const hasLiveAutoSelected = useRef(false);
  useEffect(() => {
    if (!liveData || hasAutoSelected.current || hasLiveAutoSelected.current) return;
    const firstLive = TRACKED_ZONES.find(z => liveData[z]?.data_quality !== 'unavailable');
    if (firstLive) {
      setSelectedZone(firstLive);
      hasLiveAutoSelected.current = true;
    }
  }, [liveData]);

  return (
    <>
      {isLoading && <LoadingScreen onDone={handleLoaderDone} dataReady={!csvLoading} />}

      {/* Dashboard — always mounted underneath the loader overlay. */}
      <div
        className="min-h-screen"
        style={{
          background: 'var(--d1)',
          color:      'var(--tx1)',
          opacity:    isLoading ? 0 : 1,
          transition: isLoading ? 'none' : 'opacity 0.5s ease-out',
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 pt-4 pb-0">

          {/* SECTION 1 — Header */}
          <Header
            totalRecords={totalRecords} avgBleaching={avgBleaching}
            worstYear={worstYear}       worstOcean={worstOcean}
            location={location}
            locationStatus={locationStatus}
          />

          {/* LIVE STATUS BAR — slim indicator directly below Header */}
          <LiveStatusBar
            liveStatus={liveStatus}
            fetchedAt={fetchedAt}
            zonesFailed={zonesFailed}
          />

          {/* Zone selector (only shown when live data is available) */}
          {liveData && liveStatus !== 'unavailable' && (
            <div className="flex flex-wrap gap-2 mb-5" aria-label="Zone selector">
              {TRACKED_ZONES.map(zone => {
                const zoneData = liveData[zone];
                const isActive = zone === selectedZone;
                const color    = zoneData?.risk_color ?? '#64748b';
                return (
                  <button
                    key={zone}
                    id={`zone-btn-${zone.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setSelectedZone(zone)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: `1px solid ${isActive ? color : 'var(--bd)'}`,
                      background: isActive ? `${color}22` : 'var(--d2)',
                      color: isActive ? color : 'var(--tx2)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {zone}
                    {/* Nearest-reef indicator badge */}
                    {location?.nearest_reef === zone && (
                      <span title="Your nearest reef zone" style={{ marginLeft: 5, fontSize: 10 }}>📍</span>
                    )}
                    {zoneData && zoneData.risk !== 'UNKNOWN' && (
                      <span style={{ marginLeft: 4, fontSize: 10 }}>
                        {zoneData.risk === 'HIGH' ? '🔴' : zoneData.risk === 'MODERATE' ? '🟡' : '🟢'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* SECTION 2 — Metric Cards */}
          <MetricCards
            totalRecords={totalRecords} avgBleaching={avgBleaching}
            worstYear={worstYear}       worstOcean={worstOcean}
            loading={csvLoading}
            liveData={liveData}
            liveStatus={liveStatus}
            selectedZone={selectedZone}
          />

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500 text-red-400 rounded-xl px-5 py-4 text-sm">
              ⚠ Failed to load CSV data: {error}
            </div>
          )}

          {/* SECTION 3 — Charts Row 1 */}
          <SectionTitle>Historical Bleaching Trends</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <YearlyTrendChart data={yearlyTrend} loading={csvLoading} />
            <OceanZoneChart   data={oceanStats}  loading={csvLoading} />
          </div>

          <Divider />

          {/* SECTION 4 — Charts Row 2 */}
          <SectionTitle>Geographic &amp; Environmental Analysis</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <CountryChart     data={countryStats}    loading={csvLoading} />
            <TempScatterChart data={tempVsBleaching} trendLine={trendLine}     loading={csvLoading} />
          </div>

          {/* SECTION 4b — SSTA Scatter */}
          <div className="mb-8">
            <SSTAScatterChart data={sstaVsBleaching} trendLine={sstaTrendLine} loading={csvLoading} />
          </div>

          <Divider />

          {/* SECTION 5 — Map */}
          <SectionTitle>Global Reef Survey Sites — 1980–2020</SectionTitle>
          <div className="mb-8">
            <ReefMap
              points={mapPoints}
              loading={csvLoading}
              liveData={liveData}
              fetchedAt={fetchedAt}
              location={location}
              locationStatus={locationStatus}
            />
          </div>

          <Divider />

          {/* SECTION 6 — Prediction Panel */}
          <PredictionPanel />

          {/* Feedback — sits between Prediction Panel and Footer */}
          <Divider />
          <FeedbackSection />

          {/* Footer */}
          <Footer />
        </div>
      </div>

      {/*
        ReefChatbot is a SIBLING of the dashboard div — NOT a child.
        Reason: the dashboard div has CSS transform applied during fade-in.
        Any element with transform/will-change creates a new stacking context,
        which breaks position:fixed children (they become relative to that div,
        not the viewport). Rendering outside fixes this permanently.
      */}
      <ReefChatbot />
    </>
  );
}
