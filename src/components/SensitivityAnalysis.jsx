import { useState, useEffect, useCallback } from 'react';
import { calcPortfolioPUC } from '../engine/puc.js';
import { fmt } from '../utils/format.js';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

export default function SensitivityAnalysis({ employees, baseAssumptions, baseResult }) {
  const [discountSlider, setDiscountSlider] = useState(baseAssumptions.discountRate * 100);
  const [salarySlider, setSalarySlider] = useState(baseAssumptions.salaryIncreaseRate * 100);
  const [liveResult, setLiveResult] = useState(null);
  const [chartData, setChartData] = useState([]);

  const baseDBO = baseResult?.summary?.totalDBO || 0;
  const baseCSC = baseResult?.summary?.totalCSC || 0;

  // Recalc on slider change
  const recalc = useCallback((discount, salary) => {
    if (!employees || employees.length === 0) return;
    const assumptions = {
      ...baseAssumptions,
      discountRate: discount / 100,
      salaryIncreaseRate: salary / 100,
    };
    const result = calcPortfolioPUC(employees, assumptions);
    setLiveResult(result.summary);
  }, [employees, baseAssumptions]);

  useEffect(() => { recalc(discountSlider, salarySlider); }, [discountSlider, salarySlider, recalc]);

  // Build sensitivity curves
  useEffect(() => {
    if (!employees || employees.length === 0) return;

    const points = [];
    for (let d = -2; d <= 2; d += 0.5) {
      const dr = (baseAssumptions.discountRate * 100 + d) / 100;
      if (dr <= 0) continue;
      const r1 = calcPortfolioPUC(employees, { ...baseAssumptions, discountRate: dr });
      const r2 = calcPortfolioPUC(employees, {
        ...baseAssumptions,
        salaryIncreaseRate: (baseAssumptions.salaryIncreaseRate * 100 + d) / 100,
      });
      points.push({
        delta: d === 0 ? '0 (Base)' : (d > 0 ? `+${d}%` : `${d}%`),
        dbo_diskonto: r1.summary.totalDBO,
        dbo_upah: r2.summary.totalDBO,
        csc_diskonto: r1.summary.totalCSC,
        csc_upah: r2.summary.totalCSC,
        _d: d,
      });
    }
    setChartData(points);
  }, [employees, baseAssumptions]);

  const liveChange = liveResult ? liveResult.totalDBO - baseDBO : 0;
  const liveChangePct = baseDBO > 0 ? (liveChange / baseDBO * 100) : 0;

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: 'var(--text2)', marginBottom: 6 }}>Perubahan: {label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
            {p.name}: {fmt.rpShort(p.value)}
          </div>
        ))}
      </div>
    );
  };

  if (!baseResult) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--text3)' }}>Jalankan perhitungan terlebih dahulu untuk melihat analisis sensitivitas.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Live sliders */}
      <div className="card">
        <div className="card-title">Simulator Interaktif — Ubah Asumsi, Lihat Dampak Real-time</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Tingkat Diskonto</span>
              <span className="slider-value">{discountSlider.toFixed(2)}%</span>
            </div>
            <input type="range" min="2" max="15" step="0.01"
              value={discountSlider}
              onChange={e => setDiscountSlider(parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)' }}>
              <span>2%</span><span>Base: {(baseAssumptions.discountRate * 100).toFixed(2)}%</span><span>15%</span>
            </div>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Tingkat Kenaikan Upah</span>
              <span className="slider-value">{salarySlider.toFixed(2)}%</span>
            </div>
            <input type="range" min="0" max="20" step="0.01"
              value={salarySlider}
              onChange={e => setSalarySlider(parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)' }}>
              <span>0%</span><span>Base: {(baseAssumptions.salaryIncreaseRate * 100).toFixed(2)}%</span><span>20%</span>
            </div>
          </div>
        </div>

        {/* Live result */}
        {liveResult && (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'DBO (Skenario)', value: liveResult.totalDBO, className: 'stat-tile accent' },
              { label: 'CSC (Skenario)', value: liveResult.totalCSC, className: 'stat-tile' },
              {
                label: 'Perubahan DBO',
                value: liveChange,
                className: `stat-tile ${liveChange > 0 ? 'red' : 'green'}`,
                isChange: true
              },
              {
                label: '% Perubahan DBO',
                value: liveChangePct,
                className: `stat-tile ${liveChange > 0 ? 'red' : 'green'}`,
                isPct: true
              },
            ].map((item, i) => (
              <div key={i} className={item.className}>
                <div className="label">{item.label}</div>
                <div className="value" style={{ fontSize: 15 }}>
                  {item.isPct
                    ? `${liveChangePct >= 0 ? '+' : ''}${liveChangePct.toFixed(2)}%`
                    : item.isChange
                    ? `${liveChange >= 0 ? '+' : ''}${fmt.rpShort(liveChange)}`
                    : fmt.rpShort(item.value)
                  }
                </div>
                {i === 0 && <div className="sub">vs Base: {fmt.rpShort(baseDBO)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sensitivity curve chart */}
      <div className="card">
        <div className="card-title">Kurva Sensitivitas DBO — ±2% Perubahan Asumsi</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="delta" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
            <YAxis tickFormatter={v => fmt.rpShort(v).replace('Rp ', '')} tick={{ fontSize: 9, fill: 'var(--text3)' }} />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }} />
            <ReferenceLine x="0 (Base)" stroke="var(--border2)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="dbo_diskonto" name="DBO (Δ Diskonto)" stroke="#d4a853" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="dbo_upah" name="DBO (Δ Kenaikan Upah)" stroke="#4caf82" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sensitivity table */}
      <div className="card">
        <div className="card-title">Tabel Analisis Sensitivitas — Sesuai PSAK 219 Par. 145(a)</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Asumsi / Skenario</th>
                <th>Nilai Kini DBO (Rp)</th>
                <th>Biaya Jasa Kini (Rp)</th>
                <th>Δ DBO (Rp)</th>
                <th>% Δ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Asumsi Dasar', discount: baseAssumptions.discountRate, salary: baseAssumptions.salaryIncreaseRate },
                { label: `Diskonto +1% (${((baseAssumptions.discountRate + 0.01) * 100).toFixed(2)}%)`, discount: baseAssumptions.discountRate + 0.01, salary: baseAssumptions.salaryIncreaseRate },
                { label: `Diskonto −1% (${((baseAssumptions.discountRate - 0.01) * 100).toFixed(2)}%)`, discount: baseAssumptions.discountRate - 0.01, salary: baseAssumptions.salaryIncreaseRate },
                { label: `Kenaikan Upah +1% (${((baseAssumptions.salaryIncreaseRate + 0.01) * 100).toFixed(2)}%)`, discount: baseAssumptions.discountRate, salary: baseAssumptions.salaryIncreaseRate + 0.01 },
                { label: `Kenaikan Upah −1% (${((baseAssumptions.salaryIncreaseRate - 0.01) * 100).toFixed(2)}%)`, discount: baseAssumptions.discountRate, salary: baseAssumptions.salaryIncreaseRate - 0.01 },
              ].map((scenario, i) => {
                if (scenario.discount <= 0) return null;
                const r = calcPortfolioPUC(employees, { ...baseAssumptions, discountRate: scenario.discount, salaryIncreaseRate: scenario.salary });
                const dbo = r.summary.totalDBO;
                const csc = r.summary.totalCSC;
                const delta = dbo - baseDBO;
                const deltaPct = baseDBO > 0 ? (delta / baseDBO * 100) : 0;
                return (
                  <tr key={i}>
                    <td style={{ textAlign: 'left' }}>{scenario.label}</td>
                    <td className={i === 0 ? 'num-accent' : ''}>{fmt.rp(dbo)}</td>
                    <td>{fmt.rp(csc)}</td>
                    <td className={delta > 0 ? 'num-neg' : delta < 0 ? 'num-pos' : ''}>
                      {i === 0 ? '—' : (delta >= 0 ? '+' : '') + fmt.rpShort(delta)}
                    </td>
                    <td style={{ color: delta > 0 ? 'var(--red)' : delta < 0 ? 'var(--green)' : 'var(--text3)' }}>
                      {i === 0 ? 'Base' : `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(2)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maturity analysis */}
      <div className="card">
        <div className="card-title">Analisis Jatuh Tempo Pembayaran Imbalan (Undiscounted)</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Tenor (Tahun)</th>
                <th>Estimasi Pembayaran (Rp)</th>
                <th>% dari Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const buckets = { '<1': 0, '1–2': 0, '2–5': 0, '5–10': 0, '≥10': 0 };
                employees.forEach(e => {
                  const y = e.yearsToRetirement;
                  const b = e.projectedRetirementBenefit * e.probSurviveToRetirement;
                  if (y < 1) buckets['<1'] += b;
                  else if (y < 2) buckets['1–2'] += b;
                  else if (y < 5) buckets['2–5'] += b;
                  else if (y < 10) buckets['5–10'] += b;
                  else buckets['≥10'] += b;
                });
                const total = Object.values(buckets).reduce((a, b) => a + b, 0);
                return Object.entries(buckets).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ textAlign: 'left' }}>{k}</td>
                    <td>{fmt.rp(v)}</td>
                    <td style={{ color: 'var(--text2)' }}>{total > 0 ? (v / total * 100).toFixed(1) : 0}%</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
