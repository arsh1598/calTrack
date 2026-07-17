import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { deleteLog, updateLog } from '../utils/helpers';

function EntryItem({ log, food, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  // The weight field is always directly editable — no mode toggle needed
  const [grams, setGrams] = useState(String(log.quantityGrams));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  if (!food) return null;

  const ratio = Number(grams) > 0 ? Number(grams) / 100 : log.quantityGrams / 100;
  const cal  = Math.round(food.defaultCalories * ratio);
  const prot = Math.round(food.protein * ratio * 10) / 10;
  const fat  = Math.round(food.fats   * ratio * 10) / 10;
  const carb = Math.round(food.carbs  * ratio * 10) / 10;

  const handleGramsChange = (val) => {
    setGrams(val);
    setDirty(val !== String(log.quantityGrams) && Number(val) > 0);
  };

  const handleSave = async () => {
    if (!grams || Number(grams) <= 0) return;
    setSaving(true);
    await updateLog(log.id, { quantityGrams: Number(grams) });
    setSaving(false);
    setDirty(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setGrams(String(log.quantityGrams));
      setDirty(false);
      inputRef.current?.blur();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        y: -20,
        scale: 0.95,
        transition: { duration: 0.22, ease: 'easeIn' },
      }}
      className="glass-panel p-3 mb-2"
    >
      <div className="flex items-center gap-3">
        {/* Calorie badge */}
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-amber-400 tabular-nums">{cal}</span>
          <span className="text-[9px] text-amber-600 font-medium">kcal</span>
        </div>

        {/* Info + inline editable weight */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate leading-none mb-1.5">{food.name}</p>

          {/* Weight row — always editable */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="number"
              className="w-16 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-xs font-bold text-zinc-100 px-2 py-1 text-center focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              value={grams}
              onChange={e => handleGramsChange(e.target.value)}
              onKeyDown={handleKeyDown}
              min="1"
            />
            <span className="text-xs text-zinc-500 font-medium">g</span>

            {/* Save button appears when value changes */}
            <AnimatePresence>
              {dirty && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600/80 hover:bg-indigo-600 text-white transition-colors"
                >
                  {saving ? '…' : 'Save'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Macro summary */}
          <p className="text-[10px] text-zinc-600 mt-1">
            {prot}g P · {fat}g F · {carb}g C
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
          >
            {expanded
              ? <ChevronUp size={14} className="text-zinc-500" />
              : <ChevronDown size={14} className="text-zinc-500" />}
          </button>
          <button
            onClick={() => onDelete(log.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 size={14} className="text-zinc-600 hover:text-rose-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Expanded breakdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-zinc-800/60">
              {[
                { label: 'Calories', value: cal,  suffix: 'kcal', color: 'text-amber-400' },
                { label: 'Protein',  value: prot, suffix: 'g',    color: 'text-blue-400' },
                { label: 'Fats',     value: fat,  suffix: 'g',    color: 'text-rose-400' },
                { label: 'Carbs',    value: carb, suffix: 'g',    color: 'text-emerald-400' },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <p className={`text-sm font-bold ${m.color}`}>{m.value}<span className="text-[9px] font-normal text-zinc-600 ml-0.5">{m.suffix}</span></p>
                  <p className="text-[10px] text-zinc-600">{m.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-700 mt-2">
              Logged {new Date(log.consumedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DiaryList({ logs, foodMap }) {
  const handleDelete = (id) => deleteLog(id);

  if (!logs || logs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800/50 flex items-center justify-center mb-3">
          <span className="text-2xl">🍽️</span>
        </div>
        <p className="text-sm font-semibold text-zinc-400">No food logged yet</p>
        <p className="text-xs text-zinc-600 mt-1">Tap the + button to add your first entry</p>
      </motion.div>
    );
  }

  return (
    <div>
      <AnimatePresence mode="popLayout">
        {logs.map(log => (
          <EntryItem
            key={log.id}
            log={log}
            food={foodMap[log.foodId]}
            onDelete={handleDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
