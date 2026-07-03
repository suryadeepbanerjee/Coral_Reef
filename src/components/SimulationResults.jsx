import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';

const getColor = p => p > 40 ? '#e74c3c' : p > 20 ? '#f39c12' : '#2ecc71';

const chartTT = {
  contentStyle: { backgroundColor: 'var(--d2)', border: '1px solid var(--bd)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#00b4d8' },
};

function TempSimChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gd)" vertical={false} />
        <XAxis dataKey="temp_increase" stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }}
          label={{ value: '+°C', position: 'insideRight', fill: 'var(--tl)', fontSize: 10 }} />
        <YAxis stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }} unit="%" />
        <Tooltip {...chartTT} formatter={v => [`${v}%`, 'High Risk Prob']} labelFormatter={l => `+${l}°C`} />
        <Line type="monotone" dataKey="prob_high" stroke="#e74c3c" strokeWidth={2.5}
          dot={{ r: 4, fill: '#e74c3c' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ClimateSimChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gd)" vertical={false} />
        <XAxis dataKey="year" stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }} />
        <YAxis stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }} unit="%" />
        <Tooltip {...chartTT} formatter={v => [`${v}%`, 'High Risk Prob']} />
        <Line type="monotone" dataKey="prob_high" stroke="#f39c12" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AllZonesChart({ data }) {
  const display = data.map(d => ({ ...d, zone_name: d.zone_name === 'Caribbean Reef' ? 'Caribbean' : d.zone_name }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={display} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gd)" horizontal={false} />
        <XAxis type="number" stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 11 }} unit="%" />
        <YAxis type="category" dataKey="zone_name" stroke="var(--ax)" tick={{ fill: 'var(--tl)', fontSize: 10 }} width={120} />
        <Tooltip {...chartTT} formatter={v => [`${v}%`, 'High Risk Prob']} />
        <Bar dataKey="prob_high" radius={[0, 4, 4, 0]} barSize={22}>
          {display.map((d, i) => <Cell key={i} fill={getColor(d.prob_high)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimulationResults({ type, data, zone }) {
  if (!data) return null;
  const titles = {
    temperature: `🌡️ Temperature Rise Simulation — ${zone}`,
    climate:     `🌍 30-Year Climate Projection (+0.2°C/yr) — ${zone}`,
    all_zones:   '🗺️ Current Risk — All 5 Reef Zones',
  };
  return (
    <div className="mt-4 rounded-xl p-5 border" style={{ background: 'var(--d3)', borderColor: 'var(--bd)' }}>
      <h4 className="font-semibold mb-3 text-[#00b4d8]">{titles[type]}</h4>
      {type === 'temperature' && <TempSimChart data={data} />}
      {type === 'climate'     && <ClimateSimChart data={data} />}
      {type === 'all_zones'   && <AllZonesChart data={data} />}
    </div>
  );
}
