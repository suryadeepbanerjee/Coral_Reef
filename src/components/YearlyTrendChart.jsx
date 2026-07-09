/**
 * YearlyTrendChart.jsx
 * Subframe-style gradient area chart replacing the plain line chart.
 * Same data, same annotations (El Niño markers, High Risk threshold).
 * Added: smooth curve, teal-to-transparent gradient fill, animated entry.
 */

import React from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Defs,
  linearGradient, stop,
} from 'recharts';

const MAJOR_EVENTS = [1998, 2005, 2010, 2016];

/* ── Custom dot — only on El Niño event years ─────────────────────────────── */
function EventDot({ cx, cy, payload }) {
  if (!MAJOR_EVENTS.includes(payload?.year)) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="#e74c3c" opacity={0.2} />
      <circle cx={cx} cy={cy} r={4} fill="#e74c3c" stroke="#fff" strokeWidth={1.5} />
    </g>
  );
}

/* ── Tooltip ──────────────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background:   'var(--d2)',
      border:       '1px solid var(--bd)',
      borderRadius: 10,
      padding:      '10px 14px',
      fontSize:     15,
      fontFamily:   'var(--font-body)',
      boxShadow:    '0 4px 20px rgba(0,0,0,0.15)',
      minWidth:     150,
    }}>
      <p style={{ color: '#00b4d8', fontWeight: 700, marginBottom: 4 }}>{d.year}</p>
      <p style={{ color: 'var(--tx1)', marginBottom: 2 }}>
        Avg Bleaching: <strong>{d.avg_bleaching}%</strong>
      </p>
      <p style={{ color: 'var(--tx2)', fontSize: 13 }}>Surveys: {d.count}</p>
      {MAJOR_EVENTS.includes(d.year) && (
        <p style={{ color: '#e74c3c', fontWeight: 700, marginTop: 6, fontSize: 13 }}>
          ⚠ Major El Niño Event
        </p>
      )}
    </div>
  );
}

/* ── Main chart component ─────────────────────────────────────────────────── */
export function YearlyTrendChart({ data, loading }) {
  return (
    <div
      className="rounded-xl p-5 border transition-all"
      style={{ background: 'var(--d2)', borderColor: 'var(--bd)', height: 320 }}
    >
      {/* Title */}
      <h3 style={{
        margin:     '0 0 14px 0',
        fontFamily: 'var(--font-heading)',
        fontSize:   16,
        fontWeight: 600,
        color:      'var(--tx1)',
        display:    'flex',
        alignItems: 'center',
        gap:        8,
      }}>
        <span style={{ fontSize: 16 }}>📈</span>
        Yearly Bleaching Trend — 1980–2020
      </h3>

      {loading ? (
        <div className="w-full rounded animate-pulse"
             style={{ height: 240, background: 'var(--d3)' }} />
      ) : (
        <div className="chart-enter" style={{ width: '100%', height: 248 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
            >
              {/* Gradient definition */}
              <defs>
                <linearGradient id="bleachGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00b4d8" stopOpacity={0.35} />
                  <stop offset="60%"  stopColor="#00b4d8" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#00b4d8" stopOpacity={0}    />
                </linearGradient>
              </defs>

              {/* Grid */}
              <CartesianGrid
                strokeDasharray="3 4"
                stroke="var(--gd)"
                vertical={false}
              />

              {/* Axes */}
              <XAxis
                dataKey="year"
                stroke="var(--ax)"
                tick={{ fill: 'var(--tl)', fontSize: 13, fontFamily: 'var(--font-body)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--bd)' }}
                interval={4}
              />
              <YAxis
                stroke="var(--ax)"
                tick={{ fill: 'var(--tl)', fontSize: 13, fontFamily: 'var(--font-body)' }}
                tickLine={false}
                axisLine={false}
                unit="%"
                width={38}
              />

              {/* Tooltip */}
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(0,180,216,0.3)', strokeWidth: 1 }} />

              {/* High-risk threshold */}
              <ReferenceLine
                y={10}
                stroke="#e74c3c"
                strokeDasharray="5 4"
                strokeOpacity={0.7}
                label={{ value: 'High Risk', fill: '#e74c3c', fontSize: 10,
                         fontFamily: 'var(--font-body)', position: 'insideTopRight' }}
              />

              {/* El Niño event markers */}
              {MAJOR_EVENTS.map(y => (
                <ReferenceLine
                  key={y}
                  x={y}
                  stroke="#f39c12"
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                  label={{ value: 'El Niño', fill: '#f39c12', fontSize: 11,
                           fontFamily: 'var(--font-body)', position: 'top' }}
                />
              ))}

              {/* Gradient area */}
              <Area
                type="monotoneX"
                dataKey="avg_bleaching"
                stroke="#00b4d8"
                strokeWidth={2.5}
                fill="url(#bleachGrad)"
                dot={<EventDot />}
                activeDot={{ r: 5, fill: '#00b4d8', stroke: '#fff', strokeWidth: 2 }}
                name="Avg Bleaching %"
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
