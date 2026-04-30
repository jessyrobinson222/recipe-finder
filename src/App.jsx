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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SOURCE_LABELS = {
  "recipetineats.com": "RecipeTin Eats",
  "allrecipes.com": "AllRecipes",
  "seriouseats.com": "Serious Eats",
  "bbcgoodfood.com": "BBC Good Food",
  "taste.com.au": "Taste",
  "delicious.com.au": "Delicious",
};
const SOURCE_COLORS = {
  "RecipeTin Eats": "#c0392b",
  "AllRecipes": "#e67e22",
  "Serious Eats": "#2980b9",
  "BBC Good Food": "#27ae60",
  "Taste": "#8e44ad",
  "Delicious": "#16a085",
};

function getSource(url) {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return SOURCE_LABELS[domain] || domain;
  } catch { return "Recipe"; }
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, saved, onSave, onUnsave }) {
  const source = getSource(recipe.link);
  const color = SOURCE_COLORS[source] || "#555";
  const image = recipe.pagemap?.cse_image?.[0]?.src || recipe.pagemap?.cse_thumbnail?.[0]?.src;

  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
      {image && (
        <div style={{ position: "relative", height: 210, overflow: "hidden" }}>
          <img src={image} alt={recipe.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", top: 12, left: 12 }}>
            <span style={{ background: color, color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, fontFamily: "sans-serif", letterSpacing: 0.3 }}>{source}</span>
          </div>
          <button onClick={saved ? onUnsave : onSave} style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)",
            border: "none", borderRadius: 8, padding: "8px 12px",
            cursor: "pointer", fontSize: 20, color: saved ? "#e74c3c" : "#fff"
          }}>{saved ? "♥" : "♡"}</button>
        </div>
      )}
      <div style={{ padding: "16px 18px 18px" }}>
        {!image && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <span style={{ background: color, color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, fontFamily: "sans-serif" }}>{source}</span>
            <button onClick={saved ? onUnsave : onSave} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: saved ? "#e74c3c" : "#ccc" }}>{saved ? "♥" : "♡"}</button>
          </div>
        )}
        <div style={{ fontSize: 17, fontWeight: 700, color: "#2c2c2c", marginBottom: 8, lineHeight: 1.35 }}>{recipe.title}</div>
        <div style={{ fontSize: 13, color: "#777", lineHeight: 1.65, marginBottom: 16 }}>{recipe.snippet}</div>
        <a href={recipe.link} target="_blank" rel="noopener noreferrer" style={{
          display: "block", textAlign: "center", padding: "14px",
          borderRadius: 10, background: color, color: "#fff",
          fontSize: 15, fontWeight: 700, textDecoration: "none", fontFamily: "Georgia, serif"
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
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

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
    const queryParts = [...starred, ...available.slice(0, 3)];
    const query = queryParts.join(" ") + " recipe";

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.items || []);
    } catch {
      setError("Search failed — make sure the app is deployed to Vercel.");
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = (recipe) => {
    const updated = [recipe, ...saved.filter(r => r.link !== recipe.link)];
    setSaved(updated); persistSaved(updated);
  };
  const unsaveRecipe = (link) => {
    const updated = saved.filter(r => r.link !== link);
    setSaved(updated); persistSaved(updated);
  };
  const isSaved = (link) => saved.some(r => r.link === link);

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#faf8f4", minHeight: "100vh" }}>
      <style>{`* { box-sizing: border-box; } a { -webkit-tap-highlight-color: transparent; }`}</style>

      {/* Header */}
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

      {/* Search tab */}
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
            {ingredients.map(({ name, starred }) => (
              <span key={name} style={{
                background: starred ? "#2c2c2c" : "#fff",
                color: starred ? "#fff" : "#444",
                border: `2px solid ${starred ? "#2c2c2c" : "#e0d8d0"}`,
                borderRadius: 20, padding: "4px 6px 4px 10px",
                fontSize: 14, display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s"
              }}>
                <button onClick={() => toggleStar(name)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "0 2px", fontSize: 14, color: starred ? "#f59e0b" : "#ccc"
                }}>★</button>
                {name}
                <button onClick={() => removeIngredient(name)} style={{
                  background: "none", border: "none",
                  color: starred ? "rgba(255,255,255,0.5)" : "#bbb",
                  cursor: "pointer", padding: "0 4px 0 2px", fontSize: 16, lineHeight: 1
                }}>×</button>
              </span>
            ))}
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} onBlur={() => { if (input.trim()) addIngredient(input); }}
              placeholder={ingredients.length === 0 ? "Type an ingredient, press Enter (e.g. chicken thighs…)" : "Add more…"}
              style={{ border: "none", outline: "none", fontSize: 15, flex: 1, minWidth: 180, background: "transparent", color: "#333", fontFamily: "inherit" }}
            />
          </div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
            Tap <span style={{ color: "#f59e0b" }}>★</span> to prioritise. Dump your whole fridge in — search uses starred ingredients first.
          </div>

          <button onClick={search} disabled={loading || !ingredients.length} style={{
            marginTop: 16, width: "100%", padding: 16,
            background: ingredients.length && !loading ? "#c0392b" : "#ccc",
            color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700,
            cursor: ingredients.length && !loading ? "pointer" : "not-allowed", fontFamily: "inherit"
          }}>{loading ? "Searching…" : "🔍 Find Recipes"}</button>

          {error && (
            <div style={{ marginTop: 12, color: "#c0392b", fontSize: 13, textAlign: "center", background: "#fff0f0", padding: "10px 16px", borderRadius: 8 }}>{error}</div>
          )}

          {results && (
            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 20 }}>
              {results.length === 0
                ? <div style={{ textAlign: "center", padding: 40, color: "#888" }}>No recipes found — try different ingredients</div>
                : results.map((r, i) => (
                  <RecipeCard key={i} recipe={r} saved={isSaved(r.link)}
                    onSave={() => saveRecipe(r)} onUnsave={() => unsaveRecipe(r.link)} />
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Saved tab */}
      {tab === "saved" && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
          {saved.length === 0
            ? <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>♡</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#555", marginBottom: 6 }}>No saved recipes</div>
                <div style={{ fontSize: 14, color: "#aaa" }}>Search for recipes and tap the heart to save them</div>
              </div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {saved.map((r, i) => (
                  <RecipeCard key={i} recipe={r} saved={true} onUnsave={() => unsaveRecipe(r.link)} />
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}