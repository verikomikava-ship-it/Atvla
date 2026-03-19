import { Bill, Debt, Subscription } from '../types';

export type PaymentWarning = {
  id: number;
  name: string;
  amount: number;
  daysUntilDue: number;
  urgency: 'critical' | 'warning' | 'safe';
  color: string;
  type: 'bill' | 'debt' | 'subscription';
};

export type BillWarning = PaymentWarning;

export const getDaysUntilDue = (dueDate: string): number => {
  if (!dueDate) return Infinity;
  
  // დღეს ლოკალურ დროში (0:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // ტარიფი დღე ლოკალურ დროში (ის ტაიმზონის პრობლემის გარეშე)
  const [year, month, day] = dueDate.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);
  
  // დღეების რაოდენობის გამოთვლა
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const getUrgency = (daysUntilDue: number): 'critical' | 'warning' | 'safe' => {
  if (daysUntilDue <= 3 && daysUntilDue >= 0) return 'critical';
  if (daysUntilDue < 0) return 'critical'; // დაკვიცივდა
  if (daysUntilDue <= 7) return 'warning';
  return 'safe';
};

export const getUrgencyColor = (daysUntilDue: number, paid: boolean): string => {
  if (paid) return '#475569'; // რუხი - გადახდილი
  
  if (daysUntilDue < 0) return '#dc2626'; // მუქი წითალი - დაკვიცივდა
  if (daysUntilDue === 0) return '#ef4444'; // წითალი - დღეს დღე
  if (daysUntilDue <= 3) return '#f87171'; // ღია წითალი - კრიტიკული
  if (daysUntilDue <= 7) return '#fbbf24'; // ყვითალი - ზეგავლენა
  
  return '#10b981'; // მწვანე - უსაფრთხო
};

export const getUpcomingBillWarnings = (bills: Bill[]): PaymentWarning[] => {
  const currentMonth = new Date().getMonth(); // 0-11

  return bills
    .filter((b) => !b.paid && b.dueDate && (b.reset_month === undefined || b.reset_month === currentMonth))
    .map((b) => {
      // თუ reset_month აქვს, dueDate-ის თვე გავასწოროთ მიმდინარე თვეზე
      let effectiveDueDate = b.dueDate!;
      if (b.reset_month !== undefined) {
        const [, , day] = effectiveDueDate.split('-').map(Number);
        const currentYear = new Date().getFullYear();
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const actualDay = Math.min(day, lastDayOfMonth);
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(actualDay).padStart(2, '0');
        effectiveDueDate = `${currentYear}-${monthStr}-${dayStr}`;
      }
      const daysUntilDue = getDaysUntilDue(effectiveDueDate);
      return {
        id: b.id,
        name: b.name,
        amount: b.amount,
        daysUntilDue,
        urgency: getUrgency(daysUntilDue),
        color: getUrgencyColor(daysUntilDue, false),
        type: 'bill' as const,
      };
    })
    .filter((w) => w.urgency !== 'safe')
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
};

export const getUpcomingDebtWarnings = (debts: Debt[]): PaymentWarning[] => {
  return debts
    .filter((d) => !d.paid && d.dueDate)
    .map((d) => {
      const daysUntilDue = getDaysUntilDue(d.dueDate!);
      return {
        id: d.id,
        name: d.name,
        amount: d.amount,
        daysUntilDue,
        urgency: getUrgency(daysUntilDue),
        color: getUrgencyColor(daysUntilDue, false),
        type: 'debt' as const,
      };
    })
    .filter((w) => w.urgency !== 'safe')
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
};

export const getUpcomingSubscriptionWarnings = (subscriptions: Subscription[]): PaymentWarning[] => {
  const currentMonth = new Date().getMonth();

  return subscriptions
    .filter((s) => !s.paid && s.dueDate && (s.reset_month === undefined || s.reset_month === currentMonth))
    .map((s) => {
      let effectiveDueDate = s.dueDate!;
      if (s.reset_month !== undefined) {
        const [, , day] = effectiveDueDate.split('-').map(Number);
        const currentYear = new Date().getFullYear();
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const actualDay = Math.min(day, lastDayOfMonth);
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(actualDay).padStart(2, '0');
        effectiveDueDate = `${currentYear}-${monthStr}-${dayStr}`;
      }
      const daysUntilDue = getDaysUntilDue(effectiveDueDate);
      return {
        id: s.id,
        name: s.name,
        amount: s.amount,
        daysUntilDue,
        urgency: getUrgency(daysUntilDue),
        color: getUrgencyColor(daysUntilDue, false),
        type: 'subscription' as const,
      };
    })
    .filter((w) => w.urgency !== 'safe')
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
};

export const getAllPaymentWarnings = (bills: Bill[], debts: Debt[], subscriptions: Subscription[] = []): PaymentWarning[] => {
  const billWarnings = getUpcomingBillWarnings(bills);
  const debtWarnings = getUpcomingDebtWarnings(debts);
  const subWarnings = getUpcomingSubscriptionWarnings(subscriptions);
  return [...billWarnings, ...debtWarnings, ...subWarnings].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
};
