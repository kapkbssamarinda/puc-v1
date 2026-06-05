import { Info } from 'lucide-react';

export default function AssumptionsPanel({ assumptions, onChange }) {
  const handle = (key, val) => {
    const num = parseFloat(val);
    if (!isNaN(num)) onChange({ ...assumptions, [key]: num });
  };

  return (
    <div className="card">
      <div className="card-title">Asumsi Aktuaria</div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Asumsi ini mengacu pada laporan aktuaria sesuai PSAK 219. Ubah sesuai data perusahaan klien.</span>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Tingkat Diskonto (% per tahun)</label>
          <input
            type="number" step="0.01" min="0" max="20"
            className="form-input"
            value={(assumptions.discountRate * 100).toFixed(2)}
            onChange={e => handle('discountRate', e.target.value / 100)}
          />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            Contoh: 6.77 → 6,77%. Gunakan IGSYC Zero Coupon sesuai durasi kewajiban.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Tingkat Kenaikan Upah (% per tahun)</label>
          <input
            type="number" step="0.01" min="0" max="30"
            className="form-input"
            value={(assumptions.salaryIncreaseRate * 100).toFixed(2)}
            onChange={e => handle('salaryIncreaseRate', e.target.value / 100)}
          />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            Jangka panjang. Laporan BMD: 4,00%.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Usia Pensiun Normal (tahun)</label>
          <input
            type="number" step="1" min="45" max="70"
            className="form-input"
            value={assumptions.retirementAge}
            onChange={e => handle('retirementAge', e.target.value)}
          />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            PP 35/2021: umumnya 56–58 tahun.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Faktor Cacat (× mortalita TMI)</label>
          <input
            type="number" step="0.01" min="0" max="1"
            className="form-input"
            value={assumptions.disabilityFactor.toFixed(2)}
            onChange={e => handle('disabilityFactor', e.target.value)}
          />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            Standar: 0.10 (10% dari TMI IV 2019).
          </span>
        </div>
      </div>

      <div className="section-sep">
        <h3>Tingkat Pengunduran Diri (Per Tahun)</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Usia 15–29', key: 'w1529', value: '6,00%' },
          { label: 'Usia 30–34', key: 'w3034', value: '3,00%' },
          { label: 'Usia 35–39', key: 'w3539', value: '1,80%' },
          { label: 'Usia 40–53', key: 'w4053', value: '1,20%' },
          { label: 'Usia 54–55', key: 'w5455', value: '0,60%' },
          { label: 'Usia > 56', key: 'w56', value: '0,00%' },
        ].map(item => (
          <div key={item.key} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{item.label}</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{item.value}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
        Tingkat pengunduran diri mengacu TMI IV 2019 (fixed per laporan aktuaria). Tabel mortalita: TMI IV 2019, hard-coded.
      </p>
    </div>
  );
}
