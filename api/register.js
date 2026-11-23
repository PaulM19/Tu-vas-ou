import { requireUser } from "./_lib/auth.js";

const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";
const DOMAIN = "@edu.em-lyon.com";

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

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

const { firstName, lastName, whatsapp, semester, lookingFor, destination, partnerConsent } = req.body || {};
// Accord facultatif pour transmettre / vendre ses données aux partenaires (case décochée par défaut).
const consent = partnerConsent === true;

// Email prouvé par le code de vérification (jeton de session signé).
const cleanEmail = requireUser(req, res);
    if (!cleanEmail) return;
    if (!firstName?.trim() || !lastName?.trim() || !cleanEmail?.endsWith(DOMAIN)) {
        return res.status(400).json({ error: "Informations manquantes ou invalides." });
    }
    if (!destination?.school) {
        return res.status(400).json({ error: "Destination manquante." });
    }
    const tooLong = (v, n) => v != null && String(v).length > n;
    if (tooLong(firstName, 60) || tooLong(lastName, 60) || tooLong(whatsapp, 25) || tooLong(destination.school, 150)
        || tooLong(destination.city, 80) || tooLong(destination.country, 80)) {
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
        school: destination.school,
        city: destination.city || null,
        country: destination.country || null,
        looking_for: Array.isArray(lookingFor) && lookingFor.length ? lookingFor.join(",") : null,
        is_seeded: false,
};
const insert = body => sbFetch("students", { method: "POST", prefer: "return=representation", body: JSON.stringify(body) });

let { ok, status, data } = await insert({ ...row, partner_consent: consent, partner_consent_at: consent ? new Date().toISOString() : null });
// Si les colonnes partner_consent n'existent pas encore dans Supabase, on inscrit quand même
// l'étudiant sans son choix (voir supabase/partner-consent.sql).
if (!ok && data?.code === "PGRST204") {
    console.log("Colonnes partner_consent manquantes : lance supabase/partner-consent.sql. Choix perdu pour", cleanEmail);
    ({ ok, status, data } = await insert(row));
}

if (!ok) {
    if (status === 409) {
        return res.status(409).json({ error: "Cette adresse email est deja inscrite." });
    }
    console.log("Insert student error:", data);
    return res.status(500).json({ error: "Erreur lors de l'inscription." });
}


const student = { ...shape(data[0]), partnerConsent: data[0].partner_consent === true };

const { data: schoolRows } = await sbFetch(
    `students?select=*&school=eq.${encodeURIComponent(destination.school)}&order=created_at.asc`
    );
    const matches = (schoolRows || [])
    .filter(s => s.email.toLowerCase() !== cleanEmail)
    .map(shape);

return res.status(200).json({ ok: true, student, matches });
}
