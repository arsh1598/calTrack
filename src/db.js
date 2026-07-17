import Dexie from 'dexie';

export const db = new Dexie('CalTrackDB');

db.version(1).stores({
  foods: '++id, &name, defaultCalories, protein, fats, carbs, isCustom',
  logs: '++id, date, foodId, quantityGrams, consumedAt',
  settings: '++id, key, value',
});

// Seed default foods on first launch
db.on('ready', async () => {
  const count = await db.foods.count();
  if (count === 0) {
    await db.foods.bulkAdd([
      { name: 'Chicken Breast', defaultCalories: 165, protein: 31, fats: 3.6, carbs: 0, isCustom: false },
      { name: 'Brown Rice', defaultCalories: 123, protein: 2.7, fats: 1, carbs: 25.8, isCustom: false },
      { name: 'Whole Egg', defaultCalories: 155, protein: 13, fats: 11, carbs: 1.1, isCustom: false },
      { name: 'Oats', defaultCalories: 389, protein: 16.9, fats: 6.9, carbs: 66.3, isCustom: false },
      { name: 'Salmon', defaultCalories: 208, protein: 20, fats: 13, carbs: 0, isCustom: false },
      { name: 'Broccoli', defaultCalories: 34, protein: 2.8, fats: 0.4, carbs: 6.6, isCustom: false },
      { name: 'Banana', defaultCalories: 89, protein: 1.1, fats: 0.3, carbs: 22.8, isCustom: false },
      { name: 'Almonds', defaultCalories: 579, protein: 21.2, fats: 49.9, carbs: 21.6, isCustom: false },
      { name: 'Greek Yogurt', defaultCalories: 59, protein: 10, fats: 0.4, carbs: 3.6, isCustom: false },
      { name: 'Sweet Potato', defaultCalories: 86, protein: 1.6, fats: 0.1, carbs: 20.1, isCustom: false },
      { name: 'Avocado', defaultCalories: 160, protein: 2, fats: 14.7, carbs: 8.5, isCustom: false },
      { name: 'Cottage Cheese', defaultCalories: 98, protein: 11.1, fats: 4.3, carbs: 3.4, isCustom: false },
      { name: 'Tuna (canned)', defaultCalories: 116, protein: 25.5, fats: 1, carbs: 0, isCustom: false },
      { name: 'Peanut Butter', defaultCalories: 588, protein: 25, fats: 50, carbs: 20, isCustom: false },
      { name: 'White Rice', defaultCalories: 130, protein: 2.7, fats: 0.3, carbs: 28, isCustom: false },
      { name: 'Whey Protein', defaultCalories: 400, protein: 80, fats: 5, carbs: 8, isCustom: false },
      { name: 'Spinach', defaultCalories: 23, protein: 2.9, fats: 0.4, carbs: 3.6, isCustom: false },
      { name: 'Blueberries', defaultCalories: 57, protein: 0.7, fats: 0.3, carbs: 14.5, isCustom: false },
      { name: 'Beef (lean)', defaultCalories: 250, protein: 26, fats: 15, carbs: 0, isCustom: false },
      { name: 'Milk (whole)', defaultCalories: 61, protein: 3.2, fats: 3.3, carbs: 4.8, isCustom: false },
    ]);
  }

  // Seed default settings
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.bulkAdd([
      { key: 'goalCalories', value: 2000 },
      { key: 'goalProtein', value: 150 },
      { key: 'goalFats', value: 65 },
      { key: 'goalCarbs', value: 200 },
    ]);
  }
});

export default db;
