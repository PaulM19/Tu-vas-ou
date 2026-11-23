import { requireUser } from "./_lib/auth.js";

const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";

// Qui part dans chaque ville. Réservé aux étudiants connectés (email emlyon vérifié).
// Ne renvoie que le prénom, l'initiale du nom (ou le nom complet si l'étudiant l'a accepté),
// l'école et le semestre : jamais d'email ni de numéro.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const cleanEmail = requireUser(req, res);
  if (!cleanEmail) return;

  const key = process.env.SUPABASE_SERVICE_KEY;
  const get = query => fetch(`${SUPABASE_URL}/rest/v1/students?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  const cols = "select=email,first_name,last_name,school,city,country,semester";
  let r = await get(`${cols},show_full_name&show_on_map=eq.true&order=first_name.asc`);
  // Colonnes pas encore créées (voir supabase/show-on-map.sql) : tout le monde visible, avec l'initiale seulement.
  if (!r.ok) {
    console.log("map-people: show_on_map indisponible, liste complète utilisée.", r.status);
    r = await get(`${cols}&order=first_name.asc`);
  }
  if (!r.ok) return res.status(500).json({ error: "Impossible de charger la liste." });
  const rows = await r.json();

  const byCity = {};
  for (const s of rows) {
    if (!s.city) continue;
    const k = `${s.country}|${s.city}`;
    if (!byCity[k]) byCity[k] = { city: s.city, country: s.country, people: [] };
    const last = (s.last_name || "").trim();
    byCity[k].people.push({
      name: `${(s.first_name || "").trim()}${!last ? "" : s.show_full_name === true ? ` ${last}` : ` ${last[0].toUpperCase()}.`}`,
      school: s.school,
      semester: s.semester,
      me: (s.email || "").toLowerCase() === cleanEmail,
    });
  }

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ cities: Object.values(byCity) });
}
