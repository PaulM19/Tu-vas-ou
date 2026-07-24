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

function shape(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    whatsapp: row.whatsapp,
    semester: row.semester,
    lookingFor: row.looking_for ? row.looking_for.split(",") : [],
    destination: { school: row.school, city: row.city, country: row.country },
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

const { email } = req.body || {};
  const cleanEmail = (email || "").toLowerCase().trim();
  if (!cleanEmail) return res.status(400).json({ error: "Email requis." });

const { data: meRows } = await sbFetch(
  `students?select=*&email=eq.${encodeURIComponent(cleanEmail)}&limit=1`
  );
  if (!meRows || meRows.length === 0) {
    return res.status(404).json({ error: "Email introuvable. Verifie ou inscris-toi." });
  }
  const me = meRows[0];

const { data: schoolRows } = await sbFetch(
  `students?select=*&school=eq.${encodeURIComponent(me.school)}&order=created_at.asc`
  );
  const matches = (schoolRows || [])
  .filter(s => s.email.toLowerCase() !== cleanEmail)
  .map(shape);

return res.status(200).json({ student: shape(me), matches });
}
