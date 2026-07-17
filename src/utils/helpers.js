import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

/**
 * Returns YYYY-MM-DD string for a given Date or today
 */
export function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Parse YYYY-MM-DD back to Date (midnight local)
 */
export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Get labels for the last N days
 */
export function getRecentDays(n = 7) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDate(d));
  }
  return days;
}

/**
 * Calculate macros consumed from a list of log entries + food items
 */
export function calcMacros(logs, foodMap) {
  let cals = 0, protein = 0, fats = 0, carbs = 0;
  for (const log of logs) {
    const food = foodMap[log.foodId];
    if (!food) continue;
    const ratio = (log.quantityGrams / 100);
    // Allow per-entry overrides
    cals    += (log.overrideCalories ?? food.defaultCalories) * ratio;
    protein += (log.overrideProtein  ?? food.protein)         * ratio;
    fats    += (log.overrideFats     ?? food.fats)            * ratio;
    carbs   += (log.overrideCarbs    ?? food.carbs)           * ratio;
  }
  return {
    calories: Math.round(cals),
    protein:  Math.round(protein * 10) / 10,
    fats:     Math.round(fats * 10) / 10,
    carbs:    Math.round(carbs * 10) / 10,
  };
}

/**
 * Hook: daily goals from settings table
 */
export function useGoals() {
  const settings = useLiveQuery(() => db.settings.toArray(), []);
  const goals = {};
  if (settings) {
    for (const s of settings) {
      goals[s.key] = s.value;
    }
  }

  const updateGoal = useCallback(async (key, value) => {
    const existing = await db.settings.where('key').equals(key).first();
    if (existing) {
      await db.settings.update(existing.id, { value: Number(value) });
    } else {
      await db.settings.add({ key, value: Number(value) });
    }
  }, []);

  return {
    goalCalories: goals.goalCalories ?? 2000,
    goalProtein:  goals.goalProtein  ?? 150,
    goalFats:     goals.goalFats     ?? 65,
    goalCarbs:    goals.goalCarbs    ?? 200,
    updateGoal,
  };
}

/**
 * Hook: logs for a specific date
 */
export function useDayLogs(date) {
  return useLiveQuery(
    () => db.logs.where('date').equals(date).toArray(),
    [date]
  );
}

/**
 * Hook: all foods as a map { id => food }
 */
export function useFoodMap() {
  const foods = useLiveQuery(() => db.foods.toArray(), []);
  const map = {};
  if (foods) {
    for (const f of foods) map[f.id] = f;
  }
  return map;
}

/**
 * Hook: all foods as array
 */
export function useFoods() {
  return useLiveQuery(() => db.foods.orderBy('name').toArray(), []) ?? [];
}

/**
 * Hook: last 25 unique foods logged (ordered most-recent first)
 * Returns an array of food objects
 */
export function useRecentFoods() {
  const recentLogs = useLiveQuery(async () => {
    // Get all logs ordered by consumedAt desc
    const logs = await db.logs.orderBy('consumedAt').reverse().toArray();
    // Deduplicate by foodId, keeping last 25 unique
    const seen = new Set();
    const unique = [];
    for (const log of logs) {
      if (!seen.has(log.foodId)) {
        seen.add(log.foodId);
        unique.push(log.foodId);
        if (unique.length >= 25) break;
      }
    }
    // Fetch the corresponding food objects
    const foods = await db.foods.bulkGet(unique);
    // Filter out any that may have been deleted
    return foods.filter(Boolean);
  }, []) ?? [];

  return recentLogs;
}


/**
 * Add a food log entry
 */
export async function addLog({ date, foodId, quantityGrams, overrides = {} }) {
  return db.logs.add({
    date,
    foodId,
    quantityGrams: Number(quantityGrams),
    consumedAt: new Date().toISOString(),
    ...overrides,
  });
}

/**
 * Delete a log entry
 */
export async function deleteLog(id) {
  return db.logs.delete(id);
}

/**
 * Update a log entry
 */
export async function updateLog(id, changes) {
  return db.logs.update(id, changes);
}

/**
 * Add or update a food in the master directory
 */
export async function upsertFood(food) {
  if (food.id) {
    await db.foods.update(food.id, food);
    return food.id;
  }
  return db.foods.add({ ...food, isCustom: true });
}

/**
 * Delete a food and its related logs
 */
export async function deleteFood(foodId) {
  await db.logs.where('foodId').equals(foodId).delete();
  await db.foods.delete(foodId);
}

/**
 * Export all data as JSON
 */
export async function exportData() {
  const foods = await db.foods.toArray();
  const logs = await db.logs.toArray();
  const settings = await db.settings.toArray();
  const payload = { version: 1, exportedAt: new Date().toISOString(), foods, logs, settings };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `caltrack-backup-${formatDate()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import data from JSON
 */
export async function importData(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data.version || !data.foods) throw new Error('Invalid backup file');
  await db.transaction('rw', db.foods, db.logs, db.settings, async () => {
    await db.foods.clear();
    await db.logs.clear();
    await db.settings.clear();
    await db.foods.bulkAdd(data.foods.map(f => { const { id, ...rest } = f; return rest; }));
    await db.logs.bulkAdd(data.logs.map(l => { const { id, ...rest } = l; return rest; }));
    if (data.settings) {
      await db.settings.bulkAdd(data.settings.map(s => { const { id, ...rest } = s; return rest; }));
    }
  });
}

/**
 * Request storage persistence
 */
export async function requestStoragePersistence() {
  if (!navigator.storage?.persist) return false;
  const persisted = await navigator.storage.persisted();
  if (persisted) return true;
  return navigator.storage.persist();
}

/**
 * Smooth animated number hook
 */
export function useAnimatedNumber(target, duration = 600) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const from = display;
    const diff = target - from;
    if (diff === 0) return;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

/**
 * Days of week labels
 */
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
