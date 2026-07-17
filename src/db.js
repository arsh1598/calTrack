import Dexie from 'dexie';

// Fallback seed data used when defaultFoods.json is unavailable
// (kept minimal – the real seed comes from the USDA-generated JSON)
const FALLBACK_FOODS = [
  { name: 'Chicken Breast',  defaultCalories: 165, protein: 31,   fats: 3.6,  carbs: 0,    isCustom: false },
  { name: 'Brown Rice',      defaultCalories: 123, protein: 2.7,  fats: 1,    carbs: 25.8, isCustom: false },
  { name: 'Whole Egg',       defaultCalories: 155, protein: 13,   fats: 11,   carbs: 1.1,  isCustom: false, servingSize: 60,  servingUnit: 'large egg',    servingLabel: 'eggs' },
  { name: 'Oats',            defaultCalories: 389, protein: 16.9, fats: 6.9,  carbs: 66.3, isCustom: false, servingSize: 80,  servingUnit: '80g serving',  servingLabel: 'servings' },
  { name: 'Salmon',          defaultCalories: 208, protein: 20,   fats: 13,   carbs: 0,    isCustom: false },
  { name: 'Broccoli',        defaultCalories: 34,  protein: 2.8,  fats: 0.4,  carbs: 6.6,  isCustom: false },
  { name: 'Banana',          defaultCalories: 89,  protein: 1.1,  fats: 0.3,  carbs: 22.8, isCustom: false, servingSize: 118, servingUnit: 'medium banana', servingLabel: 'bananas' },
  { name: 'Almonds',         defaultCalories: 579, protein: 21.2, fats: 49.9, carbs: 21.6, isCustom: false, servingSize: 28,  servingUnit: 'handful (28g)', servingLabel: 'handfuls' },
  { name: 'Greek Yogurt',    defaultCalories: 59,  protein: 10,   fats: 0.4,  carbs: 3.6,  isCustom: false, servingSize: 150, servingUnit: '150g cup',      servingLabel: 'cups' },
  { name: 'Sweet Potato',    defaultCalories: 86,  protein: 1.6,  fats: 0.1,  carbs: 20.1, isCustom: false, servingSize: 130, servingUnit: 'medium potato', servingLabel: 'potatoes' },
  { name: 'Avocado',         defaultCalories: 160, protein: 2,    fats: 14.7, carbs: 8.5,  isCustom: false, servingSize: 200, servingUnit: 'medium avocado',servingLabel: 'avocados' },
  { name: 'Cottage Cheese',  defaultCalories: 98,  protein: 11.1, fats: 4.3,  carbs: 3.4,  isCustom: false },
  { name: 'Tuna (canned)',   defaultCalories: 116, protein: 25.5, fats: 1,    carbs: 0,    isCustom: false, servingSize: 145, servingUnit: '1 can (145g)',  servingLabel: 'cans' },
  { name: 'Peanut Butter',   defaultCalories: 588, protein: 25,   fats: 50,   carbs: 20,   isCustom: false, servingSize: 32,  servingUnit: '2 tbsp (32g)',  servingLabel: 'servings' },
  { name: 'White Rice',      defaultCalories: 130, protein: 2.7,  fats: 0.3,  carbs: 28,   isCustom: false },
  { name: 'Whey Protein',    defaultCalories: 400, protein: 80,   fats: 5,    carbs: 8,    isCustom: false, servingSize: 30,  servingUnit: '1 scoop (30g)', servingLabel: 'scoops' },
  { name: 'Spinach',         defaultCalories: 23,  protein: 2.9,  fats: 0.4,  carbs: 3.6,  isCustom: false },
  { name: 'Blueberries',     defaultCalories: 57,  protein: 0.7,  fats: 0.3,  carbs: 14.5, isCustom: false, servingSize: 80,  servingUnit: '80g cup',       servingLabel: 'cups' },
  { name: 'Beef (lean)',     defaultCalories: 250, protein: 26,   fats: 15,   carbs: 0,    isCustom: false },
  { name: 'Milk (whole)',    defaultCalories: 61,  protein: 3.2,  fats: 3.3,  carbs: 4.8,  isCustom: false, servingSize: 240, servingUnit: '240ml glass',   servingLabel: 'glasses' },
  // ── Requested Items ──────────────────────────────────────────────────────────
  { name: 'Quaker Oats',     defaultCalories: 389, protein: 16.9, fats: 6.9,  carbs: 66.3, isCustom: false, servingSize: 40,  servingUnit: '40g serving',   servingLabel: 'servings' },
  { name: 'Paneer',          defaultCalories: 265, protein: 18,   fats: 20,   carbs: 1.2,  isCustom: false },
  { name: 'Roti (Chapati)',  defaultCalories: 297, protein: 9,    fats: 3,    carbs: 58,   isCustom: false, servingSize: 40,  servingUnit: '1 roti (40g)',  servingLabel: 'rotis' },
  { name: 'Moong Dal (cooked)',defaultCalories:105, protein: 7,   fats: 0.4,  carbs: 19,   isCustom: false },
  { name: 'Masoor Dal (cooked)',defaultCalories:116,protein: 9,   fats: 0.4,  carbs: 20,   isCustom: false },
  { name: 'Ghee',            defaultCalories: 900, protein: 0,    fats: 100,  carbs: 0,    isCustom: false, servingSize: 15,  servingUnit: '1 tbsp (15g)',  servingLabel: 'tbsp' },
  { name: 'Idli',            defaultCalories: 144, protein: 4,    fats: 0.3,  carbs: 31,   isCustom: false },
  { name: 'Dosa (plain)',    defaultCalories: 167, protein: 3.9,  fats: 3.7,  carbs: 29,   isCustom: false },
  { name: 'Paratha (plain)', defaultCalories: 330, protein: 7,    fats: 14,   carbs: 45,   isCustom: false, servingSize: 60,  servingUnit: '1 paratha',     servingLabel: 'parathas' },
  { name: 'Rajma (cooked)',  defaultCalories: 127, protein: 9,    fats: 0.5,  carbs: 22,   isCustom: false },
  { name: 'Chana Masala',    defaultCalories: 164, protein: 6,    fats: 7,    carbs: 20,   isCustom: false },
];

