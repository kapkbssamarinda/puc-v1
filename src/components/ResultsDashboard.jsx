import { fmt, rpBracket } from '../utils/format.js';
import { AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const CHART_COLORS = ['#d4a853', '#4caf82', '#5b9bd5', '#e05555', '#a78bfa'];

const SectionHeader = ({ label }) => (
  <tr>
    <td colSpan={3} style={{ textAlign: 'left', fontWeight: 600, paddingTop: 10, paddingBottom: 2, color: 'var(--text1)', borderBottom: '1px solid var(--border)' }}>
      {label}
    </td>
  </tr>
);

const NoPriorNote = () => (
  <p style={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: 11, marginBottom: 8 }}>
    Belum ada data periode lalu — isi di tab &quot;Data Periode Lalu&quot;
  </p>
);

export default function ResultsDashboard({ result, assumptions = {}, company = {}, priorPeriod: _ignored }) {
  if (!result) return null;
  const {
    summary, employees, sensitivity,
    reconciliationDBO, incomeStatement, oci, balanceSheet,
    priorPeriod,
  } = result;

  const period = company.period || `31 Desember ${new Date().getFullYear()}`;
  const discountRate = assumptions.discountRate ?? 0;
  const totalExpense = incomeStatement
    ? incomeStatement.totalExpenseAfterExcess
    : summary.totalCSC + summary.totalInterestCost;
  const noOpeningData = !priorPeriod || priorPeriod.openingDBO === 0;

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

  const isEstimated = employees.length > 0 && employees.every(e => e.isGenerated);

  return (
    <div>
      {isEstimated && (
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Hasil ini menggunakan <strong>data estimasi rata-rata</strong> —
            deviasi ±15–25% dari perhitungan individu dimungkinkan.
            Untuk laporan resmi, gunakan data karyawan individu.
          </span>
        </div>
      )}

      {/* ── KPI tiles ─────────────────────────────────────────── */}
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
          <div className="sub">DBO Awal × Tingkat Diskonto</div>
        </div>
        <div className="stat-tile green">
          <div className="label">Total Beban Laba Rugi</div>
          <div className="value" style={{ fontSize: 16 }}>{fmt.rpShort(totalExpense)}</div>
          <div className="sub">CSC + Bunga + Jasa Lalu</div>
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

      {/* ── Charts ────────────────────────────────────────────── */}
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
              const pct = totalExpense > 0 ? (item.value / totalExpense * 100) : 0;
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

      {/* ── A. Laporan Posisi Keuangan ────────────────────────── */}
      <div className="card">
        <div className="card-title">A. (Aset)/Kewajiban pada Laporan Posisi Keuangan — Par. 57(a)&amp;(b) PSAK 219</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Keterangan</th>
                <th>{period}</th>
                <th style={{ textAlign: 'left', paddingLeft: 16, color: 'var(--text3)' }}>Referensi</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Nilai Kini Kewajiban Imbalan Pasti', value: summary.totalDBO },
                { label: 'Nilai Wajar Aset Program', value: 0 },
                { label: 'Defisit / (Surplus)', value: summary.totalDBO },
                { label: 'Dampak Pembatasan Aset', value: 0 },
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'left' }}>{row.label}</td>
                  <td className={row.value > 0 ? 'num-accent' : ''}>{fmt.rp(row.value)}</td>
                  <td />
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
        {priorPeriod?.openingDBO > 0 && (
          <p className="note" style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
            Perbandingan: DBO {summary.totalDBO >= priorPeriod.openingDBO ? 'naik' : 'turun'}{' '}
            {fmt.pct(Math.abs((summary.totalDBO - priorPeriod.openingDBO) / priorPeriod.openingDBO))}{' '}
            dari periode sebelumnya ({fmt.rpShort(priorPeriod.openingDBO)}).
          </p>
        )}
      </div>

      {/* ── B. Laporan Laba Rugi ──────────────────────────────── */}
      <div className="card">
        <div className="card-title">B. Jumlah Diakui pada Laporan Laba Rugi — Par. 57(c) PSAK 219</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Keterangan</th>
                <th>{period}</th>
                <th style={{ textAlign: 'left', paddingLeft: 16, color: 'var(--text3)' }}>Referensi</th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader label="Biaya Jasa" />
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Biaya Jasa Kini</td>
                <td className="num-accent">{fmt.rp(incomeStatement?.currentServiceCost ?? summary.totalCSC)}</td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>Akrual tahun berjalan</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Biaya Jasa Lalu</td>
                <td>{fmt.rp(incomeStatement?.pastServiceCost ?? 0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>(Keuntungan)/Kerugian atas Penyelesaian</td>
                <td>{fmt.rp(incomeStatement?.settlementGainLoss ?? 0)}</td>
                <td />
              </tr>
              <SectionHeader label="Biaya Bunga" />
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Biaya Bunga atas Kewajiban Imbalan Pasti</td>
                <td className="num-accent">{fmt.rp(incomeStatement?.interestOnDBO ?? summary.totalInterestCost)}</td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>
                  DBO Awal × {fmt.pct(priorPeriod?.openingDiscountRate ?? discountRate)}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>(Penghasilan)/Biaya Bunga atas Nilai Wajar Aset Program</td>
                <td>{fmt.rp(0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Biaya Bunga atas Dampak Batas Atas Aset</td>
                <td>{fmt.rp(0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Selisih Pembayaran atas Aset Program</td>
                <td>{fmt.rp(0)}</td>
                <td />
              </tr>
              <tr className="row-total">
                <td>Beban/(Pendapatan) yang Diakui dalam Laporan Laba Rugi</td>
                <td>{fmt.rp(totalExpense)}</td>
                <td style={{ fontFamily: 'var(--font-body)', fontSize: 11 }}>Par. 57(c)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── C. Rekonsiliasi DBO ───────────────────────────────── */}
      <div className="card">
        <div className="card-title">C. Rekonsiliasi Nilai Kini Kewajiban Imbalan Pasti — Par. 140-141 PSAK 219</div>
        {noOpeningData && <NoPriorNote />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Keterangan</th>
                <th>{period}</th>
                <th style={{ textAlign: 'left', paddingLeft: 16, color: 'var(--text3)' }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'left' }}>DBO Awal Periode</td>
                <td>{fmt.rp(reconciliationDBO?.openingDBO ?? 0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Biaya Jasa Kini</td>
                <td>{fmt.rp(reconciliationDBO?.currentCSC ?? summary.totalCSC)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Biaya Bunga atas DBO</td>
                <td>{fmt.rp(reconciliationDBO?.interestCost ?? summary.totalInterestCost)}</td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>
                  DBO Awal × {fmt.pct(priorPeriod?.openingDiscountRate ?? discountRate)}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Biaya Jasa Lalu &amp; Settlement</td>
                <td>{fmt.rp((reconciliationDBO?.pastServiceCost ?? 0) + (reconciliationDBO?.settlementGainLoss ?? 0))}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Dampak Mutasi Pegawai</td>
                <td>{fmt.rp(reconciliationDBO?.employeeMutation ?? 0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Selisih Pembayaran atas Aset Program</td>
                <td>{fmt.rp(0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Dampak Perubahan Kurs</td>
                <td>{fmt.rp(0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Imbalan Kerja yang Dibayarkan</td>
                <td>{fmt.rp(-(reconciliationDBO?.benefitsPaid ?? 0))}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Dampak Kombinasi Bisnis</td>
                <td>{fmt.rp(0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>DBO Expected Akhir Periode</td>
                <td>{fmt.rp(reconciliationDBO?.expectedClosing ?? summary.totalDBO)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>(Keuntungan)/Kerugian Aktuarial</td>
                <td style={{ color: reconciliationDBO?.actuarialGainLoss > 0 ? 'var(--red)' : reconciliationDBO?.actuarialGainLoss < 0 ? 'var(--green)' : undefined }}>
                  {fmt.rp(reconciliationDBO?.actuarialGainLoss ?? 0)}
                </td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>Aktual vs Expected</td>
              </tr>
              <tr className="row-total">
                <td>DBO Aktual Akhir Periode</td>
                <td>{fmt.rp(reconciliationDBO?.closingDBO ?? summary.totalDBO)}</td>
                <td style={{ fontFamily: 'var(--font-body)', fontSize: 11 }}>Par. 140-141</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── D. OCI ────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">D. Penghasilan Komprehensif Lain — Par. 57(d) &amp; 122 PSAK 219</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Keterangan</th>
                <th>{period}</th>
                <th style={{ textAlign: 'left', paddingLeft: 16, color: 'var(--text3)' }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'left' }}>Keuntungan/(Kerugian) Aktuarial atas DBO</td>
                <td>{fmt.rp(oci?.actuarialGainLossOnDBO ?? 0)}</td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>Dari rekonsiliasi DBO</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>Keuntungan/(Kerugian) Aktuarial atas Aset Program</td>
                <td>{fmt.rp(0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>Dampak Perubahan Batas Atas Aset</td>
                <td>{fmt.rp(0)}</td>
                <td />
              </tr>
              <tr className="row-total">
                <td>Total Penghasilan Komprehensif Lain</td>
                <td>{fmt.rp(oci?.totalOCI ?? 0)}</td>
                <td style={{ fontFamily: 'var(--font-body)', fontSize: 11 }}>Par. 57(d)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 11, fontStyle: 'italic', marginTop: 8, lineHeight: 1.6 }}>
          Sesuai PSAK 219 paragraf 122, pengukuran kembali atas liabilitas (aset) imbalan pasti neto yang diakui dalam OCI tidak direklasifikasi ke laba rugi pada periode berikutnya.
        </p>
      </div>

      {/* ── E. Rekonsiliasi OCI ───────────────────────────────── */}
      <div className="card">
        <div className="card-title">E. Rekonsiliasi Penghasilan Komprehensif Lain</div>
        {noOpeningData && <NoPriorNote />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Keterangan</th>
                <th>{period}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'left' }}>Akumulasi OCI Awal Periode</td>
                <td>{fmt.rp(oci?.accumulatedOCIOpening ?? 0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>OCI Tahun Berjalan</td>
                <td>{fmt.rp(oci?.totalOCI ?? 0)}</td>
                <td />
              </tr>
              <tr className="row-total">
                <td>Akumulasi OCI Akhir Periode</td>
                <td>{fmt.rp(oci?.accumulatedOCIClosing ?? 0)}</td>
                <td style={{ fontFamily: 'var(--font-body)', fontSize: 11 }}>Par. 122</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── F. Rekonsiliasi Balance Sheet ─────────────────────── */}
      <div className="card">
        <div className="card-title">F. Rekonsiliasi (Aset)/Kewajiban pada Laporan Posisi Keuangan</div>
        {noOpeningData && <NoPriorNote />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Keterangan</th>
                <th>{period}</th>
                <th style={{ textAlign: 'left', paddingLeft: 16, color: 'var(--text3)' }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'left' }}>(Aset)/Kewajiban Awal Periode</td>
                <td>{fmt.rp(balanceSheet?.openingNetLiability ?? 0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Beban Laba Rugi (CSC + Bunga + Jasa Lalu)</td>
                <td>{fmt.rp(balanceSheet?.expenseRecognized ?? totalExpense)}</td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>Dari tabel B</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Penghasilan Komprehensif Lain (OCI)</td>
                <td>{fmt.rp(balanceSheet?.totalOCI ?? 0)}</td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>Dari tabel D</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Iuran Perusahaan</td>
                <td>{fmt.rp(0)}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Imbalan Kerja Dibayarkan</td>
                <td>{fmt.rp(-(balanceSheet?.benefitsPaid ?? 0))}</td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Dampak Mutasi Pegawai</td>
                <td>{fmt.rp(balanceSheet?.employeeMutation ?? 0)}</td>
                <td />
              </tr>
              <tr className="row-total">
                <td>(Aset)/Kewajiban Akhir Periode</td>
                <td>{fmt.rp(balanceSheet?.closingNetLiability ?? summary.totalDBO)}</td>
                <td style={{ fontFamily: 'var(--font-body)', fontSize: 11 }}>Par. 57(a)&amp;(b)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── G. Analisis Sensitivitas ──────────────────────────── */}
      {sensitivity?.length > 0 && (
        <div className="card">
          <div className="card-title">G. Analisis Sensitivitas — Par. 145(a) PSAK 219</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Skenario Asumsi</th>
                  <th>DBO (Rp)</th>
                  <th>CSC (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {sensitivity.map((row, i) => (
                  <tr key={i} className={i === 0 ? 'row-total' : ''}>
                    <td style={{ textAlign: 'left' }}>{row.label}</td>
                    <td className={i === 0 ? '' : 'num-accent'}>{fmt.rp(row.dbo)}</td>
                    <td>{fmt.rp(row.csc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── H. Pengukuran Kembali ─────────────────────────────── */}
      <div className="card">
        <div className="card-title">H. Pengukuran Kembali (Keuntungan)/Kerugian Aktuaria — Par. 141 PSAK 219</div>
        {noOpeningData && <NoPriorNote />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Keterangan</th>
                <th>{period}</th>
                <th style={{ textAlign: 'left', paddingLeft: 16, color: 'var(--text3)' }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="row-total">
                <td style={{ textAlign: 'left' }}>(Keuntungan)/Kerugian Aktuarial — Total</td>
                <td style={{ color: reconciliationDBO?.actuarialGainLoss > 0 ? 'var(--red)' : reconciliationDBO?.actuarialGainLoss < 0 ? 'var(--green)' : undefined }}>
                  {rpBracket(reconciliationDBO?.actuarialGainLoss ?? 0)}
                </td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>Dari rekonsiliasi DBO</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Penyesuaian Pengalaman atas Liabilitas</td>
                <td style={{ color: 'var(--text3)', fontStyle: 'italic' }}>
                  {noOpeningData ? '—' : '→ Dari analisis detail'}
                </td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>Aktual vs proyeksi</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Dampak Perubahan Asumsi Keuangan</td>
                <td style={{ color: 'var(--text3)', fontStyle: 'italic' }}>
                  {noOpeningData ? '—' : '→ Dari analisis detail'}
                </td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>Δ tingkat diskonto & upah</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left', paddingLeft: 24 }}>Dampak Perubahan Asumsi Demografis</td>
                <td style={{ color: 'var(--text3)', fontStyle: 'italic' }}>
                  {noOpeningData ? '—' : '→ Dari analisis detail'}
                </td>
                <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--text3)' }}>Δ mortalita, pengunduran diri</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginTop: 8 }}>
          Breakdown penyesuaian pengalaman vs perubahan asumsi memerlukan re-kalkulasi DBO dengan asumsi periode sebelumnya.
          {noOpeningData && ' Isi data periode lalu untuk mengaktifkan rekonsiliasi.'}
        </p>
      </div>

      {/* ── I. Analisis Jatuh Tempo ───────────────────────────── */}
      {summary.maturity?.length > 0 && (
        <div className="card">
          <div className="card-title">I. Analisis Jatuh Tempo Pembayaran Imbalan — PSAK 219</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Tenor (Tahun)</th>
                  <th>Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {summary.maturity.map((row, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'left' }}>{row.label}</td>
                    <td className="num-accent">{fmt.rp(row.amount)}</td>
                  </tr>
                ))}
                <tr className="row-total">
                  <td>Total</td>
                  <td>{fmt.rp(summary.maturity.reduce((s, r) => s + r.amount, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Top 10 ────────────────────────────────────────────── */}
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
