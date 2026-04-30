export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { starred, available, filters = {} } = req.body;
  if (!starred?.length && !available?.length)
    return res.status(400).json({ error: "No ingredients provided" });

  const key = process.env.SPOONACULAR_API_KEY;
  const allIngredients = [...(starred || []), ...(available || [])].join(",");

  const params = new URLSearchParams({
    includeIngredients: allIngredients,
    sort: "max-used-ingredients",
    number: String(filters.number || 10),
    addRecipeInformation: "true",
    fillIngredients: "true",
    addRecipeNutrition: "true",
    ignorePantry: "true",
    apiKey: key,
  });

  if (filters.diet)         params.set("diet", filters.diet);
  if (filters.cuisine)      params.set("cuisine", filters.cuisine);
  if (filters.type)         params.set("type", filters.type);
  if (filters.maxReadyTime) params.set("maxReadyTime", String(filters.maxReadyTime));
  if (filters.intolerances?.length) params.set("intolerances", filters.intolerances.join(","));

  try {
    const response = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?${params}`
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}