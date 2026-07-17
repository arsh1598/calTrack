import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, BookOpen, Settings, Zap, ChevronDown, X, Database } from 'lucide-react';

import { db } from './db';
import {
  formatDate,
  calcMacros,
  useGoals,
  useDayLogs,
  useFoodMap,
  useAnimatedNumber,
  requestStoragePersistence,
} from './utils/helpers';

import MacroRing from './components/MacroRing';
import DateStrip from './components/DateStrip';
import LogDrawer from './components/LogDrawer';
import DiaryList from './components/DiaryList';
import FoodDirectoryPanel from './components/FoodDirectoryPanel';
import CalendarView from './components/CalendarView';
import SettingsPanel from './components/SettingsPanel';

// ── Storage Persistence Banner ────────────────────────────────────────────────
function PersistBanner({ onDismiss }) {
  const [status, setStatus] = useState('idle'); // idle | requesting | granted | denied

  const handleRequest = async () => {
    setStatus('requesting');
    try {
      const granted = await requestStoragePersistence();
      setStatus(granted ? 'granted' : 'denied');
      setTimeout(onDismiss, 2000);
    } catch {
      setStatus('denied');
    }
  };

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 240 }}
      className="fixed top-0 inset-x-0 z-50 safe-top"
    >
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="glass-panel p-3 flex items-center gap-3 border-indigo-500/30">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
            <Database size={14} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-200">Protect Your Data</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
              Allow persistent storage so your diary is never auto-deleted by the browser.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {status === 'idle' && (
              <button
                onClick={handleRequest}
                className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Allow
              </button>
            )}
            {status === 'requesting' && (
              <span className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            )}
            {status === 'granted' && <span className="text-xs font-bold text-emerald-400">✓ Saved!</span>}
            {status === 'denied' && <span className="text-xs font-bold text-rose-400">Denied</span>}
            <button onClick={onDismiss} className="glass-btn w-6 h-6 flex items-center justify-center">
              <X size={12} className="text-zinc-500" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Calorie Ring (large, center) ──────────────────────────────────────────────
