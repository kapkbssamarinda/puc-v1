// Force bracket notation for a value that is stored positive but displayed as a deduction.
// rpBracket(x) for x > 0 → "Rp x", for x < 0 → "(Rp |x|)"
export function rpBracket(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  if (value < 0) return `(${fmt.rp(Math.abs(value))})`;
  return fmt.rp(value);
}

export const fmt = {
  rp: (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    const abs = Math.abs(Math.round(v));
    const str = abs.toLocaleString('id-ID');
    return (v < 0 ? '(' : '') + 'Rp ' + str + (v < 0 ? ')' : '');
  },
  rpShort: (v) => {
    if (!v && v !== 0) return '—';
    const abs = Math.abs(v);
    if (abs >= 1e9) return (v < 0 ? '-' : '') + 'Rp ' + (abs / 1e9).toFixed(2) + ' M';
    if (abs >= 1e6) return (v < 0 ? '-' : '') + 'Rp ' + (abs / 1e6).toFixed(1) + ' jt';
    return fmt.rp(v);
  },
  pct: (v) => {
    if (v === null || v === undefined) return '—';
    return (v * 100).toFixed(2) + '%';
  },
  num: (v, dec = 2) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Number(v).toFixed(dec);
  },
  plain: (v) => {
    if (!v && v !== 0) return '—';
    return Math.round(v).toLocaleString('id-ID');
  }
};
