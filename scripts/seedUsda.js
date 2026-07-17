#!/usr/bin/env node
/**
 * scripts/seedUsda.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches Foundation + SR Legacy foods from USDA FoodData Central API,
 * normalises all nutritional values to a strict per-100g baseline, and writes
 * a minified JSON seed file to src/data/defaultFoods.json.
 *
 * Usage:
 *   node scripts/seedUsda.js                    # uses DEMO_KEY (rate-limited)
 *   node scripts/seedUsda.js YOUR_API_KEY       # recommended
 *   USDA_API_KEY=xxx node scripts/seedUsda.js   # via env var
 *
 * Get a free API key (takes ~30s): https://fdc.nal.usda.gov/api-guide.html
 * ─────────────────────────────────────────────────────────────────────────────
 * Actual USDA response shape (foods/list):
 *   { fdcId, description, dataType,
 *     foodNutrients: [{ number, name, amount, unitName, ... }] }
 *
 * Key nutrient numbers we use:
 *   "203" – Protein (G)
 *   "204" – Total lipid / fat (G)
 *   "205" – Carbohydrate, by difference (G)
 *   "208" – Energy (KCAL)   ← preferred
 *   "957" – Energy Atwater General (KCAL) ← fallback
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const API_KEY    = process.argv[2] || process.env.USDA_API_KEY || 'DEMO_KEY';
const BASE_URL   = 'https://api.nal.usda.gov/fdc/v1';
const DATA_TYPES = ['Foundation', 'SR Legacy'];
const PAGE_SIZE  = 200;
const MAX_PAGES  = 5;     // 1000 items max per dataset

// ── Nutrient number → our schema key ─────────────────────────────────────────
// The `number` field in USDA responses is a string like "203", "204", etc.
const NUMBER_MAP = {
  '208': 'defaultCalories', // Energy, KCAL (preferred)
  '957': 'defaultCalories', // Energy, Atwater General, KCAL (fallback)
  '203': 'protein',         // Protein, G
  '204': 'fats',            // Total lipid (fat), G
  '205': 'carbs',           // Carbohydrate, by difference, G
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function r1(n) { return Math.round(Number(n) * 10) / 10; }

async function fetchWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'CalTrack-Seeder/1.0' } });
    if (res.status === 429) {
      const wait = 3000 * attempt;
      console.warn(`\n  ⚠  Rate limited – waiting ${wait/1000}s (retry ${attempt}/3)…`);
      await sleep(wait);
      if (attempt < 3) return fetchWithRetry(url, attempt + 1);
      throw new Error('Rate limit exceeded after 3 retries');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  } catch (err) {
    if (attempt < 3 && err.name !== 'Error') {
      await sleep(2000);
      return fetchWithRetry(url, attempt + 1);
    }
    throw err;
  }
}

/**
 * Clean verbose USDA descriptions into human-readable short names.
 * Input:  "Chicken, broilers or fryers, breast, meat only, cooked, roasted"
 * Output: "Chicken Breast (cooked)"
 */
function cleanName(desc) {
  const parts = desc.split(',').map(s => s.trim());
  const primary = parts[0];

  // Short, useful qualifiers (category-level info)
  const qualifiers = parts.slice(1).filter(p =>
    p.length <= 25 &&
    !p.match(/\b(NFS|nos|type|broilers|fryers|species|varieties|cultivars)\b/i) &&
    !p.match(/^\d/) // skip entries that start with numbers
  );

  // Cooking state words to append in parentheses
  const prepWords = ['raw', 'cooked', 'roasted', 'baked', 'boiled', 'fried',
                     'grilled', 'steamed', 'dried', 'canned', 'frozen', 'smoked'];
  const prep = qualifiers.find(q => prepWords.some(w => q.toLowerCase().includes(w)));

  // One meaningful qualifier (not the prep state)
  const qualifier = qualifiers.find(q => q !== prep && q.length < 18);

  let name = primary;
  if (qualifier) name += `, ${qualifier}`;
  if (prep)      name += ` (${prep})`;

  // Title-case each word
  name = name.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  return name.length > 64 ? name.slice(0, 61) + '…' : name;
}

/**
 * Extract per-100g macros from a USDA food item's foodNutrients array.
 * Returns null if any required macro is missing or data is implausible.
 */
function extractMacros(foodNutrients = []) {
  const result = {};

  for (const n of foodNutrients) {
    const key = NUMBER_MAP[n.number];
    if (!key) continue;
    const val = parseFloat(n.amount ?? 0);
    if (isNaN(val)) continue;

    // For calories: prefer number "208", skip "957" if "208" already found
    if (key === 'defaultCalories' && n.number === '957' && result.defaultCalories !== undefined) continue;

    result[key] = r1(val);
  }

  const required = ['defaultCalories', 'protein', 'fats', 'carbs'];
  if (required.some(k => result[k] === undefined)) return null;
  if (result.defaultCalories <= 0 || result.defaultCalories > 950) return null;

  return result;
}

