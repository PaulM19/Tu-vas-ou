import { requireUser } from "./_lib/auth.js";

const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";
const DOMAIN = "@edu.em-lyon.com";

async function sbFetch(path, options = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "",
    },
  });
  return { ok: res.ok, status: res.status };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

// On ne peut supprimer que son propre compte : l'email vient du jeton de session.
  const cleanEmail = requireUser(req, res);
  if (!cleanEmail) return;

const { ok } = await sbFetch(`students?email=eq.${encodeURIComponent(cleanEmail)}`, {
  method: "DELETE",
});

if (!ok) {
  return res.status(500).json({ error: "Erreur lors de la suppression." });
}

return res.status(200).json({ ok: true });
}
