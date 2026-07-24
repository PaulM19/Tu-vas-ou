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
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

const { firstName, lastName, email, whatsapp, semester, lookingFor, destination } = req.body || {};

const cleanEmail = (email || "").toLowerCase().trim();
  if (!firstName?.trim() || !lastName?.trim() || !cleanEmail.endsWith(DOMAIN)) {
    return res.status(400).json({ error: "Informations manquantes ou invalides." });
  }
  if (!destination?.school) {
    return res.status(400).json({ error: "Destination manquante." });
  }

const { ok, status, data } = await sbFetch("students", {
  method: "POST",
  prefer: "return=representation",
  body: JSON.stringify({
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    email: cleanEmail,
    whatsapp: whatsapp || null,
    semester: semester || null,
    school: destination.school,
    city: destination.city || null,
    country: destination.country || null,
    looking_for: lookingFor || [],
    is_seeded: false,
  }),
});

if (!ok) {
  if (status === 409) {
    return res.status(409).json({ error: "Cette adresse email est déjà inscrite." });
  }
  console.log("Insert student error:", data);
  return res.status(500).json({ error: "Erreur lors de l'inscription." });
}

return res.status(200).json({ ok: true, student: data?.[0] || null });
}
