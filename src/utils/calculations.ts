import { DayData, AppState, MonthlyStats, UserProfile, Debt } from '../types';

// რამდენი სამუშაო დღეა მოცემულ თვეში
export const getWorkDaysInMonth = (year: number, month: number, workDays: number[]): number => {
  if (!workDays || workDays.length === 0) return 22; // default
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month, d).getDay();
    if (workDays.includes(dayOfWeek)) count++;
  }
  return count || 1; // მინ 1 რომ 0-ზე არ გაიყოს
};

// არის თუ არა მოცემული თარიღი სამუშაო დღე
export const isWorkDay = (dateStr: string, workDays: number[]): boolean => {
  if (!workDays || workDays.length === 0) return true;
  const d = new Date(dateStr + 'T00:00:00');
  return workDays.includes(d.getDay());
};

// დღიური შემოსავლის გეგმა კონკრეტული დღისთვის
export const getDailyTargetForDate = (dateStr: string, profile: UserProfile): number => {
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();
  const workDays = profile.workDays || [];
  const workDay = isWorkDay(dateStr, workDays);

  if (profile.incomeType === 'freelance') {
    return profile.dailyTarget || 0;
  }

  if (profile.incomeType === 'salary') {
    if (!workDay) return 0;
    const workDaysCount = getWorkDaysInMonth(year, month, workDays);
    return Math.round(profile.salary / workDaysCount);
  }

  // 'both' - ხელფასი + დღიური დანამატი
  const dailyExtra = profile.dailyTarget || 0;
  if (!workDay) return dailyExtra; // არასამუშაო დღე - მხოლოდ დანამატი
  const workDaysCount = getWorkDaysInMonth(year, month, workDays);
  const dailySalary = Math.round(profile.salary / workDaysCount);
  return dailySalary + dailyExtra;
};

export const getDayStatus = (total: number, dailyBudget: number = 150): string => {
  const half = dailyBudget / 2;
  if (total > 0 && total < half) return 'status-critical';
  if (total >= half && total < dailyBudget) return 'status-yellow';
  if (total >= dailyBudget) return 'status-perfect';
  return 'bg-slate-800';
};

export const calculateDayTotal = (data: DayData | undefined): number => {
  if (!data) return 0;
  return (data.incMain || 0) + (data.incExtra || 0);
};

// ხარჯების ჯამი (ძველი და ახალი ფორმატების მხარდაჭერა)
export const getExpensesTotal = (data: DayData | undefined): number => {
  if (!data) return 0;

  // ახალი ფორმატი: expenses მასივი
  const newExpenses = (data.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

  // ძველი ფორმატი: gas, shop, other
  const legacyExpenses = (data.gas || 0) + (data.shop || 0) + (data.other || 0);

  return newExpenses + legacyExpenses + (data.debt_exp || 0);
};

export const calculateBalance = (data: DayData | undefined): number => {
  if (!data) return 0;
  const inc = (data.incMain || 0) + (data.incExtra || 0);
  const exp = getExpensesTotal(data) + (data.kulaba || 0);
  return inc - exp;
};

export const calculateStats = (
  state: AppState
): { totalInc: number; totalExp: number; totalKulaba: number } => {
  let totalInc = 0;
  let totalExp = 0;
  let totalKulaba = 0;

  Object.entries(state.db).forEach(([, d]) => {
    const inc = (d.incMain || 0) + (d.incExtra || 0);
    const exp = getExpensesTotal(d);
    const kulaba = d.kulaba || 0;

    totalKulaba += kulaba;
    totalInc += inc;
    totalExp += exp;
  });

  state.bills.forEach((b) => {
    if (b.paid) {
      totalExp += +b.amount || 0;
    }
  });

  state.debts.forEach((d) => {
    if (d.paid) {
      totalExp += +d.amount || 0;
    }
  });

  (state.subscriptions || []).forEach((s) => {
    if (s.paid) {
      totalExp += +s.amount || 0;
    }
  });

  return { totalInc, totalExp, totalKulaba };
};

export const calculateMonthlyStats = (state: AppState): Record<number, MonthlyStats> => {
  const months: MonthlyStats[] = Array.from({ length: 12 }, () => ({
    inc: 0,
    exp: 0,
    kulaba: 0,
    debts: 0,
    bills: 0,
    bills_paid: 0,
    bills_remaining: 0,
  }));

  Object.entries(state.db).forEach(([date, d]) => {
    const m = new Date(date).getMonth();
    const inc = (d.incMain || 0) + (d.incExtra || 0);
    const exp = getExpensesTotal(d);

    months[m].inc += inc;
    months[m].exp += exp;
    months[m].debts += d.debt_exp || 0;
    months[m].kulaba += d.kulaba || 0;
  });

  state.bills.forEach((b) => {
    const billMonth = b.reset_month !== undefined ? b.reset_month : 0;
    const billAmount = +b.amount || 0;

    months[billMonth].bills += billAmount;

    if (b.paid) {
      months[billMonth].bills_paid += billAmount;
      months[billMonth].exp += billAmount;
    } else {
      months[billMonth].bills_remaining += billAmount;
    }
  });

  return Object.fromEntries(months.map((m, i) => [i, m]));
};

// ვალის დაფარვის გეგმა
export type DebtRepaymentPlan = {
  debt: Debt;
  suggestedDaily: number;  // რამდენი უნდა გადადოს დღეში
  daysToPayoff: number;    // რამდენ დღეში დაიფარება
  remainingAmount: number; // დარჩენილი თანხა
};

export const calculateDebtRepaymentPlan = (
  debts: Debt[],
  dailyBudget: number,       // დღიური ბიუჯეტი (შემოსავალი - ბილები) / 30
  averageDailyExpenses: number // საშუალო დღიური ხარჯი
): DebtRepaymentPlan[] => {
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  // აქტიური ვალები პრიორიტეტით
  const activeDebts = debts
    .filter((d) => !d.paid)
    .sort((a, b) => {
      const pa = priorityOrder[a.priority || 'medium'];
      const pb = priorityOrder[b.priority || 'medium'];
      return pa - pb;
    });

  if (activeDebts.length === 0) return [];

  // რამდენი რჩება ვალისთვის ყოველდღე
  const availableForDebt = Math.max(0, dailyBudget - averageDailyExpenses);

  return activeDebts.map((debt) => {
    const totalParts = debt.parts || 1;
    const paidParts = debt.paidParts || 0;
    const partsRemaining = Math.round(debt.amount * ((totalParts - paidParts) / totalParts));
    // paidAmount-ის გათვალისწინება (ნაწილობრივი გადახდა)
    const remainingAmount = Math.max(0, Math.min(partsRemaining, debt.amount - (debt.paidAmount || 0)));
    const suggestedDaily = activeDebts.length > 0
      ? Math.round(availableForDebt / activeDebts.length)
      : 0;
    const daysToPayoff = suggestedDaily > 0 ? Math.ceil(remainingAmount / suggestedDaily) : 999;

    return { debt, suggestedDaily, daysToPayoff, remainingAmount };
  });
};

// საშუალო დღიური ხარჯის გამოთვლა ბოლო 30 დღის მონაცემებით
export const getAverageDailyExpenses = (db: Record<string, DayData>): number => {
  const today = new Date();
  let totalExpenses = 0;
  let daysWithData = 0;

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const data = db[key];
    if (data) {
      totalExpenses += getExpensesTotal(data);
      daysWithData++;
    }
  }

  return daysWithData > 0 ? Math.round(totalExpenses / daysWithData) : 0;
};
