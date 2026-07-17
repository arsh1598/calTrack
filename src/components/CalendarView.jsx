import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatDate, parseDate, calcMacros, MONTH_LABELS, DAY_LABELS } from '../utils/helpers';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarView({ isOpen, onClose, onSelectDate, selectedDate, goals }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Get all logs for viewed month
  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const monthEnd   = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(getDaysInMonth(viewYear, viewMonth)).padStart(2, '0')}`;

  const monthLogs = useLiveQuery(
    () => db.logs.where('date').between(monthStart, monthEnd, true, true).toArray(),
    [monthStart, monthEnd]
  ) ?? [];

  const allFoods = useLiveQuery(() => db.foods.toArray(), []) ?? [];
  const foodMap = {};
  for (const f of allFoods) foodMap[f.id] = f;

  // Group logs by date
  const logsByDate = {};
  for (const log of monthLogs) {
    if (!logsByDate[log.date]) logsByDate[log.date] = [];
    logsByDate[log.date].push(log);
  }

  const getDayStatus = (dateStr) => {
    const logs = logsByDate[dateStr];
    if (!logs || logs.length === 0) return 'empty';
    const macros = calcMacros(logs, foodMap);
    const calPct = macros.calories / (goals.goalCalories || 2000);
    if (calPct >= 0.85 && calPct <= 1.15) return 'met';
    if (calPct > 0) return 'partial';
    return 'empty';
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const statusColors = {
    met: 'bg-emerald-500/80 text-white shadow-emerald-500/20 shadow',
    partial: 'bg-amber-500/70 text-white shadow-amber-500/20 shadow',
    empty: 'bg-transparent text-zinc-400',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-w-2xl mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="glass-panel-dark rounded-t-3xl border-t border-zinc-800/60 p-5" style={{ maxHeight: '85dvh', overflow: 'auto' }}>
              <div className="drag-handle" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className="glass-btn w-9 h-9 flex items-center justify-center">
                  <ChevronLeft size={16} className="text-zinc-400" />
                </button>
                <h2 className="text-base font-bold text-zinc-50">
                  {MONTH_LABELS[viewMonth]} {viewYear}
                </h2>
                <div className="flex gap-2">
                  <button onClick={nextMonth} className="glass-btn w-9 h-9 flex items-center justify-center">
                    <ChevronRight size={16} className="text-zinc-400" />
                  </button>
                  <button onClick={onClose} className="glass-btn w-9 h-9 flex items-center justify-center">
                    <X size={16} className="text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 mb-2">
                {DAY_LABELS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-zinc-600 uppercase tracking-wider py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Leading empty cells */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const todayStr = formatDate(today);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const status = getDayStatus(dateStr);
                  const isFuture = dateStr > todayStr;

                  return (
                    <motion.button
                      key={dateStr}
                      onClick={() => { if (!isFuture) { onSelectDate(dateStr); onClose(); } }}
                      whileTap={!isFuture ? { scale: 0.88 } : {}}
                      className={`
                        aspect-square rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-200 relative
                        ${isFuture ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'}
                        ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-zinc-950' : ''}
                        ${!isFuture && status !== 'empty' ? statusColors[status] : ''}
                        ${!isFuture && status === 'empty' && !isSelected ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : ''}
                        ${isToday && status === 'empty' ? 'text-indigo-400 font-bold' : ''}
                      `}
                    >
                      {day}
                      {isToday && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-5 mt-5 pt-4 border-t border-zinc-800/50">
                {[
                  { color: 'bg-emerald-500/80', label: 'Goal met (±15%)' },
                  { color: 'bg-amber-500/70', label: 'Partial' },
                  { color: 'bg-zinc-700/50', label: 'No data' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-[10px] text-zinc-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
