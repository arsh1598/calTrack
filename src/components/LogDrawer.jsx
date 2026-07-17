import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Zap, Clock, Hash, Scale, Globe, Scan, AlertCircle, Loader, ChevronRight } from 'lucide-react';
import { useFoods, useRecentFoods, addLog } from '../utils/helpers';
import { saveImportedFood } from '../db';
import {
  searchFoodByName,
  searchFoodByBarcode,
  looksLikeBarcode,
  ProductNotFoundError,
  IncompleteMacroDataError,
  NetworkError,
} from '../services/openFoodFacts';

// ── Helpers ───────────────────────────────────────────────────────────────────
function computePreview(food, grams) {
  if (!food || !grams || Number(grams) <= 0) return null;
  const r = Number(grams) / 100;
  return {
    calories: Math.round(food.defaultCalories * r),
    protein:  Math.round(food.protein * r * 10) / 10,
    fats:     Math.round(food.fats    * r * 10) / 10,
    carbs:    Math.round(food.carbs   * r * 10) / 10,
  };
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function MacroPreview({ preview }) {
  if (!preview) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-4 gap-2"
    >
      {[
        { label: 'Cal',  value: preview.calories,       color: 'text-amber-400' },
        { label: 'Prot', value: `${preview.protein}g`,  color: 'text-blue-400' },
        { label: 'Fats', value: `${preview.fats}g`,     color: 'text-rose-400' },
        { label: 'Carbs',value: `${preview.carbs}g`,    color: 'text-emerald-400' },
      ].map(m => (
        <div key={m.label} className="glass-panel p-2 text-center">
          <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">{m.label}</p>
        </div>
      ))}
    </motion.div>
  );
}

