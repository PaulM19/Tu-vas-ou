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
    const get = cols => fetch(`${SUPABASE_URL}/rest/v1/students?select=${cols}${filter}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    // lat / lng / trip_type : positions des villes hors partenaires (stage, freemover).
    // Si les colonnes n'existent pas encore (supabase/trip-type.sql), on charge sans.
    let r = await get("city,country,semester,trip_type,lat,lng");
    if (!r.ok) r = await get("city,country,semester");
    if (!r.ok) {
      console.log("Map fetch error:", r.status, await r.text());
      return res.status(500).json({ error: "Impossible de charger la carte." });
    }
    const rows = await r.json();

    const byCity = {};
    for (const { city, country, semester, trip_type, lat, lng } of rows) {
      if (!city) continue;
      const k = `${country}|${city}`;
      if (!byCity[k]) byCity[k] = { city, country, count: 0, bySem: { fall: 0, spring: 0, double: 0 }, byType: { exchange: 0, freemover: 0, internship: 0 } };
      byCity[k].count++;
      if (byCity[k].bySem[semester] !== undefined) byCity[k].bySem[semester]++;
      const type = trip_type || "exchange";
      if (byCity[k].byType[type] !== undefined) byCity[k].byType[type]++;
      // Coordonnées : on garde la première connue pour la ville
      if (lat != null && lng != null && byCity[k].lat == null) { byCity[k].lat = lat; byCity[k].lng = lng; }
    }
    const cities = Object.values(byCity).sort((a, b) => b.count - a.count);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ total: rows.length, cities });
  } catch (e) {
    console.log("Map error:", e);
    return res.status(500).json({ error: "Impossible de charger la carte." });
  }
}
