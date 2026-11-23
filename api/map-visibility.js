import { requireUser } from "./_lib/auth.js";

const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";

// Apparaître ou non sur la carte. On ne peut changer que son propre réglage (email du jeton de session).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const cleanEmail = requireUser(req, res);
  if (!cleanEmail) return;

  const { show } = req.body || {};
  if (typeof show !== "boolean") return res.status(400).json({ error: "Choix invalide." });

  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/students?email=eq.${encodeURIComponent(cleanEmail)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ show_on_map: show }),
  });
  if (!r.ok) {
    console.log("map-visibility error:", r.status, await r.text());
    return res.status(500).json({ error: "Impossible d'enregistrer ton choix. Réessaie." });
  }
  return res.status(200).json({ ok: true, showOnMap: show });
}
