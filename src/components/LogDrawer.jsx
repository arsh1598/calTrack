import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, ChevronDown, Zap } from 'lucide-react';
import { useFoods, addLog } from '../utils/helpers';

const MACROS = [
  { key: 'overrideCalories', baseKey: 'defaultCalories', label: 'Calories', unit: 'kcal' },
  { key: 'overrideProtein',  baseKey: 'protein',         label: 'Protein',  unit: 'g' },
  { key: 'overrideFats',     baseKey: 'fats',            label: 'Fats',     unit: 'g' },
  { key: 'overrideCarbs',    baseKey: 'carbs',           label: 'Carbs',    unit: 'g' },
];

function computePreview(food, grams, overrides) {
  if (!food || !grams) return { calories: 0, protein: 0, fats: 0, carbs: 0 };
  const r = Number(grams) / 100;
  return {
    calories: Math.round((overrides.overrideCalories ?? food.defaultCalories) * r),
    protein:  Math.round((overrides.overrideProtein  ?? food.protein) * r * 10) / 10,
    fats:     Math.round((overrides.overrideFats     ?? food.fats) * r * 10) / 10,
    carbs:    Math.round((overrides.overrideCarbs    ?? food.carbs) * r * 10) / 10,
  };
}

export default function LogDrawer({ isOpen, onClose, date }) {
  const foods = useFoods();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState('');
  const [modify, setModify] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const filtered = foods.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const preview = computePreview(selected, grams, overrides);

  const handleSelectFood = (food) => {
    setSelected(food);
    setOverrides({});
    setModify(false);
    setGrams('');
    setSuccess(false);
  };

  const handleLog = async () => {
    if (!selected || !grams || Number(grams) <= 0) return;
    setLoading(true);
    try {
      const overridePayload = modify ? Object.fromEntries(
        Object.entries(overrides).filter(([, v]) => v !== '' && v !== undefined)
          .map(([k, v]) => [k, Number(v)])
      ) : {};
      await addLog({ date, foodId: selected.id, quantityGrams: Number(grams), overrides: overridePayload });
      setSuccess(true);
      setTimeout(() => {
        setSelected(null);
        setGrams('');
        setOverrides({});
        setModify(false);
        setSearch('');
        setSuccess(false);
        onClose();
      }, 700);
    } finally {
      setLoading(false);
    }
  };

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelected(null);
      setGrams('');
      setOverrides({});
      setModify(false);
      setSuccess(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="glass-panel-dark rounded-t-3xl border-t border-zinc-800/60 overflow-hidden"
              style={{ maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>

              {/* Handle + header */}
              <div className="pt-3 px-5 pb-4 border-b border-zinc-800/50 flex-shrink-0">
                <div className="drag-handle" />
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-50">Log Food</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Quick-add to your diary</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="glass-btn w-8 h-8 flex items-center justify-center"
                  >
                    <X size={16} className="text-zinc-400" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative mt-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    className="input-field pl-8"
                    placeholder="Search foods..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Food list or logging panel */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <AnimatePresence mode="wait">
                  {!selected ? (
                    <motion.div
                      key="food-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-3 space-y-1"
                    >
                      {filtered.length === 0 && (
                        <p className="text-center text-zinc-500 text-sm py-8">No foods found</p>
                      )}
                      {filtered.map((food) => (
                        <motion.button
                          key={food.id}
                          onClick={() => handleSelectFood(food)}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full text-left p-3 rounded-xl border border-transparent hover:bg-zinc-800/60 hover:border-zinc-700/40 transition-all duration-200 flex items-center justify-between group"
                        >
                          <div>
                            <p className="text-sm font-semibold text-zinc-100 group-hover:text-white">{food.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {food.defaultCalories} kcal · {food.protein}g P · {food.fats}g F · {food.carbs}g C <span className="text-zinc-600">(per 100g)</span>
                            </p>
                          </div>
                          <ChevronDown size={14} className="text-zinc-600 group-hover:text-zinc-400 -rotate-90" />
                        </motion.button>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="log-panel"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-5 space-y-4"
                    >
                      {/* Selected food header */}
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => setSelected(null)}
                          className="glass-btn px-3 py-1.5 text-xs text-zinc-400 flex-shrink-0"
                        >
                          ← Back
                        </button>
                        <div>
                          <h3 className="text-base font-bold text-zinc-50">{selected.name}</h3>
                          <p className="text-xs text-zinc-500">{selected.defaultCalories} kcal per 100g</p>
                        </div>
                      </div>

                      {/* Grams input */}
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
                          Amount (grams)
                        </label>
                        <input
                          type="number"
                          className="input-field text-xl font-bold"
                          placeholder="e.g. 150"
                          value={grams}
                          onChange={e => setGrams(e.target.value)}
                          min="1"
                          autoFocus
                        />
                      </div>

                      {/* Preview macros */}
                      {grams && Number(grams) > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid grid-cols-4 gap-2"
                        >
                          {[
                            { label: 'Cal', value: preview.calories, color: 'text-amber-400' },
                            { label: 'Prot', value: preview.protein + 'g', color: 'text-blue-400' },
                            { label: 'Fats', value: preview.fats + 'g', color: 'text-rose-400' },
                            { label: 'Carbs', value: preview.carbs + 'g', color: 'text-emerald-400' },
                          ].map(m => (
                            <div key={m.label} className="glass-panel p-2 text-center">
                              <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">{m.label}</p>
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {/* Modify toggle */}
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-300">Modify for this entry only</p>
                          <p className="text-xs text-zinc-600">Override macros without changing the master food</p>
                        </div>
                        <button
                          onClick={() => setModify(!modify)}
                          className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                            modify ? 'bg-indigo-600' : 'bg-zinc-700'
                          }`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
                            modify ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Override fields */}
                      <AnimatePresence>
                        {modify && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              {MACROS.map(m => (
                                <div key={m.key}>
                                  <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block mb-1">
                                    {m.label} per 100g ({m.unit})
                                  </label>
                                  <input
                                    type="number"
                                    className="input-field"
                                    placeholder={String(selected[m.baseKey] ?? '')}
                                    value={overrides[m.key] ?? ''}
                                    onChange={e => setOverrides(prev => ({ ...prev, [m.key]: e.target.value }))}
                                  />
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Log button */}
                      <motion.button
                        onClick={handleLog}
                        disabled={!grams || Number(grams) <= 0 || loading}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                          success
                            ? 'bg-emerald-600 text-white shadow-glow-emerald'
                            : !grams || Number(grams) <= 0
                              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                              : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-500 hover:to-violet-500'
                        }`}
                      >
                        {success ? (
                          <>✓ Logged!</>
                        ) : loading ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Zap size={16} />
                            Log to Diary
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
