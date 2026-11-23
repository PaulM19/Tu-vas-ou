import { requireUser } from "./_lib/auth.js";
import { sbFetch, shapeMe, findMatches, geocode, checkDestination } from "./_lib/students.js";

const DOMAIN = "@edu.em-lyon.com";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { firstName, lastName, whatsapp, semester, lookingFor, destination } = req.body || {};
    const tripType = req.body?.tripType || "exchange";

    // Email prouvé par le code de vérification (jeton de session signé).
    const cleanEmail = requireUser(req, res);
    if (!cleanEmail) return;
    if (!firstName?.trim() || !lastName?.trim() || !cleanEmail?.endsWith(DOMAIN)) {
        return res.status(400).json({ error: "Informations manquantes ou invalides." });
    }
    const destError = checkDestination(tripType, destination);
    if (destError) return res.status(400).json({ error: destError });
    const tooLong = (v, n) => v != null && String(v).length > n;
    if (tooLong(firstName, 60) || tooLong(lastName, 60) || tooLong(whatsapp, 25)) {
        return res.status(400).json({ error: "Informations trop longues." });
    }
    if (whatsapp && !/^[+0-9 ().-]{4,25}$/.test(whatsapp)) {
        return res.status(400).json({ error: "Numéro WhatsApp invalide." });
    }
    if (!["fall", "spring", "double", null, undefined].includes(semester)) {
        return res.status(400).json({ error: "Semestre invalide." });
    }
    if (lookingFor != null && (!Array.isArray(lookingFor) || lookingFor.length > 10
        || lookingFor.some(x => typeof x !== "string" || x.length > 40))) {
        return res.status(400).json({ error: "Informations invalides." });
    }

    const row = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: cleanEmail,
        whatsapp: whatsapp || null,
        semester: semester || null,
        school: destination.school.trim(),
        city: destination.city?.trim() || null,
        country: destination.country?.trim() || null,
        looking_for: Array.isArray(lookingFor) && lookingFor.length ? lookingFor.join(",") : null,
        is_seeded: false,
    };
    // Ville hors liste des partenaires : on cherche ses coordonnées pour la carte
    const coords = tripType === "exchange" ? null : await geocode(row.city, row.country);
    const extra = { trip_type: tripType, lat: coords?.lat ?? null, lng: coords?.lng ?? null };

    const insert = body => sbFetch("students", { method: "POST", prefer: "return=representation", body: JSON.stringify(body) });
    let { ok, status, data } = await insert({ ...row, ...extra });

    // Colonnes trip_type / lat / lng pas encore créées (voir supabase/trip-type.sql)
    if (!ok && (data?.code === "PGRST204" || data?.code === "42703")) {
        if (tripType !== "exchange") {
            console.log("Colonnes trip_type manquantes : lance supabase/trip-type.sql");
            return res.status(503).json({ error: "Les inscriptions stage et freemover ne sont pas encore ouvertes. Réessaie bientôt." });
        }
        ({ ok, status, data } = await insert(row));
    }

    if (!ok) {
        if (status === 409) {
            return res.status(409).json({ error: "Cette adresse email est deja inscrite." });
        }
        console.log("Insert student error:", data);
        return res.status(500).json({ error: "Erreur lors de l'inscription." });
    }

    const me = data[0];
    const matches = await findMatches(me);
    return res.status(200).json({ ok: true, student: shapeMe(me), matches });
}
