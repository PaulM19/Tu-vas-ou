const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";

async function sbFetch(path, options = {}) {
  const key = "sb_publishable_nX8bK2lPKzaRBWzuGut5JQ_yyiSgE-8";
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

async function sendEmail(to, subject, html) {
  const BREVO_KEY = process.env.BREVO_API_KEY;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Tu pars où en échange ?", email: "noreply@tu-pars-ou.vercel.app" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  const text = await res.text();
  console.log("Brevo response:", res.status, text);
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body;
  if (!email || !email.toLowerCase().trim().endsWith("@edu.em-lyon.com")) {
    return res.status(403).json({ error: "Adresse email emlyon requise." });
  }

  const cleanEmail = email.toLowerCase().trim();

  const { data: existing } = await sbFetch(
    `verification_codes?email=eq.${encodeURIComponent(cleanEmail)}&select=created_at&order=created_at.desc&limit=1`
  );
  if (existing?.length > 0) {
    const lastSent = new Date(existing[0].created_at).getTime();
    if (Date.now() - lastSent < 60000) {
      return res.status(429).json({ error: "Un code a déjà été envoyé. Attends 1 minute." });
    }
  }

  const code = String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = new Date(Date.now() + 600000).toISOString();

  await sbFetch(`verification_codes?email=eq.${encodeURIComponent(cleanEmail)}`, { method: "DELETE" });
  await sbFetch("verification_codes", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({ email: cleanEmail, code, expires_at: expiresAt }),
  });

  const sent = await sendEmail(
    cleanEmail,
    `Ton code de vérification : ${code}`,
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:420px;margin:0 auto;padding:2rem 1rem;color:#111110">
      <p style="font-size:13px;font-weight:600;color:#6f6f6b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Tu pars où en échange ?</p>
      <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px">Vérifie ton adresse</h1>
      <p style="color:#6f6f6b;font-size:14px;line-height:1.6;margin:0 0 2rem">Entre ce code dans l'application pour confirmer que tu es bien étudiant emlyon.</p>
      <div style="background:#f5f4f0;border-radius:12px;padding:2rem;text-align:center;margin-bottom:2rem">
        <p style="font-size:48px;font-weight:700;letter-spacing:16px;margin:0;color:#111110">${code}</p>
      </div>
      <p style="color:#9e9e9e;font-size:12px;margin:0">Expire dans 10 minutes. Si tu n'as pas demandé ce code, ignore cet email.</p>
    </div>`
  );

  if (!sent) return res.status(500).json({ error: "Impossible d'envoyer l'email. Réessaie." });

  return res.status(200).json({ ok: true });
}
