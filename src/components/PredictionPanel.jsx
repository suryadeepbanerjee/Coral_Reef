import React, { useState } from 'react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';


// ── Default slider values (12 sliders; SSTA_Mean is NOT a slider)
const DEFAULTS = {
  Temperature_Mean_Celsius: 26.0,
  SSTA:                     0.0,
  SSTA_DHW:                 0.0,
  TSA_DHW:                  0.0,
  Turbidity:                0.03,
  Cyclone_Frequency:        50.0,
  Windspeed:                5.0,
  Depth_m:                  10.0,
  SSTA_FrequencyMax:        8.0,
  TSA_Mean:                 0.0,
  ClimSST:                  26.0,
  TSA_Frequency:            0.2,
};

// ── Slider definitions — exact spec from teammate
const SLIDERS = [
  { key: 'Temperature_Mean_Celsius', label: 'Temperature (°C)',                          min: 15.0, max: 35.0,  step: 0.1  },
  { key: 'SSTA',                     label: 'SSTA',                                      min: -5.0, max: 6.0,   step: 0.1  },
  { key: 'SSTA_DHW',                 label: 'SSTA DHW (weeks)',                          min: 0.0,  max: 55.0,  step: 0.1  },
  { key: 'TSA_DHW',                  label: 'TSA DHW (weeks)',                           min: 0.0,  max: 55.0,  step: 0.1  },
  { key: 'Turbidity',                label: 'Turbidity',                                 min: 0.0,  max: 1.5,   step: 0.01 },
  { key: 'Cyclone_Frequency',        label: 'Cyclone Frequency',                         min: 18.0, max: 110.0, step: 1.0  },
  { key: 'Windspeed',                label: 'Windspeed (m/s)',                           min: 0.0,  max: 25.0,  step: 0.1  },
  { key: 'Depth_m',                  label: 'Depth (m)',                                 min: 0.0,  max: 90.0,  step: 0.5  },
  { key: 'SSTA_FrequencyMax',        label: 'SSTA Frequency Max',                        min: 0.0,  max: 55.0,  step: 0.1  },
  { key: 'TSA_Mean',                 label: 'TSA Mean (enter positive)',                 min: 0.0,  max: 9.0,   step: 0.1  },
  { key: 'ClimSST',                  label: 'Climatic SST °C (auto → Kelvin)',           min: 15.0, max: 35.0,  step: 0.1  },
  { key: 'TSA_Frequency',            label: 'TSA Frequency',                             min: 0.0,  max: 1.0,   step: 0.01 },
];

// ── Risk colour map based on risk_label text
function riskColor(label) {
  if (!label) return '#2ecc71';
  if (label.includes('HIGH'))   return '#e74c3c';
  if (label.includes('MEDIUM')) return '#f39c12';
  return '#2ecc71';
}

function riskBg(label) {
  if (!label) return 'rgba(46,204,113,0.12)';
  if (label.includes('HIGH'))   return 'rgba(231,76,60,0.12)';
  if (label.includes('MEDIUM')) return 'rgba(243,156,18,0.12)';
  return 'rgba(46,204,113,0.12)';
}

// ── Pick the probability value matching current risk class
function dominantProb(result) {
  if (!result) return 0;
  const label = result.risk_label || '';
  if (label.includes('HIGH'))   return result.probabilities?.['High Risk']   ?? 0;
  if (label.includes('MEDIUM')) return result.probabilities?.['Medium Risk'] ?? 0;
  return result.probabilities?.['Low Risk'] ?? 0;
}

