const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";

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
  const text = await res.text();
  return { ok: res.ok, data: text ? JSON.parse(text) : null };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Email et code requis." });

  const cleanEmail = email.toLowerCase().trim();

  // Récupérer le code stocké
  const { data } = await sbFetch(`verification_codes?email=eq.${encodeURIComponent(cleanEmail)}&select=*&limit=1`);

  if (!data || data.length === 0) {
    return res.status(400).json({ error: "Code invalide ou expiré. Demande un nouveau code." });
  }

  const stored = data[0];

  // Vérifier expiration
  if (new Date() > new Date(stored.expires_at)) {
    await sbFetch(`verification_codes?email=eq.${encodeURIComponent(cleanEmail)}`, { method: "DELETE" });
    return res.status(400).json({ error: "Code expiré. Demande un nouveau code." });
  }

  // Vérifier tentatives
  if (stored.attempts >= 3) {
    await sbFetch(`verification_codes?email=eq.${encodeURIComponent(cleanEmail)}`, { method: "DELETE" });
    return res.status(400).json({ error: "Trop de tentatives. Demande un nouveau code." });
  }

  // Vérifier le code
  if (stored.code !== String(code).trim()) {
    // Incrémenter les tentatives
    await sbFetch(`verification_codes?email=eq.${encodeURIComponent(cleanEmail)}`, {
      method: "PATCH",
      body: JSON.stringify({ attempts: stored.attempts + 1 }),
    });
    const remaining = 3 - stored.attempts - 1;
    return res.status(400).json({ error: `Code incorrect. ${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.` });
  }

  // Code valide — supprimer
  await sbFetch(`verification_codes?email=eq.${encodeURIComponent(cleanEmail)}`, { method: "DELETE" });
    await sbFetch(`verified_emails?email=eq.${encodeURIComponent(cleanEmail)}`, { method: "DELETE" });
    await sbFetch("verified_emails", {
          method: "POST",
          prefer: "return=minimal",
          body: JSON.stringify({ email: cleanEmail, verified_at: new Date().toISOString() }),
    });
  return res.status(200).json({ ok: true, verified: true });
}
