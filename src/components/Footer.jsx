import React from 'react';

export function Footer() {
  return (
    <footer className="mt-12 pt-6 border-t border-[#1e3a5f] text-center text-slate-500 text-sm pb-8">
      <p>
        Data: <span className="text-[#00b4d8]">Global Coral Reef Monitoring Network</span>
        {' '}· 1980–2020 · 41,361 reef survey records
      </p>
      <p className="mt-1">
        ML Model: <span className="text-[#00b4d8]">Random Forest Classifier</span>
        {' '}· Backend: FastAPI · Frontend: React + Recharts + Leaflet
      </p>
    </footer>
  );
}
