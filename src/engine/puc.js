/**
 * Projected Unit Credit (PUC) Engine
 * Sesuai PSAK 219 - Imbalan Kerja
 */

import { getMortalityRate, getWithdrawalRate, getDisabilityRate } from './tmi2019.js';
import {
  calcRetirementBenefit,
  calcDeathBenefit,
  calcDisabilityBenefit,
  calcResignationBenefit,
} from './benefits.js';

/**
 * Proyeksikan gaji ke masa depan
 */
function projectSalary(currentSalary, yearsAhead, salaryIncreaseYear1, salaryIncreaseLongTerm) {
  if (yearsAhead <= 0) return currentSalary;
  if (yearsAhead <= 1) return currentSalary * (1 + salaryIncreaseYear1);
  return currentSalary * (1 + salaryIncreaseYear1) * Math.pow(1 + salaryIncreaseLongTerm, yearsAhead - 1);
}

/**
 * Hitung faktor dekremen aktif (probabilitas karyawan masih aktif)
 * Mempertimbangkan: mortalita + cacat + pengunduran diri
 */
function buildDecrementTable(currentAge, retirementAge, disabilityFactor = 0.1, withdrawalRates = null) {
  const table = [];
  let lx = 1.0; // probability of being active at start

  for (let age = currentAge; age < retirementAge; age++) {
    const qm = getMortalityRate(age);                        // mortalita
    const qd = getDisabilityRate(age, disabilityFactor);     // cacat
    const qw = getWithdrawalRate(age, withdrawalRates);      // pengunduran diri

    // Total decrement (approximate - independent decrements)
    const totalDecrement = qm + qd + qw;
    const survival = Math.max(0, 1 - totalDecrement);

    table.push({
      age,
      lx,           // active at start of year
      qm,           // mortality rate
      qd,           // disability rate
      qw,           // withdrawal rate
      lx_next: lx * survival,
    });

    lx = lx * survival;
  }

  // Entry at retirement age
  table.push({
    age: retirementAge,
    lx,
    qm: 0, qd: 0, qw: 0,
    lx_next: lx,
  });

  return table;
}

/**
 * Hitung PUC untuk satu karyawan
 * Returns semua komponen yang dibutuhkan untuk laporan keuangan
 */