function GramChips({ food, onSelect }) {
  const chips = [];
  if (food.servingSize) {
    chips.push({ label: `${food.servingSize}g (1 ${food.servingUnit})`, value: food.servingSize });
    if (food.servingSize * 2 < 600) {
      const plural = food.servingLabel || food.servingUnit;
      chips.push({ label: `${food.servingSize * 2}g (2 ${plural})`, value: food.servingSize * 2 });
    }
  }
  const standards = [50, 100, 150, 200].filter(v => !chips.some(c => c.value === v));
  standards.slice(0, 4 - chips.length).forEach(v => chips.push({ label: `${v}g`, value: v }));

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(c => (
        <button
          key={c.label}
          onClick={() => onSelect(String(c.value))}
          className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-all duration-200"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function GramsInput({ food, grams, setGrams }) {
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Amount (grams)</label>
        <div className="flex items-center gap-3">
          <input ref={inputRef} type="number" className="input-field text-3xl font-black flex-1"
            placeholder="0" value={grams} onChange={e => setGrams(e.target.value)} min="1" />
          <span className="text-lg font-semibold text-zinc-500 flex-shrink-0">g</span>
        </div>
      </div>

      <GramChips food={food} onSelect={setGrams} />
    </div>
  );
}

/** A single food card in local list */
function FoodCard({ food, onSelect }) {
  return (
    <motion.button
      onClick={() => onSelect(food)}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left p-3 rounded-xl border border-transparent hover:bg-zinc-800/60 hover:border-zinc-700/40 transition-all duration-150 flex items-center gap-3 group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate">{food.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {food.defaultCalories} kcal · {food.protein}g P · {food.fats}g F · {food.carbs}g C
          {food.servingUnit && <span className="text-zinc-700"> · {food.servingUnit}</span>}
        </p>
      </div>
      <div className="w-7 h-7 rounded-lg bg-zinc-800/50 group-hover:bg-indigo-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
        <span className="text-zinc-500 group-hover:text-indigo-400 text-lg leading-none font-bold">+</span>
      </div>
    </motion.button>
  );
}

/** A single Open Food Facts result card */
function OFFCard({ food, onImport, importing }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-3 flex items-center gap-3"
    >
      {food.imageUrl && (
        <img src={food.imageUrl} alt={food.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-zinc-800" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 truncate">{food.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {food.defaultCalories} kcal · {food.protein}g P · {food.fats}g F · {food.carbs}g C
          <span className="text-zinc-700"> per 100g</span>
        </p>
      </div>
      <button
        onClick={() => onImport(food)}
        disabled={importing}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
      >
        {importing ? <Loader size={12} className="animate-spin" /> : <><ChevronRight size={12} /> Use</>}
      </button>
    </motion.div>
  );
}

/** Error banner for OFFs errors */
function OFFError({ error, onClose }) {
  let message = error;
  let hint = '';

  if (error?.code === 'PRODUCT_NOT_FOUND') {
    message = 'Not found in Open Food Facts';
    hint = 'Try a different search term or barcode';
  } else if (error?.code === 'INCOMPLETE_MACROS') {
    message = 'Product found but missing nutrition data';
    hint = 'Add it manually via Food Directory';
  } else if (error?.code === 'NETWORK_ERROR') {
    message = 'Could not reach Open Food Facts';
    hint = 'Check your internet connection';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25"
    >
      <AlertCircle size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-xs font-semibold text-rose-300">{message}</p>
        {hint && <p className="text-[10px] text-rose-600 mt-0.5">{hint}</p>}
      </div>
      <button onClick={onClose} className="text-rose-600 hover:text-rose-400">
        <X size={13} />
      </button>
    </motion.div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function LogDrawer({ isOpen, onClose, date, preselectedFood }) {
  const allFoods    = useFoods();
  const recentFoods = useRecentFoods();

  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [grams, setGrams]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);

  // ── Open Food Facts state ─────────────────────────────────────────────────
  const [offStatus, setOffStatus]   = useState('idle'); // idle | loading | done | error
  const [offResults, setOffResults] = useState([]);
  const [offError, setOffError]     = useState(null);
  const [importing, setImporting]   = useState(null);   // food name currently being imported
  const searchInputRef = useRef(null);

  const isBarcode   = looksLikeBarcode(search);
  const searchTokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const localResults = searchTokens.length
    ? allFoods.filter(f => {
        const nameLower = f.name.toLowerCase();
        return searchTokens.every(token => nameLower.includes(token));
      })
    : [];

  const showRecent  = !search.trim() && !selected;
  const showSearch  = !!search.trim() && !selected;
  const showLogger  = !!selected;
  const showOFF     = showSearch && (offStatus !== 'idle');

  const preview = computePreview(selected, grams);
  const canLog  = !!selected && !!grams && Number(grams) > 0;

  // ── OFFs search ───────────────────────────────────────────────────────────
  const triggerOffSearch = useCallback(async () => {
    if (!search.trim()) return;
    setOffStatus('loading');
    setOffResults([]);
    setOffError(null);
    try {
      let results;
      if (isBarcode) {
        const food = await searchFoodByBarcode(search.trim());
        results = [food];
      } else {
        results = await searchFoodByName(search.trim());
      }
      setOffResults(results);
      setOffStatus('done');
    } catch (err) {
      setOffError(err);
      setOffStatus('error');
    }
  }, [search, isBarcode]);

  // ── Import OFF food → local DB → logger ──────────────────────────────────
  const handleImportOFF = async (offFood) => {
    setImporting(offFood.name);
    try {
      const id = await saveImportedFood(offFood);
      // Get the saved version (with local id)
      const saved = { ...offFood, id };
      setSelected(saved);
      setGrams('');
      setOffStatus('idle');
      setOffResults([]);
    } finally {
      setImporting(null);
    }
  };

  // ── Local food selection ──────────────────────────────────────────────────
  const handleSelectFood = (food) => {
    setSelected(food);
    setGrams('');
    setSuccess(false);
  };

  // ── Log entry ─────────────────────────────────────────────────────────────
  const handleLog = async () => {
    if (!canLog) return;
    setLoading(true);
    try {
      await addLog({ date, foodId: selected.id, quantityGrams: Number(grams) });
      setSuccess(true);
      setTimeout(() => { reset(); onClose(); }, 700);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelected(null);
    setGrams('');
    setSearch('');
    setSuccess(false);
    setOffStatus('idle');
    setOffResults([]);
    setOffError(null);
  };

  useEffect(() => { 
    if (isOpen) {
      setSelected(preselectedFood || null);
      setGrams('');
      setSearch('');
      setSuccess(false);
      setOffStatus('idle');
      setOffResults([]);
      setOffError(null);
    } else {
      setTimeout(() => reset(), 300);
    }
  }, [isOpen, preselectedFood]);

  // Reset OFFs when search changes
  useEffect(() => {
    if (offStatus !== 'idle') {
      setOffStatus('idle');
      setOffResults([]);
      setOffError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="fixed inset-0 z-40 sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="glass-panel-dark rounded-t-3xl border-t border-zinc-800/60 overflow-hidden flex flex-col" style={{ maxHeight: '92dvh' }}>

              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="pt-3 px-5 pb-4 border-b border-zinc-800/50 flex-shrink-0">
                <div className="drag-handle" />
                <div className="flex items-center justify-between mb-3">
                  {showLogger ? (
                    <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors">
                      <span className="text-base">←</span> Back
                    </button>
                  ) : (
                    <h2 className="text-lg font-bold text-zinc-50">Log Food</h2>
                  )}
                  <button onClick={onClose} className="glass-btn w-8 h-8 flex items-center justify-center">
                    <X size={16} className="text-zinc-400" />
                  </button>
                </div>

                {/* Search row */}
                {!showLogger && (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        ref={searchInputRef}
                        className="input-field pl-8 pr-4"
                        placeholder={`Search foods or enter barcode…`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && search.trim() && triggerOffSearch()}
                        autoFocus
                      />
                    </div>

                    {/* Online search button */}
                    {search.trim() && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={triggerOffSearch}
                        disabled={offStatus === 'loading'}
                        title={isBarcode ? 'Lookup barcode online' : 'Search Open Food Facts'}
                        className={`glass-btn px-3 flex items-center gap-1.5 text-xs font-semibold flex-shrink-0 transition-colors ${
                          offStatus === 'loading' ? 'text-zinc-600' : 'text-indigo-400 hover:text-indigo-300'
                        }`}
                      >
                        {offStatus === 'loading'
                          ? <Loader size={14} className="animate-spin" />
                          : isBarcode
                            ? <Scan size={14} />
                            : <Globe size={14} />
                        }
                        {isBarcode ? 'Scan' : 'Online'}
                      </motion.button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Body ───────────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <AnimatePresence mode="wait">

                  {/* ── Logger panel ──────────────────────────────────── */}
                  {showLogger && (
                    <motion.div key="logger" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="p-5 space-y-5">
                      {/* Food header */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          {selected.imageUrl
                            ? <img src={selected.imageUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                            : <Zap size={20} className="text-indigo-400" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-zinc-50">{selected.name}</h3>
                            {selected.isImported && (
                              <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-full">
                                <Globe size={7} className="inline mr-0.5" />OFF
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500">
                            {selected.defaultCalories} kcal · {selected.protein}g P · {selected.fats}g F · {selected.carbs}g C
                            <span className="text-zinc-700"> per 100g</span>
                          </p>
                        </div>
                      </div>

                      <GramsInput food={selected} grams={grams} setGrams={setGrams} />
                      <MacroPreview preview={preview} />

                      <motion.button
                        onClick={handleLog}
                        disabled={!canLog || loading}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                          success ? 'bg-emerald-600 text-white'
                            : !canLog ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-500 hover:to-violet-500'
                        }`}
                      >
                        {success ? '✓ Logged!'
                          : loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <><Zap size={16} /> Log to Diary</>}
                      </motion.button>
                    </motion.div>
                  )}

                  {/* ── Recent foods list ──────────────────────────────── */}
                  {showRecent && (
                    <motion.div key="recent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3">
                      {recentFoods.length > 0 ? (
                        <>
                          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                            <Clock size={11} className="text-zinc-600" />
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Recent</span>
                          </div>
                          {recentFoods.map(f => <FoodCard key={f.id} food={f} onSelect={handleSelectFood} />)}
                        </>
                      ) : (
                        <div className="flex flex-col items-center py-12 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800/50 flex items-center justify-center mb-3">
                            <Search size={20} className="text-zinc-700" />
                          </div>
                          <p className="text-sm font-semibold text-zinc-500">Search to find foods</p>
                          <p className="text-xs text-zinc-700 mt-1">Recently logged items appear here</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ── Search results (local + OFFs) ─────────────────── */}
                  {showSearch && (
                    <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-3">

                      {/* Local results */}
                      {localResults.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 px-2 py-1 mb-0.5">
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Library</span>
                          </div>
                          {localResults.slice(0, 8).map(f => <FoodCard key={f.id} food={f} onSelect={handleSelectFood} />)}
                        </div>
                      )}

                      {/* Online search prompt (idle) */}
                      {offStatus === 'idle' && (
                        <button
                          onClick={triggerOffSearch}
                          className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-zinc-700/60 hover:border-indigo-500/40 hover:bg-indigo-500/5 text-zinc-500 hover:text-indigo-400 transition-all duration-200 group"
                        >
                          {isBarcode ? <Scan size={14} /> : <Globe size={14} />}
                          <span className="text-xs font-semibold">
                            {isBarcode
                              ? `Look up barcode "${search}" on Open Food Facts`
                              : `Search Open Food Facts for "${search}"`}
                          </span>
                          <ChevronRight size={12} className="ml-auto" />
                        </button>
                      )}

                      {/* Loading */}
                      {offStatus === 'loading' && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
                          <Loader size={16} className="text-indigo-400 animate-spin flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-zinc-300">Searching Open Food Facts…</p>
                            <p className="text-xs text-zinc-600 mt-0.5">
                              {isBarcode ? 'Looking up barcode' : `Searching for "${search}"`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Error */}
                      {offStatus === 'error' && offError && (
                        <OFFError error={offError} onClose={() => { setOffStatus('idle'); setOffError(null); }} />
                      )}

                      {/* OFFs results */}
                      {offStatus === 'done' && offResults.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 px-2 py-1 mb-1">
                            <Globe size={11} className="text-emerald-600" />
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Open Food Facts</span>
                            <span className="text-[10px] text-zinc-700">({offResults.length} results)</span>
                          </div>
                          <div className="space-y-2">
                            {offResults.map((food, i) => (
                              <OFFCard
                                key={`${food.name}-${i}`}
                                food={food}
                                onImport={handleImportOFF}
                                importing={importing === food.name}
                              />
                            ))}
                          </div>
                          <p className="text-[10px] text-zinc-700 text-center mt-3 pb-1">
                            Selecting a result will save it to your library
                          </p>
                        </div>
                      )}

                      {/* No results at all */}
                      {offStatus === 'idle' && localResults.length === 0 && (
                        <p className="text-center text-zinc-600 text-sm py-6">
                          No local matches for "{search}"
                        </p>
                      )}
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
