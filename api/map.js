const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";

// true : la carte compte aussi les étudiants importés (is_seeded = true).
// false : seulement ceux qui se sont inscrits eux-mêmes sur le site.
const INCLUDE_SEEDED = true;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const key = process.env.SUPABASE_SERVICE_KEY;
  const filter = INCLUDE_SEEDED ? "" : "&is_seeded=eq.false";

  try {
    // On ne lit QUE la ville, le pays et le semestre : aucun nom, email ou numéro ne sort d'ici.
    const r = await fetch(`${SUPABASE_URL}/rest/v1/students?select=city,country,semester${filter}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) {
      console.log("Map fetch error:", r.status, await r.text());
      return res.status(500).json({ error: "Impossible de charger la carte." });
    }
    const rows = await r.json();

    const byCity = {};
    for (const { city, country, semester } of rows) {
      if (!city) continue;
      const k = `${country}|${city}`;
      if (!byCity[k]) byCity[k] = { city, country, count: 0, bySem: { fall: 0, spring: 0, double: 0 } };
      byCity[k].count++;
      if (byCity[k].bySem[semester] !== undefined) byCity[k].bySem[semester]++;
    }
    const cities = Object.values(byCity).sort((a, b) => b.count - a.count);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ total: rows.length, cities });
  } catch (e) {
    console.log("Map error:", e);
    return res.status(500).json({ error: "Impossible de charger la carte." });
  }
}