export function calcEmployeePUC(employee, assumptions) {
  const {
    discountRate,
    salaryIncreaseYear1,
    salaryIncreaseLongTerm,
    retirementAge,
    disabilityFactor,
    withdrawalRates = null,
  } = assumptions;

  const {
    id, name,
    currentAge,
    pastService,     // masa kerja lalu (tahun)
    monthlyWage,
    gender,
  } = employee;

  // Validasi
  if (currentAge >= retirementAge) {
    // Sudah melewati usia pensiun — tidak ada kewajiban masa depan
    return createZeroResult(employee);
  }

  const yearsToRetirement = retirementAge - currentAge;
  const totalService = pastService + yearsToRetirement; // masa kerja total saat pensiun

  // Proyeksi gaji saat pensiun
  const projectedSalaryAtRetirement = projectSalary(monthlyWage, yearsToRetirement, salaryIncreaseYear1, salaryIncreaseLongTerm);

  // Bangun tabel dekremen
  const decrementTable = buildDecrementTable(currentAge, retirementAge, disabilityFactor, withdrawalRates);

  // Hitung expected benefit pada berbagai skenario
  // Projected benefit obligation based on total service at retirement
  const projectedRetirementBenefit = calcRetirementBenefit(projectedSalaryAtRetirement, totalService);

  // Unit kredit per tahun masa kerja
  const unitCredit = totalService > 0 ? projectedRetirementBenefit / totalService : 0;

  // Present Value of Defined Benefit Obligation (PVDBO)
  // = PV of (unit credit × past service) weighted by survival probability
  const accumulatedUnits = pastService; // unit yang telah diakumulasi

  // PV of accumulated benefit obligation (untuk karyawan yang survive ke pensiun)
  const probSurviveToRetirement = decrementTable[decrementTable.length - 1].lx;
  const pvRetirementDBO = (unitCredit * accumulatedUnits) *
    probSurviveToRetirement *
    Math.pow(1 + discountRate, -yearsToRetirement);

  // PV of DBO for decrements before retirement (death, disability, resignation)
  // Hanya porsi yang sudah terakumulasi (accrued) sesuai PSAK 219 PUC method.
  let pvPreRetirementDBO = 0;

  for (const row of decrementTable) {
    if (row.age >= retirementAge) break;
    const yearsFromNow = row.age - currentAge;
    const serviceAtDecrement = pastService + yearsFromNow;
    const salaryAtDecrement = projectSalary(monthlyWage, yearsFromNow, salaryIncreaseYear1, salaryIncreaseLongTerm);
    const discountFactor = Math.pow(1 + discountRate, -(yearsFromNow + 0.5)); // mid-year

    // Porsi benefit yang sudah terakumulasi pada tanggal valuasi.
    // min(pastService, serviceAtDecrement) = pastService karena serviceAtDecrement >= pastService.
    const accrualFraction = totalService > 0
      ? Math.min(pastService, serviceAtDecrement) / totalService
      : 0;

    // Death benefit — Pasal 57 PP 35/2021
    const deathBenefit = calcDeathBenefit(salaryAtDecrement, serviceAtDecrement);
    pvPreRetirementDBO += row.lx * row.qm * deathBenefit * accrualFraction * discountFactor;

    // Disability benefit — Pasal 56 ayat 4 PP 35/2021
    const disabilityBenefit = calcDisabilityBenefit(salaryAtDecrement, serviceAtDecrement);
    pvPreRetirementDBO += row.lx * row.qd * disabilityBenefit * accrualFraction * discountFactor;

    // Resignation benefit — hanya UPMK + UPH, tidak ada UP
    const resignBenefit = calcResignationBenefit(salaryAtDecrement, serviceAtDecrement);
    pvPreRetirementDBO += row.lx * row.qw * resignBenefit * accrualFraction * discountFactor;
  }

  // Total DBO (nilai kini kewajiban imbalan pasti) — hanya porsi accrued
  const dbo = pvRetirementDBO + pvPreRetirementDBO;

  // Expected cashflows per tahun (undiscounted) — untuk analisis jatuh tempo PSAK 219
  const expectedCashflows = [];
  for (const row of decrementTable) {
    if (row.age >= retirementAge) break;
    const yearsFromNow = row.age - currentAge;
    const serviceAtDecrement = pastService + yearsFromNow;
    const salaryAtDecrement = projectSalary(monthlyWage, yearsFromNow, salaryIncreaseYear1, salaryIncreaseLongTerm);

    const amount =
      row.lx * row.qm * calcDeathBenefit(salaryAtDecrement, serviceAtDecrement) +
      row.lx * row.qd * calcDisabilityBenefit(salaryAtDecrement, serviceAtDecrement) +
      row.lx * row.qw * calcResignationBenefit(salaryAtDecrement, serviceAtDecrement);

    expectedCashflows.push({ year: yearsFromNow, amount });
  }
  // Cashflow pensiun di akhir periode
  expectedCashflows.push({
    year: yearsToRetirement,
    amount: probSurviveToRetirement * projectedRetirementBenefit,
  });

  // Current Service Cost (CSC) = PV of one additional unit credit
  // = benefit earned this year, discounted back
  const csc_retirement = unitCredit *
    probSurviveToRetirement *
    Math.pow(1 + discountRate, -yearsToRetirement);

  // CSC from pre-retirement decrements (incremental unit this year)
  let csc_preRetirement = 0;
  for (const row of decrementTable) {
    if (row.age >= retirementAge) break;
    const yearsFromNow = row.age - currentAge;
    const salaryAtDecrement = projectSalary(monthlyWage, yearsFromNow, salaryIncreaseYear1, salaryIncreaseLongTerm);
    const discountFactor = Math.pow(1 + discountRate, -(yearsFromNow + 0.5));
    const serviceAtDecrement = pastService + yearsFromNow;

    // Incremental unit for death/disability
    const incrementalUnit = totalService > 0 ? 1 / totalService : 0;
    const incrementalDeath = calcDeathBenefit(salaryAtDecrement, serviceAtDecrement) * incrementalUnit;
    const incrementalDisability = calcDisabilityBenefit(salaryAtDecrement, serviceAtDecrement) * incrementalUnit;
    const incrementalResign = calcResignationBenefit(salaryAtDecrement, serviceAtDecrement) * incrementalUnit;

    csc_preRetirement += row.lx * (
      row.qm * incrementalDeath +
      row.qd * incrementalDisability +
      row.qw * incrementalResign
    ) * discountFactor;
  }

  const csc = csc_retirement + csc_preRetirement;

  // Interest Cost = DBO awal × discount rate
  // (diasumsikan DBO awal = DBO sekarang untuk estimasi awal)
  const interestCost = dbo * discountRate;

  return {
    id,
    name,
    currentAge,
    pastService,
    monthlyWage,
    yearsToRetirement,
    totalServiceAtRetirement: totalService,
    projectedSalaryAtRetirement,
    projectedRetirementBenefit,
    unitCredit,
    probSurviveToRetirement,
    dbo,
    csc,
    interestCost,
    decrementTable,
    expectedCashflows,
  };
}

