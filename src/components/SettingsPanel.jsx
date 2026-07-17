import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, Settings, Target, Database, Shield } from 'lucide-react';
import { useGoals, exportData, importData } from '../utils/helpers';

function GoalInput({ label, goalKey, value, unit, onUpdate, color }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(String(value));

  const save = async () => {
    const n = parseFloat(temp);
    if (!isNaN(n) && n > 0) await onUpdate(goalKey, n);
    setEditing(false);
  };

  return (
    <div className="glass-panel p-3 flex items-center gap-3">
      <div className={`w-2 h-8 rounded-full ${color}`} />
      <div className="flex-1">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              className="input-field py-1 text-sm w-24"
              value={temp}
              onChange={e => setTemp(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            />
            <span className="text-xs text-zinc-500">{unit}</span>
            <button onClick={save} className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Save</button>
          </div>
        ) : (
          <button
            onClick={() => { setTemp(String(value)); setEditing(true); }}
            className="text-base font-bold text-zinc-100 hover:text-white transition-colors"
          >
            {value} <span className="text-sm font-medium text-zinc-500">{unit}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPanel({ isOpen, onClose }) {
  const { goalCalories, goalProtein, goalFats, goalCarbs, updateGoal } = useGoals();
  const [importStatus, setImportStatus] = useState('');
  const [persistStatus, setPersistStatus] = useState('');

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('importing');
      await importData(file);
      setImportStatus('success');
      setTimeout(() => setImportStatus(''), 3000);
    } catch {
      setImportStatus('error');
      setTimeout(() => setImportStatus(''), 3000);
    }
    e.target.value = '';
  };

  const handleRequestPersist = async () => {
    if (!navigator.storage?.persist) {
      setPersistStatus('unsupported');
      return;
    }
    const granted = await navigator.storage.persist();
    setPersistStatus(granted ? 'granted' : 'denied');
    setTimeout(() => setPersistStatus(''), 4000);
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
              className="glass-panel-dark rounded-t-3xl border-t border-zinc-800/60 flex flex-col overflow-hidden"
              style={{ maxHeight: '92dvh' }}
            >
              {/* Header */}
              <div className="pt-3 px-5 pb-4 border-b border-zinc-800/50 flex-shrink-0">
                <div className="drag-handle" />
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-50">Settings</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Goals, data & preferences</p>
                  </div>
                  <button onClick={onClose} className="glass-btn w-8 h-8 flex items-center justify-center">
                    <X size={16} className="text-zinc-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-6">
                {/* Daily Goals */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={14} className="text-indigo-400" />
                    <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Daily Goals</h3>
                  </div>
                  <div className="space-y-2">
                    <GoalInput label="Calories" goalKey="goalCalories" value={goalCalories} unit="kcal" onUpdate={updateGoal} color="bg-amber-500" />
                    <GoalInput label="Protein"  goalKey="goalProtein"  value={goalProtein}  unit="g"    onUpdate={updateGoal} color="bg-blue-500" />
                    <GoalInput label="Fats"     goalKey="goalFats"     value={goalFats}     unit="g"    onUpdate={updateGoal} color="bg-rose-500" />
                    <GoalInput label="Carbohydrates" goalKey="goalCarbs" value={goalCarbs} unit="g"    onUpdate={updateGoal} color="bg-emerald-500" />
                  </div>
                </section>

                {/* Data Passport */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Database size={14} className="text-violet-400" />
                    <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Data Passport</h3>
                  </div>
                  <div className="glass-panel p-4 space-y-3">
                    <p className="text-xs text-zinc-500">
                      All data lives exclusively in your browser's IndexedDB. Export it to keep a local backup, or restore from a previous export.
                    </p>
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={exportData}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download size={14} />
                        Export JSON
                      </motion.button>
                      <label className="flex-1">
                        <motion.span
                          whileTap={{ scale: 0.97 }}
                          className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            importStatus === 'success'
                              ? 'bg-emerald-600 text-white'
                              : importStatus === 'error'
                                ? 'bg-rose-600 text-white'
                                : 'bg-zinc-700/80 hover:bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          <Upload size={14} />
                          {importStatus === 'importing' ? 'Importing...' :
                           importStatus === 'success' ? '✓ Restored!' :
                           importStatus === 'error' ? '✗ Failed' : 'Restore JSON'}
                        </motion.span>
                        <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                      </label>
                    </div>
                  </div>
                </section>

                {/* Storage Persistence */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={14} className="text-emerald-400" />
                    <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Storage Protection</h3>
                  </div>
                  <div className="glass-panel p-4">
                    <p className="text-xs text-zinc-500 mb-3">
                      Request browser storage persistence to prevent your data from being automatically evicted by the browser under storage pressure.
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleRequestPersist}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        persistStatus === 'granted'
                          ? 'bg-emerald-600 text-white'
                          : persistStatus === 'denied'
                            ? 'bg-zinc-700 text-zinc-400'
                            : persistStatus === 'unsupported'
                              ? 'bg-zinc-800 text-zinc-600'
                              : 'bg-zinc-700/80 hover:bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      <Shield size={14} />
                      {persistStatus === 'granted' ? '✓ Storage Persisted!' :
                       persistStatus === 'denied' ? 'Permission Denied' :
                       persistStatus === 'unsupported' ? 'Not Supported' :
                       'Request Persistence'}
                    </motion.button>
                  </div>
                </section>

                {/* About */}
                <section className="pb-4">
                  <div className="glass-panel p-4 text-center">
                    <p className="text-sm font-bold gradient-text-blue">CalTrack</p>
                    <p className="text-xs text-zinc-600 mt-1">v1.0 · Local-First · No Cloud · Your Data</p>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
