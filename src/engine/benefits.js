/**
 * Skala manfaat berdasarkan UU No. 6 Tahun 2023 (Cipta Kerja)
 * dan Peraturan Pemerintah No. 35 Tahun 2021
 */

/**
 * Multiplier pesangon (UP) berdasarkan masa kerja
 * Pasal 40 PP 35/2021
 */
export function getPesangonMultiplier(yearsOfService) {
  const n = Math.floor(yearsOfService);
  if (n < 1) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 4;
  if (n === 5) return 5;
  if (n === 6) return 6;
  if (n === 7) return 7;
  if (n >= 8) return 9; // maks 9 bulan
  return 9;
}

/**
 * Multiplier penghargaan masa kerja (UPMK) berdasarkan masa kerja
 */
export function getPenghargaanMultiplier(yearsOfService) {
  const n = Math.floor(yearsOfService);
  if (n < 3) return 0;
  if (n < 6) return 2;
  if (n < 9) return 3;
  if (n < 12) return 4;
  if (n < 15) return 5;
  if (n < 18) return 6;
  if (n < 21) return 7;
  if (n < 24) return 8;
  return 10; // maks 10 bulan
}

/**
 * Uang penggantian hak (15% dari UP + UPMK)
 * Pasal 40 ayat 3 PP 35/2021
 */
export function getHakPenggantianFactor() {
  return 0.15;
}

/**
 * Hitung total manfaat untuk pensiun normal
 * UP diperhitungkan 2x untuk pensiun normal
 */
export function calcRetirementBenefit(monthlyWage, yearsOfService) {
  const up = getPesangonMultiplier(yearsOfService) * monthlyWage;
  const upmk = getPenghargaanMultiplier(yearsOfService) * monthlyWage;
  const uph = (up + upmk) * getHakPenggantianFactor();
  // Pensiun normal: 2x UP + UPMK + UPH
  return 2 * up + upmk + uph;
}

/**
 * Hitung manfaat untuk meninggal dunia
 * UP 2x + UPMK + UPH (sama dengan pensiun normal)
 */
export function calcDeathBenefit(monthlyWage, yearsOfService) {
  return calcRetirementBenefit(monthlyWage, yearsOfService);
}

/**
 * Hitung manfaat untuk cacat tetap total
 * UP 2x + UPMK + UPH
 */
export function calcDisabilityBenefit(monthlyWage, yearsOfService) {
  return calcRetirementBenefit(monthlyWage, yearsOfService);
}

/**
 * Hitung manfaat untuk pengunduran diri
 * Hanya UPMK + UPH (tanpa UP)
 */
export function calcResignationBenefit(monthlyWage, yearsOfService) {
  const upmk = getPenghargaanMultiplier(yearsOfService) * monthlyWage;
  const uph = upmk * getHakPenggantianFactor();
  return upmk + uph;
}