// ── Mini horizontal probability bar
function ProbBar({ label, emoji, value, color }) {
  return (
    <div className="flex items-center gap-2 text-xs mb-1.5">
      <span className="w-4">{emoji}</span>
      <span className="w-24 text-right" style={{ color: 'var(--tx2)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bd)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="w-10 text-right font-semibold tabular-nums" style={{ color }}>{value?.toFixed(1)}%</span>
    </div>
  );
}

export function PredictionPanel() {
  const [values, setValues]         = useState({ ...DEFAULTS });
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const [simResult, setSimResult]   = useState(null);
  const [simScenario, setSimScenario] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const handleSlider = (key, val) => setValues(v => ({ ...v, [key]: parseFloat(val) }));

  // ── Predict
  const handlePredict = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}: ${await res.text()}`);
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Simulate scenario
  const handleSimulate = async (scenario) => {
    setSimLoading(true); setSimResult(null); setSimScenario(scenario);
    try {
      const baseline_inputs = { ...values, SSTA_Mean: 0.0 };
      const res = await fetch(`${API}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseline_inputs, scenario, years: 10 }),
      });
      if (!res.ok) throw new Error(`Sim error ${res.status}: ${await res.text()}`);
      setSimResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setSimLoading(false); }
  };

  const color = riskColor(result?.risk_label);
  const gaugeValue = dominantProb(result);

  return (
    <section className="rounded-2xl border p-6 md:p-8 transition-all"
             style={{ background: 'var(--d2)', borderColor: 'var(--bd)' }}>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── LEFT — Heading + 12 Sliders + Button */}
        <div className="lg:col-span-3 flex flex-col">

          {/* Heading lives here so right panel starts at the same vertical level */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--tx1)' }}>
              🤖 Bleaching Risk Predictor — Enter Conditions
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>
              Powered by Random Forest trained on 41,361 real reef surveys
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 flex-1 content-between">
            {SLIDERS.map(s => {
              const pct = ((values[s.key] - s.min) / (s.max - s.min)) * 100;
              const decimals = s.step < 0.1 ? 2 : 1;
              return (
                <div key={s.key} className="pb-5">
                  <div className="flex justify-between text-xs mb-1">
                    <label className="font-medium" style={{ color: 'var(--tx2)' }}>{s.label}</label>
                    <span className="text-[#00b4d8] font-semibold tabular-nums">
                      {values[s.key]?.toFixed(decimals)}
                    </span>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step}
                    value={values[s.key]}
                    onChange={e => handleSlider(s.key, e.target.value)}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, #00b4d8 ${pct}%, var(--bd) ${pct}%)` }}
                  />
                  <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--tx2)' }}>
                    <span>{s.min}</span><span>{s.max}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={handlePredict} disabled={loading}
            className="mt-6 w-full py-4 text-black font-black text-lg rounded-xl transition-all shadow-lg disabled:opacity-50"
            style={{ background: '#00b4d8', boxShadow: '0 4px 24px rgba(0,180,216,0.25)' }}>
            {loading ? '⏳ Predicting…' : '🔬 PREDICT BLEACHING RISK'}
          </button>

          {error && (
            <div className="mt-3 bg-red-500/10 border border-red-500 text-red-500 rounded-lg px-4 py-3 text-sm">
              ⚠ {error} — Is the backend running? Run: <code className="font-mono text-xs">cd backend &amp;&amp; python -m uvicorn main:app --port 8000</code>
            </div>
          )}
        </div>

        {/* ── RIGHT — Results */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Empty state — flex-1 so it fills the full column height */}
          {!result && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center border-2 border-dashed rounded-xl"
                 style={{ borderColor: 'var(--bd)', color: 'var(--tx2)' }}>
              <span className="text-5xl">🪸</span>
              <p>Adjust sliders,<br />then click <strong>PREDICT BLEACHING RISK</strong></p>
            </div>
          )}

          {/* Spinner — flex-1 so it fills the full column height */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-[#00b4d8]">
                <div className="w-12 h-12 border-4 border-[#00b4d8] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm animate-pulse">Running model…</p>
              </div>
            </div>
          )}

          {/* ── Result panel — flex-1 + justify-between distributes boxes to fill the same height as sliders */}
          {result && (
            <div className="flex flex-col flex-1 justify-between gap-3">

              {/* Risk badge — full label with emoji from backend */}
              <div className="text-center mt-4">
                <div className="inline-block px-8 py-3 rounded-full font-black text-xl tracking-widest shadow-lg"
                     style={{ background: color, color: color === '#f39c12' ? '#000' : '#fff' }}>
                  {result.risk_label}
                </div>
              </div>

              {/* Gauge — dominant class probability */}
              <div className="relative" style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="100%"
                    data={[{ value: gaugeValue }]} startAngle={180} endAngle={0}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar minAngle={5} background={{ fill: 'var(--d3)' }} clockWise
                      dataKey="value" fill={color} cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
                  <span className="text-3xl font-black" style={{ color: 'var(--tx1)' }}>{gaugeValue.toFixed(1)}%</span>
                  <span className="text-xs" style={{ color: 'var(--tx2)' }}>Confidence</span>
                </div>
              </div>

              {/* Three-class probability bars */}
              <div className="rounded-xl p-4 border" style={{ background: 'var(--d3)', borderColor: 'var(--bd)' }}>
                <p className="text-[#00b4d8] font-semibold text-xs uppercase tracking-wider mb-3">Class Probabilities</p>
                <ProbBar label="Low Risk"    emoji="🟢" value={result.probabilities?.['Low Risk']}    color="#2ecc71" />
                <ProbBar label="Medium Risk" emoji="🟡" value={result.probabilities?.['Medium Risk']} color="#f39c12" />
                <ProbBar label="High Risk"   emoji="🔴" value={result.probabilities?.['High Risk']}   color="#e74c3c" />
                <p className="text-xs mt-3 text-right" style={{ color: 'var(--tx2)' }}>
                  Model Confidence: <span className="font-semibold" style={{ color: 'var(--tx1)' }}>{result.confidence}%</span>
                </p>
              </div>

              {/* Risk message */}
              <div className="rounded-xl p-4 border text-sm leading-relaxed"
                   style={{ background: riskBg(result.risk_label), borderColor: color, color: 'var(--tx1)' }}>
                <p className="font-semibold text-xs uppercase tracking-wider mb-2" style={{ color }}>📢 Assessment</p>
                <p>{result.risk_message}</p>
              </div>

              {/* Recommended action */}
              <div className="rounded-xl p-4 border text-sm leading-relaxed"
                   style={{ background: 'rgba(0,180,170,0.08)', borderColor: '#00b4aa', color: 'var(--tx1)' }}>
                <p className="font-semibold text-xs uppercase tracking-wider mb-2" style={{ color: '#00b4aa' }}>🛡️ Recommended Action</p>
                <p>{result.recommended_action}</p>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ── SIMULATION — full width below both columns, only after prediction */}
      {result && (
        <div className="mt-6 border-t pt-6" style={{ borderColor: 'var(--bd)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--tx2)' }}>
              📈 Climate Scenario Simulation — 10-Year Projection
            </p>
            <div className="flex gap-2">
              {[
                { key: 'optimistic', label: '🌿 Optimistic',  col: '#2ecc71' },
                { key: 'status_quo', label: '📊 Status Quo',  col: '#f39c12' },
                { key: 'worst_case', label: '🔥 Worst Case',  col: '#e74c3c' },
              ].map(btn => (
                <button key={btn.key}
                  onClick={() => handleSimulate(btn.key)}
                  disabled={simLoading}
                  className="py-2 px-5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-50"
                  style={{
                    background:   simScenario === btn.key && simResult ? `${btn.col}22` : 'var(--d3)',
                    borderColor:  simScenario === btn.key && simResult ? btn.col : 'var(--bd)',
                    color:        simScenario === btn.key && simResult ? btn.col : 'var(--tx2)',
                  }}>
                  {simLoading && simScenario === btn.key ? '⏳ Running…' : btn.label}
                </button>
              ))}
            </div>
          </div>

          {simResult && (
            <div className="rounded-xl border p-4" style={{ background: 'var(--d3)', borderColor: 'var(--bd)' }}>
              <p className="text-xs mb-3 text-center font-medium" style={{ color: 'var(--tx2)' }}>
                {simScenario === 'optimistic' ? '🌿 Optimistic' : simScenario === 'worst_case' ? '🔥 Worst Case' : '📊 Status Quo'} — 10-Year Projection
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={simResult} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" />
                  <XAxis dataKey="Year" tick={{ fontSize: 11, fill: 'var(--tx2)' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--tx2)' }} unit="%" />
                  <Tooltip
                    contentStyle={{ background: 'var(--d2)', border: '1px solid var(--bd)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--tx1)' }}
                    formatter={(v, name) => [`${v.toFixed(1)}%`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="Overall Reef Health (%)"
                    stroke="#00b4aa" strokeWidth={2.5} dot={false} name="Reef Health %" />
                  <Line type="monotone" dataKey="Bleaching Probability (%)"
                    stroke="#e74c3c" strokeWidth={2.5} dot={false} name="Bleaching Prob %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

    </section>
  );
}
