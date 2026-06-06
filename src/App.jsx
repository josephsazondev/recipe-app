import React, { useEffect, useState } from 'react';

/* ============================================================================
   Recipe & Costing — single-file React app (tech-template architecture)
   Flat columnar data model. Three synced collections + local-only plan state.
     ingredients  { rowId, ingredientId, name, unit, price, qty, cal, fat, carbs, protein }
     recipes      { rowId, recipeId, name, servings, servingsPerPack, bakeTemp,
                    bakeTime, sellPrice, laborTime, laborRate, overheadPack, overheadUtil }
     recipeItems  { rowId, itemId, recipeId, ingredientId, qty }   (join table)
   unitCost (price/qty) and line costs are DERIVED, never stored.
============================================================================ */

/* ---------- design tokens ---------- */
const C = {
  bg: '#f7f7fb', surface: '#fff', ink: '#1a1a2e', sub: '#6e6e80', muted: '#9a9aab', hint: '#c4c4d0',
  border: '#e8e8f0', divider: '#f0f0f5', accent: '#6c63ff', accentBg: '#eeecff',
  profit: '#1aaa74', profitBg: '#e6f7f1', loss: '#e05252', lossBg: '#fde8e8', amber: '#e0900a',
};
const SH = {
  card: '0 1px 2px rgba(26,26,46,.04), 0 6px 18px rgba(26,26,46,.05)',
  sheet: '0 -10px 50px rgba(26,26,46,.22)',
  fab: '0 8px 22px rgba(108,99,255,.42)',
};
const PESO = '₱';
const fmt = n => PESO + (Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = n => (Number(n) || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });

const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];

/* ---------- icons (stroke-based inline SVG; never emoji) ---------- */
const ICONS = {
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6 9 17l-5-5" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  trash: (<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></>),
  edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  beaker: <path d="M9 3h6M10 3v6.5L5 18a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 18l-5-8.5V3M7.5 14h9" />,
  book: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z" />,
  chart: <path d="M3 3v18h18M7 15l3-4 3 3 4-6" />,
  cart: <path d="M6 6h15l-1.5 9h-12L5 3H2M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />,
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></>),
  scale: <path d="M12 3v18M7 7h10M4 21h16M6 7l-3 6a3 3 0 0 0 6 0L6 7Zm12 0-3 6a3 3 0 0 0 6 0l-3-6Z" />,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  link: <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />,
};
function Icon({ name, size = 20, color = 'currentColor', stroke = 1.9, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}>{ICONS[name]}</svg>
  );
}

/* ---------- shared styles ---------- */
const inp = {
  width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 12,
  background: C.surface, color: C.ink, fontSize: 16,
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6, letterSpacing: '.02em' };
const cardStyle = { background: C.surface, borderRadius: 18, padding: 16, boxShadow: SH.card };
const btnPrimary = {
  width: '100%', padding: '14px 16px', borderRadius: 14, background: C.accent, color: '#fff',
  fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
const btnGhost = { ...btnPrimary, background: C.accentBg, color: C.accent };
const btnDanger = { ...btnPrimary, background: C.lossBg, color: C.loss };

/* ============================================================================
   API client — GET (json) / POST (no-cors, fire-and-forget) + normalization
============================================================================ */
const SETTINGS_KEY = 'recipe_app_settings';
const PLAN_KEY = 'recipe_app_plan';
const getSettings = () => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; } };
const saveSettings = s => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

