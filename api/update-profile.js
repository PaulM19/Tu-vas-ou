import { requireUser } from "./_lib/auth.js";
import { sbFetch, shapeMe, findMatches, geocode, checkDestination } from "./_lib/students.js";

// Modifie le profil de l'étudiant connecté. L'email ne change pas : il vient du jeton de session.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const cleanEmail = requireUser(req, res);
  if (!cleanEmail) return;

  const { firstName, lastName, whatsapp, semester, lookingFor, destination } = req.body || {};
  const tripType = req.body?.tripType || "exchange";

  // Mêmes règles qu'à l'inscription
  if (!firstName?.trim() || !lastName?.trim()) {
    return res.status(400).json({ error: "Entre ton prénom et ton nom." });
  }
  if (!whatsapp?.trim()) {
    return res.status(400).json({ error: "Entre ton numéro WhatsApp." });
  }
  const destError = checkDestination(tripType, destination);
  if (destError) return res.status(400).json({ error: destError });
  const tooLong = (v, n) => v != null && String(v).length > n;
  if (tooLong(firstName, 60) || tooLong(lastName, 60) || tooLong(whatsapp, 25)) {
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

  const row = {
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    whatsapp: whatsapp.trim(),
    semester,
    school: destination.school.trim(),
    city: destination.city?.trim() || null,
    country: destination.country?.trim() || null,
    looking_for: Array.isArray(lookingFor) && lookingFor.length ? lookingFor.join(",") : null,
  };
  const coords = tripType === "exchange" ? null : await geocode(row.city, row.country);
  const extra = { trip_type: tripType, lat: coords?.lat ?? null, lng: coords?.lng ?? null };

  const patch = body => sbFetch(`students?email=eq.${encodeURIComponent(cleanEmail)}`, {
    method: "PATCH", prefer: "return=representation", body: JSON.stringify(body),
  });
  let { ok, data } = await patch({ ...row, ...extra });
  // Colonnes trip_type / lat / lng pas encore créées (voir supabase/trip-type.sql)
  if (!ok && (data?.code === "PGRST204" || data?.code === "42703")) {
    if (tripType !== "exchange") {
      return res.status(503).json({ error: "Les profils stage et freemover ne sont pas encore ouverts. Réessaie bientôt." });
    }
    ({ ok, data } = await patch(row));
  }
  if (!ok) {
    console.log("Update profile error:", data);
    return res.status(500).json({ error: "Impossible d'enregistrer. Réessaie." });
  }
  if (!data || data.length === 0) {
    return res.status(404).json({ error: "Compte introuvable. Reconnecte-toi." });
  }
  const me = data[0];

  // La destination a pu changer : on renvoie les matchs à jour
  const matches = await findMatches(me);
  return res.status(200).json({ student: shapeMe(me), matches });
}