function CalorieRing({ calories, goal, size = 160 }) {
  const animated = useAnimatedNumber(calories);
  const radius = (size - 14) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(calories / (goal || 2000), 1);
  const offset = circ * (1 - pct);
  const isOver = calories > goal;

  return (
    <div className="relative flex flex-col items-center">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: isOver
            ? 'radial-gradient(circle, rgba(244,63,94,0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          transform: 'scale(1.3)',
        }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="calGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isOver ? '#f43f5e' : '#6366f1'} />
            <stop offset="100%" stopColor={isOver ? '#ec4899' : '#a78bfa'} />
          </linearGradient>
          <filter id="calGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(39,39,42,0.8)" strokeWidth={14} />
        <motion.circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke="url(#calGradient)"
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circ}
          filter="url(#calGlow)"
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={animated}
          className="text-3xl font-black text-zinc-50 leading-none tabular-nums"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
        >
          {animated.toLocaleString()}
        </motion.span>
        <span className="text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-widest">kcal</span>
        <span className="text-[10px] text-zinc-700 mt-0.5">of {goal.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', icon: Zap, label: 'Today' },
    { id: 'foods', icon: BookOpen, label: 'Foods' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 safe-bottom">
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="glass-panel-dark p-1.5 flex gap-1">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-300 relative ${
                activeTab === id ? 'tab-active' : 'hover:bg-zinc-800/50'
              }`}
            >
              {activeTab === id && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-xl bg-indigo-500/10 border border-indigo-500/30"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={18}
                className={`relative z-10 transition-colors ${activeTab === id ? 'text-indigo-400' : 'text-zinc-500'}`}
              />
              <span className={`text-[10px] font-semibold relative z-10 transition-colors ${
                activeTab === id ? 'text-indigo-400' : 'text-zinc-600'
              }`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ selectedDate, setSelectedDate, goals, onOpenLogDrawer }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const logs = useDayLogs(selectedDate);
  const foodMap = useFoodMap();

  const macros = calcMacros(logs ?? [], foodMap);
  const remaining = goals.goalCalories - macros.calories;
  const isToday = selectedDate === formatDate();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-50">
            {isToday ? "Today's Macros" : formatDisplayDate(selectedDate)}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {remaining > 0
              ? `${remaining} kcal remaining`
              : remaining === 0
                ? 'Goal reached! 🎯'
                : `${Math.abs(remaining)} kcal over goal`}
          </p>
        </div>
        <button
          onClick={() => setCalendarOpen(true)}
          className="glass-btn px-3 py-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400"
        >
          <Calendar size={14} />
          Calendar
        </button>
      </div>

      {/* Date strip */}
      <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Main calorie ring */}
      <div className="glass-panel p-6 flex flex-col items-center gap-5">
        <CalorieRing calories={macros.calories} goal={goals.goalCalories} />

        {/* Macro rings row */}
        <div className="grid grid-cols-3 gap-3 w-full">
          <MacroRing
            label="Protein"
            value={macros.protein}
            goal={goals.goalProtein}
            gradientId="protGrad"
            gradientColors={['#60a5fa', '#818cf8']}
            size={100}
            strokeWidth={8}
          />
          <MacroRing
            label="Fats"
            value={macros.fats}
            goal={goals.goalFats}
            gradientId="fatGrad"
            gradientColors={['#f87171', '#fb923c']}
            size={100}
            strokeWidth={8}
          />
          <MacroRing
            label="Carbs"
            value={macros.carbs}
            goal={goals.goalCarbs}
            gradientId="carbGrad"
            gradientColors={['#34d399', '#6ee7b7']}
            size={100}
            strokeWidth={8}
          />
        </div>

        {/* Quick stats bar */}
        <div className="w-full grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/50">
          {[
            { label: 'Logged', value: (logs ?? []).length, suffix: ' items' },
            { label: 'Protein', value: `${Math.round((macros.protein / (goals.goalProtein || 1)) * 100)}`, suffix: '%' },
            { label: 'Calories', value: `${Math.round((macros.calories / (goals.goalCalories || 1)) * 100)}`, suffix: '%' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-sm font-bold text-zinc-100">{s.value}<span className="text-xs text-zinc-500 font-normal">{s.suffix}</span></p>
              <p className="text-[10px] text-zinc-600">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Diary section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Food Diary</h2>
          <span className="text-xs text-zinc-600">{(logs ?? []).length} entries</span>
        </div>
        <DiaryList logs={logs ?? []} foodMap={foodMap} />
      </div>

      {/* FAB */}
      <div className="h-24" /> {/* Bottom padding for nav */}

      <motion.button
        onClick={() => onOpenLogDrawer()}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed right-5 bottom-24 z-20 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/40 flex items-center justify-center"
        style={{ boxShadow: '0 4px 24px rgba(99,102,241,0.5)' }}
      >
        <Plus size={24} className="text-white" />
      </motion.button>

      <CalendarView
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelectDate={setSelectedDate}
        selectedDate={selectedDate}
        goals={goals}
      />
    </div>
  );
}

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [selectedDate, setSelectedDate] = useState(formatDate());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPersistBanner, setShowPersistBanner] = useState(false);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [preselectedFood, setPreselectedFood] = useState(null);
  const goals = useGoals();

  const handleOpenLogDrawer = (food = null) => {
    setPreselectedFood(food);
    setLogDrawerOpen(true);
  };

  // Request storage persistence on mount
  useEffect(() => {
    const checkPersistence = async () => {
      if (!navigator.storage?.persisted) return;
      const persisted = await navigator.storage.persisted();
      if (!persisted) {
        setShowPersistBanner(true);
      }
    };
    // Small delay for better UX
    const t = setTimeout(checkPersistence, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-dvh bg-zinc-950 relative overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)' }}
        />
      </div>

      {/* Storage persistence banner */}
      <AnimatePresence>
        {showPersistBanner && (
          <PersistBanner onDismiss={() => setShowPersistBanner(false)} />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-32 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + selectedDate}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardTab
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                goals={goals}
                onOpenLogDrawer={handleOpenLogDrawer}
              />
            )}
            {activeTab === 'foods' && (
              <FoodDirectoryPanel inline={true} onOpenLogDrawer={handleOpenLogDrawer} />
            )}
            {activeTab === 'settings' && (
              <SettingsPanel inline={true} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Overlays */}
      <LogDrawer 
        isOpen={logDrawerOpen} 
        onClose={() => setLogDrawerOpen(false)} 
        date={selectedDate} 
        preselectedFood={preselectedFood} 
      />
    </div>
  );
}
