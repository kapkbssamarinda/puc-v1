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
function projectSalary(currentSalary, yearsAhead, salaryIncreaseRate) {
  return currentSalary * Math.pow(1 + salaryIncreaseRate, yearsAhead);
}

/**
 * Hitung faktor dekremen aktif (probabilitas karyawan masih aktif)
 * Mempertimbangkan: mortalita + cacat + pengunduran diri
 */
function buildDecrementTable(currentAge, retirementAge, disabilityFactor = 0.1) {
  const table = [];
  let lx = 1.0; // probability of being active at start

  for (let age = currentAge; age < retirementAge; age++) {
    const qm = getMortalityRate(age);      // mortalita
    const qd = getDisabilityRate(age, disabilityFactor); // cacat
    const qw = getWithdrawalRate(age);     // pengunduran diri

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
    salaryIncreaseRate,
    retirementAge,
    disabilityFactor,
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
  const projectedSalaryAtRetirement = projectSalary(monthlyWage, yearsToRetirement, salaryIncreaseRate);

  // Bangun tabel dekremen
  const decrementTable = buildDecrementTable(currentAge, retirementAge, disabilityFactor);

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
  const pvRetirementBenefit = (unitCredit * accumulatedUnits) *
    probSurviveToRetirement *
    Math.pow(1 + discountRate, -yearsToRetirement);

  // PV of benefits payable due to decrements before retirement (death, disability, resignation)
  let pvPreRetirementBenefits = 0;
  let pvPreRetirementDBO = 0; // accumulated portion only

  for (const row of decrementTable) {
    if (row.age >= retirementAge) break;
    const yearsFromNow = row.age - currentAge;
    const serviceAtDecrement = pastService + yearsFromNow;
    const salaryAtDecrement = projectSalary(monthlyWage, yearsFromNow, salaryIncreaseRate);
    const discountFactor = Math.pow(1 + discountRate, -(yearsFromNow + 0.5)); // mid-year

    // Death benefit
    const deathBenefit = calcDeathBenefit(salaryAtDecrement, serviceAtDecrement);
    pvPreRetirementBenefits += row.lx * row.qm * deathBenefit * discountFactor;

    // Disability benefit
    const disabilityBenefit = calcDisabilityBenefit(salaryAtDecrement, serviceAtDecrement);
    pvPreRetirementBenefits += row.lx * row.qd * disabilityBenefit * discountFactor;

    // Resignation benefit
    const resignBenefit = calcResignationBenefit(salaryAtDecrement, serviceAtDecrement);
    pvPreRetirementBenefits += row.lx * row.qw * resignBenefit * discountFactor;

    // DBO portion (accumulated unit only) for pre-retirement decrements
    const accUnitAtDecrement = totalService > 0
      ? (unitCredit * Math.min(serviceAtDecrement, pastService))
      : 0;
    pvPreRetirementDBO += row.lx * (row.qm + row.qd) *
      accUnitAtDecrement * discountFactor;
    pvPreRetirementDBO += row.lx * row.qw *
      (calcResignationBenefit(salaryAtDecrement, serviceAtDecrement) / Math.max(serviceAtDecrement, 1) * Math.min(serviceAtDecrement, pastService)) *
      discountFactor;
  }

  // Total DBO (nilai kini kewajiban imbalan pasti)
  const dbo = pvRetirementBenefit + pvPreRetirementBenefits;

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
    const salaryAtDecrement = projectSalary(monthlyWage, yearsFromNow, salaryIncreaseRate);
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
  };
}

/**
 * Hitung agregat seluruh karyawan
 */
export function calcPortfolioPUC(employees, assumptions) {
  const results = employees.map(emp => calcEmployeePUC(emp, assumptions));

  const totalDBO = results.reduce((s, r) => s + r.dbo, 0);
  const totalCSC = results.reduce((s, r) => s + r.csc, 0);
  const totalInterest = results.reduce((s, r) => s + r.interestCost, 0);
  const totalWage = employees.reduce((s, e) => s + e.monthlyWage, 0);

  // Weighted average duration (simplified Macaulay)
  const weightedDuration = results.length > 0
    ? results.reduce((s, r) => s + r.yearsToRetirement * r.dbo, 0) / Math.max(totalDBO, 1)
    : 0;

  return {
    employees: results,
    summary: {
      totalEmployees: employees.length,
      totalWagePerMonth: totalWage,
      totalDBO,
      totalCSC,
      totalInterestCost: totalInterest,
      weightedAverageDuration: weightedDuration,
      avgAge: employees.length > 0
        ? employees.reduce((s, e) => s + e.currentAge, 0) / employees.length
        : 0,
      avgPastService: employees.length > 0
        ? employees.reduce((s, e) => s + e.pastService, 0) / employees.length
        : 0,
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
 * Hitung rekonsiliasi DBO (pergerakan dari awal ke akhir periode)
 * Requires: DBO awal, pembayaran aktual, asumsi
 */
export function calcReconciliation(
  openingDBO,
  currentCSC,
  currentInterest,
  benefitsPaid,
  closingDBO
) {
  const expectedClosing = openingDBO + currentCSC + currentInterest - benefitsPaid;
  const actuarialGainLoss = closingDBO - expectedClosing;
  return {
    openingDBO,
    currentCSC,
    currentInterest,
    benefitsPaid,
    expectedClosing,
    actuarialGainLoss,
    closingDBO,
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
  };
}
