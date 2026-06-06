# Migrating data from the old app

The original prototype (`Recipe App.html`) stored everything in the browser under the
`spreadifyData` localStorage key, using a **nested** shape:

```jsonc
{
  "ingredients": [{ "id": "ING-…", "nutrition": { "cal": 0, "fat": 0, "carbs": 0, "protein": 0 }, … }],
  "recipes":     [{ "id": "REC-…", "labor": { "time": 0, "rate": 0 },
                    "overhead": { "pack": 0, "util": 0 },
                    "ingredients": [{ "id": "ING-…", "qty": 0 }], … }]
}
```

The new app uses a **flat columnar** model with a separate join table:

| Collection / Sheet | Shape |
|--------------------|-------|
| `ingredients` | `{ ingredientId, name, unit, price, qty, cal, fat, carbs, protein }` |
| `recipes` | `{ recipeId, name, servings, servingsPerPack, bakeTemp, bakeTime, sellPrice, laborTime, laborRate, overheadPack, overheadUtil }` |
| `recipeItems` | `{ itemId, recipeId, ingredientId, qty }` — one row per ingredient in a recipe |

The migration flattens `nutrition` / `labor` / `overhead` into columns and lifts each recipe's
embedded `ingredients[]` into `recipeItems` rows, preserving the original `id` values as foreign keys.

---

## Step 1 — Get your old backup file

- In the **old app**, click **Backup** (top-right) to download `spreadify_backup_YYYY-MM-DD.json`.
- No old app handy but data still in a browser? Open that browser's DevTools console on the old page and run
  `copy(localStorage.getItem('spreadifyData'))`, then paste into a new file named `old-backup.json`.

---

## Option A — In-app Restore (quickest, local view)

1. Open the new app → header **Restore** (upload icon) → pick your old `*.json`.
2. It **auto-detects the legacy format and converts it** — you'll see
   *"Legacy backup detected and migrated."* with the imported counts.
3. Data loads into the current view. This is ideal for demo / single-device use.

> Restore loads into the in-memory view only. To **persist to a Google Sheets backend**, use Option B,
> which writes the data directly into the sheet (the app's POSTs are fire-and-forget and not meant for bulk loads).

---

## Option B — Convert + paste into Google Sheets (recommended for backend persistence)

1. Run the converter (outputs next to the input file, or pass an output dir):

   ```bash
   npm run migrate -- path/to/old-backup.json
   # or:  node scripts/migrate-legacy.mjs path/to/old-backup.json ./out
   ```

   It writes:
   - `migrated.json` — full new-shape snapshot (also importable via Restore)
   - `ingredients.tsv`, `recipes.tsv`, `recipeItems.tsv` — one per sheet tab, **header row included**

2. Make sure the backend is set up (see `SETUP.md`) so the **Ingredients**, **Recipes**, and
   **RecipeItems** tabs exist.

3. For each tab, open the matching `.tsv` in a text editor, **select all + copy**, then in the Google Sheet
   click cell **A1** of that tab and **paste**. The TSV's header row overwrites row 1, so columns line up exactly.
   - Values are plain numbers/IDs/text (no date columns), so Sheets won't coerce them.
   - If a tab already has data you want to replace, clear it first (select all rows → Delete).

4. Open the app → **Settings** → **Test connection**. On success it syncs and your migrated recipes,
   ingredients, and costing all appear.

---

## What to check after migrating

- **Pantry**: ingredient count and per-unit costs match (unit cost = price ÷ qty, recomputed automatically).
- **Recipes**: each recipe lists its ingredients; the **Costing** screen shows the same totals you saw before.
- **Orphan links**: if a recipe referenced an ingredient that was later deleted, that line shows as
  *Unknown* with no cost — re-add the ingredient (keeping the same `IngredientId`) or edit the recipe.