/**
 * Analisis jatuh tempo pembayaran imbalan sesuai PSAK 219.
 * Mengelompokkan expected cashflows (undiscounted) ke 5 tenor bucket.
 */
export function calcMaturityAnalysis(employeeResults) {
  const buckets = [
    { label: '< 1 tahun',        min: 0,  max: 1,        amount: 0 },
    { label: '1 ≤ x < 2 tahun',  min: 1,  max: 2,        amount: 0 },
    { label: '2 ≤ x < 5 tahun',  min: 2,  max: 5,        amount: 0 },
    { label: '5 ≤ x < 10 tahun', min: 5,  max: 10,       amount: 0 },
    { label: 'x ≥ 10 tahun',     min: 10, max: Infinity,  amount: 0 },
  ];

  for (const result of employeeResults) {
    for (const cf of (result.expectedCashflows ?? [])) {
      const bucket = buckets.find(b => cf.year >= b.min && cf.year < b.max);
      if (bucket) bucket.amount += cf.amount;
    }
  }

  return buckets.map(({ label, amount }) => ({ label, amount }));
}

/**
 * Macaulay Duration dari expected cashflows per PSAK 219 Par. 147.
 */
function calcMacaulayDuration(employeeResults, discountRate) {
  let sumPV_t = 0;
  let sumPV = 0;

  for (const result of employeeResults) {
    for (const cf of (result.expectedCashflows ?? [])) {
      if (cf.amount <= 0) continue;
      const t = cf.year + 0.5; // mid-year convention
      const pv = cf.amount * Math.pow(1 + discountRate, -t);
      sumPV_t += t * pv;
      sumPV += pv;
    }
  }

  return sumPV > 0 ? sumPV_t / sumPV : 0;
}

/**
 * Hitung agregat seluruh karyawan
 */
export function calcPortfolioPUC(employees, assumptions, priorPeriod = {}) {
  const results = employees.map(emp => calcEmployeePUC(emp, assumptions));

  const totalDBO = results.reduce((s, r) => s + r.dbo, 0);
  const totalCSC = results.reduce((s, r) => s + r.csc, 0);
  const totalWage = employees.reduce((s, e) => s + e.monthlyWage, 0);

  // Interest Cost = Opening DBO × opening discount rate (PSAK 219)
  const openingDBO = priorPeriod.openingDBO || 0;
  const openingRate = priorPeriod.openingDiscountRate || assumptions.discountRate;
  const portfolioInterestCost = openingDBO * openingRate;

  const weightedDuration = calcMacaulayDuration(results, assumptions.discountRate);

  return {
    employees: results,
    summary: {
      totalEmployees: employees.length,
      totalWagePerMonth: totalWage,
      totalDBO,
      totalCSC,
      totalInterestCost: portfolioInterestCost,
      estimatedNextInterestCost: totalDBO * assumptions.discountRate,
      weightedAverageDuration: weightedDuration,
      avgAge: employees.length > 0
        ? employees.reduce((s, e) => s + e.currentAge, 0) / employees.length
        : 0,
      avgPastService: employees.length > 0
        ? employees.reduce((s, e) => s + e.pastService, 0) / employees.length
        : 0,
      maturity: calcMaturityAnalysis(results),
    },
  };
}

/**
 * Sensitivity analysis — variasikan satu asumsi, hitung ulang DBO dan CSC
 */
export function calcSensitivity(employees, baseAssumptions, variations) {
  return variations.map(({ label, assumptions: overrides }) => {
    const assumptions = { ...baseAssumptions, ...overrides };
    const portfolio = calcPortfolioPUC(employees, assumptions);
    return {
      label,
      dbo: portfolio.summary.totalDBO,
      csc: portfolio.summary.totalCSC,
    };
  });
}

/**
 * Rekonsiliasi DBO dari awal ke akhir periode — PSAK 219 Par. 140-141.
 * actuarialGainLoss adalah selisih antara closingDBO aktual dan yang diharapkan;
 * nilai positif = kerugian aktuarial (menambah kewajiban).
 */
export function calcReconciliation({
  openingDBO = 0,
  currentCSC = 0,
  interestCost = 0,
  pastServiceCost = 0,
  settlementGainLoss = 0,
  benefitsPaid = 0,
  employeeMutation = 0,
  closingDBO = 0,
} = {}) {
  const expectedClosing =
    openingDBO + currentCSC + interestCost + pastServiceCost +
    settlementGainLoss - benefitsPaid + employeeMutation;
  const actuarialGainLoss = closingDBO - expectedClosing;
  return {
    openingDBO,
    currentCSC,
    interestCost,
    pastServiceCost,
    settlementGainLoss,
    benefitsPaid,
    employeeMutation,
    expectedClosing,
    actuarialGainLoss,
    closingDBO,
  };
}

