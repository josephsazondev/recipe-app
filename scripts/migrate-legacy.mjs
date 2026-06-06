#!/usr/bin/env node
/* ============================================================================
   Migrate a legacy "Recipe App.html" backup → the new flat data model.

   Usage:
     node scripts/migrate-legacy.mjs <old-backup.json> [outDir]
     npm run migrate -- <old-backup.json> [outDir]

   Outputs into [outDir] (defaults to the input file's folder):
     migrated.json      full new-shape snapshot (importable via the app's Restore)
     ingredients.tsv    paste into the Ingredients tab of your Google Sheet
     recipes.tsv        paste into the Recipes tab
     recipeItems.tsv    paste into the RecipeItems tab
   Each .tsv includes its header row; paste with cell A1 selected (overwrites headers).
============================================================================ */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const N = v => (v === '' || v == null ? 0 : Number(v) || 0);
let seq = 0;
const uid = p => `${p}-${Date.now().toString(36)}-${seq++}`;

function migrate(d) {
  const ingredients = (d.ingredients || []).map(i => ({
    ingredientId: i.id || uid('ING'),
    name: i.name || '',
    unit: i.unit || 'kg',
    price: N(i.price),
    qty: N(i.qty) || 1,
    cal: N(i.nutrition?.cal),
    fat: N(i.nutrition?.fat),
    carbs: N(i.nutrition?.carbs),
    protein: N(i.nutrition?.protein),
  }));
  const recipes = [];
  const recipeItems = [];
  (d.recipes || []).forEach(r => {
    const recipeId = r.id || uid('REC');
    recipes.push({
      recipeId,
      name: r.name || '',
      servings: N(r.servings) || 1,
      servingsPerPack: N(r.servingsPerPack) || 1,
      bakeTemp: r.bakeTemp && r.bakeTemp !== 'N/A' ? String(r.bakeTemp) : '',
      bakeTime: N(r.bakeTime),
      sellPrice: N(r.sellPrice),
      laborTime: N(r.labor?.time),
      laborRate: N(r.labor?.rate),
      overheadPack: N(r.overhead?.pack),
      overheadUtil: N(r.overhead?.util),
    });
    (r.ingredients || []).forEach(it => {
      recipeItems.push({ itemId: uid('ITM'), recipeId, ingredientId: it.id || '', qty: N(it.qty) });
    });
  });
  return { ingredients, recipes, recipeItems };
}

// [header label, field key] — order must match the Code.gs HEADERS for each sheet
const COLUMNS = {
  ingredients: [['IngredientId', 'ingredientId'], ['Name', 'name'], ['Unit', 'unit'], ['Price', 'price'], ['Qty', 'qty'], ['Cal', 'cal'], ['Fat', 'fat'], ['Carbs', 'carbs'], ['Protein', 'protein']],
  recipes: [['RecipeId', 'recipeId'], ['Name', 'name'], ['Servings', 'servings'], ['ServingsPerPack', 'servingsPerPack'], ['BakeTemp', 'bakeTemp'], ['BakeTime', 'bakeTime'], ['SellPrice', 'sellPrice'], ['LaborTime', 'laborTime'], ['LaborRate', 'laborRate'], ['OverheadPack', 'overheadPack'], ['OverheadUtil', 'overheadUtil']],
  recipeItems: [['ItemId', 'itemId'], ['RecipeId', 'recipeId'], ['IngredientId', 'ingredientId'], ['Qty', 'qty']],
};

const cell = v => String(v ?? '').replace(/[\t\n\r]/g, ' ');
const toTsv = (rows, cols) =>
  [cols.map(c => c[0]).join('\t'), ...rows.map(r => cols.map(c => cell(r[c[1]])).join('\t'))].join('\n');

const inPath = process.argv[2];
if (!inPath) {
  console.error('Usage: node scripts/migrate-legacy.mjs <old-backup.json> [outDir]');
  process.exit(1);
}
const outDir = process.argv[3] || dirname(inPath);

let raw;
try {
  raw = JSON.parse(readFileSync(inPath, 'utf8'));
} catch (e) {
  console.error(`Could not read/parse "${inPath}": ${e.message}`);
  process.exit(1);
}

const out = migrate(raw);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'migrated.json'), JSON.stringify(out, null, 2));
for (const key of Object.keys(COLUMNS)) {
  writeFileSync(join(outDir, `${key}.tsv`), toTsv(out[key], COLUMNS[key]));
}

console.log(`Migrated ${out.ingredients.length} ingredients, ${out.recipes.length} recipes, ${out.recipeItems.length} recipe items.`);
console.log(`Wrote migrated.json + ingredients.tsv / recipes.tsv / recipeItems.tsv → ${outDir}`);
