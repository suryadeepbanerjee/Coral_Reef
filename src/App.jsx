import React, { useState, useEffect } from 'react';
import { useCSVData } from './hooks/useCSVData';
import { Header }           from './components/Header';
import { MetricCards }      from './components/MetricCards';
import { YearlyTrendChart } from './components/YearlyTrendChart';
import { OceanZoneChart }   from './components/OceanZoneChart';
import { CountryChart }     from './components/CountryChart';
import { TempScatterChart } from './components/TempScatterChart';
import { SSTAScatterChart } from './components/SSTAScatterChart';
import { ReefMap }          from './components/ReefMap';
import { PredictionPanel }  from './components/PredictionPanel';
import { Footer }           from './components/Footer';
import { ReefChatbot }      from './components/ReefChatbot';
import { LoadingScreen }    from './components/LoadingScreen';

function SectionTitle({ children }) {
  return (
    <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--tx1)' }}>
      <div className="w-1 h-6 bg-[#00b4d8] rounded-full" />
      {children}
    </h2>
  );
}

function Divider() {
  return <div className="border-t my-8" style={{ borderColor: 'var(--bd)' }} />;
}

export default function App() {
  // No isDark state here — ThemeToggle is self-contained.
  // Removing it prevents the entire App tree from re-rendering on toggle.
  const [isLoading, setIsLoading] = useState(true);

  // LoadingScreen calls this after its own exit animation completes.
  // Just unmount the loader — no extra state needed here.
  const handleLoaderDone = () => setIsLoading(false);

  // ── Scroll lock while loader active ─────────────────────────────────────────
  // position:fixed prevents keyboard/touch/momentum scroll from revealing
  // the dashboard early. Scroll position is restored exactly on unlock.
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

    const preventScroll = (e) => { e.preventDefault(); e.stopPropagation(); };
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

  const {
    loading, error,
    yearlyTrend, oceanStats, countryStats,
    mapPoints,
    worstYear, worstOcean,
    totalRecords, avgBleaching,
    tempVsBleaching, sstaVsBleaching,
    trendLine, sstaTrendLine,
  } = useCSVData();

  return (
    <>
      {isLoading && <LoadingScreen onDone={handleLoaderDone} />}

      {/* Dashboard — always mounted underneath the loader overlay.
          No transform here (transform creates stacking context that
          breaks LoadingScreen's position:fixed fullscreen coverage).
          Simple opacity fade-in once loader unmounts. */}
      <div
        className="min-h-screen"
        style={{
          background: 'var(--d1)',
          color:      'var(--tx1)',
          opacity:    isLoading ? 0 : 1,
          transition: isLoading ? 'none' : 'opacity 0.5s ease-out',
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8">

          {/* SECTION 1 — Header (ThemeToggle is self-contained inside) */}
          <Header
            totalRecords={totalRecords} avgBleaching={avgBleaching}
            worstYear={worstYear}       worstOcean={worstOcean}
          />

          {/* SECTION 2 — Metric Cards */}
          <MetricCards
            totalRecords={totalRecords} avgBleaching={avgBleaching}
            worstYear={worstYear}       worstOcean={worstOcean}
            loading={loading}
          />

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500 text-red-400 rounded-xl px-5 py-4 text-sm">
              ⚠ Failed to load CSV data: {error}
            </div>
          )}

          {/* SECTION 3 — Charts Row 1 */}
          <SectionTitle>Historical Bleaching Trends</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <YearlyTrendChart data={yearlyTrend} loading={loading} />
            <OceanZoneChart   data={oceanStats}  loading={loading} />
          </div>

          <Divider />

          {/* SECTION 4 — Charts Row 2 */}
          <SectionTitle>Geographic &amp; Environmental Analysis</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <CountryChart     data={countryStats}    loading={loading} />
            <TempScatterChart data={tempVsBleaching} trendLine={trendLine}     loading={loading} />
          </div>

          {/* SECTION 4b — SSTA Scatter */}
          <div className="mb-8">
            <SSTAScatterChart data={sstaVsBleaching} trendLine={sstaTrendLine} loading={loading} />
          </div>

          <Divider />

          {/* SECTION 5 — Map */}
          <SectionTitle>Global Reef Survey Sites — 1980–2020</SectionTitle>
          <div className="mb-8">
            <ReefMap points={mapPoints} loading={loading} />
          </div>

          <Divider />

          {/* SECTION 6 — Prediction Panel */}
          <PredictionPanel />

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
