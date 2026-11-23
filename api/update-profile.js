import { requireUser } from "./_lib/auth.js";

const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";

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
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
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

// Modifie le profil de l'étudiant connecté. L'email ne change pas : il vient du jeton de session.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const cleanEmail = requireUser(req, res);
  if (!cleanEmail) return;

  const { firstName, lastName, whatsapp, semester, lookingFor, destination } = req.body || {};

  // Mêmes règles qu'à l'inscription
  if (!firstName?.trim() || !lastName?.trim()) {
    return res.status(400).json({ error: "Entre ton prénom et ton nom." });
  }
  if (!whatsapp?.trim()) {
    return res.status(400).json({ error: "Entre ton numéro WhatsApp." });
  }
  if (!destination?.school) {
    return res.status(400).json({ error: "Choisis ta destination dans la liste." });
  }
  const tooLong = (v, n) => v != null && String(v).length > n;
  if (tooLong(firstName, 60) || tooLong(lastName, 60) || tooLong(whatsapp, 25) || tooLong(destination.school, 150)
      || tooLong(destination.city, 80) || tooLong(destination.country, 80)) {
    return res.status(400).json({ error: "Informations trop longues." });
  }
  if (!/^[+0-9 ().-]{4,25}$/.test(whatsapp.trim())) {
    return res.status(400).json({ error: "Numéro WhatsApp invalide." });
  }
  if (!["fall", "spring", "double"].includes(semester)) {
    return res.status(400).json({ error: "Semestre invalide." });
  }
  if (lookingFor != null && (!Array.isArray(lookingFor) || lookingFor.length > 10
      || lookingFor.some(x => typeof x !== "string" || x.length > 40))) {
    return res.status(400).json({ error: "Informations invalides." });
  }

  const { ok, data } = await sbFetch(`students?email=eq.${encodeURIComponent(cleanEmail)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      whatsapp: whatsapp.trim(),
      semester,
      school: destination.school,
      city: destination.city || null,
      country: destination.country || null,
      looking_for: Array.isArray(lookingFor) && lookingFor.length ? lookingFor.join(",") : null,
    }),
  });
  if (!ok) {
    console.log("Update profile error:", data);
    return res.status(500).json({ error: "Impossible d'enregistrer. Réessaie." });
  }
  if (!data || data.length === 0) {
    return res.status(404).json({ error: "Compte introuvable. Reconnecte-toi." });
  }
  const me = data[0];

  // La destination a pu changer : on renvoie les matchs à jour
  const { data: schoolRows } = await sbFetch(
    `students?select=*&school=eq.${encodeURIComponent(me.school)}&order=created_at.asc`
  );
  const matches = (schoolRows || [])
    .filter(s => s.email.toLowerCase() !== cleanEmail)
    .map(shape);

  return res.status(200).json({ student: { ...shape(me), showOnMap: me.show_on_map !== false, showFullName: me.show_full_name === true }, matches });
}
