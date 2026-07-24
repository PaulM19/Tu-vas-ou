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
  if (req.method !== "GET") return res.status(405).end();

const { school } = req.query;

if (school) {
  const { data } = await sbFetch(
    `students?select=first_name,last_name&school=eq.${encodeURIComponent(school)}&is_seeded=eq.false&order=created_at.asc`
    );
  const rows = data || [];
  const initials = rows.slice(0, 5).map(s => ((s.first_name?.[0] || "") + (s.last_name?.[0] || "")).toUpperCase());
  return res.status(200).json({ count: rows.length, initials });
}

const { data } = await sbFetch(`students?select=country&is_seeded=eq.false`);
  const rows = data || [];
  const total = rows.length;
  const countries = new Set(rows.map(r => r.country)).size;
  return res.status(200).json({ total, countries });
}
