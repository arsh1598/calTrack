import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Pencil, Trash2, Search, Check } from 'lucide-react';
import { useFoods, upsertFood, deleteFood } from '../utils/helpers';

const EMPTY_FOOD = { name: '', defaultCalories: '', protein: '', fats: '', carbs: '' };

function FoodForm({ initial = EMPTY_FOOD, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Food name is required'); return; }
    if (!form.defaultCalories || isNaN(form.defaultCalories)) { setError('Calories required'); return; }
    setError('');
    await onSave({
      ...form,
      defaultCalories: Number(form.defaultCalories),
      protein: Number(form.protein) || 0,
      fats:    Number(form.fats) || 0,
      carbs:   Number(form.carbs) || 0,
    });
  };

  const field = (key, label, placeholder, unit) => (
    <div key={key}>
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
        {label} <span className="text-zinc-700">({unit})</span>
      </label>
      <input
        type={key === 'name' ? 'text' : 'number'}
        className="input-field"
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass-panel p-4 space-y-3"
    >
      <h3 className="text-sm font-bold text-zinc-200">{initial.id ? 'Edit Food' : 'Add Custom Food'}</h3>
      <p className="text-[11px] text-zinc-500">All values are per 100g</p>

      {field('name', 'Food Name', 'e.g. Quinoa', 'text')}
      <div className="grid grid-cols-2 gap-2">
        {field('defaultCalories', 'Calories', '0', 'kcal')}
        {field('protein', 'Protein', '0', 'g')}
        {field('fats', 'Fats', '0', 'g')}
        {field('carbs', 'Carbohydrates', '0', 'g')}
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <div className="flex gap-2">
        <button onClick={onCancel} className="glass-btn flex-1 py-2 text-sm text-zinc-400">
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
        >
          Save Food
        </button>
      </div>
    </motion.div>
  );
}

export default function FoodDirectoryPanel({ isOpen, onClose }) {
  const foods = useFoods();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = foods.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (food) => {
    await upsertFood(food);
    setAdding(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await deleteFood(id);
    setConfirmDelete(null);
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
              {/* Header */}
              <div className="pt-3 px-5 pb-4 border-b border-zinc-800/50 flex-shrink-0">
                <div className="drag-handle" />
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-50">Food Directory</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">{foods.length} items in database</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAdding(true); setEditing(null); }}
                      className="glass-btn px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-400"
                    >
                      <Plus size={12} />
                      Add Food
                    </button>
                    <button onClick={onClose} className="glass-btn w-8 h-8 flex items-center justify-center">
                      <X size={16} className="text-zinc-400" />
                    </button>
                  </div>
                </div>
                <div className="relative mt-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    className="input-field pl-8"
                    placeholder="Search directory..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
                {/* Add / Edit form */}
                <AnimatePresence>
                  {(adding || editing) && (
                    <FoodForm
                      key={editing ? `edit-${editing.id}` : 'add'}
                      initial={editing || EMPTY_FOOD}
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-100 truncate">{food.name}</p>
                          {food.isCustom && (
                            <span className="text-[9px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              CUSTOM
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {food.defaultCalories} kcal · {food.protein}g P · {food.fats}g F · {food.carbs}g C
                        </p>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditing(food); setAdding(false); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800"
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
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(food.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10"
                          >
                            <Trash2 size={13} className="text-zinc-600 hover:text-rose-400" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
