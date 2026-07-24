const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";
const DOMAIN = "@edu.em-lyon.com";

async function sbFetch(path, options = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY || "sb_publishable_nX8bK2lPKzaRBWzuGut5JQ_yyiSgE-8";
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

const { email } = req.body || {};
  const cleanEmail = (email || "").toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.endsWith(DOMAIN)) {
    return res.status(400).json({ error: "Email invalide." });
  }

const { ok } = await sbFetch(`students?email=eq.${encodeURIComponent(cleanEmail)}`, {
  method: "DELETE",
});

if (!ok) {
  return res.status(500).json({ error: "Erreur lors de la suppression." });
}

return res.status(200).json({ ok: true });
}
