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
 * Pasal 40 ayat 2 PP 35/2021
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
 * Uang penggantian hak (15% dari jumlah UP yang diterima + UPMK)
 * Pasal 40 ayat 3 PP 35/2021
 */
export function getHakPenggantianFactor() {
  return 0.15;
}

/**
 * Hitung total manfaat untuk pensiun normal.
 * Pasal 56 PP 35/2021: UP diberikan 1,75x (bukan 2x).
 * UPH dihitung dari UP yang benar-benar diterima (1,75x upBase).
 */
export function calcRetirementBenefit(monthlyWage, yearsOfService) {
  const upBase = getPesangonMultiplier(yearsOfService) * monthlyWage;
  const upmk = getPenghargaanMultiplier(yearsOfService) * monthlyWage;
  const upReceived = 1.75 * upBase;
  const uph = (upReceived + upmk) * getHakPenggantianFactor();
  return upReceived + upmk + uph;
}

/**
 * Hitung manfaat untuk meninggal dunia.
 * Pasal 57 PP 35/2021: UP diberikan 2x.
 * UPH dihitung dari UP yang benar-benar diterima (2x upBase).
 */
export function calcDeathBenefit(monthlyWage, yearsOfService) {
  const upBase = getPesangonMultiplier(yearsOfService) * monthlyWage;
  const upmk = getPenghargaanMultiplier(yearsOfService) * monthlyWage;
  const upReceived = 2 * upBase;
  const uph = (upReceived + upmk) * getHakPenggantianFactor();
  return upReceived + upmk + uph;
}

/**
 * Hitung manfaat untuk cacat tetap total.
 * Pasal 56 ayat 4 PP 35/2021: sama dengan meninggal dunia (2x UP).
 */
export function calcDisabilityBenefit(monthlyWage, yearsOfService) {
  return calcDeathBenefit(monthlyWage, yearsOfService);
}

/**
 * Hitung manfaat untuk pengunduran diri.
 * Pasal 162 UU 13/2003 jo. PP 35/2021: hanya UPMK + UPH (tanpa UP).
 * UPH = 15% × UPMK karena tidak ada UP yang diterima.
 */
export function calcResignationBenefit(monthlyWage, yearsOfService) {
  const upmk = getPenghargaanMultiplier(yearsOfService) * monthlyWage;
  const uph = upmk * getHakPenggantianFactor();
  return upmk + uph;
}

/**
 * Breakdown semua skenario manfaat untuk keperluan disclosure PSAK 219.
 * Mengembalikan rincian komponen (upBase, upReceived, upmk, uph, total)
 * per skenario pemutusan hubungan kerja.
 */
export function calcBenefitBreakdown(monthlyWage, yearsOfService) {
  const upBase = getPesangonMultiplier(yearsOfService) * monthlyWage;
  const upmk = getPenghargaanMultiplier(yearsOfService) * monthlyWage;
  const hpFactor = getHakPenggantianFactor();

  const retirement = (() => {
    const upReceived = 1.75 * upBase;
    const uph = (upReceived + upmk) * hpFactor;
    return { upBase, upReceived, upmk, uph, total: upReceived + upmk + uph };
  })();

  const death = (() => {
    const upReceived = 2 * upBase;
    const uph = (upReceived + upmk) * hpFactor;
    return { upBase, upReceived, upmk, uph, total: upReceived + upmk + uph };
  })();

  const disability = death; // Pasal 56 ayat 4 PP 35/2021: identik dengan meninggal

  const resignation = (() => {
    const uph = upmk * hpFactor;
    return { upBase: 0, upReceived: 0, upmk, uph, total: upmk + uph };
  })();

  return { retirement, death, disability, resignation };
}