const api = {
  async get(type) {
    const { apiUrl, apiKey } = getSettings(); if (!apiUrl) return null;
    const url = new URL(apiUrl);
    url.searchParams.set('type', type);
    url.searchParams.set('_t', Date.now());
    if (apiKey) url.searchParams.set('key', apiKey);
    const r = await fetch(url); const j = await r.json();
    if (j?.error) throw new Error(j.error);
    return j;
  },
  post(body) {
    const { apiUrl, apiKey } = getSettings(); if (!apiUrl) return;
    const url = new URL(apiUrl); if (apiKey) url.searchParams.set('key', apiKey);
    fetch(url.toString(), {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  },
};

// Coerce the numeric columns Sheets may hand back as strings/Dates.
const N = v => (v === '' || v == null ? 0 : Number(v) || 0);
function normalizeData(d) {
  if (!d) return d;
  return {
    ingredients: (d.ingredients || []).map(x => ({
      ...x, price: N(x.price), qty: N(x.qty) || 1,
      cal: N(x.cal), fat: N(x.fat), carbs: N(x.carbs), protein: N(x.protein),
    })),
    recipes: (d.recipes || []).map(x => ({
      ...x, servings: N(x.servings) || 1, servingsPerPack: N(x.servingsPerPack) || 1,
      bakeTemp: x.bakeTemp == null ? '' : String(x.bakeTemp), bakeTime: N(x.bakeTime),
      sellPrice: N(x.sellPrice), laborTime: N(x.laborTime), laborRate: N(x.laborRate),
      overheadPack: N(x.overheadPack), overheadUtil: N(x.overheadUtil),
    })),
    recipeItems: (d.recipeItems || []).map(x => ({ ...x, qty: N(x.qty) })),
  };
}
const syncData = setData => api.get('all').then(r => { if (r && !r.error) setData(normalizeData(r)); }).catch(() => {});

/* ---------- legacy migration (old single-file prototype → flat model) ----------
   Old backup shape: ingredients[{ id, nutrition:{...} }], recipes[{ id, labor:{...},
   overhead:{...}, ingredients:[{ id, qty }] }]. Convert to the flat columnar model
   with a separate recipeItems join table. */
function isLegacyBackup(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return false;
  if (Array.isArray(d.recipeItems)) return false; // already the new shape
  const ing = (d.ingredients || [])[0];
  const rec = (d.recipes || [])[0];
  if (ing && (ing.nutrition || (ing.id && ing.ingredientId == null))) return true;
  if (rec && (rec.labor || rec.overhead || Array.isArray(rec.ingredients))) return true;
  return false;
}
function migrateLegacy(d) {
  let seq = 0;
  const uid = p => p + '-' + Date.now().toString(36) + '-' + seq++;
  const ingredients = (d.ingredients || []).map(i => ({
    ingredientId: i.id || uid('ING'), name: i.name || '', unit: i.unit || 'kg',
    price: N(i.price), qty: N(i.qty) || 1,
    cal: N(i.nutrition && i.nutrition.cal), fat: N(i.nutrition && i.nutrition.fat),
    carbs: N(i.nutrition && i.nutrition.carbs), protein: N(i.nutrition && i.nutrition.protein),
  }));
  const recipes = [], recipeItems = [];
  (d.recipes || []).forEach(r => {
    const recipeId = r.id || uid('REC');
    recipes.push({
      recipeId, name: r.name || '',
      servings: N(r.servings) || 1, servingsPerPack: N(r.servingsPerPack) || 1,
      bakeTemp: r.bakeTemp && r.bakeTemp !== 'N/A' ? String(r.bakeTemp) : '',
      bakeTime: N(r.bakeTime), sellPrice: N(r.sellPrice),
      laborTime: N(r.labor && r.labor.time), laborRate: N(r.labor && r.labor.rate),
      overheadPack: N(r.overhead && r.overhead.pack), overheadUtil: N(r.overhead && r.overhead.util),
    });
    (r.ingredients || []).forEach(it => {
      recipeItems.push({ itemId: uid('ITM'), recipeId, ingredientId: it.id || '', qty: N(it.qty) });
    });
  });
  return normalizeData({ ingredients, recipes, recipeItems });
}

/* ============================================================================
   Mock data — loaded when no apiUrl is set (design-first iteration)
============================================================================ */
const MOCK = normalizeData({
  ingredients: [
    { rowId: 'I_2', ingredientId: 'ING-1', name: 'All-Purpose Flour', unit: 'kg', price: 65, qty: 1, cal: 3640, fat: 9.8, carbs: 763, protein: 103 },
    { rowId: 'I_3', ingredientId: 'ING-2', name: 'White Sugar', unit: 'kg', price: 70, qty: 1, cal: 3870, fat: 0, carbs: 1000, protein: 0 },
    { rowId: 'I_4', ingredientId: 'ING-3', name: 'Butter', unit: 'g', price: 0.55, qty: 1, cal: 7.2, fat: 0.81, carbs: 0.01, protein: 0.01 },
    { rowId: 'I_5', ingredientId: 'ING-4', name: 'Eggs', unit: 'pcs', price: 8, qty: 1, cal: 72, fat: 4.8, carbs: 0.4, protein: 6.3 },
  ],
  recipes: [
    { rowId: 'R_2', recipeId: 'REC-1', name: 'Classic Chocolate Chip Cookies', servings: 24, servingsPerPack: 6, bakeTemp: '180°C', bakeTime: 12, sellPrice: 120, laborTime: 1.5, laborRate: 80, overheadPack: 40, overheadUtil: 25 },
  ],
  recipeItems: [
    { rowId: 'M_2', itemId: 'ITM-1', recipeId: 'REC-1', ingredientId: 'ING-1', qty: 0.5 },
    { rowId: 'M_3', itemId: 'ITM-2', recipeId: 'REC-1', ingredientId: 'ING-2', qty: 0.3 },
    { rowId: 'M_4', itemId: 'ITM-3', recipeId: 'REC-1', ingredientId: 'ING-3', qty: 200 },
    { rowId: 'M_5', itemId: 'ITM-4', recipeId: 'REC-1', ingredientId: 'ING-4', qty: 2 },
  ],
});

/* ============================================================================
   Pure compute helpers (derive everything on the fly)
============================================================================ */
const unitCost = ing => (ing && ing.qty ? ing.price / ing.qty : 0);

function computeRecipe(recipe, items, ingredients) {
  const byId = Object.fromEntries(ingredients.map(i => [i.ingredientId, i]));
  const lines = items
    .filter(it => it.recipeId === recipe.recipeId)
    .map(it => {
      const ing = byId[it.ingredientId];
      const uc = unitCost(ing);
      return {
        ...it,
        name: ing ? ing.name : 'Unknown',
        unit: ing ? ing.unit : '',
        unitCost: uc,
        cost: uc * it.qty,
        nutrition: ing ? { cal: ing.cal, fat: ing.fat, carbs: ing.carbs, protein: ing.protein } : null,
      };
    });

  const servings = Math.max(1, recipe.servings || 1);
  const perPack = Math.max(1, recipe.servingsPerPack || 1);
  const totalPacks = servings / perPack;

  const rawCost = lines.reduce((s, l) => s + l.cost, 0);
  const laborCost = (recipe.laborTime || 0) * (recipe.laborRate || 0);
  const overhead = (recipe.overheadPack || 0) + (recipe.overheadUtil || 0);
  const totalCost = rawCost + laborCost + overhead;
  const costPerPack = totalCost / totalPacks;
  const costPerServing = totalCost / servings;
  const sellPrice = recipe.sellPrice || 0;
  const profit = sellPrice - costPerPack;
  const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;

  const nut = lines.reduce((a, l) => {
    if (l.nutrition) {
      a.cal += l.nutrition.cal * l.qty; a.fat += l.nutrition.fat * l.qty;
      a.carbs += l.nutrition.carbs * l.qty; a.protein += l.nutrition.protein * l.qty;
    }
    return a;
  }, { cal: 0, fat: 0, carbs: 0, protein: 0 });
  const nutPerServing = {
    cal: nut.cal / servings, fat: nut.fat / servings, carbs: nut.carbs / servings, protein: nut.protein / servings,
  };

  return { lines, servings, perPack, totalPacks, rawCost, laborCost, overhead, totalCost, costPerPack, costPerServing, sellPrice, profit, margin, nutPerServing };
}

/* ============================================================================
   Bottom-sheet wrapper
============================================================================ */
function Sheet({ title, onClose, children }) {
  return (
    <div className="sheet-overlay" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,46,.42)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div className="sheet-panel" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, margin: '0 auto', background: C.surface, borderRadius: '24px 24px 0 0', boxShadow: SH.sheet, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 38, height: 5, borderRadius: 3, background: C.border }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 18px 12px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{title}</h2>
          <button className="pressable" onClick={onClose} style={{ padding: 6, color: C.sub }}><Icon name="x" /></button>
        </div>
        <div style={{ padding: '0 18px 26px', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 14 }}><label style={labelStyle}>{label}</label>{children}</div>;
}

/* ============================================================================
   App
============================================================================ */
export default function App() {
  const [data, setData] = useState({ ingredients: [], recipes: [], recipeItems: [] });
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('ingredients');
  const [sheet, setSheet] = useState(null); // { type, payload }
  const [plan, setPlan] = useState(() => { try { return JSON.parse(localStorage.getItem(PLAN_KEY) || '[]'); } catch { return []; } });

  useEffect(() => {
    const s = getSettings();
    if (!s.apiUrl) { setData(MOCK); setLoading(false); return; }
    api.get('all')
      .then(r => { if (r && !r.error) setData(normalizeData(r)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); }, [plan]);

  const reconcile = () => setTimeout(() => syncData(setData), 1500);

  /* ----- ingredient mutations ----- */
  const saveIngredient = form => {
    const isEdit = !!form.rowId;
    const ingredientId = form.ingredientId || 'ING-' + Date.now();
    const rec = {
      rowId: form.rowId, ingredientId, name: form.name.trim(), unit: form.unit,
      price: N(form.price), qty: N(form.qty) || 1,
      cal: N(form.cal), fat: N(form.fat), carbs: N(form.carbs), protein: N(form.protein),
    };
    setData(d => ({
      ...d,
      ingredients: isEdit
        ? d.ingredients.map(i => (i.ingredientId === ingredientId ? rec : i))
        : [...d.ingredients, rec],
    }));
    api.post(isEdit
      ? { type: 'update_ingredient', rowId: form.rowId, ...rec }
      : { type: 'append_ingredient', ...rec });
    reconcile();
    setSheet(null);
  };
  const deleteIngredient = ing => {
    setData(d => ({ ...d, ingredients: d.ingredients.filter(i => i.ingredientId !== ing.ingredientId) }));
    api.post({ type: 'delete_ingredient', rowId: ing.rowId || ing.ingredientId });
    reconcile();
    setSheet(null);
  };

  /* ----- recipe mutations (recipe row + join-table items) ----- */
  const saveRecipe = form => {
    const isEdit = !!form.rowId;
    const recipeId = form.recipeId || 'REC-' + Date.now();
    const rec = {
      rowId: form.rowId, recipeId, name: form.name.trim(),
      servings: N(form.servings) || 1, servingsPerPack: N(form.servingsPerPack) || 1,
      bakeTemp: form.bakeTemp || '', bakeTime: N(form.bakeTime), sellPrice: N(form.sellPrice),
      laborTime: N(form.laborTime), laborRate: N(form.laborRate),
      overheadPack: N(form.overheadPack), overheadUtil: N(form.overheadUtil),
    };
    const items = form.items.map((it, i) => ({
      rowId: undefined, itemId: 'ITM-' + Date.now() + '-' + i,
      recipeId, ingredientId: it.ingredientId, qty: N(it.qty),
    }));
    setData(d => ({
      ...d,
      recipes: isEdit ? d.recipes.map(r => (r.recipeId === recipeId ? rec : r)) : [...d.recipes, rec],
      recipeItems: [...d.recipeItems.filter(it => it.recipeId !== recipeId), ...items],
    }));
    api.post(isEdit
      ? { type: 'update_recipe', rowId: form.rowId, ...rec }
      : { type: 'append_recipe', ...rec });
    api.post({ type: 'set_recipe_items', recipeId, items: items.map(it => ({ ingredientId: it.ingredientId, qty: it.qty })) });
    reconcile();
    setSheet(null);
  };
  const deleteRecipe = recipe => {
    setData(d => ({
      ...d,
      recipes: d.recipes.filter(r => r.recipeId !== recipe.recipeId),
      recipeItems: d.recipeItems.filter(it => it.recipeId !== recipe.recipeId),
    }));
    setPlan(p => p.filter(x => x.recipeId !== recipe.recipeId));
    api.post({ type: 'delete_recipe', rowId: recipe.rowId || recipe.recipeId, recipeId: recipe.recipeId });
    reconcile();
    setSheet(null);
  };

  /* ----- backup / restore (JSON, local) ----- */
  const exportData = async () => {
    const str = JSON.stringify(data, null, 2);
    const name = `recipe_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  const importData = file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const raw = JSON.parse(e.target.result);
        const legacy = isLegacyBackup(raw);
        const d = legacy ? migrateLegacy(raw) : normalizeData(raw);
        setData({ ingredients: d.ingredients || [], recipes: d.recipes || [], recipeItems: d.recipeItems || [] });
        alert(
          (legacy ? 'Legacy backup detected and migrated.\n\n' : '') +
          `${d.ingredients.length} ingredients, ${d.recipes.length} recipes loaded into the current view. ` +
          'Connect a backend in Settings to persist it.'
        );
      } catch { alert('Invalid backup file.'); }
    };
    reader.readAsText(file);
  };

  const NAV = [
    { id: 'ingredients', label: 'Pantry', icon: 'beaker' },
    { id: 'recipes', label: 'Recipes', icon: 'book' },
    { id: 'costing', label: 'Costing', icon: 'chart' },
    { id: 'planner', label: 'Planner', icon: 'cart' },
    { id: 'settings', label: 'Settings', icon: 'gear' },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: C.bg }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: C.ink, color: '#fff', padding: '16px 18px calc(16px + env(safe-area-inset-top))', paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>Recipe &amp; Costing</div>
            <div style={{ fontSize: 12, color: '#b9b9cc', marginTop: 2 }}>{NAV.find(n => n.id === screen)?.label}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pressable" onClick={exportData} title="Backup"
              style={{ padding: 9, borderRadius: 10, background: 'rgba(255,255,255,.12)', color: '#fff' }}><Icon name="download" size={18} /></button>
            <label className="pressable" title="Restore"
              style={{ padding: 9, borderRadius: 10, background: 'rgba(255,255,255,.12)', color: '#fff', display: 'grid', placeItems: 'center' }}>
              <Icon name="upload" size={18} />
              <input type="file" accept=".json" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; }} />
            </label>
          </div>
        </div>
      </header>

      {/* screens */}
      <main className="screen" key={screen} style={{ flex: 1, padding: 16, paddingBottom: 96, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {screen === 'ingredients' && <IngredientsScreen data={data} setSheet={setSheet} />}
        {screen === 'recipes' && <RecipesScreen data={data} setSheet={setSheet} />}
        {screen === 'costing' && <CostingScreen data={data} />}
        {screen === 'planner' && <PlannerScreen data={data} plan={plan} setPlan={setPlan} setScreen={setScreen} />}
        {screen === 'settings' && <SettingsScreen setData={setData} />}
      </main>

      {/* FAB — anchored to the bottom-right of the centered container */}
      {(screen === 'ingredients' || screen === 'recipes') && (
        <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: '100%', maxWidth: 560, pointerEvents: 'none', zIndex: 45 }}>
          <button className="pressable"
            onClick={() => setSheet({ type: screen === 'ingredients' ? 'ingredient' : 'recipe' })}
            style={{ position: 'absolute', right: 18, bottom: 'calc(80px + env(safe-area-inset-bottom))', width: 58, height: 58, borderRadius: 20, background: C.accent, color: '#fff', display: 'grid', placeItems: 'center', boxShadow: SH.fab, pointerEvents: 'auto' }}>
            <Icon name="plus" size={26} stroke={2.4} />
          </button>
        </div>
      )}

      {/* bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 560, background: C.surface, borderTop: `1px solid ${C.divider}`, display: 'flex', padding: '8px 4px calc(8px + env(safe-area-inset-bottom))', zIndex: 50 }}>
        {NAV.map(n => {
          const active = screen === n.id;
          return (
            <button key={n.id} className="pressable" onClick={() => setScreen(n.id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 2px', color: active ? C.accent : C.muted }}>
              <Icon name={n.icon} size={22} stroke={active ? 2.2 : 1.8} />
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600 }}>{n.label}</span>
            </button>
          );
        })}
      </nav>

      {/* sheets */}
      {sheet?.type === 'ingredient' && (
        <IngredientSheet init={sheet.payload} onClose={() => setSheet(null)} onSave={saveIngredient} onDelete={deleteIngredient} />
      )}
      {sheet?.type === 'recipe' && (
        <RecipeSheet init={sheet.payload} data={data} onClose={() => setSheet(null)} onSave={saveRecipe} onDelete={deleteRecipe} />
      )}
    </div>
  );
}

/* ============================================================================
   Screen: Pantry (ingredients)
============================================================================ */
function IngredientsScreen({ data, setSheet }) {
  const list = [...data.ingredients].sort((a, b) => a.name.localeCompare(b.name));
  if (!list.length) return <Empty icon="beaker" title="No ingredients yet" hint="Tap + to add your first raw ingredient." />;
  return (
    <>
      <SectionTitle>Ingredient Database</SectionTitle>
      {list.map(i => (
        <button key={i.ingredientId} className="pressable" onClick={() => setSheet({ type: 'ingredient', payload: i })}
          style={{ ...cardStyle, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{i.name}</div>
            <div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>{num(i.qty)} {i.unit} pack &middot; {fmt(i.price)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, color: C.accent, fontSize: 15 }}>{fmt(unitCost(i))}</div>
            <div style={{ fontSize: 11, color: C.muted }}>per {i.unit}</div>
          </div>
          <Icon name="chevron" size={18} color={C.hint} />
        </button>
      ))}
    </>
  );
}

/* ============================================================================
   Screen: Recipes
============================================================================ */
function RecipesScreen({ data, setSheet }) {
  const list = [...data.recipes].sort((a, b) => a.name.localeCompare(b.name));
  if (!list.length) return <Empty icon="book" title="No recipes yet" hint="Tap + to formulate your first recipe." />;
  return (
    <>
      <SectionTitle>Saved Formulations</SectionTitle>
      {list.map(r => {
        const c = computeRecipe(r, data.recipeItems, data.ingredients);
        return (
          <button key={r.recipeId} className="pressable" onClick={() => setSheet({ type: 'recipe', payload: r })}
            style={{ ...cardStyle, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
              <div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>
                {num(c.totalPacks)} packs &middot; {r.servings} servings &middot; {c.lines.length} ingredients
              </div>
            </div>
            <Pill value={c.profit} suffix="/pack" />
            <Icon name="chevron" size={18} color={C.hint} />
          </button>
        );
      })}
    </>
  );
}

/* ============================================================================
   Screen: Costing dashboard
============================================================================ */
function CostingScreen({ data }) {
  const [recipeId, setRecipeId] = useState(data.recipes[0]?.recipeId || '');
  const [batches, setBatches] = useState(1);
  const recipe = data.recipes.find(r => r.recipeId === recipeId);
  if (!data.recipes.length) return <Empty icon="chart" title="Nothing to analyze" hint="Create a recipe first to see its costing." />;
  const c = recipe ? computeRecipe(recipe, data.recipeItems, data.ingredients) : null;

  return (
    <>
      <div style={cardStyle}>
        <label style={labelStyle}>Recipe to analyze</label>
        <select style={inp} value={recipeId} onChange={e => setRecipeId(e.target.value)}>
          {data.recipes.map(r => <option key={r.recipeId} value={r.recipeId}>{r.name}</option>)}
        </select>
      </div>

      {c && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Stat label="Cost / pack" value={fmt(c.costPerPack)} />
            <Stat label="Selling / pack" value={fmt(c.sellPrice)} />
            <Stat label="Profit / pack" value={fmt(c.profit)} tone={c.profit >= 0 ? 'profit' : 'loss'} />
            <Stat label="Margin" value={`${c.margin.toFixed(1)}%`} tone={c.margin >= 0 ? 'profit' : 'loss'} />
          </div>

          <div style={cardStyle}>
            <SubTitle>Financial breakdown <span style={{ color: C.muted, fontWeight: 500 }}>(1 batch)</span></SubTitle>
            <Row k="Raw ingredients" v={fmt(c.rawCost)} />
            <Row k="Labor" v={fmt(c.laborCost)} />
            <Row k="Packaging" v={fmt(recipe.overheadPack)} />
            <Row k="Utilities" v={fmt(recipe.overheadUtil)} />
            <Row k="Total batch cost" v={fmt(c.totalCost)} strong />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12.5, color: C.sub }}>
              <span>{num(c.totalPacks)} packs &middot; {c.servings} servings &middot; {fmt(c.costPerServing)}/serving</span>
            </div>
          </div>

          <div style={cardStyle}>
            <SubTitle>Nutrition <span style={{ color: C.muted, fontWeight: 500 }}>(per serving)</span></SubTitle>
            <Row k="Calories" v={`${c.nutPerServing.cal.toFixed(0)} kcal`} />
            <Row k="Fat" v={`${c.nutPerServing.fat.toFixed(1)} g`} />
            <Row k="Carbohydrates" v={`${c.nutPerServing.carbs.toFixed(1)} g`} />
            <Row k="Protein" v={`${c.nutPerServing.protein.toFixed(1)} g`} />
          </div>

          {(recipe.bakeTime > 0 || recipe.bakeTemp) && (
            <div style={cardStyle}>
              <SubTitle>Baking process</SubTitle>
              <Row k="Time" v={recipe.bakeTime > 0 ? `${recipe.bakeTime} mins` : '—'} />
              <Row k="Temperature" v={recipe.bakeTemp || '—'} />
            </div>
          )}

          <div style={cardStyle}>
            <SubTitle>Scale proportions</SubTitle>
            <label style={labelStyle}>Target batches ({batches}x)</label>
            <input type="number" step="0.1" min="0.1" style={{ ...inp, marginBottom: 12 }}
              value={batches} onChange={e => setBatches(Math.max(0.1, Number(e.target.value) || 1))} />
            {c.lines.map(l => (
              <Row key={l.itemId} k={l.name} v={<span style={{ color: C.accent, fontWeight: 700 }}>{num(l.qty * batches)} {l.unit}</span>} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ============================================================================
   Screen: Grocery / production planner
============================================================================ */
function PlannerScreen({ data, plan, setPlan, setScreen }) {
  const [pick, setPick] = useState(data.recipes[0]?.recipeId || '');
  const [batches, setBatches] = useState(1);

  const add = () => {
    if (!pick) return;
    setPlan(p => {
      const ex = p.find(x => x.recipeId === pick);
      return ex ? p.map(x => (x.recipeId === pick ? { ...x, batches: x.batches + batches } : x))
                : [...p, { recipeId: pick, batches }];
    });
    setBatches(1);
  };
  const setBatchesFor = (id, v) => setPlan(p => p.map(x => (x.recipeId === id ? { ...x, batches: Math.max(0.1, v) } : x)));
  const remove = id => setPlan(p => p.filter(x => x.recipeId !== id));

  // consolidate ingredients across the whole plan
  const byId = Object.fromEntries(data.ingredients.map(i => [i.ingredientId, i]));
  const consolidated = {};
  let budget = 0;
  plan.forEach(p => {
    data.recipeItems.filter(it => it.recipeId === p.recipeId).forEach(it => {
      const ing = byId[it.ingredientId]; if (!ing) return;
      const qty = it.qty * p.batches;
      const cost = unitCost(ing) * qty;
      const e = consolidated[it.ingredientId] || (consolidated[it.ingredientId] = { name: ing.name, unit: ing.unit, qty: 0, cost: 0 });
      e.qty += qty; e.cost += cost; budget += cost;
    });
  });
  const shopping = Object.values(consolidated).sort((a, b) => b.cost - a.cost);

  if (!data.recipes.length) return <Empty icon="cart" title="Nothing to plan" hint="Create recipes first, then plan your production runs." />;

  return (
    <>
      <div style={cardStyle}>
        <SubTitle>Add to production plan</SubTitle>
        <Field label="Recipe">
          <select style={inp} value={pick} onChange={e => setPick(e.target.value)}>
            {data.recipes.map(r => <option key={r.recipeId} value={r.recipeId}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Target batches">
          <input type="number" step="0.1" min="0.1" style={inp} value={batches}
            onChange={e => setBatches(Math.max(0.1, Number(e.target.value) || 1))} />
        </Field>
        <button className="pressable" style={btnPrimary} onClick={add}><Icon name="plus" size={18} stroke={2.3} />Add to plan</button>
      </div>

      {plan.length > 0 && (
        <div style={cardStyle}>
          <SubTitle>Current plan</SubTitle>
          {plan.map(p => {
            const r = data.recipes.find(x => x.recipeId === p.recipeId);
            if (!r) return null;
            return (
              <div key={p.recipeId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.divider}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: C.sub }}>{num(p.batches * (r.servings || 1))} servings total</div>
                </div>
                <input type="number" step="0.1" min="0.1" value={p.batches}
                  onChange={e => setBatchesFor(p.recipeId, Number(e.target.value) || 0.1)}
                  style={{ ...inp, width: 72, padding: '8px 10px', textAlign: 'center', fontWeight: 700 }} />
                <button className="pressable" onClick={() => remove(p.recipeId)} style={{ padding: 6, color: C.loss }}><Icon name="trash" size={18} /></button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ ...cardStyle, background: C.ink, color: '#fff' }}>
        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.08em', color: '#b9b9cc' }}>Estimated budget</div>
        <div style={{ fontSize: 30, fontWeight: 800, marginTop: 4 }}>{fmt(budget)}</div>
      </div>

      {shopping.length > 0 && (
        <div style={cardStyle}>
          <SubTitle>Consolidated shopping list</SubTitle>
          {shopping.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.divider}` }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>{num(s.qty)} {s.unit}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{fmt(s.cost)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================================================================
   Screen: Settings (backend connection)
============================================================================ */
function SettingsScreen({ setData }) {
  const s = getSettings();
  const [apiUrl, setApiUrl] = useState(s.apiUrl || '');
  const [apiKey, setApiKey] = useState(s.apiKey || '');
  const [status, setStatus] = useState(null);

  const save = () => { saveSettings({ apiUrl: apiUrl.trim(), apiKey: apiKey.trim() }); setStatus(null); };
  const test = async () => {
    saveSettings({ apiUrl: apiUrl.trim(), apiKey: apiKey.trim() });
    setStatus('testing');
    try {
      const r = await api.get('ping');
      if (r?.ok) { setStatus('ok'); syncData(setData); } else setStatus('fail');
    } catch { setStatus('fail'); }
  };

  return (
    <>
      <div style={cardStyle}>
        <SubTitle>Backend connection</SubTitle>
        <p style={{ fontSize: 13, color: C.sub, marginBottom: 14, lineHeight: 1.5 }}>
          Paste your Google Apps Script web-app <code>/exec</code> URL to sync data across devices.
          Leave blank to run in local demo mode with sample data.
        </p>
        <Field label="API URL (/exec)">
          <input style={inp} placeholder="https://script.google.com/macros/s/.../exec" value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
        </Field>
        <Field label="API key (optional)">
          <input style={inp} placeholder="matches the Config sheet api_key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="pressable" style={btnGhost} onClick={save}>Save</button>
          <button className="pressable" style={btnPrimary} onClick={test}><Icon name="link" size={18} />Test connection</button>
        </div>
        {status === 'testing' && <Note tone="muted">Testing…</Note>}
        {status === 'ok' && <Note tone="profit">Connected. Data synced.</Note>}
        {status === 'fail' && <Note tone="loss">Could not reach the backend. Check the URL, deployment access, and key.</Note>}
      </div>

      <div style={cardStyle}>
        <SubTitle>About</SubTitle>
        <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>
          Recipe &amp; Costing — formulate recipes, analyze unit cost &amp; margin, and plan production grocery runs.
          Use Backup / Restore in the header for JSON snapshots.
        </p>
      </div>
    </>
  );
}

/* ============================================================================
   Sheet: Ingredient add / edit
============================================================================ */
function IngredientSheet({ init, onClose, onSave, onDelete }) {
  const [f, setF] = useState({
    rowId: init?.rowId, ingredientId: init?.ingredientId,
    name: init?.name || '', unit: init?.unit || 'kg',
    price: init?.price ?? '', qty: init?.qty ?? 1,
    cal: init?.cal ?? '', fat: init?.fat ?? '', carbs: init?.carbs ?? '', protein: init?.protein ?? '',
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const submit = () => { if (!f.name.trim()) return alert('Ingredient name is required.'); onSave(f); };

  return (
    <Sheet title={init ? 'Edit ingredient' : 'New ingredient'} onClose={onClose}>
      <Field label="Ingredient name"><input style={inp} value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. All-Purpose Flour" autoFocus /></Field>
      <Field label="Unit of measure">
        <select style={inp} value={f.unit} onChange={e => set('unit', e.target.value)}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>
      <Two>
        <Field label={`Package price (${PESO})`}><input type="number" step="0.01" style={inp} value={f.price} onChange={e => set('price', e.target.value)} placeholder="0.00" /></Field>
        <Field label="Units in package"><input type="number" step="0.01" style={inp} value={f.qty} onChange={e => set('qty', e.target.value)} /></Field>
      </Two>
      <div style={{ fontSize: 12, color: C.muted, margin: '-4px 0 12px' }}>
        Unit cost: <b style={{ color: C.accent }}>{fmt(unitCost({ price: N(f.price), qty: N(f.qty) || 1 }))}</b> per {f.unit}
      </div>
      <SubTitle>Nutrition <span style={{ color: C.muted, fontWeight: 500 }}>(per unit)</span></SubTitle>
      <Two>
        <Field label="Calories"><input type="number" style={inp} value={f.cal} onChange={e => set('cal', e.target.value)} placeholder="0" /></Field>
        <Field label="Fat (g)"><input type="number" style={inp} value={f.fat} onChange={e => set('fat', e.target.value)} placeholder="0" /></Field>
        <Field label="Carbs (g)"><input type="number" style={inp} value={f.carbs} onChange={e => set('carbs', e.target.value)} placeholder="0" /></Field>
        <Field label="Protein (g)"><input type="number" style={inp} value={f.protein} onChange={e => set('protein', e.target.value)} placeholder="0" /></Field>
      </Two>
      <button className="pressable" style={{ ...btnPrimary, marginTop: 6 }} onClick={submit}><Icon name="check" size={18} stroke={2.3} />{init ? 'Update' : 'Save'} ingredient</button>
      {init && <button className="pressable" style={{ ...btnDanger, marginTop: 10 }} onClick={() => { if (confirm('Delete this ingredient? Recipes using it will lose its cost.')) onDelete(init); }}><Icon name="trash" size={18} />Delete</button>}
    </Sheet>
  );
}

/* ============================================================================
   Sheet: Recipe add / edit (with embedded ingredient line items)
============================================================================ */
function RecipeSheet({ init, data, onClose, onSave, onDelete }) {
  const initItems = init
    ? data.recipeItems.filter(it => it.recipeId === init.recipeId).map(it => ({ ingredientId: it.ingredientId, qty: it.qty }))
    : [];
  const [f, setF] = useState({
    rowId: init?.rowId, recipeId: init?.recipeId, name: init?.name || '',
    servings: init?.servings ?? 1, servingsPerPack: init?.servingsPerPack ?? 1,
    bakeTemp: init?.bakeTemp || '', bakeTime: init?.bakeTime ?? '', sellPrice: init?.sellPrice ?? '',
    laborTime: init?.laborTime ?? '', laborRate: init?.laborRate ?? '',
    overheadPack: init?.overheadPack ?? '', overheadUtil: init?.overheadUtil ?? '',
  });
  const [items, setItems] = useState(initItems);
  const [pick, setPick] = useState(data.ingredients[0]?.ingredientId || '');
  const [qty, setQty] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const byId = Object.fromEntries(data.ingredients.map(i => [i.ingredientId, i]));

  const addItem = () => {
    if (!pick || !N(qty)) return;
    setItems(p => {
      const ex = p.find(x => x.ingredientId === pick);
      return ex ? p.map(x => (x.ingredientId === pick ? { ...x, qty: N(qty) } : x)) : [...p, { ingredientId: pick, qty: N(qty) }];
    });
    setQty('');
  };
  const removeItem = id => setItems(p => p.filter(x => x.ingredientId !== id));

  const submit = () => {
    if (!f.name.trim()) return alert('Recipe name is required.');
    if (!items.length) return alert('Add at least one ingredient.');
    onSave({ ...f, items });
  };

  if (!data.ingredients.length) {
    return (
      <Sheet title="New recipe" onClose={onClose}>
        <Empty icon="beaker" title="Add ingredients first" hint="You need at least one ingredient in your pantry before formulating a recipe." />
      </Sheet>
    );
  }

  return (
    <Sheet title={init ? 'Edit recipe' : 'New recipe'} onClose={onClose}>
      <Field label="Recipe name"><input style={inp} value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Chocolate Chip Cookies" autoFocus /></Field>
      <Two>
        <Field label="Servings / batch"><input type="number" min="1" style={inp} value={f.servings} onChange={e => set('servings', e.target.value)} /></Field>
        <Field label="Servings / pack"><input type="number" min="1" style={inp} value={f.servingsPerPack} onChange={e => set('servingsPerPack', e.target.value)} /></Field>
      </Two>
      <Two>
        <Field label="Baking temp"><input style={inp} value={f.bakeTemp} onChange={e => set('bakeTemp', e.target.value)} placeholder="e.g. 180°C" /></Field>
        <Field label="Baking time (min)"><input type="number" style={inp} value={f.bakeTime} onChange={e => set('bakeTime', e.target.value)} placeholder="0" /></Field>
      </Two>
      <Field label={`Target selling price / pack (${PESO})`}><input type="number" step="0.01" style={inp} value={f.sellPrice} onChange={e => set('sellPrice', e.target.value)} placeholder="0.00" /></Field>

      <SubTitle>Labor &amp; overhead <span style={{ color: C.muted, fontWeight: 500 }}>(per batch)</span></SubTitle>
      <Two>
        <Field label="Prep time (hrs)"><input type="number" step="0.1" style={inp} value={f.laborTime} onChange={e => set('laborTime', e.target.value)} placeholder="0" /></Field>
        <Field label={`Hourly rate (${PESO})`}><input type="number" step="0.5" style={inp} value={f.laborRate} onChange={e => set('laborRate', e.target.value)} placeholder="0" /></Field>
        <Field label={`Packaging (${PESO})`}><input type="number" step="0.01" style={inp} value={f.overheadPack} onChange={e => set('overheadPack', e.target.value)} placeholder="0" /></Field>
        <Field label={`Utilities (${PESO})`}><input type="number" step="0.01" style={inp} value={f.overheadUtil} onChange={e => set('overheadUtil', e.target.value)} placeholder="0" /></Field>
      </Two>

      <SubTitle>Ingredients</SubTitle>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Ingredient</label>
          <select style={inp} value={pick} onChange={e => setPick(e.target.value)}>
            {data.ingredients.map(i => <option key={i.ingredientId} value={i.ingredientId}>{i.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Qty</label>
          <input type="number" step="0.01" style={inp} value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
        </div>
        <button className="pressable" onClick={addItem} style={{ ...btnGhost, width: 50, padding: 13, flexShrink: 0 }}><Icon name="plus" size={20} stroke={2.3} /></button>
      </div>

      {items.map(it => {
        const ing = byId[it.ingredientId];
        return (
          <div key={it.ingredientId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${C.divider}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{ing ? ing.name : 'Unknown'}</div>
              <div style={{ fontSize: 12, color: C.sub }}>{num(it.qty)} {ing?.unit} &middot; {fmt(unitCost(ing) * it.qty)}</div>
            </div>
            <button className="pressable" onClick={() => removeItem(it.ingredientId)} style={{ padding: 6, color: C.loss }}><Icon name="trash" size={18} /></button>
          </div>
        );
      })}

      <button className="pressable" style={{ ...btnPrimary, marginTop: 16 }} onClick={submit}><Icon name="check" size={18} stroke={2.3} />{init ? 'Update' : 'Save'} recipe</button>
      {init && <button className="pressable" style={{ ...btnDanger, marginTop: 10 }} onClick={() => { if (confirm('Delete this recipe permanently?')) onDelete(init); }}><Icon name="trash" size={18} />Delete</button>}
    </Sheet>
  );
}

/* ============================================================================
   Small presentational helpers
============================================================================ */
function SectionTitle({ children }) { return <h2 style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: '.06em', padding: '2px 2px 0' }}>{children}</h2>; }
function SubTitle({ children }) { return <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{children}</h3>; }
function Two({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>; }
function Row({ k, v, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.divider}`, fontWeight: strong ? 700 : 400 }}>
      <span style={{ color: strong ? C.ink : C.sub, fontSize: 14 }}>{k}</span>
      <span style={{ fontSize: 14 }}>{v}</span>
    </div>
  );
}
function Stat({ label, value, tone }) {
  const color = tone === 'profit' ? C.profit : tone === 'loss' ? C.loss : C.ink;
  const bg = tone === 'profit' ? C.profitBg : tone === 'loss' ? C.lossBg : C.surface;
  return (
    <div style={{ ...cardStyle, background: bg, padding: 14 }}>
      <div style={{ fontSize: 11.5, color: C.sub, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}
function Pill({ value, suffix }) {
  const ok = value >= 0;
  return (
    <span style={{ fontSize: 12.5, fontWeight: 700, color: ok ? C.profit : C.loss, background: ok ? C.profitBg : C.lossBg, padding: '5px 9px', borderRadius: 9, whiteSpace: 'nowrap' }}>
      {fmt(value)}{suffix}
    </span>
  );
}
function Note({ tone, children }) {
  const color = tone === 'profit' ? C.profit : tone === 'loss' ? C.loss : C.sub;
  return <div style={{ marginTop: 12, fontSize: 13, color, fontWeight: 600 }}>{children}</div>;
}
function Empty({ icon, title, hint }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: C.muted }}>
      <div style={{ display: 'inline-grid', placeItems: 'center', width: 64, height: 64, borderRadius: 20, background: C.accentBg, color: C.accent, marginBottom: 16 }}>
        <Icon name={icon} size={28} />
      </div>
      <div style={{ fontWeight: 700, color: C.ink, fontSize: 16 }}>{title}</div>
      <div style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>{hint}</div>
    </div>
  );
}
