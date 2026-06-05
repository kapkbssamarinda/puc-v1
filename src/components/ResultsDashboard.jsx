import { fmt } from '../utils/format.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const CHART_COLORS = ['#d4a853', '#4caf82', '#5b9bd5', '#e05555', '#a78bfa'];

export default function ResultsDashboard({ result }) {
  if (!result) return null;
  const { summary, employees } = result;

  // DBO by age group
  const ageGroups = {};
  employees.forEach(e => {
    const grp = Math.floor(e.currentAge / 5) * 5;
    const key = `${grp}–${grp + 4}`;
    if (!ageGroups[key]) ageGroups[key] = { label: key, dbo: 0, count: 0 };
    ageGroups[key].dbo += e.dbo;
    ageGroups[key].count += 1;
  });
  const ageChartData = Object.values(ageGroups).sort((a, b) => parseInt(a.label) - parseInt(b.label));

  // Top 10 by DBO
  const top10 = [...employees].sort((a, b) => b.dbo - a.dbo).slice(0, 10);

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, fontFamily: 'var(--font-mono)' }}>
            {p.name}: {fmt.rpShort(p.value)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* KPI tiles */}
      <div className="stat-grid">
        <div className="stat-tile accent">
          <div className="label">Total DBO</div>
          <div className="value" style={{ fontSize: 16 }}>{fmt.rpShort(summary.totalDBO)}</div>
          <div className="sub">Liabilitas Laporan Posisi Keuangan</div>
        </div>
        <div className="stat-tile">
          <div className="label">Biaya Jasa Kini (CSC)</div>
          <div className="value" style={{ fontSize: 16 }}>{fmt.rpShort(summary.totalCSC)}</div>
          <div className="sub">Beban Laporan Laba Rugi</div>
        </div>
        <div className="stat-tile">
          <div className="label">Biaya Bunga</div>
          <div className="value" style={{ fontSize: 16 }}>{fmt.rpShort(summary.totalInterestCost)}</div>
          <div className="sub">DBO × Tingkat Diskonto</div>
        </div>
        <div className="stat-tile green">
          <div className="label">Total Beban Laba Rugi</div>
          <div className="value" style={{ fontSize: 16 }}>{fmt.rpShort(summary.totalCSC + summary.totalInterestCost)}</div>
          <div className="sub">CSC + Biaya Bunga</div>
        </div>
        <div className="stat-tile">
          <div className="label">Jumlah Karyawan</div>
          <div className="value">{summary.totalEmployees}</div>
          <div className="sub">Rata-rata usia {fmt.num(summary.avgAge, 1)} th</div>
        </div>
        <div className="stat-tile">
          <div className="label">Durasi Rata-rata Tertimbang</div>
          <div className="value">{fmt.num(summary.weightedAverageDuration, 2)}</div>
          <div className="sub">tahun (Macaulay Duration)</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">DBO per Kelompok Usia</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageChartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
              <YAxis tickFormatter={v => fmt.rpShort(v).replace('Rp ', '')} tick={{ fontSize: 9, fill: 'var(--text3)' }} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="dbo" name="DBO" radius={[3, 3, 0, 0]}>
                {ageChartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Komposisi Beban Laba Rugi</div>
          <div style={{ padding: '24px 0' }}>
            {[
              { label: 'Biaya Jasa Kini (CSC)', value: summary.totalCSC, color: 'var(--accent)' },
              { label: 'Biaya Bunga', value: summary.totalInterestCost, color: 'var(--blue)' },
            ].map(item => {
              const total = summary.totalCSC + summary.totalInterestCost;
              const pct = total > 0 ? (item.value / total * 100) : 0;
              return (
                <div key={item.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: item.color }}>
                      {fmt.rpShort(item.value)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Laporan Posisi Keuangan */}
      <div className="card">
        <div className="card-title">Program Imbalan Pasca Kerja — Paragraf 57(a)&amp;(b) PSAK 219</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Keterangan</th>
                <th>31 Des {new Date().getFullYear()}</th>
                <th style={{ textAlign: 'left', paddingLeft: 16, color: 'var(--text3)' }}>Referensi</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Nilai Kini Kewajiban Imbalan Pasti', value: summary.totalDBO, ref: '' },
                { label: 'Nilai Wajar Aset Program', value: 0, ref: '' },
                { label: 'Defisit / (Surplus)', value: summary.totalDBO, ref: '' },
                { label: 'Dampak Pembatasan Aset', value: 0, ref: '' },
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'left' }}>{row.label}</td>
                  <td className={row.value > 0 ? 'num-accent' : ''}>{fmt.rp(row.value)}</td>
                  <td style={{ textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text3)' }}>{row.ref}</td>
                </tr>
              ))}
              <tr className="row-total">
                <td>(Aset)/Kewajiban Neto</td>
                <td>{fmt.rp(summary.totalDBO)}</td>
                <td style={{ fontFamily: 'var(--font-body)', fontSize: 11 }}>Par. 57(a)&amp;(b)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Beban Laba Rugi */}
      <div className="card">
        <div className="card-title">Jumlah Diakui pada Laporan Laba Rugi — Paragraf 57(c) PSAK 219</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Keterangan</th>
                <th>Jumlah (Rp)</th>
                <th style={{ textAlign: 'left', paddingLeft: 16 }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ textAlign: 'left', fontWeight: 500 }}>Biaya Jasa</td><td></td><td></td></tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Biaya Jasa Kini</td>
                <td>{fmt.rp(summary.totalCSC)}</td>
                <td style={{ textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text3)' }}>Akrual tahun berjalan</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Biaya Jasa Lalu</td>
                <td style={{ color: 'var(--text3)' }}>—</td>
                <td style={{ textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text3)' }}>Isi dari laporan sebelumnya</td>
              </tr>
              <tr><td style={{ textAlign: 'left', fontWeight: 500 }}>Biaya Bunga</td><td></td><td></td></tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Biaya Bunga atas DBO</td>
                <td>{fmt.rp(summary.totalInterestCost)}</td>
                <td style={{ textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text3)' }}>DBO × {(summary.discountRateUsed || 0.0677 * 100).toFixed(2)}%</td>
              </tr>
              <tr className="row-total">
                <td>Total Beban/(Pendapatan) Diakui</td>
                <td>{fmt.rp(summary.totalCSC + summary.totalInterestCost)}</td>
                <td style={{ fontFamily: 'var(--font-body)', fontSize: 11 }}>Par. 57(c)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 table */}
      <div className="card">
        <div className="card-title">10 Karyawan dengan DBO Tertinggi</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Nama</th>
                <th>Usia</th>
                <th>Masa Kerja</th>
                <th>Gaji/Bln</th>
                <th>Proyeksi Gaji Pensiun</th>
                <th>DBO</th>
                <th>CSC</th>
                <th>Prob. Pensiun</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((e, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'left' }}>{e.name || `Karyawan ${e.id}`}</td>
                  <td>{e.currentAge}</td>
                  <td>{Number(e.pastService).toFixed(1)} th</td>
                  <td>{fmt.rpShort(e.monthlyWage)}</td>
                  <td>{fmt.rpShort(e.projectedSalaryAtRetirement)}</td>
                  <td className="num-accent">{fmt.rpShort(e.dbo)}</td>
                  <td>{fmt.rpShort(e.csc)}</td>
                  <td>{fmt.pct(e.probSurviveToRetirement)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
