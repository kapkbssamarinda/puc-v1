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

  // ============================================================
  // SHEET 1: RINGKASAN EKSEKUTIF
  // ============================================================
  const ws1 = wb.addWorksheet('Ringkasan Eksekutif', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
  });

  ws1.columns = [
    { width: 38 }, { width: 22 }, { width: 22 }, { width: 28 }
  ];

  // Title
  ws1.mergeCells('A1:D1');
  ws1.getCell('A1').value = 'LAPORAN VALUASI AKTUARIA — IMBALAN PASCA KERJA';
  ws1.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF' + COLORS.headerText } };
  ws1.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.header } };
  ws1.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(1).height = 30;

  ws1.mergeCells('A2:D2');
  ws1.getCell('A2').value = `Metode Projected Unit Credit (PUC) | Sesuai PSAK 219`;
  ws1.getCell('A2').font = { name: 'Calibri', size: 10, color: { argb: 'FF' + COLORS.subHeaderText } };
  ws1.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.subHeader } };
  ws1.getCell('A2').alignment = { horizontal: 'center' };

  ws1.addRow([]);

  // Company info
  addSectionHeader(ws1, 'A4:D4', 'INFORMASI PERUSAHAAN');
  addDataRow(ws1, 5, 'Nama Perusahaan', companyInfo.name || '-', '', '');
  addDataRow(ws1, 6, 'Tanggal Valuasi', companyInfo.valuationDate || new Date().toLocaleDateString('id-ID'), '', '');
  addDataRow(ws1, 7, 'Periode Laporan', companyInfo.period || '31 Desember 2025', '', '');

  ws1.addRow([]);

  // Summary stats
  addSectionHeader(ws1, 'A9:D9', 'DATA KARYAWAN');

  const dataRows = [
    ['Jumlah Karyawan Tetap', summary.totalEmployees, '', 'orang'],
    ['Total Upah per Bulan', rp(summary.totalWagePerMonth), '', 'Rp'],
    ['Rata-rata Usia', summary.avgAge.toFixed(2), '', 'tahun'],
    ['Rata-rata Masa Kerja Lalu', summary.avgPastService.toFixed(2), '', 'tahun'],
    ['Durasi Rata-rata Tertimbang', summary.weightedAverageDuration.toFixed(2), '', 'tahun'],
  ];
  dataRows.forEach((d, i) => addDataRow(ws1, 10 + i, d[0], d[1], d[3], ''));

  ws1.addRow([]);

  addSectionHeader(ws1, 'A16:D16', 'HASIL PERHITUNGAN UTAMA');
  ws1.getRow(17).values = ['Komponen', '31 Des 2025', '', 'Keterangan'];
  styleHeaderRow(ws1.getRow(17));

  const resultRows = [
    ['Nilai Kini Kewajiban Imbalan Pasti (DBO)', rp(summary.totalDBO), '', 'Liabilitas di Laporan Posisi Keuangan'],
    ['Nilai Wajar Aset Program', 0, '', 'Tidak ada aset program'],
    ['Defisit / (Surplus)', rp(summary.totalDBO), '', 'DBO − Aset Program'],
    ['Dampak Pembatasan Aset', 0, '', '-'],
    ['(Aset)/Kewajiban Neto', rp(summary.totalDBO), '', 'Paragraf 57(a)&(b) PSAK 219'],
  ];
  resultRows.forEach((d, i) => {
    const row = ws1.getRow(18 + i);
    row.values = d;
    row.getCell(1).font = { name: 'Calibri', size: 10 };
    row.getCell(2).numFmt = '#,##0';
    row.getCell(2).font = { name: 'Calibri', size: 10, bold: i === 4, color: i === 4 ? { argb: 'FF' + COLORS.accent } : undefined };
    row.getCell(4).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.light } };
    addBorderRow(row, 4);
  });

  ws1.addRow([]);

  addSectionHeader(ws1, 'A24:D24', 'BEBAN DI LAPORAN LABA RUGI');
  ws1.getRow(25).values = ['Komponen', 'Nilai (Rp)', '', 'Paragraf PSAK 219'];
  styleHeaderRow(ws1.getRow(25));
  const bebanRows = [
    ['Biaya Jasa Kini (Current Service Cost)', rp(summary.totalCSC), '', 'Par. 57(c)'],
    ['Biaya Bunga (Interest Cost)', rp(summary.totalInterestCost), '', 'Par. 57(c)'],
    ['Total Beban / (Pendapatan) Laba Rugi', rp(summary.totalCSC + summary.totalInterestCost), '', 'Par. 57(c)'],
  ];
  bebanRows.forEach((d, i) => {
    const row = ws1.getRow(26 + i);
    row.values = d;
    row.getCell(2).numFmt = '#,##0';
    row.getCell(2).font = { name: 'Calibri', size: 10, bold: i === 2, color: i === 2 ? { argb: 'FF' + COLORS.accent } : undefined };
    row.getCell(4).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.light } };
    addBorderRow(row, 4);
  });

  // ============================================================
  // SHEET 2: ASUMSI AKTUARIA
  // ============================================================
  const ws2 = wb.addWorksheet('Asumsi Aktuaria', { views: [{ showGridLines: false }] });
  ws2.columns = [{ width: 36 }, { width: 20 }, { width: 20 }, { width: 30 }];

  addTitleBlock(ws2, 'ASUMSI DAN METODE PENILAIAN AKTUARIA');

  addSectionHeader(ws2, 'A4:D4', 'METODE DAN ASUMSI UTAMA');
  ws2.getRow(5).values = ['Parameter', 'Nilai', '', 'Keterangan'];
  styleHeaderRow(ws2.getRow(5));

  const asumsiRows = [
    ['Metode Penilaian Aktuaria', 'Projected Unit Credit', '', 'PSAK 219'],
    ['Tingkat Diskonto', pct(assumptions.discountRate), '', 'Yield Curve IGSYC Zero Coupon'],
    ['Tingkat Kenaikan Upah Jangka Panjang', pct(assumptions.salaryIncreaseRate), '', 'Sesuai PSAK 219 Par. 83'],
    ['Tabel Mortalita', 'TMI IV 2019', '', 'Tabel Mortalita Indonesia IV 2019'],
    ['Tingkat Cacat', pct(assumptions.disabilityFactor) + ' dari TMI IV 2019', '', 'Probabilitas cacat relatif'],
    ['Usia Pensiun Normal', assumptions.retirementAge + ' tahun', '', 'PP 35/2021'],
    ['Tingkat Pengunduran Diri 15-29 th', '6,00%', '', 'Per tahun'],
    ['Tingkat Pengunduran Diri 30-34 th', '3,00%', '', 'Per tahun'],
    ['Tingkat Pengunduran Diri 35-39 th', '1,80%', '', 'Per tahun'],
    ['Tingkat Pengunduran Diri 40-53 th', '1,20%', '', 'Per tahun'],
    ['Tingkat Pengunduran Diri 54-55 th', '0,60%', '', 'Per tahun'],
    ['Tingkat Pengunduran Diri > 56 th', '0,00%', '', 'Per tahun'],
    ['Tingkat Pengembalian Aset Program', '0,00%', '', 'Tidak ada aset program'],
  ];
  asumsiRows.forEach((d, i) => {
    const row = ws2.getRow(6 + i);
    row.values = d;
    row.getCell(1).font = { name: 'Calibri', size: 10 };
    row.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + COLORS.accent } };
    row.getCell(4).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.light } };
    addBorderRow(row, 4);
  });

  // ============================================================
  // SHEET 3: DATA INDIVIDU KARYAWAN
  // ============================================================
  const ws3 = wb.addWorksheet('Data Karyawan', { views: [{ showGridLines: false }] });
  ws3.columns = [
    { width: 6 }, { width: 28 }, { width: 10 }, { width: 12 },
    { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 },
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
      i + 1,
      emp.name || `Karyawan ${i + 1}`,
      emp.currentAge,
      emp.pastService.toFixed(2),
      rp(emp.monthlyWage),
      rp(emp.projectedSalaryAtRetirement),
      rp(emp.dbo),
      rp(emp.csc),
      rp(emp.interestCost),
      (emp.probSurviveToRetirement * 100).toFixed(2) + '%',
    ];
    [5, 6, 7, 8, 9].forEach(col => { row.getCell(col).numFmt = '#,##0'; });
    row.getCell(1).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.subHeaderText } };
    row.getCell(2).font = { name: 'Calibri', size: 10 };
    [3, 4, 5, 6, 7, 8, 9, 10].forEach(col => {
      row.getCell(col).font = { name: 'Calibri', size: 10 };
      row.getCell(col).alignment = { horizontal: 'right' };
    });
    addBorderRow(row, 10);
  });

  // Total row
  const totalRow = ws3.getRow(5 + employees.length);
  totalRow.values = ['', 'TOTAL', '', '',
    rp(summary.totalWagePerMonth), '',
    rp(summary.totalDBO), rp(summary.totalCSC), rp(summary.totalInterestCost), ''];
  [5, 7, 8, 9].forEach(col => { totalRow.getCell(col).numFmt = '#,##0'; });
  totalRow.eachCell((cell, col) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + COLORS.accent } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.total } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF' + COLORS.accent } },
    };
  });

  // ============================================================
  // SHEET 4: REKONSILIASI DBO
  // ============================================================
  const ws4 = wb.addWorksheet('Rekonsiliasi DBO', { views: [{ showGridLines: false }] });
  ws4.columns = [{ width: 48 }, { width: 22 }, { width: 22 }, { width: 28 }];
  addTitleBlock(ws4, 'REKONSILIASI NILAI KINI KEWAJIBAN IMBALAN PASTI');

  ws4.getRow(4).values = ['Keterangan', 'Jumlah (Rp)', '', 'Referensi PSAK 219'];
  styleHeaderRow(ws4.getRow(4));

  const rekonRows = [
    ['Nilai Kini Kewajiban Imbalan Pasti pada Awal Periode', null, '', ''],
    ['(+) Biaya Jasa Kini', rp(summary.totalCSC), '', 'Par. 57(c)'],
    ['(+) Biaya Bunga atas Kewajiban Imbalan Pasti', rp(summary.totalInterestCost), '', 'Par. 57(c)'],
    ['(+/-) Biaya Jasa Lalu & Keuntungan/Kerugian Penyelesaian', null, '', 'Par. 57(c)'],
    ['(-) Imbalan Kerja yang Dibayarkan', null, '', ''],
    ['(+/-) Keuntungan/(Kerugian) Aktuarial atas DBO', null, '', 'OCI - Par. 57(d)'],
    ['Nilai Kini Kewajiban Imbalan Pasti pada Akhir Periode', rp(summary.totalDBO), '', ''],
  ];

  rekonRows.forEach((d, i) => {
    const row = ws4.getRow(5 + i);
    row.values = d;
    row.getCell(1).font = { name: 'Calibri', size: 10 };
    if (d[1] !== null) {
      row.getCell(2).numFmt = '#,##0';
      row.getCell(2).font = { name: 'Calibri', size: 10, bold: i === rekonRows.length - 1, color: i === rekonRows.length - 1 ? { argb: 'FF' + COLORS.accent } : undefined };
    } else {
      row.getCell(2).value = '→ Isi dari laporan sebelumnya';
      row.getCell(2).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF' + COLORS.light } };
    }
    row.getCell(4).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.light } };
    addBorderRow(row, 4);
  });

  // ============================================================
  // SHEET 5: ANALISIS SENSITIVITAS
  // ============================================================
  const ws5 = wb.addWorksheet('Sensitivitas', { views: [{ showGridLines: false }] });
  ws5.columns = [{ width: 32 }, { width: 22 }, { width: 22 }, { width: 24 }, { width: 18 }];
  addTitleBlock(ws5, 'ANALISIS SENSITIVITAS — PSAK 219 PAR. 145(a)');

  ws5.getRow(4).values = ['Asumsi', 'Nilai Kini DBO (Rp)', 'Biaya Jasa Kini (Rp)', 'Perubahan DBO (Rp)', '% Perubahan'];
  styleHeaderRow(ws5.getRow(4));

  if (calcResult.sensitivity) {
    calcResult.sensitivity.forEach((s, i) => {
      const row = ws5.getRow(5 + i);
      const baseDBO = calcResult.summary.totalDBO;
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
      addBorderRow(row, 5);
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
  if (typeof value === 'number') {
    row.getCell(2).numFmt = '#,##0';
  }
  row.getCell(3).font = { name: 'Calibri', size: 9, color: { argb: 'FF' + COLORS.subHeaderText } };
  addBorderRow(row, 4);
}

function styleHeaderRow(row) {
  row.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.subHeader } };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF' + COLORS.accent } }
    };
  });
  row.height = 22;
}

function addBorderRow(row, numCols) {
  for (let i = 1; i <= numCols; i++) {
    row.getCell(i).border = {
      bottom: { style: 'hair', color: { argb: 'FF' + COLORS.border } }
    };
  }
}
