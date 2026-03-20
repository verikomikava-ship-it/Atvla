import React, { useMemo } from 'react';
import { AppState, Bill, UTILITY_TYPES } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UtilitiesManagerProps {
  state: AppState;
  selectedMonth: string;
  onToggleBillPaid: (id: number) => void;
}

export const UtilitiesManager: React.FC<UtilitiesManagerProps> = ({
  state,
  selectedMonth,
  onToggleBillPaid,
}) => {
  const currentMonth = parseInt(selectedMonth || '0');

  // კომუნალური ბილები ამ თვისთვის (სახელი იწყება "კომუნალური:" ან არის UTILITY_TYPES-ის label)
  const utilityBillNames = useMemo(() => {
    const names = new Set<string>();
    UTILITY_TYPES.forEach((u) => {
      names.add(`კომუნალური: ${u.label}`);
      names.add(u.label);
    });
    return names;
  }, []);

  const utilityBills = useMemo(() => {
    return state.bills.filter((b) => {
      if ((b.reset_month ?? 0) !== currentMonth) return false;
      return utilityBillNames.has(b.name) || b.name.startsWith('კომუნალური:');
    });
  }, [state.bills, currentMonth, utilityBillNames]);

  // კომუნალურის ფაქტობრივი გადახდები კალენდრიდან
  const actualPayments = useMemo(() => {
    const payments: Record<string, { amount: number; dates: string[] }> = {};
    Object.entries(state.db).forEach(([dateKey, dayData]) => {
      const d = new Date(dateKey + 'T00:00:00');
      if (d.getMonth() !== currentMonth) return;
      (dayData.expenses || []).forEach((exp) => {
        if (exp.subcategory === 'კომუნალური' && exp.amount > 0 && exp.utilityType) {
          const key = exp.utilityType;
          if (!payments[key]) payments[key] = { amount: 0, dates: [] };
          payments[key].amount += exp.amount;
          payments[key].dates.push(dateKey);
        }
      });
    });
    return payments;
  }, [state.db, currentMonth]);

  const paidTotal = utilityBills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);
  const remainingTotal = utilityBills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
  const total = utilityBills.reduce((s, b) => s + b.amount, 0);
  const actualTotal = Object.values(actualPayments).reduce((s, p) => s + p.amount, 0);

  // ბილის შესაბამისი utility type
  const getBillUtilityInfo = (bill: Bill) => {
    for (const u of UTILITY_TYPES) {
      if (bill.name === `კომუნალური: ${u.label}` || bill.name === u.label || bill.name.includes(u.label)) {
        const payment = actualPayments[u.key];
        return { ...u, payment };
      }
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        <p className="font-semibold text-sm">კომუნალურები</p>
      </div>

      {/* სტატისტიკა */}
      <Card className="bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-700/50">
        <CardContent className="p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-teal-700 dark:text-teal-300">
              <Check className="h-2.5 w-2.5" />გადახდილი:
            </span>
            <span className="font-bold text-teal-700 dark:text-teal-300">{paidTotal}₾</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-teal-600 dark:text-teal-400">დარჩენილი:</span>
            <span className="font-bold text-teal-600 dark:text-teal-400">{remainingTotal}₾</span>
          </div>
          {actualTotal > 0 && actualTotal !== paidTotal && (
            <div className="flex justify-between text-xs">
              <span className="text-teal-600 dark:text-teal-400">ფაქტობრივად გადახდილი:</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">{actualTotal}₾</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-teal-800 dark:text-teal-200 pt-1.5 border-t border-teal-200 dark:border-teal-700/50">
            <span>სულ:</span>
            <span className="font-bold">{total}₾</span>
          </div>
          {total > 0 && (
            <Progress
              value={(paidTotal / total) * 100}
              indicatorClassName="bg-teal-500"
              className="h-1 bg-teal-100 dark:bg-teal-900/30"
            />
          )}
        </CardContent>
      </Card>

      {/* კომუნალურების სია */}
      {utilityBills.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 py-4 text-xs">
          კომუნალური არ დამატებულა. ინსტალაციაში ან ყოველთვიურ გადასახადებში დაამატე.
        </p>
      ) : (
        <div className="space-y-1.5">
          {utilityBills.map((bill) => {
            const utilInfo = getBillUtilityInfo(bill);
            const icon = utilInfo?.icon || '🏠';
            const color = utilInfo?.color || '#14b8a6';
            const payment = utilInfo?.payment;

            return (
              <Card
                key={bill.id}
                className={`border transition-all ${
                  bill.paid
                    ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-300 dark:border-teal-600/50'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                }`}
              >
                <CardContent className="p-2">
                  <div className="flex items-center gap-2">
                    {/* Checkbox */}
                    <button
                      onClick={() => onToggleBillPaid(bill.id)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        bill.paid
                          ? 'bg-teal-500 border-teal-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 hover:border-teal-400'
                      }`}
                    >
                      {bill.paid && <Check className="w-3 h-3" />}
                    </button>

                    {/* Icon */}
                    <span className="text-lg">{icon}</span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${bill.paid ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}
                          style={{ color: bill.paid ? undefined : color }}
                        >
                          {utilInfo?.label || bill.name.replace('კომუნალური: ', '')}
                        </span>
                        <span
                          className="text-sm font-black"
                          style={{ color: bill.paid ? '#94a3b8' : color }}
                        >
                          {bill.amount}₾
                        </span>
                      </div>

                      {/* ფაქტობრივი გადახდა */}
                      {payment && (
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-teal-600 dark:text-teal-400">
                            გადახდილი: {payment.dates.map((d) => {
                              const parts = d.split('-');
                              return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
                            }).join(', ')}
                          </span>
                          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                            {payment.amount}₾
                          </span>
                        </div>
                      )}

                      {/* გადახდის ვადა */}
                      {!bill.paid && bill.dueDate && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                          ვადა: {(() => {
                            const parts = bill.dueDate!.split('-');
                            return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
