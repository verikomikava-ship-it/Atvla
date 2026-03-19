import React, { useState, useCallback, useMemo } from 'react';
import { AppState, DayData, Debt, DebtPriority, UserProfile, Bill, Subscription, Loan, Lombard } from '@/types';
import { useAppState } from '@/hooks/useAppState';
import { calculateStats } from '@/utils/calculations';
import { MONTH_NAMES } from '@/utils/constants';
import { Header } from '@/components/Header';
import { Calendar } from '@/components/Calendar';
import { DayEditor } from '@/components/DayEditor';
import { DebtsManager } from '@/components/DebtsManager';
import { BillsManager } from '@/components/BillsManager';
import { SubscriptionsManager } from '@/components/SubscriptionsManager';
import { LoansManager } from '@/components/LoansManager';
import { LombardsManager } from '@/components/LombardsManager';
import { StatsView } from '@/components/StatsView';
import { ToolsMenu } from '@/components/ToolsMenu';
import { DiaryView } from '@/components/DiaryView';
import { SetupWizard } from '@/components/SetupWizard';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  const { state, updateState } = useAppState();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth().toString());
  const [activeTab, setActiveTab] = useState<'debts' | 'bills' | 'subscriptions' | 'loans' | 'lombards' | 'stats'>('debts');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stats = useMemo(() => calculateStats(state), [state]);

  const handleSetupComplete = useCallback(
    (profile: UserProfile, bills: Bill[]) => {
      const newState: AppState = {
        ...state,
        profile,
        bills: [...state.bills, ...bills],
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleSaveDay = useCallback(
    (date: string, data: DayData, debtPayments?: { debtId: number; amount: number }[], billPayments?: { billId: number; paid: boolean }[]) => {
      let updatedDebts = state.debts;
      let updatedBills = state.bills;

      // ვალის გადახდების დამუშავება
      if (debtPayments && debtPayments.length > 0) {
        updatedDebts = state.debts.map((debt) => {
          const payments = debtPayments.filter((p) => p.debtId === debt.id);
          if (payments.length === 0) return debt;

          const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
          const newPaidAmount = Math.max(0, (debt.paidAmount || 0) + totalPayment);
          const fullyPaid = newPaidAmount >= debt.amount;

          return {
            ...debt,
            paidAmount: Math.min(newPaidAmount, debt.amount),
            paid: fullyPaid,
          };
        });
      }

      // ბილის გადახდების დამუშავება
      if (billPayments && billPayments.length > 0) {
        updatedBills = state.bills.map((bill) => {
          const payment = billPayments.find((p) => p.billId === bill.id);
          if (!payment) return bill;
          return { ...bill, paid: payment.paid };
        });
      }

      const newState: AppState = {
        ...state,
        db: {
          ...state.db,
          [date]: data,
        },
        debts: updatedDebts,
        bills: updatedBills,
      };
      updateState(newState);
      setSelectedDay(null);
    },
    [state, updateState]
  );

  const handleCloseEditor = useCallback(() => {
    setSelectedDay(null);
  }, []);

  const handleGoalChange = useCallback(
    (goal: number, goalName: string) => {
      const newState: AppState = {
        ...state,
        goal,
        goalName,
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleAddDebt = useCallback(
    (name: string, amount: number, priority: DebtPriority, dueDate?: string, parts?: number) => {
      const newState: AppState = {
        ...state,
        debts: [
          ...state.debts,
          {
            id: Date.now(),
            name,
            amount,
            paid: false,
            priority,
            dueDate,
            parts: parts || 1,
            paidParts: 0,
          },
        ],
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleRemoveDebt = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        debts: state.debts.filter((d) => d.id !== id),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleToggleDebtPaid = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        debts: state.debts.map((d) => (d.id === id ? { ...d, paid: !d.paid } : d)),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handlePayDebtPart = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        debts: state.debts.map((d) => {
          if (d.id !== id) return d;
          const totalParts = d.parts || 1;
          const newPaidParts = Math.min((d.paidParts || 0) + 1, totalParts);
          return {
            ...d,
            paidParts: newPaidParts,
            paid: newPaidParts >= totalParts,
          };
        }),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleAddBill = useCallback(
    (name: string, amount: number, isRecurring: boolean = false, dueDate?: string) => {
      const now = Date.now();
      const billsToAdd = [];

      if (isRecurring) {
        const dueDateDay = dueDate ? parseInt(dueDate.split('-')[2]) : undefined;
        const currentYear = new Date().getFullYear();

        for (let month = 0; month < 12; month++) {
          let monthDueDate: string | undefined = dueDate;
          if (dueDate && dueDateDay) {
            const lastDayOfMonth = new Date(currentYear, month + 1, 0).getDate();
            const actualDay = Math.min(dueDateDay, lastDayOfMonth);
            const monthStr = String(month + 1).padStart(2, '0');
            const dayStr = String(actualDay).padStart(2, '0');
            monthDueDate = `${currentYear}-${monthStr}-${dayStr}`;
          }

          billsToAdd.push({
            id: now + month,
            name,
            amount,
            date: '',
            paid: false,
            reset_month: month,
            dueDate: monthDueDate,
          });
        }
      } else {
        billsToAdd.push({
          id: now,
          name,
          amount,
          date: '',
          paid: false,
          reset_month: parseInt(selectedMonth || '0'),
          dueDate: dueDate,
        });
      }

      const newState: AppState = {
        ...state,
        bills: [...state.bills, ...billsToAdd],
      };
      updateState(newState);
    },
    [state, selectedMonth, updateState]
  );

  const handleRemoveBill = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        bills: state.bills.filter((b) => b.id !== id),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleToggleBillPaid = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        bills: state.bills.map((b) => (b.id === id ? { ...b, paid: !b.paid } : b)),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleAddSubscription = useCallback(
    (name: string, amount: number, dueDate?: string) => {
      const now = Date.now();
      const subsToAdd = [];
      const dueDateDay = dueDate ? parseInt(dueDate.split('-')[2]) : undefined;
      const currentYear = new Date().getFullYear();

      for (let month = 0; month < 12; month++) {
        let monthDueDate: string | undefined = dueDate;
        if (dueDate && dueDateDay) {
          const lastDayOfMonth = new Date(currentYear, month + 1, 0).getDate();
          const actualDay = Math.min(dueDateDay, lastDayOfMonth);
          const monthStr = String(month + 1).padStart(2, '0');
          const dayStr = String(actualDay).padStart(2, '0');
          monthDueDate = `${currentYear}-${monthStr}-${dayStr}`;
        }

        subsToAdd.push({
          id: now + month,
          name,
          amount,
          paid: false,
          reset_month: month,
          dueDate: monthDueDate,
        });
      }

      const newState: AppState = {
        ...state,
        subscriptions: [...(state.subscriptions || []), ...subsToAdd],
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleRemoveSubscription = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        subscriptions: (state.subscriptions || []).filter((s) => s.id !== id),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleToggleSubscriptionPaid = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        subscriptions: (state.subscriptions || []).map((s) =>
          s.id === id ? { ...s, paid: !s.paid } : s
        ),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleImportData = useCallback(
    (newState: AppState) => {
      updateState(newState);
    },
    [updateState]
  );

  // პროფილის რედაქტირება
  const handleProfileChange = useCallback(
    (profile: UserProfile) => {
      updateState({ ...state, profile });
    },
    [state, updateState]
  );

  // ვალის რედაქტირება
  const handleEditDebt = useCallback(
    (id: number, updates: Partial<Debt>) => {
      updateState({
        ...state,
        debts: state.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      });
    },
    [state, updateState]
  );

  // ბილის რედაქტირება
  const handleEditBill = useCallback(
    (id: number, updates: Partial<Bill>) => {
      updateState({
        ...state,
        bills: state.bills.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      });
    },
    [state, updateState]
  );

  // გამოწერის რედაქტირება
  const handleEditSubscription = useCallback(
    (id: number, updates: Partial<Subscription>) => {
      updateState({
        ...state,
        subscriptions: (state.subscriptions || []).map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      });
    },
    [state, updateState]
  );

  // სესხები (გასესხებული)
  const handleAddLoan = useCallback(
    (loan: Omit<Loan, 'id'>) => {
      updateState({
        ...state,
        loans: [...(state.loans || []), { ...loan, id: Date.now() }],
      });
    },
    [state, updateState]
  );

  const handleRemoveLoan = useCallback(
    (id: number) => {
      updateState({
        ...state,
        loans: (state.loans || []).filter((l) => l.id !== id),
      });
    },
    [state, updateState]
  );

  const handleToggleLoanReturned = useCallback(
    (id: number) => {
      updateState({
        ...state,
        loans: (state.loans || []).map((l) =>
          l.id === id ? { ...l, returned: !l.returned } : l
        ),
      });
    },
    [state, updateState]
  );

  const handleEditLoan = useCallback(
    (id: number, updates: Partial<Loan>) => {
      updateState({
        ...state,
        loans: (state.loans || []).map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      });
    },
    [state, updateState]
  );

  // ლობარდი
  const handleAddLombard = useCallback(
    (data: { itemName: string; principal: number; monthlyInterest: number; contractNumber?: string; paymentDay: number }) => {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];
      const currentYear = new Date().getFullYear();

      // ვალის შექმნა (ძირი თანხა)
      const debtId = now;
      const newDebt: Debt = {
        id: debtId,
        name: `🏪 ლობარდი: ${data.itemName}`,
        amount: data.principal,
        paid: false,
        priority: 'high',
        paidAmount: 0,
      };

      // 12 თვის ბილების შექმნა (ყოველთვიური პროცენტი)
      const billIds: number[] = [];
      const newBills: Bill[] = [];
      for (let month = 0; month < 12; month++) {
        const billId = now + 1 + month;
        billIds.push(billId);
        const lastDayOfMonth = new Date(currentYear, month + 1, 0).getDate();
        const actualDay = Math.min(data.paymentDay, lastDayOfMonth);
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(actualDay).padStart(2, '0');
        newBills.push({
          id: billId,
          name: `🏪 ლობარდი %: ${data.itemName}`,
          amount: data.monthlyInterest,
          date: '',
          paid: false,
          reset_month: month,
          dueDate: `${currentYear}-${monthStr}-${dayStr}`,
        });
      }

      // ლობარდის ობიექტი
      const lombard: Lombard = {
        id: now + 100,
        itemName: data.itemName,
        principal: data.principal,
        monthlyInterest: data.monthlyInterest,
        contractNumber: data.contractNumber,
        paymentDay: data.paymentDay,
        debtId,
        billIds,
        active: true,
        createdAt: today,
      };

      updateState({
        ...state,
        debts: [...state.debts, newDebt],
        bills: [...state.bills, ...newBills],
        lombards: [...(state.lombards || []), lombard],
      });
    },
    [state, updateState]
  );

  const handleRemoveLombard = useCallback(
    (id: number) => {
      const lombard = (state.lombards || []).find((l) => l.id === id);
      if (!lombard) return;
      updateState({
        ...state,
        debts: state.debts.filter((d) => d.id !== lombard.debtId),
        bills: state.bills.filter((b) => !lombard.billIds.includes(b.id)),
        lombards: (state.lombards || []).filter((l) => l.id !== id),
      });
    },
    [state, updateState]
  );

  const handleEditLombard = useCallback(
    (id: number, updates: Partial<Lombard>) => {
      const lombard = (state.lombards || []).find((l) => l.id === id);
      if (!lombard) return;

      let updatedDebts = state.debts;
      let updatedBills = state.bills;

      // ვალის განახლება თუ ძირი თანხა შეიცვალა
      if (updates.principal !== undefined && updates.principal !== lombard.principal) {
        updatedDebts = state.debts.map((d) =>
          d.id === lombard.debtId ? { ...d, amount: updates.principal!, name: `🏪 ლობარდი: ${updates.itemName || lombard.itemName}` } : d
        );
      } else if (updates.itemName) {
        updatedDebts = state.debts.map((d) =>
          d.id === lombard.debtId ? { ...d, name: `🏪 ლობარდი: ${updates.itemName}` } : d
        );
      }

      // ბილების განახლება თუ პროცენტი ან სახელი შეიცვალა
      if (updates.monthlyInterest !== undefined || updates.itemName) {
        updatedBills = state.bills.map((b) => {
          if (!lombard.billIds.includes(b.id)) return b;
          return {
            ...b,
            amount: updates.monthlyInterest ?? lombard.monthlyInterest,
            name: `🏪 ლობარდი %: ${updates.itemName || lombard.itemName}`,
          };
        });
      }

      updateState({
        ...state,
        debts: updatedDebts,
        bills: updatedBills,
        lombards: (state.lombards || []).map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      });
    },
    [state, updateState]
  );

  const handleResetData = useCallback(() => {
    const emptyState: AppState = {
      db: {},
      debts: [],
      bills: [],
      subscriptions: [],
      loans: [],
      lombards: [],
      goal: 0,
      goalName: '',
      profile: {
        setupCompleted: false,
        incomeType: 'salary',
        salary: 0,
        payFrequency: 'monthly_1',
        workDays: [1, 2, 3, 4, 5],
        dailyTarget: 0,
        additionalIncomes: [],
        dailyBudget: 150,
      },
    };
    updateState(emptyState);
    setSelectedDay(null);
  }, [updateState]);

  // თუ setup არ არის გავლილი, wizard აჩვენე
  if (!state.profile?.setupCompleted) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  const tabsRow1 = [
    { key: 'debts' as const, label: 'ვალები', icon: '💸' },
    { key: 'bills' as const, label: 'ყოველთვიური გადასახადი', icon: '📅' },
    { key: 'subscriptions' as const, label: 'გამოწერები', icon: '🔄' },
  ];
  const tabsRow2 = [
    { key: 'loans' as const, label: 'გასესხებული', icon: '🤝' },
    { key: 'lombards' as const, label: 'ლობარდი', icon: '🏪' },
    { key: 'stats' as const, label: 'სტატისტიკა', icon: '📊' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200">
      {/* Main scrollable area (header + calendar) */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <Header
          state={state}
          selectedMonth={selectedMonth}
          totalInc={stats.totalInc}
          totalExp={stats.totalExp}
          totalKulaba={stats.totalKulaba}
          onGoalChange={handleGoalChange}
          onProfileChange={handleProfileChange}
        />

        <main className="px-3 py-2">
          <DiaryView state={state} selectedMonth={selectedMonth} />
          <Calendar state={state} selectedMonth={selectedMonth} onDaySelect={setSelectedDay} />
        </main>

        {/* Mobile: month selector + sidebar toggle */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 sticky bottom-0 bg-slate-900/95 backdrop-blur border-t border-slate-700/50">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 bg-slate-800/80 text-slate-200 px-3 py-2 rounded-md border border-slate-600 text-sm"
          >
            {MONTH_NAMES.map((month, index) => (
              <option key={index} value={index.toString()}>
                {month}
              </option>
            ))}
            <option value="">ყველა თვე</option>
          </select>
          <button
            onClick={() => setSidebarOpen(true)}
            className="bg-yellow-500 text-slate-900 px-3 py-2 rounded-md font-bold text-sm flex items-center gap-1"
          >
            <Menu className="w-4 h-4" />
            მენიუ
          </button>
        </div>
      </div>

      {/* Sidebar: overlay on mobile, fixed on desktop */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={cn(
        'bg-slate-900/95 backdrop-blur border-l border-slate-700/50 flex flex-col',
        // Desktop
        'hidden md:flex md:w-96 md:h-screen md:relative',
        // Mobile overlay
        sidebarOpen && '!flex fixed inset-y-0 right-0 w-[85vw] max-w-96 z-50 h-screen'
      )}>
        <div className="p-3 border-b border-slate-700/50 flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 bg-slate-800/80 text-slate-200 px-3 py-2 rounded-md border border-slate-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 outline-none transition-colors text-sm"
          >
            {MONTH_NAMES.map((month, index) => (
              <option key={index} value={index.toString()}>
                {month}
              </option>
            ))}
            <option value="">ყველა თვე</option>
          </select>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-md hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-slate-700/50">
          <div className="flex text-xs font-bold">
            {tabsRow1.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 py-1.5 px-1 transition-all duration-200 border-b-2 flex items-center justify-center gap-1',
                  activeTab === tab.key
                    ? 'text-yellow-400 border-yellow-400 bg-yellow-400/5'
                    : 'text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                )}
              >
                <span className="text-[10px]">{tab.icon}</span>
                <span className="text-[11px]">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex text-xs font-bold">
            {tabsRow2.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 py-1.5 px-1 transition-all duration-200 border-b-2 flex items-center justify-center gap-1',
                  activeTab === tab.key
                    ? 'text-yellow-400 border-yellow-400 bg-yellow-400/5'
                    : 'text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                )}
              >
                <span className="text-[10px]">{tab.icon}</span>
                <span className="text-[11px]">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {activeTab === 'debts' && (
            <DebtsManager
              state={state}
              onAddDebt={handleAddDebt}
              onRemoveDebt={handleRemoveDebt}
              onToggleDebtPaid={handleToggleDebtPaid}
              onPayDebtPart={handlePayDebtPart}
              onEditDebt={handleEditDebt}
            />
          )}

          {activeTab === 'bills' && (
            <BillsManager
              state={state}
              selectedMonth={selectedMonth}
              onAddBill={handleAddBill}
              onRemoveBill={handleRemoveBill}
              onToggleBillPaid={handleToggleBillPaid}
              onEditBill={handleEditBill}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsManager
              state={state}
              selectedMonth={selectedMonth}
              onAddSubscription={handleAddSubscription}
              onRemoveSubscription={handleRemoveSubscription}
              onToggleSubscriptionPaid={handleToggleSubscriptionPaid}
              onEditSubscription={handleEditSubscription}
            />
          )}

          {activeTab === 'loans' && (
            <LoansManager
              state={state}
              onAddLoan={handleAddLoan}
              onRemoveLoan={handleRemoveLoan}
              onToggleLoanReturned={handleToggleLoanReturned}
              onEditLoan={handleEditLoan}
            />
          )}

          {activeTab === 'lombards' && (
            <LombardsManager
              state={state}
              onAddLombard={handleAddLombard}
              onRemoveLombard={handleRemoveLombard}
              onEditLombard={handleEditLombard}
            />
          )}

          {activeTab === 'stats' && (
            <StatsView
              state={state}
              totalInc={stats.totalInc}
              totalExp={stats.totalExp}
              totalKulaba={stats.totalKulaba}
            />
          )}
        </div>
      </aside>

      <ToolsMenu state={state} onImport={handleImportData} onReset={handleResetData} />

      {selectedDay && (
        <DayEditor
          date={selectedDay}
          state={state}
          onSave={handleSaveDay}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
};
