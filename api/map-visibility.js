import { requireUser } from "./_lib/auth.js";

const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";

// Réglages de la carte : apparaître ou non (show), et afficher son nom complet ou seulement l'initiale (fullName).
// On ne peut changer que ses propres réglages (email du jeton de session).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const cleanEmail = requireUser(req, res);
  if (!cleanEmail) return;

  const { show, fullName } = req.body || {};
  const patch = {};
  if (typeof show === "boolean") patch.show_on_map = show;
  if (typeof fullName === "boolean") patch.show_full_name = fullName;
  if (!Object.keys(patch).length) return res.status(400).json({ error: "Choix invalide." });

  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/students?email=eq.${encodeURIComponent(cleanEmail)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    const text = await r.text();
    console.log("map-visibility error:", r.status, text);
    let code = ""; try { code = JSON.parse(text).code || ""; } catch { /* réponse non JSON */ }
    // Colonne absente ou pas encore prise en compte par Supabase (voir supabase/show-on-map.sql)
    if (code === "PGRST204" || code === "42703") {
      return res.status(503).json({ error: "Réglage pas encore activé côté base de données.", code });
    }
    return res.status(500).json({ error: "Impossible d'enregistrer ton choix. Réessaie.", code: code || String(r.status) });
  }
  return res.status(200).json({ ok: true });
}