/** Attach serving-size metadata for countable foods */
const SERVING_HINTS = {
  egg:           { servingSize: 60,  servingUnit: 'large egg',      servingLabel: 'eggs' },
  banana:        { servingSize: 118, servingUnit: 'medium banana',   servingLabel: 'bananas' },
  apple:         { servingSize: 182, servingUnit: 'medium apple',    servingLabel: 'apples' },
  orange:        { servingSize: 130, servingUnit: 'medium orange',   servingLabel: 'oranges' },
  avocado:       { servingSize: 200, servingUnit: 'medium avocado',  servingLabel: 'avocados' },
  almond:        { servingSize: 28,  servingUnit: 'handful (28g)',   servingLabel: 'handfuls' },
  walnut:        { servingSize: 28,  servingUnit: 'handful (28g)',   servingLabel: 'handfuls' },
  'sweet potato':{ servingSize: 130, servingUnit: 'medium potato',   servingLabel: 'potatoes' },
  potato:        { servingSize: 150, servingUnit: 'medium potato',   servingLabel: 'potatoes' },
  blueberr:      { servingSize: 80,  servingUnit: '80g cup',         servingLabel: 'cups' },
  strawberr:     { servingSize: 80,  servingUnit: '80g cup',         servingLabel: 'cups' },
  milk:          { servingSize: 240, servingUnit: '240ml glass',     servingLabel: 'glasses' },
  oat:           { servingSize: 80,  servingUnit: '80g serving',     servingLabel: 'servings' },
};

function attachServingHint(name, food) {
  const lower = name.toLowerCase();
  for (const [keyword, hint] of Object.entries(SERVING_HINTS)) {
    if (lower.includes(keyword)) return { ...food, ...hint };
  }
  return food;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchPage(dataType, pageNumber) {
  const params = new URLSearchParams({
    api_key:    API_KEY,
    dataType,
    pageSize:   PAGE_SIZE,
    pageNumber,
  });
  return fetchWithRetry(`${BASE_URL}/foods/list?${params}`);
}

async function fetchAllFoods() {
  const all = [];
  for (const dataType of DATA_TYPES) {
    console.log(`\n📦 Dataset: ${dataType}`);
    for (let page = 1; page <= MAX_PAGES; page++) {
      process.stdout.write(`  Page ${page}/${MAX_PAGES}… `);
      try {
        const items = await fetchPage(dataType, page);
        if (!Array.isArray(items) || items.length === 0) { console.log('(empty)'); break; }
        console.log(`${items.length} items`);
        all.push(...items);
        if (items.length < PAGE_SIZE) break;
        await sleep(700); // polite delay
      } catch (err) {
        console.error(`\n  ✗ Page ${page} failed: ${err.message}`);
        break;
      }
    }
  }
  return all;
}

// ── Transform ─────────────────────────────────────────────────────────────────
function transform(rawItems) {
  const seen  = new Set();
  const foods = [];

  for (const item of rawItems) {
    const macros = extractMacros(item.foodNutrients);
    if (!macros) continue;

    const name = cleanName(item.description || '');
    if (!name || name.length < 3) continue;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    let food = { name, ...macros, isCustom: false };
    food = attachServingHint(name, food);
    foods.push(food);
  }

  foods.sort((a, b) => a.name.localeCompare(b.name));
  return foods;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  CalTrack – USDA FoodData Central Seeder ');
  console.log('═══════════════════════════════════════════');
  console.log(`  Key    : ${API_KEY === 'DEMO_KEY' ? 'DEMO_KEY ⚠ (rate-limited)' : '✓ Custom key'}`);
  console.log(`  Sources: ${DATA_TYPES.join(' + ')}\n`);

  const raw   = await fetchAllFoods();
  console.log(`\n✓ Raw items fetched : ${raw.length}`);

  const foods = transform(raw);
  console.log(`✓ Valid unique foods: ${foods.length}`);

  const outDir  = path.join(__dirname, '..', 'src', 'data');
  const outFile = path.join(outDir, 'defaultFoods.json');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'USDA FoodData Central – Foundation Foods + SR Legacy',
    count:  foods.length,
    foods,
  };

  fs.writeFileSync(outFile, JSON.stringify(payload), 'utf8');
  const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log(`\n✅ Written → src/data/defaultFoods.json (${kb} KB)`);

  if (foods.length > 0) {
    console.log('\nSample (first 8):');
    foods.slice(0, 8).forEach(f =>
      console.log(`  • ${f.name.padEnd(34)} ${String(f.defaultCalories).padStart(4)} kcal | P:${f.protein}g F:${f.fats}g C:${f.carbs}g`)
    );
  }
}

main().catch(err => { console.error('\n✗ Fatal:', err.message); process.exit(1); });
