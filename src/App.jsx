import { useState, useRef, useEffect } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "recipe-finder:saved";
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function persistSaved(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  catch (e) { console.error(e); }
}

// ─── Filter config ────────────────────────────────────────────────────────────
const DIETS = ["Vegetarian", "Vegan", "Gluten Free", "Ketogenic", "Paleo", "Whole30", "Pescetarian", "Primal"];
const CUISINES = ["Italian", "Asian", "Mexican", "Mediterranean", "American", "French", "Indian", "Japanese", "Chinese", "Thai", "Greek", "Spanish", "Middle Eastern"];
const MEAL_TYPES = ["Main Course", "Starter", "Salad", "Soup", "Snack", "Breakfast", "Dessert"];
const COOK_TIMES = [
  { label: "Any", value: null },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
];
const RESULT_COUNTS = [5, 10, 15, 20];
const INTOLERANCES = ["Dairy", "Egg", "Gluten", "Peanut", "Seafood", "Shellfish", "Soy", "Tree Nut", "Wheat"];

const DEFAULT_FILTERS = {
  diet: null,
  cuisine: null,
  type: null,
  maxReadyTime: null,
  number: 10,
  intolerances: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCalories(recipe) {
  const cal = (recipe.nutrition?.nutrients || []).find(n => n.name === "Calories");
  return cal ? Math.round(cal.amount) : null;
}
function getDomain(url) {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return null; }
}
function countActiveFilters(f) {
  return [f.diet, f.cuisine, f.type, f.maxReadyTime].filter(Boolean).length
    + (f.intolerances?.length || 0)
    + (f.number !== 10 ? 1 : 0);
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────
function FilterPanel({ filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });
  const toggle = (key, val) => {
    const cur = filters[key];
    onChange({ ...filters, [key]: cur === val ? null : val });
  };
  const toggleIntolerance = (val) => {
    const cur = filters.intolerances || [];
    onChange({ ...filters, intolerances: cur.includes(val) ? cur.filter(i => i !== val) : [...cur, val] });
  };

  const chipStyle = (active) => ({
    padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
    border: `2px solid ${active ? "#c0392b" : "#e0d8d0"}`,
    background: active ? "#c0392b" : "#fff",
    color: active ? "#fff" : "#555",
    fontFamily: "inherit", transition: "all 0.12s", whiteSpace: "nowrap"
  });

  const section = (title) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 16 }}>
      {title}
    </div>
  );

  return (
    <div style={{ background: "#fff", border: "2px solid #e8e0d5", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
      {/* Diet */}
      {section("Diet")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {DIETS.map(d => (
          <button key={d} style={chipStyle(filters.diet === d.toLowerCase())}
            onClick={() => toggle("diet", d.toLowerCase())}>{d}</button>
        ))}
      </div>

      {/* Cuisine */}
      {section("Cuisine")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CUISINES.map(c => (
          <button key={c} style={chipStyle(filters.cuisine === c.toLowerCase())}
            onClick={() => toggle("cuisine", c.toLowerCase())}>{c}</button>
        ))}
      </div>

      {/* Meal type */}
      {section("Meal Type")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {MEAL_TYPES.map(t => (
          <button key={t} style={chipStyle(filters.type === t.toLowerCase().replace(" ", "+"))}
            onClick={() => toggle("type", t.toLowerCase().replace(" ", "+"))}>{t}</button>
        ))}
      </div>

      {/* Cook time */}
      {section("Max Cook Time")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COOK_TIMES.map(({ label, value }) => (
          <button key={label} style={chipStyle(filters.maxReadyTime === value)}
            onClick={() => set("maxReadyTime", value)}>{label}</button>
        ))}
      </div>

      {/* Intolerances */}
      {section("Intolerances / Allergies")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {INTOLERANCES.map(i => (
          <button key={i} style={chipStyle((filters.intolerances || []).includes(i.toLowerCase()))}
            onClick={() => toggleIntolerance(i.toLowerCase())}>{i}</button>
        ))}
      </div>

      {/* Result count */}
      {section("Number of Results")}
      <div style={{ display: "flex", gap: 6 }}>
        {RESULT_COUNTS.map(n => (
          <button key={n} style={chipStyle(filters.number === n)}
            onClick={() => set("number", n)}>{n}</button>
        ))}
      </div>

      {/* Reset */}
      <button onClick={() => onChange(DEFAULT_FILTERS)} style={{
        marginTop: 16, width: "100%", padding: "10px", borderRadius: 8,
        border: "2px solid #e0d8d0", background: "none", color: "#888",
        fontSize: 13, cursor: "pointer", fontFamily: "inherit"
      }}>Reset all filters</button>
    </div>
  );
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, saved, onSave, onUnsave }) {
  const calories = getCalories(recipe);
  const domain = getDomain(recipe.sourceUrl);
  const used = recipe.usedIngredients || [];
  const missed = recipe.missedIngredients || [];

  const badge = { background: "#f0ebe4", color: "#555", borderRadius: 20, padding: "5px 12px", fontSize: 12, fontFamily: "sans-serif" };

  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
      {recipe.image && (
        <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
          <img src={recipe.image} alt={recipe.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button onClick={saved ? onUnsave : onSave} style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
            border: "none", borderRadius: 8, padding: "8px 12px",
            cursor: "pointer", fontSize: 20, color: saved ? "#e74c3c" : "#fff"
          }}>{saved ? "♥" : "♡"}</button>
        </div>
      )}
      <div style={{ padding: "16px 18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#2c2c2c", lineHeight: 1.3 }}>{recipe.title}</div>
          {!recipe.image && (
            <button onClick={saved ? onUnsave : onSave} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: saved ? "#e74c3c" : "#ccc", flexShrink: 0 }}>
              {saved ? "♥" : "♡"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {recipe.readyInMinutes && <span style={badge}>⏱ {recipe.readyInMinutes} mins</span>}
          {recipe.servings && <span style={badge}>👤 Serves {recipe.servings}</span>}
          {calories && <span style={badge}>🔥 {calories} cal</span>}
          {domain && <span style={{ ...badge, background: "#faf8f4", color: "#888" }}>🔗 {domain}</span>}
        </div>

        {used.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#27ae60", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              ✓ Uses from your fridge ({used.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {used.map(i => (
                <span key={i.id} style={{ background: "#e8f8ee", color: "#1e7e34", borderRadius: 20, padding: "3px 10px", fontSize: 12 }}>{i.name}</span>
              ))}
            </div>
          </div>
        )}
        {missed.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#e67e22", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              + You'll also need ({missed.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {missed.map(i => (
                <span key={i.id} style={{ background: "#fef3e2", color: "#b7590a", borderRadius: 20, padding: "3px 10px", fontSize: 12 }}>{i.name}</span>
              ))}
            </div>
          </div>
        )}

        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
            display: "block", textAlign: "center", padding: "14px", borderRadius: 10,
            background: "#c0392b", color: "#fff", fontSize: 15, fontWeight: 700,
            textDecoration: "none", fontFamily: "Georgia, serif"
          }}>View Full Recipe ↗</a>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("search");
  const [input, setInput] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => { setSaved(loadSaved()); }, []);

  const addIngredient = (val) => {
    const t = val.trim().toLowerCase();
    if (t && !ingredients.find(i => i.name === t))
      setIngredients(p => [...p, { name: t, starred: false }]);
    setInput("");
  };
  const toggleStar = (name) => setIngredients(p => p.map(i => i.name === name ? { ...i, starred: !i.starred } : i));
  const removeIngredient = (name) => setIngredients(p => p.filter(i => i.name !== name));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (input.trim()) addIngredient(input); }
    else if (e.key === "Backspace" && !input && ingredients.length > 0) setIngredients(p => p.slice(0, -1));
  };

  const search = async () => {
    if (!ingredients.length) return;
    setLoading(true); setError(null); setResults(null);
    const starred = ingredients.filter(i => i.starred).map(i => i.name);
    const available = ingredients.filter(i => !i.starred).map(i => i.name);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred, available, filters })
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setError("Search failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = (recipe) => { const u = [recipe, ...saved.filter(r => r.id !== recipe.id)]; setSaved(u); persistSaved(u); };
  const unsaveRecipe = (id) => { const u = saved.filter(r => r.id !== id); setSaved(u); persistSaved(u); };
  const isSaved = (id) => saved.some(r => r.id === id);
  const activeFilterCount = countActiveFilters(filters);

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#faf8f4", minHeight: "100vh" }}>
      <style>{`* { box-sizing: border-box; } a { -webkit-tap-highlight-color: transparent; }`}</style>

      <div style={{ background: "#c0392b", padding: "26px 24px 0", textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#f5c6c2", textTransform: "uppercase", marginBottom: 4 }}>Recipe Finder</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>What's in the fridge?</div>
        <div style={{ display: "flex", marginTop: 18 }}>
          {[["search", "🔍 Search"], ["saved", `♥ Saved${saved.length ? ` (${saved.length})` : ""}`]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "12px 0", border: "none", cursor: "pointer",
              background: tab === id ? "#faf8f4" : "transparent",
              color: tab === id ? "#c0392b" : "#f5c6c2",
              fontWeight: 700, fontSize: 14, fontFamily: "inherit",
              borderRadius: tab === id ? "10px 10px 0 0" : 0
            }}>{label}</button>
          ))}
        </div>
      </div>

      {tab === "search" && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
          {/* Ingredient input */}
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            Your Ingredients
          </label>
          <div onClick={() => inputRef.current?.focus()} style={{
            background: "#fff", border: "2px solid #e8e0d5", borderRadius: 12,
            padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 8,
            cursor: "text", minHeight: 60, alignItems: "center"
          }}>
            {ingredients.map(({ name, starred }) => (
              <span key={name} style={{
                background: starred ? "#2c2c2c" : "#fff", color: starred ? "#fff" : "#444",
                border: `2px solid ${starred ? "#2c2c2c" : "#e0d8d0"}`,
                borderRadius: 20, padding: "4px 6px 4px 10px",
                fontSize: 14, display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s"
              }}>
                <button onClick={() => toggleStar(name)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: 14, color: starred ? "#f59e0b" : "#ccc" }}>★</button>
                {name}
                <button onClick={() => removeIngredient(name)} style={{ background: "none", border: "none", color: starred ? "rgba(255,255,255,0.5)" : "#bbb", cursor: "pointer", padding: "0 4px 0 2px", fontSize: 16, lineHeight: 1 }}>×</button>
              </span>
            ))}
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} onBlur={() => { if (input.trim()) addIngredient(input); }}
              placeholder={ingredients.length === 0 ? "Type an ingredient, press Enter…" : "Add more…"}
              style={{ border: "none", outline: "none", fontSize: 15, flex: 1, minWidth: 180, background: "transparent", color: "#333", fontFamily: "inherit" }}
            />
          </div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
            Dump your whole fridge in. Tap <span style={{ color: "#f59e0b" }}>★</span> to prioritise ingredients.
          </div>

          {/* Filters toggle */}
          <button onClick={() => setFiltersOpen(o => !o)} style={{
            marginTop: 12, padding: "10px 18px", borderRadius: 10,
            border: `2px solid ${activeFilterCount > 0 ? "#c0392b" : "#e0d8d0"}`,
            background: activeFilterCount > 0 ? "#fff0ee" : "#fff",
            color: activeFilterCount > 0 ? "#c0392b" : "#666",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 8
          }}>
            <span>{filtersOpen ? "▲" : "▼"}</span>
            Filters
            {activeFilterCount > 0 && (
              <span style={{ background: "#c0392b", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {filtersOpen && (
            <div style={{ marginTop: 8 }}>
              <FilterPanel filters={filters} onChange={setFilters} />
            </div>
          )}

          <button onClick={search} disabled={loading || !ingredients.length} style={{
            marginTop: 14, width: "100%", padding: 16,
            background: ingredients.length && !loading ? "#c0392b" : "#ccc",
            color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700,
            cursor: ingredients.length && !loading ? "pointer" : "not-allowed", fontFamily: "inherit"
          }}>{loading ? "Finding recipes…" : "🔍 Find Recipes"}</button>

          {error && <div style={{ marginTop: 12, color: "#c0392b", fontSize: 13, textAlign: "center", background: "#fff0f0", padding: "10px 16px", borderRadius: 8 }}>{error}</div>}

          {results && (
            <div style={{ marginTop: 28 }}>
              {results.length === 0
                ? <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
                    No recipes found — try removing some filters or adding more ingredients
                  </div>
                : <>
                    <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
                      {results.length} recipes · ranked by how many of your ingredients they use
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {results.map(r => (
                        <RecipeCard key={r.id} recipe={r} saved={isSaved(r.id)}
                          onSave={() => saveRecipe(r)} onUnsave={() => unsaveRecipe(r.id)} />
                      ))}
                    </div>
                  </>
              }
            </div>
          )}
        </div>
      )}

      {tab === "saved" && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
          {saved.length === 0
            ? <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>♡</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#555", marginBottom: 6 }}>No saved recipes</div>
                <div style={{ fontSize: 14, color: "#aaa" }}>Search and tap the heart to save recipes</div>
              </div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {saved.map(r => (
                  <RecipeCard key={r.id} recipe={r} saved={true} onUnsave={() => unsaveRecipe(r.id)} />
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}