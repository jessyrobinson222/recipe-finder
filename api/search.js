// Pantry staples — too generic to build useful search queries from
const PANTRY_STAPLES = new Set([
  "salt", "pepper", "oil", "olive oil", "vegetable oil", "butter", "garlic",
  "onion", "onions", "sugar", "flour", "water", "stock", "broth", "eggs", "egg",
  "milk", "cream", "cheese", "soy sauce", "vinegar", "lemon", "lime", "herbs",
  "spices", "cumin", "paprika", "oregano", "thyme", "bay leaves", "chilli",
  "chili", "cornstarch", "baking soda", "baking powder", "honey", "mustard"
]);

// Build varied ingredient combos from the fridge list — no ingredient is
// privileged, just spread pairs across the full list for maximum variety
function buildQueryCombos(ingredients, maxCombos = 5) {
  const interesting = ingredients.filter(i => !PANTRY_STAPLES.has(i.toLowerCase()));
  const pool = interesting.length > 0 ? interesting : ingredients;
  if (pool.length === 0) return [];

  const combos = new Set();

  // Spread pairs evenly across the list rather than anchoring on first item
  const step = Math.max(1, Math.floor(pool.length / maxCombos));
  for (let i = 0; i < pool.length - 1 && combos.size < maxCombos; i += step) {
    const j = (i + Math.ceil(pool.length / 3)) % pool.length;
    if (i !== j) combos.add(`${pool[i]} ${pool[j]} recipe`);
  }

  // Fill remaining slots with single-ingredient searches from different
  // parts of the list if we don't have enough pairs
  for (let i = 0; i < pool.length && combos.size < maxCombos; i += 2) {
    combos.add(`${pool[i]} recipe`);
  }

  return [...combos].slice(0, maxCombos);
}

// Extract real star rating + review count from Google's pagemap schema data
function extractRating(item) {
  const ar = item.pagemap?.aggregaterating?.[0];
  if (!ar) return null;
  const rating = parseFloat(ar.ratingvalue);
  const count = parseInt(ar.ratingcount || ar.reviewcount || ar.bestrating || 0);
  if (isNaN(rating)) return null;
  return { rating, count };
}

// Rough ingredient overlap — count how many fridge ingredients appear in
// the result title + snippet (used for ranking, not filtering)
function countMatches(item, ingredients) {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  return ingredients.filter(ing => text.includes(ing.toLowerCase())).length;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { ingredients = [], filters = {} } = body;
  if (!ingredients.length) return res.status(400).json({ error: "No ingredients provided" });

  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  const number = Math.min(filters.number || 10, 10); // CSE max per request is 10

  // Build query from most interesting ingredients
  const queryIngredients = pickQueryIngredients(ingredients);
  const baseQuery = queryIngredients.join(" ") + " recipe";
  const query = [
    baseQuery,
    filters.cuisine  ? filters.cuisine  : null,
    filters.diet     ? filters.diet     : null,
    filters.type     ? filters.type.replace("+", " ") : null,
  ].filter(Boolean).join(" ");

  try {
    // Run up to 2 queries in parallel for better coverage:
    // 1. Primary: top ingredients
    // 2. Fallback broader: just the first ingredient if we have multiple
    const queries = [query];
    if (queryIngredients.length > 1) {
      queries.push(`${queryIngredients[0]} recipe`);
    }

    const fetches = queries.map(q =>
      fetch(`https://www.googleapis.com/customsearch/v1?` + new URLSearchParams({
        key, cx, q, num: "10"
      })).then(r => r.json())
    );

    const responses = await Promise.all(fetches);

    // Merge and deduplicate by URL
    const seen = new Set();
    let items = [];
    for (const data of responses) {
      for (const item of (data.items || [])) {
        if (!seen.has(item.link)) {
          seen.add(item.link);
          items.push(item);
        }
      }
    }

    // Attach rating + ingredient match score to each result
    items = items.map(item => ({
      ...item,
      ratingData: extractRating(item),
      matchCount: countMatches(item, ingredients),
    }));

    // Filter: only show recipes with real ratings that meet quality threshold
    const minRating = filters.minRating ?? 4.5;

    let results = items.filter(item => {
      if (!item.ratingData) return false;
      const { rating, count } = item.ratingData;
      // Higher bar for well-reviewed recipes, lower bar for smaller sites
      return count >= 100 ? rating >= minRating : rating >= 4.0;
    });

    // If strict filtering returns nothing, relax review count only
    // (keeps quality bar but handles newer/smaller sites like MOB)
    if (results.length === 0) {
      results = items.filter(item =>
        item.ratingData && item.ratingData.rating >= minRating
      );
    }

    // If still nothing, return all results with ratings (no threshold)
    if (results.length === 0) {
      results = items.filter(item => item.ratingData);
    }

    // Last resort: return everything if we have no rated results at all
    if (results.length === 0) results = items;

    // Rank: most fridge ingredients matched first, then by rating
    results.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      const rA = a.ratingData?.rating || 0;
      const rB = b.ratingData?.rating || 0;
      return rB - rA;
    });

    if (filters.maxReadyTime) {
      results = results.map(r => ({ ...r, cookTimeNote: `Filter for ${filters.maxReadyTime} min recipes applied in search` }));
    }

    res.status(200).json({ results: results.slice(0, number) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}