/**
 * Generator karyawan representatif dari data ringkasan.
 * Bukan pengganti input individu — hasil estimasi, bukan aktuaria akurat.
 */

/**
 * Buat distribusi 5-bucket di sekitar rata-rata untuk meredam bias
 * single-point estimate (PUC bersifat non-linear terhadap usia).
 */
export function generateEmployeesFromSummary({
  totalEmployees,
  totalWagePerMonth,
  avgAge,
  avgPastService,
  genderRatioMale = 50,
}) {
  if (totalEmployees <= 0 || totalWagePerMonth <= 0) return [];

  const avgWage = totalWagePerMonth / totalEmployees;

  // Distribusi ±σ di sekitar rata-rata: σ ≈ 8 th usia, 5 th masa kerja
  const buckets = [
    { ageDelta: -8, serviceDelta: -5, wageFactor: 0.70, weight: 0.10 },
    { ageDelta: -4, serviceDelta: -2, wageFactor: 0.85, weight: 0.25 },
    { ageDelta:  0, serviceDelta:  0, wageFactor: 1.00, weight: 0.30 },
    { ageDelta: +4, serviceDelta: +2, wageFactor: 1.15, weight: 0.25 },
    { ageDelta: +8, serviceDelta: +5, wageFactor: 1.30, weight: 0.10 },
  ];

  const employees = [];
  let idCounter = 1;

  for (const bucket of buckets) {
    const bucketCount = Math.max(1, Math.round(totalEmployees * bucket.weight));
    const bucketAge = Math.max(18, Math.min(65, Math.round(avgAge + bucket.ageDelta)));
    const rawService = Math.round((avgPastService + bucket.serviceDelta) * 100) / 100;
    const bucketWage = Math.round(avgWage * bucket.wageFactor);
    // Masa kerja tidak boleh melebihi (usia - 18)
    const bucketService = Math.max(0, Math.min(rawService, bucketAge - 18));

    for (let i = 0; i < bucketCount && employees.length < totalEmployees; i++) {
      const isMale = (employees.length / totalEmployees * 100) < genderRatioMale;
      employees.push({
        id: String(idCounter),
        name: `Karyawan ${idCounter}`,
        currentAge: bucketAge,
        pastService: bucketService,
        monthlyWage: bucketWage,
        gender: isMale ? 'L' : 'P',
        isGenerated: true,
      });
      idCounter++;
    }
  }

  // Isi sisa jika ada selisih rounding
  while (employees.length < totalEmployees) {
    const isMale = (employees.length / totalEmployees * 100) < genderRatioMale;
    employees.push({
      id: String(idCounter),
      name: `Karyawan ${idCounter}`,
      currentAge: Math.round(avgAge),
      pastService: Math.max(0, Math.min(avgPastService, Math.round(avgAge) - 18)),
      monthlyWage: Math.round(avgWage),
      gender: isMale ? 'L' : 'P',
      isGenerated: true,
    });
    idCounter++;
  }

  // Normalisasi total gaji agar tepat sesuai input
  const currentTotal = employees.reduce((s, e) => s + e.monthlyWage, 0);
  if (currentTotal > 0) {
    const factor = totalWagePerMonth / currentTotal;
    employees.forEach(e => { e.monthlyWage = Math.round(e.monthlyWage * factor); });
  }

  return employees;
}
