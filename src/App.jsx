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
const DEFAULT_FILTERS = {
  cuisine: null, type: null, maxReadyTime: null,
  number: 10, minRating: 4.5, minReviews: 100,
};

function countActiveFilters(f) {
  return [f.cuisine, f.type, f.maxReadyTime].filter(Boolean).length +
    (f.number !== 10 ? 1 : 0) +
    (f.minRating !== 4.5 ? 1 : 0) +
    (f.minReviews !== 100 ? 1 : 0);
}

// ─── Stars display ────────────────────────────────────────────────────────────
function StarRating({ rating, count }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
      <span style={{ color: "#f59e0b", fontSize: 15, letterSpacing: 1 }}>
        {"★".repeat(full)}{half ? "½" : ""}{"☆".repeat(empty)}
      </span>
      <span style={{ fontSize: 13, color: "#888", fontFamily: "sans-serif" }}>
        {rating.toFixed(1)}
        {count > 0 && <span> · {count.toLocaleString()} reviews</span>}
      </span>
    </div>
  );
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────
function FilterPanel({ filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });
  const toggle = (key, val) => onChange({ ...filters, [key]: filters[key] === val ? null : val });

  const chip = (active) => ({
    padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
    border: `2px solid ${active ? "#c0392b" : "#e0d8d0"}`,
    background: active ? "#c0392b" : "#fff",
    color: active ? "#fff" : "#555",
    fontFamily: "inherit", transition: "all 0.12s", whiteSpace: "nowrap"
  });

  const sectionLabel = (title) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 16 }}>
      {title}
    </div>
  );

  return (
    <div style={{ background: "#fff", border: "2px solid #e8e0d5", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>

      {/* Min rating */}
      {sectionLabel("Minimum Rating")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {[4.0, 4.3, 4.5, 4.7, 4.9].map(r => (
          <button key={r} style={chip(filters.minRating === r)}
            onClick={() => set("minRating", r)}>{"★".repeat(Math.floor(r))} {r.toFixed(1)}+</button>
        ))}
      </div>

      {/* Min reviews */}
      {sectionLabel("Minimum Reviews")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {[10, 50, 100, 500, 1000].map(n => (
          <button key={n} style={chip(filters.minReviews === n)}
            onClick={() => set("minReviews", n)}>{n.toLocaleString()}+</button>
        ))}
      </div>

      {/* Cuisine */}
      {sectionLabel("Cuisine")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CUISINES.map(c => (
          <button key={c} style={chip(filters.cuisine === c.toLowerCase())}
            onClick={() => toggle("cuisine", c.toLowerCase())}>{c}</button>
        ))}
      </div>

      {/* Meal type */}
      {sectionLabel("Meal Type")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {MEAL_TYPES.map(t => (
          <button key={t} style={chip(filters.type === t.toLowerCase().replace(" ", "+"))}
            onClick={() => toggle("type", t.toLowerCase().replace(" ", "+"))}>{t}</button>
        ))}
      </div>

      {/* Cook time */}
      {sectionLabel("Max Cook Time")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COOK_TIMES.map(({ label, value }) => (
          <button key={label} style={chip(filters.maxReadyTime === value)}
            onClick={() => set("maxReadyTime", value)}>{label}</button>
        ))}
      </div>

      {/* Result count */}
      {sectionLabel("Number of Results")}
      <div style={{ display: "flex", gap: 6 }}>
        {RESULT_COUNTS.map(n => (
          <button key={n} style={chip(filters.number === n)}
            onClick={() => set("number", n)}>{n}</button>
        ))}
      </div>

      <button onClick={() => onChange(DEFAULT_FILTERS)} style={{
        marginTop: 16, width: "100%", padding: "10px", borderRadius: 8,
        border: "2px solid #e0d8d0", background: "none", color: "#888",
        fontSize: 13, cursor: "pointer", fontFamily: "inherit"
      }}>Reset filters</button>
    </div>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────
const SOURCE_COLORS = {
  "mob.co.uk": "#1a1a1a",
  "recipetineats.com": "#c0392b",
  "allrecipes.com": "#e67e22",
  "seriouseats.com": "#2980b9",
  "bbcgoodfood.com": "#27ae60",
  "taste.com.au": "#8e44ad",
  "delicious.com.au": "#16a085",
  "foodnetwork.com": "#e74c3c",
  "jamieoliver.com": "#f39c12",
};

function getSource(url) {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return { domain, label: domain.split(".")[0].replace("recipetineats", "RecipeTin Eats").replace("bbcgoodfood", "BBC Good Food"), color: SOURCE_COLORS[domain] || "#555" };
  } catch { return { domain: "", label: "Recipe", color: "#555" }; }
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, allIngredients, saved, onSave, onUnsave }) {
  const { label, color } = getSource(recipe.link);
  const image = recipe.pagemap?.cse_image?.[0]?.src || recipe.pagemap?.cse_thumbnail?.[0]?.src;
  const { rating, count } = recipe.ratingData || {};

  // Which of the user's ingredients appear in title+snippet
  const text = `${recipe.title} ${recipe.snippet}`.toLowerCase();
  const matchedIngredients = allIngredients.filter(i => text.includes(i.toLowerCase()));

  const badge = { background: "#f0ebe4", color: "#555", borderRadius: 20, padding: "5px 12px", fontSize: 12, fontFamily: "sans-serif" };

  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
      {image && (
        <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
          <img src={image} alt={recipe.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", top: 12, left: 12 }}>
            <span style={{ background: color, color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, fontFamily: "sans-serif", textTransform: "capitalize" }}>{label}</span>
          </div>
          <button onClick={saved ? onUnsave : onSave} style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
            border: "none", borderRadius: 8, padding: "8px 12px",
            cursor: "pointer", fontSize: 20, color: saved ? "#e74c3c" : "#fff"
          }}>{saved ? "♥" : "♡"}</button>
        </div>
      )}

      <div style={{ padding: "16px 18px 20px" }}>
        {!image && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ background: color, color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, fontFamily: "sans-serif", textTransform: "capitalize" }}>{label}</span>
            <button onClick={saved ? onUnsave : onSave} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: saved ? "#e74c3c" : "#ccc" }}>{saved ? "♥" : "♡"}</button>
          </div>
        )}

        <div style={{ fontSize: 18, fontWeight: 700, color: "#2c2c2c", lineHeight: 1.3, marginBottom: 8 }}>{recipe.title}</div>

        <StarRating rating={rating} count={count} />

        <div style={{ fontSize: 13, color: "#777", lineHeight: 1.65, marginBottom: 14 }}>{recipe.snippet}</div>

        {/* Fridge ingredient matches */}
        {matchedIngredients.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#27ae60", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              ✓ Mentions your ingredients ({matchedIngredients.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {matchedIngredients.map(i => (
                <span key={i} style={{ background: "#e8f8ee", color: "#1e7e34", borderRadius: 20, padding: "3px 10px", fontSize: 12 }}>{i}</span>
              ))}
            </div>
          </div>
        )}

        <a href={recipe.link} target="_blank" rel="noopener noreferrer" style={{
          display: "block", textAlign: "center", padding: "14px", borderRadius: 10,
          background: color, color: "#fff", fontSize: 15, fontWeight: 700,
          textDecoration: "none", fontFamily: "Georgia, serif"
        }}>View Recipe ↗</a>
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
    if (t && !ingredients.includes(t)) setIngredients(p => [...p, t]);
    setInput("");
  };
  const removeIngredient = (name) => setIngredients(p => p.filter(i => i !== name));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (input.trim()) addIngredient(input); }
    else if (e.key === "Backspace" && !input && ingredients.length > 0) setIngredients(p => p.slice(0, -1));
  };

  const search = async () => {
    if (!ingredients.length) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, filters })
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setError("Search failed — please try again.");
    } finally { setLoading(false); }
  };

  const saveRecipe = (r) => { const u = [r, ...saved.filter(s => s.link !== r.link)]; setSaved(u); persistSaved(u); };
  const unsaveRecipe = (link) => { const u = saved.filter(s => s.link !== link); setSaved(u); persistSaved(u); };
  const isSaved = (link) => saved.some(s => s.link === link);
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
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            Your Ingredients
          </label>
          <div onClick={() => inputRef.current?.focus()} style={{
            background: "#fff", border: "2px solid #e8e0d5", borderRadius: 12,
            padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 8,
            cursor: "text", minHeight: 60, alignItems: "center"
          }}>
            {ingredients.map(name => (
              <span key={name} style={{
                background: "#fff", color: "#444", border: "2px solid #e0d8d0",
                borderRadius: 20, padding: "4px 10px 4px 12px",
                fontSize: 14, display: "flex", alignItems: "center", gap: 6
              }}>
                {name}
                <button onClick={() => removeIngredient(name)} style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", padding: "0 2px", fontSize: 16, lineHeight: 1 }}>×</button>
              </span>
            ))}
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} onBlur={() => { if (input.trim()) addIngredient(input); }}
              placeholder={ingredients.length === 0 ? "Type an ingredient, press Enter…" : "Add more…"}
              style={{ border: "none", outline: "none", fontSize: 15, flex: 1, minWidth: 180, background: "transparent", color: "#333", fontFamily: "inherit" }}
            />
          </div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
            Dump your whole fridge in. Recipes are ranked by how many of your ingredients they use.
          </div>

          {/* Filters */}
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
              <span style={{ background: "#c0392b", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{activeFilterCount}</span>
            )}
          </button>

          {filtersOpen && <div style={{ marginTop: 8 }}><FilterPanel filters={filters} onChange={setFilters} /></div>}

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
                    No recipes found — try adjusting your filters or adding more ingredients
                  </div>
                : <>
                    <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
                      {results.length} recipes · ranked by ingredient match
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {results.map((r, i) => (
                        <RecipeCard key={i} recipe={r} allIngredients={ingredients}
                          saved={isSaved(r.link)} onSave={() => saveRecipe(r)} onUnsave={() => unsaveRecipe(r.link)} />
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
                {saved.map((r, i) => (
                  <RecipeCard key={i} recipe={r} allIngredients={[]}
                    saved={true} onUnsave={() => unsaveRecipe(r.link)} />
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}