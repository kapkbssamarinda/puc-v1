import { useState, useCallback } from 'react';
import {
  Users, Settings, BarChart2, TrendingUp, FileSpreadsheet,
  FileText, Play, ChevronRight, AlertCircle, CheckCircle2,
  BookOpen
} from 'lucide-react';

import EmployeeInput from './components/EmployeeInput.jsx';
import AssumptionsPanel from './components/AssumptionsPanel.jsx';
import PriorPeriodInput from './components/PriorPeriodInput.jsx';
import ResultsDashboard from './components/ResultsDashboard.jsx';
import SensitivityAnalysis from './components/SensitivityAnalysis.jsx';

import {
  calcPortfolioPUC, calcSensitivity,
  calcReconciliation, calcOCI, calcIncomeStatement, calcBalanceSheetReconciliation,
} from './engine/puc.js';
import { generateEmployeesFromSummary } from './engine/summaryGenerator.js';
import { exportToExcel } from './engine/excelExport.js';
import { fmt } from './utils/format.js';

const DEFAULT_ASSUMPTIONS = {
  discountRate: 0.0677,
  salaryIncreaseYear1: 0.04,
  salaryIncreaseLongTerm: 0.04,
  retirementAge: 58,
  disabilityFactor: 0.10,
  withdrawalRates: [
    { min: 15, max: 29, rate: 0.060 },
    { min: 30, max: 34, rate: 0.030 },
    { min: 35, max: 39, rate: 0.018 },
    { min: 40, max: 53, rate: 0.012 },
    { min: 54, max: 55, rate: 0.006 },
    { min: 56, max: 99, rate: 0.000 },
  ],
};

const DEFAULT_PRIOR_PERIOD = {
  openingDBO: 0,
  openingDiscountRate: 0.0677,
  pastServiceCost: 0,
  settlementGainLoss: 0,
  benefitsPaid: 0,
  employeeMutation: 0,
  accumulatedOCIOpening: 0,
};

const DEFAULT_COMPANY = {
  name: '',
  valuationDate: new Date().toLocaleDateString('id-ID'),
  period: `31 Desember ${new Date().getFullYear()}`,
};

const SAMPLE_EMPLOYEES = [
  { id: '1', name: 'Budi Santosa', currentAge: 35, pastService: 5, monthlyWage: 6000000, gender: 'L' },
  { id: '2', name: 'Siti Rahayu', currentAge: 42, pastService: 12, monthlyWage: 8500000, gender: 'P' },
  { id: '3', name: 'Ahmad Fauzi', currentAge: 50, pastService: 20, monthlyWage: 12000000, gender: 'L' },
  { id: '4', name: 'Dewi Kurniasih', currentAge: 28, pastService: 3, monthlyWage: 5000000, gender: 'P' },
  { id: '5', name: 'Rizky Pratama', currentAge: 38, pastService: 8, monthlyWage: 7500000, gender: 'L' },
  { id: '6', name: 'Indah Permata', currentAge: 45, pastService: 15, monthlyWage: 9200000, gender: 'P' },
  { id: '7', name: 'Hendra Wijaya', currentAge: 55, pastService: 25, monthlyWage: 14000000, gender: 'L' },
  { id: '8', name: 'Maya Susanti', currentAge: 32, pastService: 6, monthlyWage: 6800000, gender: 'P' },
];

