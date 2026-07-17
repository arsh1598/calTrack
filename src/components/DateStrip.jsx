import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { formatDate, parseDate, DAY_LABELS } from '../utils/helpers';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * 7-day horizontal swipeable date strip
 */
export default function DateStrip({ selectedDate, onSelectDate }) {
  const days = [];
  const today = formatDate();
  const scrollRef = useRef(null);

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDate(d));
  }

  const isToday = (date) => date === today;
  const isSelected = (date) => date === selectedDate;

  const getLabel = (dateStr) => {
    const d = parseDate(dateStr);
    return DAY_LABELS[d.getDay()];
  };

  const getDay = (dateStr) => {
    return parseInt(dateStr.split('-')[2], 10);
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1"
      >
        {days.map((date, idx) => {
          const selected = isSelected(date);
          const todayDate = isToday(date);

          return (
            <motion.button
              key={date}
              onClick={() => onSelectDate(date)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              whileTap={{ scale: 0.92 }}
              className={`
                flex-shrink-0 flex flex-col items-center justify-center
                w-12 h-[72px] rounded-2xl transition-all duration-300 relative
                ${selected
                  ? 'bg-gradient-to-b from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30'
                  : todayDate
                    ? 'bg-zinc-800/80 border border-indigo-500/40'
                    : 'bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700/50 hover:bg-zinc-800/50'
                }
              `}
            >
              <span className={`text-[10px] font-medium uppercase tracking-wider ${
                selected ? 'text-indigo-200' : 'text-zinc-500'
              }`}>
                {getLabel(date)}
              </span>
              <span className={`text-base font-bold mt-1 ${
                selected ? 'text-white' : todayDate ? 'text-zinc-100' : 'text-zinc-300'
              }`}>
                {getDay(date)}
              </span>
              {todayDate && !selected && (
                <span className="absolute bottom-2 w-1 h-1 rounded-full bg-indigo-400" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
