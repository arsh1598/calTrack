/**
 * src/services/openFoodFacts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side service for the Open Food Facts (OFF) free public API.
 * Searches packaged products by barcode or name and maps the results to our
 * exact Dexie schema (all values normalised to per-100g, rounded to 1 dp).
 *
 * Public API docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 * ─────────────────────────────────────────────────────────────────────────────
 */

const OFF_BASE = 'https://world.openfoodfacts.org';

/** Fields we ask OFF to return – keeps responses lean */
const FIELDS = 'code,product_name,brands,nutriments,image_front_small_url';

// ── Custom error types ────────────────────────────────────────────────────────

export class ProductNotFoundError extends Error {
  constructor(identifier) {
    super(`No product found for "${identifier}" in Open Food Facts.`);
    this.name  = 'ProductNotFoundError';
    this.code  = 'PRODUCT_NOT_FOUND';
  }
}

export class IncompleteMacroDataError extends Error {
  constructor(productName, missing) {
    super(
      `"${productName}" is missing macro data: ${missing.join(', ')}. ` +
      'Please enter the values manually.'
    );
    this.name    = 'IncompleteMacroDataError';
    this.code    = 'INCOMPLETE_MACROS';
    this.missing = missing;
  }
}

export class NetworkError extends Error {
  constructor(cause) {
    super(`Open Food Facts is unreachable. Check your connection. (${cause})`);
    this.name = 'NetworkError';
    this.code = 'NETWORK_ERROR';
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function r1(n) {
  const v = parseFloat(n);
  if (isNaN(v)) return null;
  return Math.round(v * 10) / 10;
}

/**
 * Parse the nutriments object from an OFF product into our schema.
 * OFF stores per-100g values under the `_100g` suffix.
 * Energy may be in kcal (energy-kcal_100g) or kJ (energy_100g); we handle both.
 */
function parseNutriments(nutriments, productName) {
  // Calories – prefer kcal, fall back to kJ conversion
  let calories = r1(nutriments['energy-kcal_100g']);
  if (calories === null) {
    const kj = r1(nutriments['energy_100g']);
    if (kj !== null) calories = r1(kj / 4.184);
  }

  const protein = r1(nutriments['proteins_100g']);
  const fats    = r1(nutriments['fat_100g']);
  const carbs   = r1(nutriments['carbohydrates_100g']);

  // Identify which required macros are missing
  const missing = [];
  if (calories === null) missing.push('calories');
  if (protein  === null) missing.push('protein');
  if (fats     === null) missing.push('fats');
  if (carbs    === null) missing.push('carbs');

  if (missing.length > 0) {
    throw new IncompleteMacroDataError(productName, missing);
  }

  // Sanity guard – flag obviously broken data
  if (calories <= 0 && protein === 0 && fats === 0 && carbs === 0) {
    throw new IncompleteMacroDataError(productName, ['all macros are zero']);
  }

  return { calories, protein, fats, carbs };
}

/**
 * Map a single OFF product object → our Dexie schema shape.
 */
function mapProduct(product) {
  const rawName = (product.product_name || '').trim();
  const brand   = (product.brands || '').split(',')[0].trim();
  const name    = brand && !rawName.toLowerCase().includes(brand.toLowerCase())
    ? `${rawName} (${brand})`
    : rawName;

  if (!name) throw new ProductNotFoundError('(unnamed product)');

  const { calories, protein, fats, carbs } = parseNutriments(
    product.nutriments || {},
    name
  );

  return {
    name,
    defaultCalories: calories,
    protein,
    fats,
    carbs,
    isCustom: true,     // imported from external source
    isImported: true,   // flag so UI can display provenance
    sourceBarcode: product.code || null,
    imageUrl: product.image_front_small_url || null,
  };
}

/**
 * Shared fetch wrapper with timeout and descriptive error forwarding.
 */
async function offFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CalTrack-App/1.0 (local-first macro tracker)' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new NetworkError('Request timed out');
    if (err.name === 'TypeError')  throw new NetworkError(err.message);
    throw err; // Re-throw our custom errors
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Look up a product by barcode (EAN-13, UPC-A, etc.).
 *
 * @param  {string} barcode   e.g. "3017620422003" (Nutella)
 * @returns {Promise<MappedFood>} Our schema-shaped food object
 * @throws  {ProductNotFoundError}   if OFF has no entry for this barcode
 * @throws  {IncompleteMacroDataError}  if the product exists but lacks macro data
 * @throws  {NetworkError}           on connectivity failures
 */
export async function searchFoodByBarcode(barcode) {
  const clean = String(barcode).replace(/\D/g, '');
  if (clean.length < 8) throw new Error('Barcode must be at least 8 digits.');

  const url  = `${OFF_BASE}/api/v2/product/${clean}.json?fields=${FIELDS}`;
  const data = await offFetch(url);

  if (data.status === 0 || !data.product) {
    throw new ProductNotFoundError(clean);
  }

  return mapProduct(data.product);
}

/**
 * Search products by name keyword.
 *
 * @param  {string} query   e.g. "Greek yogurt"
 * @param  {number} limit   max results to return (default 15)
 * @returns {Promise<MappedFood[]>} Array of schema-shaped food objects
 *                                  (items with incomplete macros are silently skipped)
 * @throws  {ProductNotFoundError}  if no results at all
 * @throws  {NetworkError}
 */
export async function searchFoodByName(query, limit = 15) {
  const params = new URLSearchParams({
    action:       'process',
    search_terms: query.trim(),
    json:         '1',
    fields:       FIELDS,
    page_size:    String(Math.min(limit * 2, 50)), // fetch extra to allow filtering
    sort_by:      'unique_scans_n',                // most-scanned first → most reliable
  });

  const url  = `${OFF_BASE}/cgi/search.pl?${params}`;
  const data = await offFetch(url);

  const products = data.products || [];

  if (products.length === 0) {
    throw new ProductNotFoundError(query);
  }

  // Map, silently drop products with incomplete macro data
  const results = [];
  for (const p of products) {
    try {
      if (!(p.product_name || '').trim()) continue;
      results.push(mapProduct(p));
    } catch {
      // Skip products with missing/invalid data
    }
    if (results.length >= limit) break;
  }

  if (results.length === 0) {
    throw new IncompleteMacroDataError(query, ['no products had complete macro data']);
  }

  return results;
}

/**
 * Convenience: detect whether a string looks like a barcode.
 * Returns true for 8–14 digit strings (EAN-8, UPC-A, EAN-13, EAN-14).
 */
export function looksLikeBarcode(input) {
  return /^\d{8,14}$/.test(input.trim());
}
