import { requireUser } from "./_lib/auth.js";

const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";

// Donne ou retire son accord pour que ses données soient transmises / vendues aux partenaires.
// On ne peut modifier que son propre choix : l'email vient du jeton de session.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const cleanEmail = requireUser(req, res);
  if (!cleanEmail) return;

  const { consent } = req.body || {};
  if (typeof consent !== "boolean") return res.status(400).json({ error: "Choix invalide." });

  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/students?email=eq.${encodeURIComponent(cleanEmail)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    // La date est mise à jour à chaque changement : elle garde la trace du dernier choix.
    body: JSON.stringify({ partner_consent: consent, partner_consent_at: new Date().toISOString() }),
  });
  if (!r.ok) {
    console.log("Partner consent error:", r.status, await r.text());
    return res.status(500).json({ error: "Impossible d'enregistrer ton choix. Réessaie." });
  }
  return res.status(200).json({ ok: true, partnerConsent: consent });
}
