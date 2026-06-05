/**
 * Excel export untuk laporan aktuaria PUC
 * Menggunakan ExcelJS
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const COLORS = {
  header: '1A1A18',
  headerText: 'D4A853',
  subHeader: '252521',
  subHeaderText: 'A09E97',
  accent: 'D4A853',
  green: '4CAF82',
  red: 'E05555',
  border: '3A3A36',
  total: '1E1E1B',
  totalText: 'D4A853',
  white: 'F0EDE6',
  light: 'B0AEA7',
};

function rp(value) {
  return Math.round(value || 0);
}

function pct(value) {
  return ((value || 0) * 100).toFixed(2) + '%';
}

export async function exportToExcel(calcResult, assumptions, companyInfo) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PUC Actuarial Tool — PSAK 219';
  wb.created = new Date();

  const { employees, summary } = calcResult;
  const period = companyInfo.period || `31 Desember ${new Date().getFullYear()}`;
  const totalExpense = rp(summary.totalCSC + summary.totalInterestCost);

  // ============================================================
  // SHEET 1: RINGKASAN EKSEKUTIF
  // ============================================================
  const ws1 = wb.addWorksheet('Ringkasan Eksekutif', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
  });
  ws1.columns = [{ width: 46 }, { width: 22 }, { width: 22 }, { width: 28 }];

  ws1.mergeCells('A1:D1');
  ws1.getCell('A1').value = 'LAPORAN VALUASI AKTUARIA — IMBALAN PASCA KERJA';
  ws1.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF' + COLORS.headerText } };
  ws1.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.header } };
  ws1.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(1).height = 30;

  ws1.mergeCells('A2:D2');
  ws1.getCell('A2').value = 'Metode Projected Unit Credit (PUC) | Sesuai PSAK 219';
  ws1.getCell('A2').font = { name: 'Calibri', size: 10, color: { argb: 'FF' + COLORS.subHeaderText } };
  ws1.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.subHeader } };
  ws1.getCell('A2').alignment = { horizontal: 'center' };
  ws1.addRow([]);

  addSectionHeader(ws1, 'A4:D4', 'INFORMASI PERUSAHAAN');
  addDataRow(ws1, 5, 'Nama Perusahaan', companyInfo.name || '-', '', '');
  addDataRow(ws1, 6, 'Tanggal Valuasi', companyInfo.valuationDate || new Date().toLocaleDateString('id-ID'), '', '');
  addDataRow(ws1, 7, 'Periode Laporan', period, '', '');
  ws1.addRow([]);

  addSectionHeader(ws1, 'A9:D9', 'DATA KARYAWAN');
  [
    ['Jumlah Karyawan Tetap', summary.totalEmployees, 'orang'],
    ['Total Upah per Bulan', rp(summary.totalWagePerMonth), 'Rp'],
    ['Rata-rata Usia', summary.avgAge.toFixed(2), 'tahun'],
    ['Rata-rata Masa Kerja Lalu', summary.avgPastService.toFixed(2), 'tahun'],
    ['Durasi Rata-rata Tertimbang', summary.weightedAverageDuration.toFixed(2), 'tahun'],
  ].forEach((d, i) => addDataRow(ws1, 10 + i, d[0], d[1], d[2], ''));
  ws1.addRow([]);

  // A. Laporan Posisi Keuangan
  addSectionHeader(ws1, 'A16:D16', 'A. LAPORAN POSISI KEUANGAN — PAR. 57(a)&(b) PSAK 219');
  ws1.getRow(17).values = ['Komponen', period, '', 'Keterangan'];
  styleHeaderRow(ws1.getRow(17));
  [
    ['Nilai Kini Kewajiban Imbalan Pasti (DBO)', rp(summary.totalDBO), '', 'Liabilitas di Laporan Posisi Keuangan'],
    ['Nilai Wajar Aset Program', 0, '', 'Tidak ada aset program'],
    ['Defisit / (Surplus)', rp(summary.totalDBO), '', 'DBO − Aset Program'],
    ['Dampak Pembatasan Aset', 0, '', '-'],
    ['(Aset)/Kewajiban Neto', rp(summary.totalDBO), '', 'Par. 57(a)&(b)'],
  ].forEach((d, i) => {
    const row = ws1.getRow(18 + i);
    row.values = d;
    row.getCell(1).font = { name: 'Calibri', size: 10 };
    row.getCell(2).numFmt = '#,##0';
    row.getCell(2).font = { name: 'Calibri', size: 10, bold: i === 4, color: i === 4 ? { argb: 'FF' + COLORS.accent } : undefined };
    row.getCell(4).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.light } };
    addBorderRow(row, 4);
  });
  ws1.addRow([]);

  // B. Beban Laba Rugi — format lengkap
  addSectionHeader(ws1, 'A24:D24', 'B. BEBAN DI LAPORAN LABA RUGI — PAR. 57(c) PSAK 219');
  ws1.getRow(25).values = ['Komponen', period, '', 'Paragraf PSAK 219'];
  styleHeaderRow(ws1.getRow(25));

  addTableGroupHeader(ws1, 26, 'Biaya Jasa');
  [
    { label: '     Biaya Jasa Kini (Current Service Cost)', value: rp(summary.totalCSC), ref: 'Par. 57(c)', isPlaceholder: false },
    { label: '     Biaya Jasa Lalu (Past Service Cost)', value: null, ref: 'Par. 57(c)', isPlaceholder: true },
    { label: '     (Keuntungan)/Kerugian atas Penyelesaian', value: null, ref: 'Par. 57(c)', isPlaceholder: true },
  ].forEach((d, i) => addBebanRow(ws1.getRow(27 + i), d.label, d.value, d.ref, d.isPlaceholder));

  addTableGroupHeader(ws1, 30, 'Biaya Bunga');
  [
    { label: '     Biaya Bunga atas Kewajiban Imbalan Pasti', value: rp(summary.totalInterestCost), ref: 'Par. 57(c)', isPlaceholder: false },
    { label: '     (Penghasilan)/Biaya Bunga atas Nilai Wajar Aset Program', value: 0, ref: '', isPlaceholder: false },
    { label: '     Biaya Bunga atas Dampak Batas Atas Aset', value: 0, ref: '', isPlaceholder: false },
    { label: '     Selisih Pembayaran atas Aset Program', value: 0, ref: '', isPlaceholder: false },
  ].forEach((d, i) => addBebanRow(ws1.getRow(31 + i), d.label, d.value, d.ref, d.isPlaceholder));

  const totalBebanRow = ws1.getRow(35);
  totalBebanRow.values = ['Beban/(Pendapatan) yang Diakui dalam Laporan Laba Rugi', totalExpense, '', 'Par. 57(c)'];
  totalBebanRow.getCell(2).numFmt = '#,##0';
  totalBebanRow.eachCell((cell, col) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + COLORS.accent } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.total } };
  });
  totalBebanRow.getCell(4).font = { name: 'Calibri', size: 9, bold: false, color: { argb: 'FF' + COLORS.light } };
  addBorderRow(totalBebanRow, 4);

  // ============================================================
  // SHEET 2: ASUMSI AKTUARIA + FITUR MANFAAT
  // ============================================================
  const ws2 = wb.addWorksheet('Asumsi Aktuaria', { views: [{ showGridLines: false }] });
  ws2.columns = [{ width: 44 }, { width: 24 }, { width: 20 }, { width: 38 }];
  addTitleBlock(ws2, 'ASUMSI DAN METODE PENILAIAN AKTUARIA');

  addSectionHeader(ws2, 'A4:D4', 'METODE DAN ASUMSI UTAMA');
  ws2.getRow(5).values = ['Parameter', 'Nilai', '', 'Keterangan'];
  styleHeaderRow(ws2.getRow(5));

  // Rows 6–18 (13 rows)
  [
    ['Metode Penilaian Aktuaria', 'Projected Unit Credit', '', 'PSAK 219'],
    ['Tingkat Diskonto', pct(assumptions.discountRate), '', 'Yield Curve IGSYC Zero Coupon'],
    ['Tingkat Kenaikan Upah Jangka Panjang', pct(assumptions.salaryIncreaseRate), '', 'Sesuai PSAK 219 Par. 83'],
    ['Tabel Mortalita', 'TMI IV 2019', '', 'Tabel Mortalita Indonesia IV 2019'],
    ['Tingkat Cacat', pct(assumptions.disabilityFactor) + ' dari TMI IV 2019', '', 'Probabilitas cacat relatif'],
    ['Usia Pensiun Normal', assumptions.retirementAge + ' tahun', '', 'PP 35/2021'],
    ['Tingkat Pengunduran Diri 15–29 th', '6,00%', '', 'Per tahun'],
    ['Tingkat Pengunduran Diri 30–34 th', '3,00%', '', 'Per tahun'],
    ['Tingkat Pengunduran Diri 35–39 th', '1,80%', '', 'Per tahun'],
    ['Tingkat Pengunduran Diri 40–53 th', '1,20%', '', 'Per tahun'],
    ['Tingkat Pengunduran Diri 54–55 th', '0,60%', '', 'Per tahun'],
    ['Tingkat Pengunduran Diri > 56 th', '0,00%', '', 'Per tahun'],
    ['Tingkat Pengembalian Aset Program', '0,00%', '', 'Tidak ada aset program'],
  ].forEach((d, i) => {
    const row = ws2.getRow(6 + i);
    row.values = d;
    row.getCell(1).font = { name: 'Calibri', size: 10 };
    row.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + COLORS.accent } };
    row.getCell(4).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.light } };
    addBorderRow(row, 4);
  });

  // Row 19 blank (implicit), row 20 onwards: Fitur Manfaat
  addSectionHeader(ws2, 'A20:D20', 'FITUR MANFAAT (PP NO. 35 TAHUN 2021)');
  ws2.getRow(21).values = ['Skenario PHK', 'Formula', 'Dasar Hukum', 'Keterangan UPH'];
  styleHeaderRow(ws2.getRow(21));
  [
    ['Pensiun Normal',       '1,75× UP + UPMK + UPH', 'Pasal 56',         'UPH = 15% × (1,75×UP + UPMK)'],
    ['Meninggal Dunia',      '2× UP + UPMK + UPH',    'Pasal 57',         'UPH = 15% × (2×UP + UPMK)'],
    ['Cacat Tetap Total',    '2× UP + UPMK + UPH',    'Pasal 56 ayat 4',  'UPH = 15% × (2×UP + UPMK)'],
    ['Mengundurkan Diri',    'UPMK + UPH',             'Pasal 50',         'UPH = 15% × UPMK; tidak ada UP'],
  ].forEach((d, i) => {
    const row = ws2.getRow(22 + i);
    row.values = d;
    row.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
    row.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: 'FF' + COLORS.accent } };
    row.getCell(3).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.light } };
    row.getCell(4).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF' + COLORS.subHeaderText } };
    addBorderRow(row, 4);
  });

  // ============================================================
  // SHEET 3: DATA INDIVIDU KARYAWAN
  // ============================================================
  const ws3 = wb.addWorksheet('Data Karyawan', { views: [{ showGridLines: false }] });
  ws3.columns = [
    { width: 6 }, { width: 28 }, { width: 10 }, { width: 12 },
    { width: 18 }, { width: 18 }, { width: 16 }, { width: 16 },
    { width: 18 }, { width: 16 }
  ];
  addTitleBlock(ws3, 'DATA INDIVIDU KARYAWAN — HASIL VALUASI PUC');

  const empHeader = ws3.getRow(4);
  empHeader.values = ['No', 'Nama', 'Usia', 'Masa Kerja', 'Gaji/Bulan (Rp)',
    'Proyeksi Gaji Pensiun (Rp)', 'DBO (Rp)', 'CSC (Rp)', 'Biaya Bunga (Rp)', 'Prob. Pensiun'];
  styleHeaderRow(empHeader);
  ws3.getRow(4).height = 30;

  employees.forEach((emp, i) => {
    const row = ws3.getRow(5 + i);
    row.values = [
      i + 1, emp.name || `Karyawan ${i + 1}`, emp.currentAge,
      emp.pastService.toFixed(2), rp(emp.monthlyWage),
      rp(emp.projectedSalaryAtRetirement), rp(emp.dbo),
      rp(emp.csc), rp(emp.interestCost),
      (emp.probSurviveToRetirement * 100).toFixed(2) + '%',
    ];
    [5, 6, 7, 8, 9].forEach(col => { row.getCell(col).numFmt = '#,##0'; });
    row.getCell(1).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.subHeaderText } };
    [2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(col => {
      row.getCell(col).font = { name: 'Calibri', size: 10 };
      if (col > 2) row.getCell(col).alignment = { horizontal: 'right' };
    });
    addBorderRow(row, 10);
  });

  const totalRow3 = ws3.getRow(5 + employees.length);
  totalRow3.values = ['', 'TOTAL', '', '', rp(summary.totalWagePerMonth), '',
    rp(summary.totalDBO), rp(summary.totalCSC), rp(summary.totalInterestCost), ''];
  [5, 7, 8, 9].forEach(col => { totalRow3.getCell(col).numFmt = '#,##0'; });
  totalRow3.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + COLORS.accent } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.total } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF' + COLORS.accent } } };
  });

  // ============================================================
  // SHEET 4: REKONSILIASI — 4 BAGIAN
  // ============================================================
  const ws4 = wb.addWorksheet('Rekonsiliasi', { views: [{ showGridLines: false }] });
  ws4.columns = [{ width: 54 }, { width: 24 }, { width: 20 }, { width: 34 }];
  addTitleBlock(ws4, 'REKONSILIASI — PSAK 219');

  let r = 4; // dynamic row counter

  // ── A. Rekonsiliasi Nilai Kini DBO ──────────────────────────
  addSectionHeader(ws4, `A${r}:D${r}`, 'A. REKONSILIASI NILAI KINI KEWAJIBAN IMBALAN PASTI — PAR. 140-141'); r++;
  ws4.getRow(r).values = ['Keterangan', period, '', 'Referensi PSAK 219'];
  styleHeaderRow(ws4.getRow(r)); r++;

  [
    { label: 'DBO Awal Periode',                                        value: null, ph: '→ Isi dari laporan sebelumnya', ref: '' },
    { label: '     (+) Biaya Jasa Kini',                                value: rp(summary.totalCSC),          ph: null, ref: 'Par. 57(c)' },
    { label: '     (+) Biaya Bunga atas DBO',                           value: rp(summary.totalInterestCost), ph: null, ref: 'Par. 57(c)' },
    { label: '     (+/-) Biaya Jasa Lalu & Settlement',                 value: null, ph: '→ Isi dari data aktual', ref: 'Par. 57(c)' },
    { label: '     (+/-) Dampak Mutasi Pegawai',                        value: 0,    ph: null, ref: '' },
    { label: '     (-) Selisih Pembayaran atas Aset Program',           value: 0,    ph: null, ref: '' },
    { label: '     (+/-) Dampak Perubahan Kurs',                        value: 0,    ph: null, ref: '' },
    { label: '     (-) Imbalan Kerja yang Dibayarkan',                  value: null, ph: '→ Isi dari data aktual', ref: '' },
    { label: '     (+/-) Dampak Kombinasi Bisnis',                      value: 0,    ph: null, ref: '' },
    { label: 'DBO Expected Akhir Periode',                              value: null, ph: '→ Hitung dari data di atas', ref: '' },
    { label: '     (+/-) (Keuntungan)/Kerugian Aktuarial',              value: null, ph: '→ Selisih aktual vs expected', ref: 'OCI – Par. 57(d)' },
  ].forEach(d => { addRekonRow(ws4.getRow(r), d.label, d.value, d.ph, d.ref); r++; });

  addRekonTotal(ws4.getRow(r), 'DBO Aktual Akhir Periode', rp(summary.totalDBO), 'Par. 140-141'); r++;
  r++; // blank row

  // ── B. Rekonsiliasi (Aset)/Kewajiban ────────────────────────
  addSectionHeader(ws4, `A${r}:D${r}`, 'B. REKONSILIASI (ASET)/KEWAJIBAN PADA LAPORAN POSISI KEUANGAN'); r++;
  ws4.getRow(r).values = ['Keterangan', period, '', 'Referensi'];
  styleHeaderRow(ws4.getRow(r)); r++;

  [
    { label: '(Aset)/Kewajiban Awal Periode',                   value: null, ph: '→ Isi dari laporan sebelumnya', ref: '' },
    { label: '     (+) Beban Laba Rugi (CSC + Biaya Bunga)',    value: totalExpense,                              ref: 'Dari tabel B' },
    { label: '     (+/-) Penghasilan Komprehensif Lain (OCI)',  value: null, ph: '→ Dari tabel OCI',              ref: 'Par. 57(d)' },
    { label: '     (-) Iuran Perusahaan',                       value: 0,                                         ref: '' },
    { label: '     (-) Imbalan Kerja Dibayarkan',               value: null, ph: '→ Isi dari data aktual',        ref: '' },
    { label: '     (+/-) Dampak Mutasi Pegawai',                value: 0,                                         ref: '' },
  ].forEach(d => { addRekonRow(ws4.getRow(r), d.label, d.value ?? null, d.ph, d.ref); r++; });

  addRekonTotal(ws4.getRow(r), '(Aset)/Kewajiban Akhir Periode', rp(summary.totalDBO), 'Par. 57(a)&(b)'); r++;
  r++; // blank row

  // ── C. Penghasilan Komprehensif Lain ────────────────────────
  addSectionHeader(ws4, `A${r}:D${r}`, 'C. PENGHASILAN KOMPREHENSIF LAIN (OCI) — PAR. 57(d) & 122'); r++;
  ws4.getRow(r).values = ['Keterangan', period, '', 'Referensi'];
  styleHeaderRow(ws4.getRow(r)); r++;

  [
    { label: 'Keuntungan/(Kerugian) Aktuarial atas DBO',         value: null, ph: '→ Dari rekonsiliasi DBO', ref: '' },
    { label: 'Keuntungan/(Kerugian) Aktuarial atas Aset Program',value: 0,    ph: null, ref: '' },
    { label: 'Dampak Perubahan Batas Atas Aset',                 value: 0,    ph: null, ref: '' },
  ].forEach(d => { addRekonRow(ws4.getRow(r), d.label, d.value, d.ph, d.ref); r++; });

  addRekonTotal(ws4.getRow(r), 'Total Penghasilan Komprehensif Lain', null, 'Par. 57(d)', '→ Dari rekonsiliasi DBO'); r++;

  // Catatan kaki
  ws4.mergeCells(`A${r}:D${r}`);
  ws4.getRow(r).getCell(1).value = 'Catatan: Sesuai PSAK 219 paragraf 122, OCI tidak direklasifikasi ke laba rugi pada periode berikutnya.';
  ws4.getRow(r).getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF' + COLORS.light } };
  r++;
  r++; // blank row

  // ── D. Rekonsiliasi Akumulasi OCI ───────────────────────────
  addSectionHeader(ws4, `A${r}:D${r}`, 'D. REKONSILIASI AKUMULASI PENGHASILAN KOMPREHENSIF LAIN'); r++;
  ws4.getRow(r).values = ['Keterangan', period, '', 'Referensi'];
  styleHeaderRow(ws4.getRow(r)); r++;

  [
    { label: 'Akumulasi OCI Awal Periode', value: null, ph: '→ Isi dari laporan sebelumnya', ref: '' },
    { label: '     OCI Tahun Berjalan',    value: null, ph: '→ Dari tabel C',                ref: 'Par. 122' },
  ].forEach(d => { addRekonRow(ws4.getRow(r), d.label, d.value, d.ph, d.ref); r++; });

  addRekonTotal(ws4.getRow(r), 'Akumulasi OCI Akhir Periode', null, 'Par. 122', '→ Awal + Tahun berjalan');

  // ============================================================
  // SHEET 5: ANALISIS SENSITIVITAS + ANALISIS JATUH TEMPO
  // ============================================================
  const ws5 = wb.addWorksheet('Sensitivitas', { views: [{ showGridLines: false }] });
  ws5.columns = [{ width: 32 }, { width: 22 }, { width: 22 }, { width: 24 }, { width: 18 }];
  addTitleBlock(ws5, 'ANALISIS SENSITIVITAS — PSAK 219 PAR. 145(a)');

  addSectionHeader(ws5, 'A4:E4', 'ANALISIS SENSITIVITAS');
  ws5.getRow(5).values = ['Asumsi', 'Nilai Kini DBO (Rp)', 'Biaya Jasa Kini (Rp)', 'Perubahan DBO (Rp)', '% Perubahan'];
  styleHeaderRow(ws5.getRow(5));

  let s5 = 6;
  if (calcResult.sensitivity) {
    calcResult.sensitivity.forEach((s, i) => {
      const row = ws5.getRow(s5);
      const baseDBO = summary.totalDBO;
      const change = s.dbo - baseDBO;
      const changePct = baseDBO > 0 ? (change / baseDBO * 100).toFixed(2) + '%' : '-';
      row.values = [s.label, rp(s.dbo), rp(s.csc), rp(change), changePct];
      [2, 3, 4].forEach(col => { row.getCell(col).numFmt = '#,##0'; });
      const isBase = i === 0;
      row.eachCell((cell, col) => {
        cell.font = { name: 'Calibri', size: 10, bold: isBase, color: isBase ? { argb: 'FF' + COLORS.accent } : undefined };
        if (col === 4 && !isBase) {
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF' + (change >= 0 ? COLORS.red : COLORS.green) } };
        }
      });
      if (isBase) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.total } };
        });
      }
      addBorderRow(row, 5);
      s5++;
    });
  }

  // Analisis Jatuh Tempo
  const maturity = summary.maturity;
  if (maturity?.length) {
    s5++; // blank row
    addSectionHeader(ws5, `A${s5}:E${s5}`, 'ANALISIS JATUH TEMPO PEMBAYARAN IMBALAN — PSAK 219'); s5++;
    ws5.getRow(s5).values = ['Tenor (Tahun)', period, '', '', ''];
    styleHeaderRow(ws5.getRow(s5)); s5++;

    maturity.forEach(m => {
      const row = ws5.getRow(s5);
      row.values = [m.label, rp(m.amount), '', '', ''];
      row.getCell(1).font = { name: 'Calibri', size: 10 };
      row.getCell(2).numFmt = '#,##0';
      row.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: 'FF' + COLORS.accent } };
      addBorderRow(row, 2);
      s5++;
    });

    const matTotal = ws5.getRow(s5);
    matTotal.values = ['Total', rp(maturity.reduce((acc, m) => acc + m.amount, 0)), '', '', ''];
    matTotal.getCell(2).numFmt = '#,##0';
    matTotal.eachCell((cell, col) => {
      if (col <= 2) {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + COLORS.accent } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.total } };
      }
    });
  }

  // Save
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `PUC_Aktuaria_${(companyInfo.name || 'Perusahaan').replace(/\s+/g, '_')}_${new Date().getFullYear()}.xlsx`;
  saveAs(blob, fileName);
}

// ============================================================
// HELPERS
// ============================================================
function addTitleBlock(ws, title) {
  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = title;
  ws.getCell('A1').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF' + COLORS.headerText } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.header } };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = 'Metode Projected Unit Credit | Sesuai PSAK 219 | UU No. 6/2023 & PP No. 35/2021';
  ws.getCell('A2').font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.subHeaderText } };
  ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.subHeader } };
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.addRow([]);
}

function addSectionHeader(ws, range, title) {
  ws.mergeCells(range);
  const cell = ws.getCell(range.split(':')[0]);
  cell.value = title;
  cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF' + COLORS.accent } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A18' } };
  ws.getRow(parseInt(range.match(/\d+/)[0])).height = 20;
}

function addDataRow(ws, rowNum, label, value, unit, note) {
  const row = ws.getRow(rowNum);
  row.values = [label, value, unit, note];
  row.getCell(1).font = { name: 'Calibri', size: 10 };
  row.getCell(2).font = { name: 'Calibri', size: 10, bold: true };
  if (typeof value === 'number') row.getCell(2).numFmt = '#,##0';
  row.getCell(3).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.subHeaderText } };
  addBorderRow(row, 4);
}

function styleHeaderRow(row) {
  row.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.subHeader } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF' + COLORS.accent } } };
  });
  row.height = 22;
}

function addBorderRow(row, numCols) {
  for (let i = 1; i <= numCols; i++) {
    row.getCell(i).border = { bottom: { style: 'hair', color: { argb: 'FF' + COLORS.border } } };
  }
}

// Sub-header dalam tabel (e.g. "Biaya Jasa", "Biaya Bunga")
function addTableGroupHeader(ws, rowNum, label) {
  const row = ws.getRow(rowNum);
  row.values = [label, '', '', ''];
  row.getCell(1).font = { name: 'Calibri', size: 9, bold: true, italic: true, color: { argb: 'FF' + COLORS.subHeaderText } };
  row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF202020' } };
  addBorderRow(row, 4);
}

// Baris beban L/R: value atau placeholder "—"
function addBebanRow(row, label, value, ref, isPlaceholder) {
  row.values = [label, isPlaceholder ? null : value, '', ref];
  row.getCell(1).font = { name: 'Calibri', size: 10 };
  if (isPlaceholder) {
    row.getCell(2).value = '—';
    row.getCell(2).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF' + COLORS.light } };
  } else {
    row.getCell(2).numFmt = '#,##0';
    row.getCell(2).font = { name: 'Calibri', size: 10 };
  }
  row.getCell(4).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.light } };
  addBorderRow(row, 4);
}

// Baris rekonsiliasi: value aktual atau placeholder italic
function addRekonRow(row, label, value, ph, ref) {
  row.getCell(1).value = label;
  row.getCell(1).font = { name: 'Calibri', size: 10 };
  if (value !== null && value !== undefined) {
    row.getCell(2).value = value;
    row.getCell(2).numFmt = '#,##0';
    row.getCell(2).font = { name: 'Calibri', size: 10 };
  } else {
    row.getCell(2).value = ph || '→ Isi dari data aktual';
    row.getCell(2).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF' + COLORS.light } };
  }
  row.getCell(4).value = ref || '';
  row.getCell(4).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.light } };
  addBorderRow(row, 4);
}

// Baris total rekonsiliasi: bold gold + background gelap
function addRekonTotal(row, label, value, ref, ph) {
  row.getCell(1).value = label;
  if (value !== null && value !== undefined) {
    row.getCell(2).value = value;
    row.getCell(2).numFmt = '#,##0';
  } else if (ph) {
    row.getCell(2).value = ph;
    row.getCell(2).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF' + COLORS.light } };
  }
  row.getCell(4).value = ref || '';

  // Apply fill dan bold ke semua sel, lalu override spesifik
  [1, 2, 3, 4].forEach(col => {
    const cell = row.getCell(col);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.total } };
  });
  row.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + COLORS.accent } };
  if (value !== null && value !== undefined) {
    row.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + COLORS.accent } };
  }
  row.getCell(4).font = { name: 'Calibri', size: 9, bold: false, color: { argb: 'FF' + COLORS.light } };
  addBorderRow(row, 4);
}