/**
 * Penghasilan Komprehensif Lain (OCI) — PSAK 219 Par. 57(d) & 122.
 * Keuntungan/kerugian aktuarial TIDAK direklasifikasi ke laba rugi.
 */
export function calcOCI({
  actuarialGainLossOnDBO = 0,
  actuarialGainLossOnPlanAssets = 0,
  assetCeilingChange = 0,
  accumulatedOCIOpening = 0,
} = {}) {
  const totalOCI =
    actuarialGainLossOnDBO + actuarialGainLossOnPlanAssets + assetCeilingChange;
  const accumulatedOCIClosing = accumulatedOCIOpening + totalOCI;
  return {
    actuarialGainLossOnDBO,
    actuarialGainLossOnPlanAssets,
    assetCeilingChange,
    totalOCI,
    accumulatedOCIOpening,
    accumulatedOCIClosing,
  };
}

/**
 * Beban yang diakui di Laba Rugi — PSAK 219 Par. 57(c).
 * Termasuk biaya jasa, biaya bunga, dan ekses pembayaran imbalan.
 */
export function calcIncomeStatement({
  currentServiceCost = 0,
  pastServiceCost = 0,
  settlementGainLoss = 0,
  interestOnDBO = 0,
  interestOnPlanAssets = 0,
  interestOnAssetCeiling = 0,
  excessPayments = 0,
} = {}) {
  const totalServiceCost = currentServiceCost + pastServiceCost + settlementGainLoss;
  const totalInterestCost = interestOnDBO + interestOnPlanAssets + interestOnAssetCeiling;
  const totalExpense = totalServiceCost + totalInterestCost;
  const totalExpenseAfterExcess = totalExpense + excessPayments;
  return {
    currentServiceCost,
    pastServiceCost,
    settlementGainLoss,
    totalServiceCost,
    interestOnDBO,
    interestOnPlanAssets,
    interestOnAssetCeiling,
    totalInterestCost,
    totalExpense,
    excessPayments,
    totalExpenseAfterExcess,
  };
}

/**
 * Rekonsiliasi (Aset)/Kewajiban Imbalan Pasti di Neraca — PSAK 219.
 * Menunjukkan pergerakan nilai bersih kewajiban dari awal ke akhir periode.
 */
export function calcBalanceSheetReconciliation({
  openingNetLiability = 0,
  expenseRecognized = 0,
  totalOCI = 0,
  companyContribution = 0,
  benefitsPaid = 0,
  employeeMutation = 0,
} = {}) {
  const closingNetLiability =
    openingNetLiability + expenseRecognized + totalOCI -
    companyContribution - benefitsPaid + employeeMutation;
  return {
    openingNetLiability,
    expenseRecognized,
    totalOCI,
    companyContribution,
    benefitsPaid,
    employeeMutation,
    closingNetLiability,
  };
}

/**
 * Breakdown pengukuran kembali (remeasurement) — PSAK 219 Par. 141.
 * Breakdown akurat memerlukan re-kalkulasi DBO dengan asumsi lama;
 * fungsi ini menyediakan struktur yang dapat diisi manual jika tersedia.
 */
export function calcRemeasurementBreakdown({
  actuarialGainLoss = 0,
  openingDBO = 0,
  closingDBO = 0,
  expectedClosing = 0,
  dboWithOldAssumptions = null,
} = {}) {
  // If dboWithOldAssumptions provided, split experience vs assumption change
  const assumptionChange = dboWithOldAssumptions !== null
    ? closingDBO - dboWithOldAssumptions
    : null;
  const experienceAdjustment = assumptionChange !== null
    ? actuarialGainLoss - assumptionChange
    : actuarialGainLoss;

  return {
    total: actuarialGainLoss,
    experienceAdjustment,
    financialAssumptionChange: assumptionChange ?? 0,
    demographicAssumptionChange: 0,
    hasDetail: dboWithOldAssumptions !== null,
  };
}

function createZeroResult(employee) {
  return {
    id: employee.id,
    name: employee.name,
    currentAge: employee.currentAge,
    pastService: employee.pastService,
    monthlyWage: employee.monthlyWage,
    yearsToRetirement: 0,
    totalServiceAtRetirement: employee.pastService,
    projectedSalaryAtRetirement: employee.monthlyWage,
    projectedRetirementBenefit: 0,
    unitCredit: 0,
    probSurviveToRetirement: 0,
    dbo: 0,
    csc: 0,
    interestCost: 0,
    decrementTable: [],
    expectedCashflows: [],
  };
}
