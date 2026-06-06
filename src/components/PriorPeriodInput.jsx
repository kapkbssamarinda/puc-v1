import { Info } from 'lucide-react';

export default function PriorPeriodInput({ priorPeriod, onChange }) {
  const handle = (key, val) => {
    const num = parseFloat(val);
    if (!isNaN(num)) onChange({ ...priorPeriod, [key]: num });
  };

  const fields = [
    {
      key: 'openingDBO',
      label: 'DBO Awal Periode (dari laporan sebelumnya)',
      hint: 'Nilai kini kewajiban imbalan pasti awal periode (Rp).',
      isRate: false,
    },
    {
      key: 'openingDiscountRate',
      label: 'Tingkat Diskonto Periode Sebelumnya',
      hint: 'Digunakan untuk menghitung Interest Cost periode ini. Contoh: 6.77 → 6,77%.',
      isRate: true,
    },
    {
      key: 'pastServiceCost',
      label: 'Biaya Jasa Lalu',
      hint: 'Biaya jasa lalu akibat amandemen program imbalan (Rp). Isi 0 jika tidak ada.',
      isRate: false,
    },
    {
      key: 'settlementGainLoss',
      label: '(Keuntungan)/Kerugian atas Penyelesaian',
      hint: 'Positif = kerugian, negatif = keuntungan (Rp). Isi 0 jika tidak ada.',
      isRate: false,
    },
    {
      key: 'benefitsPaid',
      label: 'Imbalan Kerja yang Dibayarkan',
      hint: 'Total imbalan yang dibayarkan selama periode berjalan (Rp).',
      isRate: false,
    },
    {
      key: 'employeeMutation',
      label: 'Dampak Mutasi Pegawai',
      hint: 'Perubahan DBO akibat masuk/keluarnya karyawan selain decrement biasa (Rp).',
      isRate: false,
    },
    {
      key: 'accumulatedOCIOpening',
      label: 'Akumulasi OCI Awal Periode',
      hint: 'Saldo akumulasi kerugian/(keuntungan) aktuarial di OCI awal periode (Rp).',
      isRate: false,
    },
  ];

  return (
    <div className="card">
      <div className="card-title">Data Periode Sebelumnya</div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Data ini digunakan untuk rekonsiliasi dan perhitungan Interest Cost.
          Isi dari laporan aktuaria periode sebelumnya.
        </span>
      </div>

      <div className="form-grid">
        {fields.map(({ key, label, hint, isRate }) => (
          <div key={key} className="form-group">
            <label className="form-label">{label}</label>
            <input
              type="number"
              step={isRate ? '0.01' : '1000000'}
              min={isRate ? '0' : undefined}
              max={isRate ? '30' : undefined}
              className="form-input"
              value={isRate
                ? (priorPeriod[key] * 100).toFixed(2)
                : priorPeriod[key]
              }
              onChange={e =>
                handle(key, isRate ? e.target.value / 100 : e.target.value)
              }
            />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