export default function App() {
  const [page, setPage] = useState('data');
  const [employees, setEmployees] = useState([]);
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [priorPeriod, setPriorPeriod] = useState(DEFAULT_PRIOR_PERIOD);
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [inputMode, setInputMode] = useState('individual');
  const [summaryInput, setSummaryInput] = useState({
    totalEmployees: 0,
    totalWagePerMonth: 0,
    avgAge: 0,
    avgPastService: 0,
    genderRatioMale: 50,
  });

  const runCalculation = useCallback(() => {
    if (employees.length === 0) {
      setCalcError('Tambahkan minimal 1 karyawan terlebih dahulu.');
      return;
    }
    setCalculating(true);
    setCalcError(null);
    setTimeout(() => {
      try {
        const portfolio = calcPortfolioPUC(employees, assumptions, priorPeriod);
        const sensitivity = calcSensitivity(employees, assumptions, [
          { label: 'Asumsi Dasar', assumptions: {} },
          { label: `Diskonto +1%`, assumptions: { discountRate: assumptions.discountRate + 0.01 } },
          { label: `Diskonto -1%`, assumptions: { discountRate: Math.max(0.001, assumptions.discountRate - 0.01) } },
          { label: `Kenaikan Upah +1%`, assumptions: { salaryIncreaseYear1: assumptions.salaryIncreaseYear1 + 0.01, salaryIncreaseLongTerm: assumptions.salaryIncreaseLongTerm + 0.01 } },
          { label: `Kenaikan Upah -1%`, assumptions: { salaryIncreaseYear1: Math.max(0, assumptions.salaryIncreaseYear1 - 0.01), salaryIncreaseLongTerm: Math.max(0, assumptions.salaryIncreaseLongTerm - 0.01) } },
        ]);

        const reconciliationDBO = calcReconciliation({
          openingDBO: priorPeriod.openingDBO,
          currentCSC: portfolio.summary.totalCSC,
          interestCost: portfolio.summary.totalInterestCost,
          pastServiceCost: priorPeriod.pastServiceCost,
          settlementGainLoss: priorPeriod.settlementGainLoss,
          benefitsPaid: priorPeriod.benefitsPaid,
          employeeMutation: priorPeriod.employeeMutation,
          closingDBO: portfolio.summary.totalDBO,
        });

        const incomeStatement = calcIncomeStatement({
          currentServiceCost: portfolio.summary.totalCSC,
          pastServiceCost: priorPeriod.pastServiceCost,
          settlementGainLoss: priorPeriod.settlementGainLoss,
          interestOnDBO: portfolio.summary.totalInterestCost,
          interestOnPlanAssets: 0,
          interestOnAssetCeiling: 0,
          excessPayments: 0,
        });

        const oci = calcOCI({
          actuarialGainLossOnDBO: reconciliationDBO.actuarialGainLoss,
          actuarialGainLossOnPlanAssets: 0,
          assetCeilingChange: 0,
          accumulatedOCIOpening: priorPeriod.accumulatedOCIOpening,
        });

        const balanceSheet = calcBalanceSheetReconciliation({
          openingNetLiability: priorPeriod.openingDBO,
          expenseRecognized: incomeStatement.totalExpenseAfterExcess,
          totalOCI: oci.totalOCI,
          companyContribution: 0,
          benefitsPaid: priorPeriod.benefitsPaid,
          employeeMutation: priorPeriod.employeeMutation,
        });

        setResult({ ...portfolio, sensitivity, reconciliationDBO, incomeStatement, oci, balanceSheet, priorPeriod });
        setPage('results');
      } catch (err) {
        setCalcError('Terjadi kesalahan: ' + err.message);
      } finally {
        setCalculating(false);
      }
    }, 50);
  }, [employees, assumptions, priorPeriod]);

  const handleExcelExport = async () => {
    if (!result) return;
    await exportToExcel(result, assumptions, company);
  };

  const handlePDFExport = async () => {
    if (!result) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 20;

    doc.setFillColor(26, 26, 24);
    doc.rect(0, 0, pageW, 38, 'F');
    doc.setTextColor(212, 168, 83);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN VALUASI AKTUARIA', pageW / 2, 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 158, 151);
    doc.text('Imbalan Pasca Kerja | Projected Unit Credit | PSAK 219', pageW / 2, 22, { align: 'center' });
    doc.text('UU No. 6/2023 & PP No. 35/2021 | TMI IV 2019', pageW / 2, 29, { align: 'center' });

    y = 50;
    const s = result.summary;
    const isEstimated = result.employees?.length > 0 && result.employees.every(e => e.isGenerated);
    if (isEstimated) {
      doc.setFillColor(50, 40, 20);
      doc.rect(13, y - 4, pageW - 26, 10, 'F');
      doc.setTextColor(212, 168, 83);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PERHATIAN: Hasil ini menggunakan data estimasi rata-rata — deviasi ±15-25% dari data individu dimungkinkan.', pageW / 2, y + 1, { align: 'center' });
      y += 14;
    }

    const printSection = (title) => {
      doc.setTextColor(212, 168, 83);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, y);
      y += 7;
    };

    const printRow = (k, v, isTotal = false) => {
      if (isTotal) {
        doc.setFillColor(35, 35, 30);
        doc.rect(13, y - 4, pageW - 26, 8, 'F');
        doc.setTextColor(212, 168, 83);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(180, 178, 170);
        doc.setFont('helvetica', 'normal');
      }
      doc.setFontSize(9);
      doc.text(k, 14, y);
      doc.text(String(v), pageW - 14, y, { align: 'right' });
      y += 7;
    };

    printSection('INFORMASI PERUSAHAAN');
    printRow('Nama Perusahaan', company.name || '—');
    printRow('Periode Valuasi', company.period);
    printRow('Jumlah Karyawan', s.totalEmployees + ' orang');
    y += 3;

    printSection('LAPORAN POSISI KEUANGAN — PAR. 57(A)&(B) PSAK 219');
    printRow('Nilai Kini Kewajiban Imbalan Pasti (DBO)', fmt.rp(s.totalDBO));
    printRow('Nilai Wajar Aset Program', 'Rp 0');
    printRow('Defisit / (Surplus)', fmt.rp(s.totalDBO));
    printRow('(Aset)/Kewajiban Neto', fmt.rp(s.totalDBO), true);
    y += 3;

    printSection('LAPORAN LABA RUGI — PAR. 57(C) PSAK 219');
    printRow('Biaya Jasa Kini (Current Service Cost)', fmt.rp(result.incomeStatement?.currentServiceCost ?? s.totalCSC));
    printRow('Biaya Jasa Lalu', fmt.rp(result.incomeStatement?.pastServiceCost ?? 0));
    printRow('(Keuntungan)/Kerugian Penyelesaian', fmt.rp(result.incomeStatement?.settlementGainLoss ?? 0));
    printRow('Biaya Bunga atas DBO', fmt.rp(result.incomeStatement?.interestOnDBO ?? s.totalInterestCost));
    printRow('Total Beban/(Pendapatan)', fmt.rp(result.incomeStatement?.totalExpenseAfterExcess ?? (s.totalCSC + s.totalInterestCost)), true);
    y += 3;

    printSection('ASUMSI AKTUARIA');
    printRow('Metode', 'Projected Unit Credit');
    printRow('Tingkat Diskonto', fmt.pct(assumptions.discountRate));
    printRow('Kenaikan Upah Tahun Pertama', fmt.pct(assumptions.salaryIncreaseYear1));
    printRow('Kenaikan Upah Jangka Panjang', fmt.pct(assumptions.salaryIncreaseLongTerm));
    printRow('Usia Pensiun Normal', assumptions.retirementAge + ' tahun');
    printRow('Tabel Mortalita', 'TMI IV 2019');
    printRow('Rata-rata Usia', fmt.num(s.avgAge, 2) + ' tahun');
    printRow('Rata-rata Masa Kerja', fmt.num(s.avgPastService, 2) + ' tahun');
    printRow('Durasi Rata-rata Tertimbang', fmt.num(s.weightedAverageDuration, 2) + ' tahun');

    // Rekonsiliasi DBO (hanya jika ada data periode lalu)
    const rd = result.reconciliationDBO;
    if (rd && result.priorPeriod?.openingDBO > 0) {
      if (y > pageH - 80) { doc.addPage(); y = 20; }
      y += 3;
      printSection('REKONSILIASI DBO — PAR. 140-141 PSAK 219');
      printRow('DBO Awal Periode', fmt.rp(rd.openingDBO));
      printRow('(+) Biaya Jasa Kini', fmt.rp(rd.currentCSC));
      printRow('(+) Biaya Bunga', fmt.rp(rd.interestCost));
      if (rd.pastServiceCost !== 0 || rd.settlementGainLoss !== 0) {
        printRow('(+/-) Jasa Lalu & Settlement', fmt.rp(rd.pastServiceCost + rd.settlementGainLoss));
      }
      if (rd.benefitsPaid !== 0) {
        printRow('(-) Imbalan Dibayarkan', fmt.rp(-rd.benefitsPaid));
      }
      if (rd.employeeMutation !== 0) {
        printRow('(+/-) Mutasi Pegawai', fmt.rp(rd.employeeMutation));
      }
      printRow('DBO Expected Akhir', fmt.rp(rd.expectedClosing));
      printRow('(+/-) (Keuntungan)/Kerugian Aktuarial', fmt.rp(rd.actuarialGainLoss));
      printRow('DBO Aktual Akhir Periode', fmt.rp(rd.closingDBO), true);
    }

    // Footer
    doc.setFillColor(26, 26, 24);
    doc.rect(0, pageH - 16, pageW, 16, 'F');
    doc.setFontSize(7);
    doc.setTextColor(120, 118, 112);
    doc.setFont('helvetica', 'normal');
    doc.text('PUC Actuarial Tool v1.0 | Sesuai PSAK 219', pageW / 2, pageH - 6, { align: 'center' });

    doc.save(`Laporan_Aktuaria_${(company.name || 'Perusahaan').replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`);
  };

  const handleGenerateSummary = useCallback(() => {
    const generated = generateEmployeesFromSummary(summaryInput);
    if (generated.length === 0) return;
    setEmployees(generated);
    setInputMode('individual');
  }, [summaryInput]);

  const loadSample = () => { setEmployees(SAMPLE_EMPLOYEES); setPage('data'); };

  const nav = [
    { id: 'data', label: 'Data Karyawan', icon: Users },
    { id: 'assumptions', label: 'Asumsi Aktuaria', icon: Settings },
    { id: 'prior', label: 'Data Periode Lalu', icon: FileText },
    { id: 'results', label: 'Hasil Perhitungan', icon: BarChart2, req: true },
    { id: 'sensitivity', label: 'Analisis Sensitivitas', icon: TrendingUp, req: true },
  ];

  const steps = [
    { label: 'Input Data', done: employees.length > 0 },
    { label: 'Atur Asumsi', done: true },
    { label: 'Hitung PUC', done: !!result },
    { label: 'Lihat Hasil', done: !!result },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>PUC Actuarial</h1>
          <p>PSAK 219 · Imbalan Kerja</p>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-label">Alur Kerja</div>
            {nav.map(item => (
              <button key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => (!item.req || result) && setPage(item.id)}
                style={{ opacity: item.req && !result ? 0.35 : 1, cursor: item.req && !result ? 'not-allowed' : 'pointer' }}>
                <item.icon size={14} />{item.label}
              </button>
            ))}
          </div>
          <div className="nav-section">
            <div className="nav-label">Ekspor</div>
            <button className="nav-item" onClick={handleExcelExport} disabled={!result} style={{ opacity: !result ? 0.35 : 1 }}>
              <FileSpreadsheet size={14} />Export Excel
            </button>
            <button className="nav-item" onClick={handlePDFExport} disabled={!result} style={{ opacity: !result ? 0.35 : 1 }}>
              <FileText size={14} />Export PDF
            </button>
          </div>
          <div className="nav-section">
            <div className="nav-label">Utilitas</div>
            <button className="nav-item" onClick={loadSample}><BookOpen size={14} />Muat Data Contoh</button>
          </div>
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <div className="form-group" style={{ gap: 4 }}>
            <label className="form-label" style={{ fontSize: 10 }}>Nama Perusahaan</label>
            <input className="form-input" style={{ fontSize: 11, padding: '5px 8px' }}
              placeholder="PT Nama Perusahaan" value={company.name}
              onChange={e => setCompany(p => ({ ...p, name: e.target.value }))} />
          </div>
        </div>
        <div className="sidebar-footer">
          <p>PUC Actuarial v1.0<br />PSAK 219 · UU 6/2023<br />PP 35/2021 · TMI IV 2019</p>
        </div>
      </aside>

      <main className="main-content">
        <div className="page">
          <div className="steps">
            {steps.map((s, i) => (
              <div key={i} className="step-item">
                <div className={`step-num ${s.done ? 'done' : i === steps.findIndex(x => !x.done) ? 'active' : 'pending'}`}>
                  {s.done ? <CheckCircle2 size={12} /> : i + 1}
                </div>
                <span className="step-label">{s.label}</span>
                {i < steps.length - 1 && <div className="step-connector" />}
              </div>
            ))}
          </div>

          {page === 'data' && (
            <>
              <div className="page-header">
                <h2>Data Karyawan</h2>
                <p>Upload Excel atau tambahkan manual. Kolom wajib: usia, masa kerja lalu, gaji per bulan.</p>
              </div>
              <EmployeeInput
                employees={employees}
                onChange={setEmployees}
                inputMode={inputMode}
                setInputMode={setInputMode}
                summaryInput={summaryInput}
                setSummaryInput={setSummaryInput}
                onGenerateSummary={handleGenerateSummary}
              />
              {calcError && (
                <div className="alert" style={{ background: 'var(--red-bg)', border: '1px solid rgba(224,85,85,0.2)', color: 'var(--red)' }}>
                  <AlertCircle size={14} /><span>{calcError}</span>
                </div>
              )}
              {employees.length > 0 && (
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={runCalculation} disabled={calculating}>
                    {calculating ? '⟳ Menghitung...' : <><Play size={14} />Jalankan Perhitungan PUC</>}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setPage('assumptions')}>
                    <Settings size={14} />Ubah Asumsi Dulu
                  </button>
                </div>
              )}
            </>
          )}

          {page === 'assumptions' && (
            <>
              <div className="page-header">
                <h2>Asumsi Aktuaria</h2>
                <p>Sesuaikan asumsi dengan kondisi klien. Tingkat diskonto mengacu IGSYC Zero Coupon sesuai durasi kewajiban.</p>
              </div>
              <AssumptionsPanel assumptions={assumptions} onChange={setAssumptions} />
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => setPage('data')}>
                  <ChevronRight size={14} />Lanjut ke Data Karyawan
                </button>
                {employees.length > 0 && (
                  <button className="btn btn-secondary" onClick={runCalculation} disabled={calculating}>
                    <Play size={14} />Hitung ({employees.length} karyawan)
                  </button>
                )}
              </div>
            </>
          )}

          {page === 'prior' && (
            <>
              <div className="page-header">
                <h2>Data Periode Sebelumnya</h2>
                <p>Isi data dari laporan aktuaria periode lalu untuk rekonsiliasi DBO dan Interest Cost yang akurat.</p>
              </div>
              <PriorPeriodInput priorPeriod={priorPeriod} onChange={setPriorPeriod} />
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => setPage('assumptions')}>
                  <ChevronRight size={14} />Lanjut ke Asumsi
                </button>
                {employees.length > 0 && (
                  <button className="btn btn-secondary" onClick={runCalculation} disabled={calculating}>
                    <Play size={14} />Hitung ({employees.length} karyawan)
                  </button>
                )}
              </div>
            </>
          )}

          {page === 'results' && (
            <>
              <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2>Hasil Perhitungan PUC</h2>
                  <p>Valuasi per {company.period} · {employees.length} karyawan · Diskonto {fmt.pct(assumptions.discountRate)}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleExcelExport}><FileSpreadsheet size={12} />Excel</button>
                  <button className="btn btn-secondary btn-sm" onClick={handlePDFExport}><FileText size={12} />PDF</button>
                </div>
              </div>
              <ResultsDashboard result={result} assumptions={assumptions} company={company} priorPeriod={priorPeriod} />
            </>
          )}

          {page === 'sensitivity' && (
            <>
              <div className="page-header">
                <h2>Analisis Sensitivitas</h2>
                <p>PSAK 219 Par. 145(a) — ubah asumsi real-time, lihat dampak terhadap DBO dan CSC.</p>
              </div>
              <SensitivityAnalysis employees={result?.employees || []} baseAssumptions={assumptions} baseResult={result} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
