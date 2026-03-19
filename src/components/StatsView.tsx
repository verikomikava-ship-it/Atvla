import React, { useMemo } from 'react';
import { AppState, ExpenseCategory } from '../types';
import { calculateMonthlyStats } from '../utils/calculations';
import { MONTH_NAMES } from '../utils/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target, Flame, Calendar, BarChart3, PieChart } from 'lucide-react';

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'საჭირო': '#10b981',
  'აუცილებელი': '#ef4444',
  'სურვილი': '#f97316',
  'გაუთვალისწინებელი': '#a855f7',
};

const CATEGORY_LABELS: ExpenseCategory[] = ['საჭირო', 'აუცილებელი', 'სურვილი', 'გაუთვალისწინებელი'];

type CategoryTotals = Record<ExpenseCategory, number>;

const DonutChart: React.FC<{ data: CategoryTotals; size?: number }> = ({ data, size = 120 }) => {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return <p className="text-slate-500 text-xs text-center py-4">ხარჯი არ არის</p>;

  const radius = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = CATEGORY_LABELS
    .filter((cat) => data[cat] > 0)
    .map((cat) => {
      const pct = data[cat] / total;
      const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;
      const dashOffset = -offset * circumference;
      offset += pct;
      return { cat, pct, dashArray, dashOffset, color: CATEGORY_COLORS[cat] };
    });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => (
          <circle
            key={seg.cat}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-200 text-sm font-black">
          {total}₾
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-slate-400 text-[9px]">
          სულ ხარჯი
        </text>
      </svg>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[10px]">
        {segments.map((seg) => (
          <div key={seg.cat} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: seg.color }} />
            <span className="text-slate-300">{seg.cat}:</span>
            <span className="font-bold text-slate-200">{data[seg.cat]}₾</span>
            <span className="text-slate-500">({Math.round(seg.pct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface StatsViewProps {
  state: AppState;
  totalInc: number;
  totalExp: number;
  totalKulaba: number;
}

export const StatsView: React.FC<StatsViewProps> = ({ state, totalInc, totalExp, totalKulaba }) => {
  const monthlyStats = useMemo(() => calculateMonthlyStats(state), [state]);

  const { debtsPaid, debtsRemaining, debtsTotal } = useMemo(() => {
    const paid = state.debts.filter((d) => d.paid).reduce((sum, d) => sum + d.amount, 0);
    const remaining = state.debts.filter((d) => !d.paid).reduce((sum, d) => sum + d.amount, 0);
    return { debtsPaid: paid, debtsRemaining: remaining, debtsTotal: paid + remaining };
  }, [state.debts]);

  const { billsPaid, billsRemaining, billsTotal } = useMemo(() => {
    const paid = state.bills.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0);
    const remaining = state.bills.filter((b) => !b.paid).reduce((sum, b) => sum + b.amount, 0);
    return { billsPaid: paid, billsRemaining: remaining, billsTotal: paid + remaining };
  }, [state.bills]);

  const netBalance = totalInc - totalExp;

  const dailyBudget = state.profile?.dailyBudget || 150;

  const streaks = useMemo(() => {
    const start = new Date(2026, 0, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let best = 0;
    let streak = 0;

    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d > today) break;

      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      const total = data ? (data.incMain || 0) + (data.incExtra || 0) : 0;

      if (total >= dailyBudget) {
        streak++;
        if (streak > best) best = streak;
      } else {
        streak = 0;
      }
    }
    return { current: streak, best };
  }, [state.db, dailyBudget]);

  // თვიური ხარჯების კატეგორიების გამოთვლა
  const monthlyCategoryTotals = useMemo(() => {
    const result: Record<number, CategoryTotals> = {};
    for (let m = 0; m < 12; m++) {
      result[m] = { 'საჭირო': 0, 'აუცილებელი': 0, 'სურვილი': 0, 'გაუთვალისწინებელი': 0 };
    }

    Object.entries(state.db).forEach(([date, d]) => {
      const m = new Date(date).getMonth();
      (d.expenses || []).forEach((e) => {
        if (e.category && e.amount > 0) {
          result[m][e.category] += e.amount;
        }
      });
      if (d.gas && d.gas > 0) result[m]['საჭირო'] += d.gas;
      if (d.shop && d.shop > 0) result[m]['საჭირო'] += d.shop;
      if (d.other && d.other > 0) result[m]['სურვილი'] += d.other;
    });

    return result;
  }, [state.db]);

  const totalCategoryTotals = useMemo(() => {
    const total: CategoryTotals = { 'საჭირო': 0, 'აუცილებელი': 0, 'სურვილი': 0, 'გაუთვალისწინებელი': 0 };
    Object.values(monthlyCategoryTotals).forEach((m) => {
      CATEGORY_LABELS.forEach((cat) => { total[cat] += m[cat]; });
    });
    return total;
  }, [monthlyCategoryTotals]);

  const filledDays = Object.keys(state.db).length;
  const daysWithGoal = useMemo(
    () => Object.values(state.db).filter((d) => (d.incMain || 0) + (d.incExtra || 0) >= dailyBudget).length,
    [state.db, dailyBudget]
  );

  // კულაბის პროგრესი მიზნისკენ
  const goalAmount = state.goal || 0;
  const kulabaProgress = goalAmount > 0 ? Math.min((totalKulaba / goalAmount) * 100, 100) : 0;

  return (
    <div className="space-y-4">
      {/* კულაბა მიმოხილვა */}
      <Card className="border-amber-700/50 bg-gradient-to-r from-amber-900/20 to-amber-800/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-400 text-base flex items-center gap-2">
            <Target className="w-5 h-5" />
            კულაბა
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-amber-300">დაგროვილი:</span>
              <span className="font-bold ml-2 text-amber-200">{totalKulaba}₾</span>
            </div>
            {goalAmount > 0 && (
              <>
                <div>
                  <span className="text-amber-400/70">მიზანი:</span>
                  <span className="font-bold ml-2">{goalAmount}₾</span>
                </div>
                <div>
                  <span className="text-amber-400/70">დარჩენილი:</span>
                  <span className="font-bold ml-2">{Math.max(0, goalAmount - totalKulaba)}₾</span>
                </div>
                <div>
                  <span className="text-amber-400/70">პროგრესი:</span>
                  <Badge variant={kulabaProgress >= 100 ? 'success' : 'warning'} className="ml-2">
                    {Math.round(kulabaProgress)}%
                  </Badge>
                </div>
              </>
            )}
          </div>
          {goalAmount > 0 && (
            <div className="mt-3">
              <Progress
                value={kulabaProgress}
                indicatorClassName={cn(
                  'transition-all duration-700',
                  kulabaProgress >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400'
                )}
              />
              {state.goalName && (
                <p className="text-xs text-amber-400/60 mt-1 flex items-center gap-1">
                  <Target className="w-3 h-3" /> {state.goalName}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* საერთო მიმოხილვა */}
      <Card className="border-yellow-700/50 bg-gradient-to-r from-yellow-900/20 to-yellow-800/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-yellow-400 text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            საერთო მიმოხილვა
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">შემოსავალი:</span>
              <span className="font-bold ml-1">{totalInc}₾</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400">გასავალი:</span>
              <span className="font-bold ml-1">{totalExp}₾</span>
            </div>
            <div>
              <span className={netBalance >= 0 ? 'text-green-300' : 'text-red-300'}>ნეტო:</span>
              <span className={cn('font-bold ml-2', netBalance >= 0 ? 'text-green-300' : 'text-red-300')}>
                {netBalance >= 0 ? '+' : ''}{netBalance}₾
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400">კულაბა:</span>
              <span className="font-bold ml-1">{totalKulaba}₾</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* სტრიქ და პროგრესი */}
      <Card className="border-green-700/50 bg-gradient-to-r from-green-900/20 to-green-800/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-400 text-base flex items-center gap-2">
            <Flame className="w-5 h-5" />
            პროგრესი
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                მიმდინარე სტრიქი:
              </span>
              <Badge variant="success">{streaks.current} დღე</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-yellow-400" />
                საუკეთესო სტრიქი:
              </span>
              <Badge variant="warning">{streaks.best} დღე</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                შევსებული დღეები:
              </span>
              <span className="font-bold">{filledDays}/365</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-green-400" />
                გეგმის შესრულება ({dailyBudget}₾+):
              </span>
              <Badge variant="success">{daysWithGoal} დღე</Badge>
            </div>
            {filledDays > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-300">წარმატების %:</span>
                <Badge variant={(daysWithGoal / filledDays) >= 0.5 ? 'success' : 'danger'}>
                  {Math.round((daysWithGoal / filledDays) * 100)}%
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ხარჯების კატეგორიები - საერთო */}
      <Card className="border-slate-600/50 bg-gradient-to-r from-slate-800/50 to-slate-700/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-300 text-base flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            ხარჯების კატეგორიები (საერთო)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart data={totalCategoryTotals} size={140} />
        </CardContent>
      </Card>

      {/* ხარჯების კატეგორიები - თვიური */}
      <Card className="border-slate-600/50 bg-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-300 text-base flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            ხარჯების კატეგორიები (თვიურად)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {MONTH_NAMES.map((month, index) => {
              const catData = monthlyCategoryTotals[index];
              const hasData = Object.values(catData).some((v) => v > 0);
              if (!hasData) return null;

              return (
                <Card key={index} className="border-slate-600 bg-slate-800/50">
                  <CardContent className="p-3">
                    <p className="text-sm font-bold text-yellow-400 mb-2 text-center">{month}</p>
                    <DonutChart data={catData} size={100} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* თვიური ანალიტიკა */}
      <Card className="border-slate-600/50 bg-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-yellow-400 text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            თვიური ანალიტიკა
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex overflow-x-auto pb-2 gap-3">
            {MONTH_NAMES.map((month, index) => {
              const stat = monthlyStats[index];
              const balance = stat.inc - stat.exp;

              return (
                <Card
                  key={index}
                  className="flex-shrink-0 border-slate-600 bg-slate-800/50"
                  style={{ minWidth: '160px' }}
                >
                  <CardContent className="p-3">
                    <div className="text-sm font-bold text-yellow-400 mb-2">{month}</div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-green-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> შემ:
                        </span>
                        <span>{stat.inc}₾</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-400 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" /> გასა:
                        </span>
                        <span>{stat.exp}₾</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-300 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                        </span>
                        <span>{stat.kulaba}₾</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-600">
                        <span className="text-blue-300">ბილი:</span>
                        <span>{stat.bills}₾</span>
                      </div>
                      <div className="flex justify-between text-blue-200 text-xs">
                        <span>&#10003;</span>
                        <span>{stat.bills_paid}₾</span>
                      </div>
                      <div className="flex justify-between text-blue-200 text-xs">
                        <span>&#9671;</span>
                        <span>{stat.bills_remaining}₾</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-600 font-bold">
                        <span className={balance >= 0 ? 'text-green-400' : 'text-red-400'}>ბ:</span>
                        <span className={balance >= 0 ? 'text-green-400' : 'text-red-400'}>{balance}₾</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ვალების სტატუსი */}
      <Card className="border-purple-700/50 bg-gradient-to-r from-purple-900/30 to-purple-800/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-purple-400 text-base">ვალების სტატუსი</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-purple-300">&#10003; გადახდილი:</span>
            <span className="font-bold text-purple-300">{debtsPaid}₾</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-purple-400">&#9671; დარჩენილი:</span>
            <span className="font-bold text-purple-400">{debtsRemaining}₾</span>
          </div>
          <div className="flex justify-between text-sm text-purple-200 mt-2 pt-2 border-t border-purple-700">
            <span>სულ:</span>
            <span className="font-bold">{debtsTotal}₾</span>
          </div>
          {debtsTotal > 0 && (
            <div className="mt-2">
              <Progress
                value={(debtsPaid / debtsTotal) * 100}
                indicatorClassName="bg-purple-400 transition-all duration-500"
              />
              <p className="text-xs text-purple-300 mt-1 text-right">
                {Math.round((debtsPaid / debtsTotal) * 100)}% გადახდილი
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ბილების სტატუსი */}
      <Card className="border-blue-700/50 bg-gradient-to-r from-blue-900/30 to-blue-800/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-blue-400 text-base">ბილების სტატუსი</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-blue-300">&#10003; გადახდილი:</span>
            <span className="font-bold text-blue-300">{billsPaid}₾</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-400">&#9671; დარჩენილი:</span>
            <span className="font-bold text-blue-400">{billsRemaining}₾</span>
          </div>
          <div className="flex justify-between text-sm text-blue-200 mt-2 pt-2 border-t border-blue-700">
            <span>სულ:</span>
            <span className="font-bold">{billsTotal}₾</span>
          </div>
          {billsTotal > 0 && (
            <div className="mt-2">
              <Progress
                value={(billsPaid / billsTotal) * 100}
                indicatorClassName="bg-blue-400 transition-all duration-500"
              />
              <p className="text-xs text-blue-300 mt-1 text-right">
                {Math.round((billsPaid / billsTotal) * 100)}% გადახდილი
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
