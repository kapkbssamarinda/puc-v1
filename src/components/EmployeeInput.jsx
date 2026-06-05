import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Plus, Trash2, Download, AlertCircle, CheckCircle } from 'lucide-react';

const TEMPLATE_COLS = ['id', 'name', 'currentAge', 'pastService', 'monthlyWage', 'gender'];

const EMPTY_EMP = { id: '', name: '', currentAge: '', pastService: '', monthlyWage: '', gender: 'L' };

export default function EmployeeInput({ employees, onChange }) {
  const [manualEmp, setManualEmp] = useState(EMPTY_EMP);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [drag, setDrag] = useState(false);
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
              // Handle Indonesian number format: 1.000.000 or 1,000,000
              const dots = (s.match(/\./g) || []).length;
              const commas = (s.match(/,/g) || []).length;
              if (dots > 1) return ''; // thousands separator
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
    const ws = XLSX.utils.json_to_sheet(data, {
      header: ['id', 'name', 'currentAge', 'pastService', 'monthlyWage', 'gender']
    });
    ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Data Karyawan');
    XLSX.writeFile(wb, 'Template_Data_Karyawan_PUC.xlsx');
  };

  return (
    <div>
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

      {/* Employee List */}
      {employees.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ margin: 0 }}>
              Daftar Karyawan
              <span className="badge badge-accent" style={{ marginLeft: 8 }}>{employees.length} orang</span>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => onChange([])}>
              <Trash2 size={12} /> Hapus Semua
            </button>
          </div>

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
                  <tr key={i}>
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
