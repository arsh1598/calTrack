import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { deleteLog, updateLog } from '../utils/helpers';

function EntryItem({ log, food, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [grams, setGrams] = useState(String(log.quantityGrams));

  if (!food) return null;

  const ratio = log.quantityGrams / 100;
  const cal    = Math.round((log.overrideCalories ?? food.defaultCalories) * ratio);
  const prot   = Math.round((log.overrideProtein  ?? food.protein) * ratio * 10) / 10;
  const fat    = Math.round((log.overrideFats     ?? food.fats) * ratio * 10) / 10;
  const carb   = Math.round((log.overrideCarbs    ?? food.carbs) * ratio * 10) / 10;

  const hasOverrides = !!(log.overrideCalories || log.overrideProtein || log.overrideFats || log.overrideCarbs);

  const handleSaveGrams = async () => {
    if (!grams || Number(grams) <= 0) return;
    await updateLog(log.id, { quantityGrams: Number(grams) });
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.25 } }}
      className="glass-panel p-3 mb-2"
    >
      <div className="flex items-center gap-3">
        {/* Calorie badge */}
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-amber-400">{cal}</span>
          <span className="text-[9px] text-amber-600 font-medium">kcal</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-zinc-100 truncate">{food.name}</p>
            {hasOverrides && (
              <span className="text-[9px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                CUSTOM
              </span>
            )}
          </div>
          {editing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                className="input-field py-1 text-sm w-20"
                value={grams}
                onChange={e => setGrams(e.target.value)}
                autoFocus
              />
              <span className="text-xs text-zinc-500">g</span>
              <button
                onClick={handleSaveGrams}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >Save</button>
              <button
                onClick={() => { setEditing(false); setGrams(String(log.quantityGrams)); }}
                className="text-xs text-zinc-600"
              >Cancel</button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 mt-0.5">{log.quantityGrams}g · {prot}P · {fat}F · {carb}C</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800"
          >
            {expanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800"
          >
            <Edit3 size={14} className="text-zinc-500 hover:text-zinc-300" />
          </button>
          <button
            onClick={() => onDelete(log.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10"
          >
            <Trash2 size={14} className="text-zinc-600 hover:text-rose-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Expanded macro breakdown */}
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
                { label: 'Calories', value: cal, unit: 'kcal', color: 'text-amber-400' },
                { label: 'Protein',  value: prot, unit: 'g', color: 'text-blue-400' },
                { label: 'Fats',     value: fat,  unit: 'g', color: 'text-rose-400' },
                { label: 'Carbs',    value: carb, unit: 'g', color: 'text-emerald-400' },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] text-zinc-600">{m.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-700 mt-2">
              Logged at {new Date(log.consumedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DiaryList({ logs, foodMap }) {
  const handleDelete = async (id) => {
    await deleteLog(id);
  };

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
