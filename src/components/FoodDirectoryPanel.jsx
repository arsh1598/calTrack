import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Pencil, Trash2, Search, Hash } from 'lucide-react';
import { useFoods, upsertFood, deleteFood } from '../utils/helpers';

const EMPTY_FOOD = {
  name: '',
  defaultCalories: '',
  protein: '',
  fats: '',
  carbs: '',
  servingSize: '',
  servingUnit: '',
  servingLabel: '',
};

function FoodForm({ initial = EMPTY_FOOD, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FOOD, ...initial });
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Food name is required'); return; }
    if (!form.defaultCalories || isNaN(form.defaultCalories)) { setError('Calories (per 100g) required'); return; }
    setError('');

    const payload = {
      ...form,
      defaultCalories: Number(form.defaultCalories),
      protein:  Number(form.protein)  || 0,
      fats:     Number(form.fats)     || 0,
      carbs:    Number(form.carbs)    || 0,
    };

    // Strip/ignore serving size fields as quantity mode is disabled
    delete payload.servingSize;
    delete payload.servingUnit;
    delete payload.servingLabel;

    await onSave(payload);
  };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const textField = (key, label, placeholder) => (
    <div key={key}>
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
        {label}
      </label>
      <input
        type="text"
        className="input-field"
        placeholder={placeholder}
        value={form[key] ?? ''}
        onChange={e => set(key, e.target.value)}
      />
    </div>
  );

  const numField = (key, label, placeholder, unit) => (
    <div key={key}>
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
        {label} <span className="text-zinc-700">({unit})</span>
      </label>
      <input
        type="number"
        className="input-field"
        placeholder={placeholder}
        value={form[key] ?? ''}
        onChange={e => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass-panel p-4 space-y-4"
    >
      <div>
        <h3 className="text-sm font-bold text-zinc-200">{initial.id ? 'Edit Food' : 'Add Custom Food'}</h3>
        <p className="text-[11px] text-zinc-500 mt-0.5">Macros are per 100g</p>
      </div>

      {/* Name */}
      {textField('name', 'Food Name', 'e.g. Quinoa')}

      {/* Macros */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Macros per 100g</p>
        <div className="grid grid-cols-2 gap-2">
          {numField('defaultCalories', 'Calories',      '0', 'kcal')}
          {numField('protein',         'Protein',       '0', 'g')}
          {numField('fats',            'Fats',          '0', 'g')}
          {numField('carbs',           'Carbohydrates', '0', 'g')}
        </div>
      </div>



      {error && <p className="text-xs text-rose-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="glass-btn flex-1 py-2.5 text-sm text-zinc-400">
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
        >
          Save Food
        </button>
      </div>
    </motion.div>
  );
}

export default function FoodDirectoryPanel({ isOpen, onClose, inline = false, onOpenLogDrawer }) {
  const foods = useFoods();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const searchTokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = searchTokens.length
    ? foods.filter(f => {
        const nameLower = f.name.toLowerCase();
        return searchTokens.every(token => nameLower.includes(token));
      })
    : foods;

  const handleSave = async (food) => {
    await upsertFood(food);
    setAdding(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await deleteFood(id);
    setConfirmDelete(null);
  };

  const renderContent = () => (
    <>
      {/* Header */}
      <div className={`flex items-center justify-between ${inline ? 'mb-4' : 'pt-3 px-5 pb-4 border-b border-zinc-800/50 flex-shrink-0'}`}>
        {!inline && <div className="drag-handle" />}
        <div className={`flex items-center justify-between w-full ${!inline && 'mt-1'}`}>
          <div>
            <h2 className="text-lg font-bold text-zinc-50">{inline ? 'Food Directory' : 'Food Directory'}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{foods.length} items · tap pencil to edit macros</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setAdding(true); setEditing(null); }}
              className="glass-btn px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-400"
            >
              <Plus size={12} />
              Add Food
            </button>
            {!inline && (
              <button onClick={onClose} className="glass-btn w-8 h-8 flex items-center justify-center">
                <X size={16} className="text-zinc-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className={inline ? 'mb-4' : 'px-5 py-2 border-b border-zinc-800/20'}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            className="input-field pl-8"
            placeholder="Search directory…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className={inline ? 'space-y-2' : 'flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2'}>
        {/* Add / Edit form */}
        <AnimatePresence>
          {(adding || editing) && (
            <FoodForm
              key={editing ? `edit-${editing.id}` : 'add'}
              initial={editing ?? EMPTY_FOOD}
              onSave={handleSave}
              onCancel={() => { setAdding(false); setEditing(null); }}
            />
          )}
        </AnimatePresence>

        {/* Food items */}
        <AnimatePresence>
          {filtered.map((food) => (
            <motion.div
              key={food.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="glass-panel p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{food.name}</p>
                  {food.isCustom && (
                    <span className="text-[9px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      CUSTOM
                    </span>
                  )}
                  {food.servingSize && (
                    <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      <Hash size={8} className="inline mr-0.5" />
                      {food.servingUnit}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {food.defaultCalories} kcal · {food.protein}g P · {food.fats}g F · {food.carbs}g C
                  <span className="text-zinc-700"> per 100g</span>
                </p>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                {onOpenLogDrawer && (
                  <button
                    onClick={() => onOpenLogDrawer(food)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-500/10 transition-colors"
                    title="Log food"
                  >
                    <Plus size={15} className="text-indigo-400 hover:text-indigo-300" />
                  </button>
                )}
                <button
                  onClick={() => { setEditing(food); setAdding(false); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Edit macros"
                >
                  <Pencil size={13} className="text-zinc-500 hover:text-zinc-300" />
                </button>
                {confirmDelete === food.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(food.id)}
                      className="text-[10px] font-bold text-rose-400 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-[10px] text-zinc-500 px-1"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(food.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={13} className="text-zinc-600 hover:text-rose-400" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );

  if (inline) {
    return <div className="space-y-4">{renderContent()}</div>;
  }

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
            className="fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div
              className="glass-panel-dark rounded-t-3xl border-t border-zinc-800/60 overflow-hidden flex flex-col"
              style={{ maxHeight: '92dvh' }}
            >
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
