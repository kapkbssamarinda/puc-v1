import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Plus, Trash2, Download, AlertCircle, CheckCircle, Zap } from 'lucide-react';

const TEMPLATE_COLS = ['id', 'name', 'currentAge', 'pastService', 'monthlyWage', 'gender'];

const EMPTY_EMP = { id: '', name: '', currentAge: '', pastService: '', monthlyWage: '', gender: 'L' };

export default function EmployeeInput({
  employees, onChange,
  inputMode, setInputMode,
  summaryInput, setSummaryInput,
  onGenerateSummary,
}) {
  const [manualEmp, setManualEmp] = useState(EMPTY_EMP);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [drag, setDrag] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const fileRef = useRef();

  // ── EXCEL UPLOAD ─────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const parsed = raw
          .filter(r => r['Usia'] || r['currentAge'] || r['usia'])
          .map((r, i) => ({
            id: String(r['id'] || r['ID'] || r['No'] || i + 1),
            name: String(r['name'] || r['Nama'] || r['nama'] || `Karyawan ${i + 1}`),
            currentAge: parseFloat(r['currentAge'] || r['Usia'] || r['usia'] || 0),
            pastService: parseFloat(r['pastService'] || r['Masa Kerja'] || r['masa_kerja'] || 0),
            monthlyWage: parseFloat(String(r['monthlyWage'] || r['Gaji'] || r['gaji'] || 0).replace(/[,.]/g, (m, o, s) => {
              const dots = (s.match(/\./g) || []).length;
              const commas = (s.match(/,/g) || []).length;
              if (dots > 1) return '';
              if (commas > 1) return '';
              return m;
            })),
            gender: String(r['gender'] || r['Gender'] || r['Jenis Kelamin'] || 'L'),
          }))
          .filter(e => e.currentAge > 0 && e.monthlyWage > 0);

        if (parsed.length === 0) {
          setUploadStatus({ type: 'error', msg: 'Tidak ada data valid ditemukan. Pastikan kolom sesuai template.' });
          return;
        }

        onChange([...employees, ...parsed]);
        setUploadStatus({ type: 'success', msg: `${parsed.length} karyawan berhasil diimpor dari Excel.` });
        setTimeout(() => setUploadStatus(null), 4000);
      } catch (err) {
        setUploadStatus({ type: 'error', msg: 'Gagal membaca file: ' + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ── MANUAL FORM ───────────────────────────────────────────────
  const addManual = () => {
    if (!manualEmp.currentAge || !manualEmp.monthlyWage) return;
    const newEmp = {
      ...manualEmp,
      id: manualEmp.id || String(employees.length + 1),
      currentAge: parseFloat(manualEmp.currentAge),
      pastService: parseFloat(manualEmp.pastService || 0),
      monthlyWage: parseFloat(String(manualEmp.monthlyWage).replace(/\./g, '').replace(',', '.')),
    };
    onChange([...employees, newEmp]);
    setManualEmp({ ...EMPTY_EMP, id: String(employees.length + 2) });
  };

  const removeEmp = (idx) => {
    onChange(employees.filter((_, i) => i !== idx));
  };

  // ── DOWNLOAD TEMPLATE ─────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      { id: '1', name: 'Budi Santosa', currentAge: 35, pastService: 5, monthlyWage: 6000000, gender: 'L' },
      { id: '2', name: 'Siti Rahayu', currentAge: 42, pastService: 12, monthlyWage: 8500000, gender: 'P' },
      { id: '3', name: 'Ahmad Fauzi', currentAge: 50, pastService: 20, monthlyWage: 12000000, gender: 'L' },
    ];
    const ws = XLSX.utils.json_to_sheet(data, { header: TEMPLATE_COLS });
    ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Data Karyawan');
    XLSX.writeFile(wb, 'Template_Data_Karyawan_PUC.xlsx');
  };

  // ── SUMMARY GENERATE ─────────────────────────────────────────
  const handleGenerate = () => {
    setSummaryError(null);
    const { totalEmployees, totalWagePerMonth, avgAge, avgPastService } = summaryInput;
    if (!totalEmployees || totalEmployees < 1) { setSummaryError('Jumlah karyawan harus minimal 1.'); return; }
    if (!totalWagePerMonth || totalWagePerMonth <= 0) { setSummaryError('Total gaji harus lebih dari 0.'); return; }
    if (!avgAge || avgAge < 18 || avgAge > 65) { setSummaryError('Rata-rata usia harus antara 18–65 tahun.'); return; }
    if (avgPastService < 0) { setSummaryError('Rata-rata masa kerja tidak boleh negatif.'); return; }
    onGenerateSummary();
  };

  const handleSummaryField = (key, val) => {
    const num = parseFloat(val);
    setSummaryInput(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  const isAllGenerated = employees.length > 0 && employees.every(e => e.isGenerated);

  return (
    <div>
      {/* ── Mode Toggle ───────────────────────────────────────── */}
      <div className="mode-toggle">
        <button
          className={`mode-btn ${inputMode === 'individual' ? 'active' : ''}`}
          onClick={() => setInputMode('individual')}
        >
          Input Individu
        </button>
        <button
          className={`mode-btn ${inputMode === 'summary' ? 'active' : ''}`}
          onClick={() => setInputMode('summary')}
        >
          <Zap size={12} style={{ marginRight: 4 }} />
          Estimasi Rata-rata
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODE: INDIVIDUAL                                        */}
      {/* ════════════════════════════════════════════════════════ */}
      {inputMode === 'individual' && (
        <>
          {/* Upload Zone */}
          <div className="card">
            <div className="card-title">Import dari Excel</div>
            <div
              className={`upload-zone ${drag ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
            >
              <Upload size={28} />
              <h3>Seret file Excel ke sini atau klik untuk pilih</h3>
              <p>Format: .xlsx atau .xls — Kolom: id, name, currentAge, pastService, monthlyWage, gender</p>
              <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>

            {uploadStatus && (
              <div className={`alert ${uploadStatus.type === 'success' ? 'alert-success' : ''}`}
                style={{ marginTop: 12, background: uploadStatus.type === 'error' ? 'var(--red-bg)' : undefined,
                  border: uploadStatus.type === 'error' ? '1px solid rgba(224,85,85,0.2)' : undefined,
                  color: uploadStatus.type === 'error' ? 'var(--red)' : undefined }}>
                {uploadStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span>{uploadStatus.msg}</span>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
                <Download size={12} /> Unduh Template Excel
              </button>
            </div>
          </div>

          {/* Manual Input */}
          <div className="card">
            <div className="card-title">Tambah Karyawan Manual</div>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              <div className="form-group">
                <label className="form-label">ID / No. Karyawan</label>
                <input className="form-input" placeholder="001" value={manualEmp.id}
                  onChange={e => setManualEmp(p => ({ ...p, id: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Nama</label>
                <input className="form-input" placeholder="Nama lengkap" value={manualEmp.name}
                  onChange={e => setManualEmp(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Usia (tahun) *</label>
                <input type="number" className="form-input" placeholder="35" value={manualEmp.currentAge}
                  onChange={e => setManualEmp(p => ({ ...p, currentAge: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Masa Kerja Lalu (tahun) *</label>
                <input type="number" step="0.5" className="form-input" placeholder="5.5" value={manualEmp.pastService}
                  onChange={e => setManualEmp(p => ({ ...p, pastService: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Gaji per Bulan (Rp) *</label>
                <input type="number" className="form-input" placeholder="6000000" value={manualEmp.monthlyWage}
                  onChange={e => setManualEmp(p => ({ ...p, monthlyWage: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Jenis Kelamin</label>
                <select className="form-input" value={manualEmp.gender}
                  onChange={e => setManualEmp(p => ({ ...p, gender: e.target.value }))}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <button className="btn btn-primary" onClick={addManual}
                disabled={!manualEmp.currentAge || !manualEmp.monthlyWage}>
                <Plus size={14} /> Tambah Karyawan
              </button>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODE: SUMMARY ESTIMATE                                  */}
      {/* ════════════════════════════════════════════════════════ */}
      {inputMode === 'summary' && (
        <div className="card">
          <div className="card-title">Input Data Ringkasan — Estimasi Cepat</div>

          <div className="alert alert-warn" style={{ marginBottom: 20 }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Mode Estimasi — Hanya untuk Referensi Awal</strong>
              <p style={{ marginTop: 4, lineHeight: 1.6 }}>
                Hasil perhitungan dari data rata-rata <strong>BUKAN</strong> angka aktuarial yang akurat.
                Perhitungan PUC bersifat non-linear — DBO dari karyawan rata-rata ≠ rata-rata DBO individu.
                Deviasi bisa mencapai <strong>±15–25%</strong> dari perhitungan individu.
                Gunakan input individu untuk laporan resmi.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Jumlah Karyawan</label>
              <input
                type="number" min="1" max="10000" className="form-input"
                placeholder="Misal: 150"
                value={summaryInput.totalEmployees || ''}
                onChange={e => handleSummaryField('totalEmployees', e.target.value)}
              />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Total karyawan tetap yang dihitung</span>
            </div>

            <div className="form-group">
              <label className="form-label">Total Gaji Seluruh Karyawan per Bulan (Rp)</label>
              <input
                type="number" min="0" className="form-input"
                placeholder="Misal: 509220958"
                value={summaryInput.totalWagePerMonth || ''}
                onChange={e => handleSummaryField('totalWagePerMonth', e.target.value)}
              />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                Jumlah upah sebulan seluruh karyawan. Contoh data BMD: 509.220.958
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Rata-rata Usia (tahun)</label>
              <input
                type="number" step="0.01" min="18" max="65" className="form-input"
                placeholder="Misal: 38.75"
                value={summaryInput.avgAge || ''}
                onChange={e => handleSummaryField('avgAge', e.target.value)}
              />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                Rata-rata usia karyawan. Contoh data BMD: 38,75
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Rata-rata Masa Kerja Lalu (tahun)</label>
              <input
                type="number" step="0.01" min="0" max="45" className="form-input"
                placeholder="Misal: 12.68"
                value={summaryInput.avgPastService || ''}
                onChange={e => handleSummaryField('avgPastService', e.target.value)}
              />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                Rata-rata masa kerja lalu. Contoh data BMD: 12,68
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Rasio Gender Laki-laki (%)</label>
              <input
                type="number" step="1" min="0" max="100" className="form-input"
                placeholder="50"
                value={summaryInput.genderRatioMale ?? 50}
                onChange={e => handleSummaryField('genderRatioMale', e.target.value)}
              />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                Persentase karyawan laki-laki (0–100)
              </span>
            </div>
          </div>

          {summaryError && (
            <div className="alert" style={{ background: 'var(--red-bg)', border: '1px solid rgba(224,85,85,0.2)', color: 'var(--red)', marginTop: 12 }}>
              <AlertCircle size={14} />
              <span>{summaryError}</span>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleGenerate}>
              <Zap size={14} /> Generate Data Karyawan Estimasi
            </button>
          </div>
        </div>
      )}

      {/* ── Employee List ─────────────────────────────────────── */}
      {employees.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ margin: 0 }}>
              Daftar Karyawan
              <span className="badge badge-accent" style={{ marginLeft: 8 }}>{employees.length} orang</span>
              {isAllGenerated && (
                <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent2)', fontWeight: 500 }}>
                  ESTIMASI
                </span>
              )}
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => onChange([])}>
              <Trash2 size={12} /> Hapus Semua
            </button>
          </div>

          {isAllGenerated && (
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>
              Data di bawah di-generate otomatis dari input rata-rata ({employees.length} karyawan,{' '}
              5 bucket distribusi). Anda bisa edit individual sebelum menghitung.
            </p>
          )}

          <div className="table-wrap" style={{ maxHeight: 360 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>No</th>
                  <th style={{ textAlign: 'left' }}>Nama</th>
                  <th>Usia</th>
                  <th>Masa Kerja</th>
                  <th>Gaji/Bulan</th>
                  <th>Gender</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e, i) => (
                  <tr key={i} style={e.isGenerated ? { opacity: 0.85 } : undefined}>
                    <td style={{ textAlign: 'left', color: 'var(--text3)' }}>{i + 1}</td>
                    <td style={{ textAlign: 'left' }}>{e.name || `Karyawan ${i + 1}`}</td>
                    <td>{e.currentAge}</td>
                    <td>{Number(e.pastService).toFixed(1)}</td>
                    <td>{Number(e.monthlyWage).toLocaleString('id-ID')}</td>
                    <td>{e.gender}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }}
                        onClick={() => removeEmp(i)}>
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
