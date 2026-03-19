import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface DiaryViewProps {
  state: AppState;
  selectedMonth: string;
}

const WEEKDAYS = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];

export const DiaryView: React.FC<DiaryViewProps> = ({ state, selectedMonth }) => {
  const [isOpen, setIsOpen] = useState(false);

  const entries = useMemo(() => {
    const month = selectedMonth === '' ? null : parseInt(selectedMonth);

    return Object.entries(state.db)
      .filter(([, d]) => d.comment && d.comment.trim().length > 0)
      .filter(([date]) => {
        if (month === null) return true;
        return new Date(date).getMonth() === month;
      })
      .sort(([a], [b]) => b.localeCompare(a));
  }, [state.db, selectedMonth]);

  if (entries.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-amber-500/10 border-2 border-amber-800/40 hover:border-amber-700/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-amber-500" />
          <span className="text-amber-400 font-bold text-sm">დღიური</span>
          <span className="text-amber-700 text-xs">({entries.length} ჩანაწერი)</span>
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-amber-700" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-700" />
        )}
      </button>

      {isOpen && (
        <Card className="mt-2 bg-amber-500/5 border-2 border-amber-800/30 overflow-hidden">
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {entries.map(([date, data]) => {
                const dateObj = new Date(date + 'T00:00:00');
                const dayName = WEEKDAYS[dateObj.getDay()];
                const dayNum = dateObj.getDate();
                const monthNum = dateObj.getMonth() + 1;

                return (
                  <div key={date} className="border-b border-amber-800/15 last:border-b-0">
                    <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                      <span className="text-amber-600 text-[10px] font-bold">
                        {dayNum}/{monthNum} - {dayName}
                      </span>
                    </div>
                    <div className="relative px-4 pb-3">
                      <div className="absolute left-8 top-0 bottom-0 w-px bg-amber-800/15" />
                      <p
                        className="pl-6 text-sm text-amber-100/80 whitespace-pre-wrap"
                        style={{ lineHeight: '1.8' }}
                      >
                        {data.comment}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
