import { Info } from 'lucide-react';

export default function AssumptionsPanel({ assumptions, onChange }) {
  const handle = (key, val) => {
    const num = parseFloat(val);
    if (!isNaN(num)) onChange({ ...assumptions, [key]: num });
  };

  const handleWithdrawalRate = (index, val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const updated = assumptions.withdrawalRates.map((r, i) =>
      i === index ? { ...r, rate: num / 100 } : r
    );
    onChange({ ...assumptions, withdrawalRates: updated });
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
          <label className="form-label">Kenaikan Upah Tahun Pertama (% per tahun)</label>
          <input
            type="number" step="0.01" min="0" max="30"
            className="form-input"
            value={(assumptions.salaryIncreaseYear1 * 100).toFixed(2)}
            onChange={e => handle('salaryIncreaseYear1', e.target.value / 100)}
          />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            Tahun pertama bisa berbeda dari jangka panjang. PDF laporan BMD: 4% tahun 1, 6% tahun 2+.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Kenaikan Upah Jangka Panjang (% per tahun)</label>
          <input
            type="number" step="0.01" min="0" max="30"
            className="form-input"
            value={(assumptions.salaryIncreaseLongTerm * 100).toFixed(2)}
            onChange={e => handle('salaryIncreaseLongTerm', e.target.value / 100)}
          />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            Rate untuk tahun ke-2 dan seterusnya hingga pensiun.
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
        {(assumptions.withdrawalRates || []).map((item, index) => (
          <div key={index} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
              Usia {item.min}–{item.max === 99 ? '>' + (item.min - 1) : item.max}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number" step="0.01" min="0" max="20"
                style={{
                  width: 64, textAlign: 'right', padding: '3px 6px',
                  background: 'var(--bg2)', border: '1px solid var(--border2)',
                  borderRadius: 4, color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)', fontSize: 13,
                }}
                value={(item.rate * 100).toFixed(2)}
                onChange={e => handleWithdrawalRate(index, e.target.value)}
              />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>%</span>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
        Tingkat pengunduran diri dapat disesuaikan per kelompok usia. Tabel mortalita: TMI IV 2019, hard-coded.
      </p>
    </div>
  );
}