export const db = new Dexie('CalTrackDB');

// v1 – baseline schema
db.version(1).stores({
  foods:    '++id, &name, defaultCalories, protein, fats, carbs, isCustom',
  logs:     '++id, date, foodId, quantityGrams, consumedAt',
  settings: '++id, key, value',
});

// v2 – adds servingSize / servingUnit / servingLabel (data-only, no index change)
db.version(2).stores({
  foods:    '++id, &name, defaultCalories, protein, fats, carbs, isCustom',
  logs:     '++id, date, foodId, quantityGrams, consumedAt',
  settings: '++id, key, value',
}).upgrade(async tx => {
  const servingMap = {
    'Whole Egg':     { servingSize: 60,  servingUnit: 'large egg',     servingLabel: 'eggs' },
    'Banana':        { servingSize: 118, servingUnit: 'medium banana',  servingLabel: 'bananas' },
    'Almonds':       { servingSize: 28,  servingUnit: 'handful (28g)', servingLabel: 'handfuls' },
    'Greek Yogurt':  { servingSize: 150, servingUnit: '150g cup',      servingLabel: 'cups' },
    'Avocado':       { servingSize: 200, servingUnit: 'medium avocado',servingLabel: 'avocados' },
    'Blueberries':   { servingSize: 80,  servingUnit: '80g cup',       servingLabel: 'cups' },
    'Sweet Potato':  { servingSize: 130, servingUnit: 'medium potato', servingLabel: 'potatoes' },
    'Milk (whole)':  { servingSize: 240, servingUnit: '240ml glass',   servingLabel: 'glasses' },
    'Oats':          { servingSize: 80,  servingUnit: '80g serving',   servingLabel: 'servings' },
    'Whey Protein':  { servingSize: 30,  servingUnit: '1 scoop (30g)',servingLabel: 'scoops' },
    'Peanut Butter': { servingSize: 32,  servingUnit: '2 tbsp (32g)', servingLabel: 'servings' },
    'Tuna (canned)': { servingSize: 145, servingUnit: '1 can (145g)', servingLabel: 'cans' },
  };
  await tx.foods.toCollection().modify(food => {
    if (servingMap[food.name]) Object.assign(food, servingMap[food.name]);
  });
});

// v3 – adds isImported / sourceBarcode / imageUrl (for Open Food Facts items)
db.version(3).stores({
  foods:    '++id, &name, defaultCalories, protein, fats, carbs, isCustom',
  logs:     '++id, date, foodId, quantityGrams, consumedAt',
  settings: '++id, key, value',
});

/**
 * Attempt to load the USDA-generated seed file dynamically.
 * Falls back to the hardcoded FALLBACK_FOODS array if the file is absent
 * (e.g. the seeder hasn't been run yet).
 */
async function loadSeedFoods() {
  try {
    // Vite resolves this at build time if the file exists.
    // The `?url` suffix gives us a URL we can fetch at runtime too.
    const mod = await import('./data/defaultFoods.json');
    const data = mod.default;
    if (data?.foods?.length > 0) {
      console.info(`[CalTrack] Loaded ${data.foods.length} USDA seed foods (${data.generatedAt?.slice(0, 10) || 'unknown date'})`);
      return [...FALLBACK_FOODS, ...data.foods];
    }
  } catch {
    // File doesn't exist yet (script hasn't been run)
  }
  console.info('[CalTrack] USDA seed not found – using built-in fallback foods');
  return FALLBACK_FOODS;
}

// ── Seed on first launch ──────────────────────────────────────────────────────
db.on('ready', async (vipDb) => {
  const seedFoods = await loadSeedFoods();
  const existingFoods = await vipDb.foods.toArray();
  const existingNames = new Set(existingFoods.map(f => f.name.toLowerCase()));

  const toAdd = [];
  for (const food of seedFoods) {
    if (!existingNames.has(food.name.toLowerCase())) {
      const { id: _id, ...rest } = food;
      toAdd.push(rest);
    }
  }

  if (toAdd.length > 0) {
    try {
      await vipDb.foods.bulkAdd(toAdd);
      console.info(`[CalTrack] Added ${toAdd.length} missing seed foods into IndexedDB`);
    } catch (err) {
      console.warn('[CalTrack] Some seed foods were skipped (likely duplicates):', err.message);
    }
  }

  // Seed default goals
  const settingsCount = await vipDb.settings.count();
  if (settingsCount === 0) {
    await vipDb.settings.bulkAdd([
      { key: 'goalCalories', value: 2000 },
      { key: 'goalProtein',  value: 150 },
      { key: 'goalFats',     value: 65 },
      { key: 'goalCarbs',    value: 200 },
    ]);
  }
});

// ── Helper: save an imported food from Open Food Facts ────────────────────────
/**
 * Save a food from Open Food Facts into the local DB.
 * If a food with the same name already exists, returns the existing record.
 *
 * @param  {object} offFood  The object returned by openFoodFacts.js services
 * @returns {Promise<number>} The local DB id of the saved food
 */
export async function saveImportedFood(offFood) {
  // Check for existing food by name to avoid duplicates
  const existing = await db.foods.where('name').equals(offFood.name).first();
  if (existing) return existing.id;

  const { id: _id, ...rest } = offFood; // strip any stale id
  return db.foods.add(rest);
}

export default db;
