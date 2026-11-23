// Outils partagés par les routes qui lisent ou écrivent les étudiants.
// Le dossier _lib n'est pas exposé comme route par Vercel.

export const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";

// Types de départ : échange dans une université partenaire, freemover (université hors accords), stage.
export const TRIP_TYPES = ["exchange", "freemover", "internship"];

export async function sbFetch(path, options = {}) {
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
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// Ce que l'application reçoit pour un étudiant. « school » contient l'université, ou l'entreprise pour un stage.
export function shape(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    whatsapp: row.whatsapp,
    semester: row.semester,
    tripType: TRIP_TYPES.includes(row.trip_type) ? row.trip_type : "exchange",
    lookingFor: row.looking_for ? row.looking_for.split(",") : [],
    destination: { school: row.school, city: row.city, country: row.country },
  };
}

// Version de l'étudiant connecté, avec ses réglages
export function shapeMe(row) {
  return { ...shape(row), showOnMap: row.show_on_map !== false, showFullName: row.show_full_name === true };
}

const same = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

// Deux étudiants sont « matchs » s'ils vont dans la même université (ou entreprise),
// ou s'ils sont dans la même ville et que l'un des deux est freemover ou en stage.
// La règle est symétrique : si A voit B, B voit A.
export function isMatch(a, b) {
  if (same(a.school, b.school)) return true;
  const sameCity = same(a.city, b.city) && same(a.country, b.country);
  const typeA = a.trip_type || "exchange", typeB = b.trip_type || "exchange";
  return sameCity && (typeA !== "exchange" || typeB !== "exchange");
}

export async function findMatchRows(me) {
  const enc = encodeURIComponent;
  const [bySchool, byCity] = await Promise.all([
    sbFetch(`students?select=*&school=eq.${enc(me.school)}&order=created_at.asc`),
    me.city ? sbFetch(`students?select=*&city=eq.${enc(me.city)}&country=eq.${enc(me.country || "")}&order=created_at.asc`) : { data: [] },
  ]);
  const seen = new Map();
  for (const r of [...(bySchool.data || []), ...(byCity.data || [])]) seen.set(r.id, r);
  const myEmail = (me.email || "").toLowerCase();
  return [...seen.values()]
    .filter(s => (s.email || "").toLowerCase() !== myEmail && isMatch(me, s));
}

export async function findMatches(me) {
  return (await findMatchRows(me)).map(shape);
}

// Coordonnées d'une ville (pour la placer sur la carte), via OpenStreetMap.
// Utilisé seulement pour les villes hors liste des universités partenaires. Renvoie null en cas d'échec.
export async function geocode(city, country) {
  if (!city) return null;
  try {
    const q = new URLSearchParams({ format: "json", limit: "1", city, country: country || "", "accept-language": "fr" });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, {
      headers: { "User-Agent": "TuParsOu/1.0 (https://tu-pars-ou.vercel.app)" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const [hit] = await r.json();
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

// Vérifie la destination envoyée par le navigateur. Renvoie un message d'erreur, ou null si tout va bien.
export function checkDestination(tripType, destination) {
  if (!TRIP_TYPES.includes(tripType)) return "Type de départ invalide.";
  if (!destination?.school?.trim()) {
    return tripType === "internship" ? "Indique ton entreprise." : tripType === "freemover" ? "Indique ton université." : "Choisis ta destination dans la liste.";
  }
  if (tripType !== "exchange" && (!destination.city?.trim() || !destination.country?.trim())) {
    return "Indique la ville et le pays.";
  }
  const tooLong = (v, n) => v != null && String(v).length > n;
  if (tooLong(destination.school, 150) || tooLong(destination.city, 80) || tooLong(destination.country, 80)) {
    return "Informations trop longues.";
  }
  return null;
}
