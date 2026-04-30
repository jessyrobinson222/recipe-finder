export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Vercel doesn't always auto-parse JSON bodies — handle both cases
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { starred = [], available = [], filters = {} } = body;
  if (!starred.length && !available.length)
    return res.status(400).json({ error: "No ingredients provided" });

  const key = process.env.SPOONACULAR_API_KEY;
  const allIngredients = [...starred, ...available].join(",");
  const number = filters.number || 10;

  try {
    // ── Step 1: findByIngredients ─────────────────────────────────────────────
    // This endpoint is strict about matching — recipes must actually use the
    // ingredients provided, ranked by how many they use.
    const findParams = new URLSearchParams({
      ingredients: allIngredients,
      number: String(Math.min(number * 2, 100)), // Spoonacular max is 100
      ranking: "1",
      ignorePantry: "true",
      apiKey: key,
    });
    const findRes = await fetch(
      `https://api.spoonacular.com/recipes/findByIngredients?${findParams}`
    );
    const findData = await findRes.json();

    if (!Array.isArray(findData) || findData.length === 0) {
      return res.status(200).json({ results: [] });
    }

    // ── Step 2: Enforce starred ingredients ───────────────────────────────────
    // If the user starred ingredients, only keep recipes that actually use at
    // least one of them. Fall back to all results if that filters everything out.
    let recipes = findData;
    if (starred.length > 0) {
      const filtered = findData.filter(r =>
        r.usedIngredients?.some(i =>
          starred.some(s => i.name.toLowerCase().includes(s.toLowerCase()))
        )
      );
      if (filtered.length > 0) recipes = filtered;
    }

    // Trim to requested count
    recipes = recipes.slice(0, number);

    // ── Step 3: Get full details (nutrition, source URL, cook time etc.) ──────
    const ids = recipes.map(r => r.id).join(",");
    const infoParams = new URLSearchParams({
      ids,
      includeNutrition: "true",
      apiKey: key,
    });
    const infoRes = await fetch(
      `https://api.spoonacular.com/recipes/informationBulk?${infoParams}`
    );
    const infoData = await infoRes.json();

    // ── Step 4: Merge used/missed ingredient data back in ─────────────────────
    // informationBulk doesn't return usedIngredients/missedIngredients, so we
    // merge them back from the findByIngredients results.
    const usedMap = Object.fromEntries(
      findData.map(r => [r.id, {
        usedIngredients: r.usedIngredients,
        missedIngredients: r.missedIngredients,
        usedIngredientCount: r.usedIngredientCount,
        missedIngredientCount: r.missedIngredientCount,
      }])
    );

    // Apply any remaining filters (diet, cuisine etc.) — these aren't available
    // in findByIngredients so we filter on the full info response
    let results = infoData.map(r => ({ ...r, ...usedMap[r.id] }));

    if (filters.diet)
      results = results.filter(r => r.diets?.includes(filters.diet));
    if (filters.cuisine)
      results = results.filter(r =>
        r.cuisines?.some(c => c.toLowerCase() === filters.cuisine)
      );
    if (filters.type)
      results = results.filter(r =>
        r.dishTypes?.some(t => t.toLowerCase() === filters.type.replace("+", " "))
      );
    if (filters.maxReadyTime)
      results = results.filter(r => r.readyInMinutes <= filters.maxReadyTime);
    if (filters.intolerances?.length) {
      // Remove recipes that contain any of the user's intolerances
      results = results.filter(r =>
        !filters.intolerances.some(intol =>
          r.extendedIngredients?.some(i =>
            i.name.toLowerCase().includes(intol.toLowerCase())
          )
        )
      );
    }

    res.status(200).json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}