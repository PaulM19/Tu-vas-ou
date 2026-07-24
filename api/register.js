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

const { firstName, lastName, email, whatsapp, semester, lookingFor, destination } = req.body || {};

const cleanEmail = (email || "").toLowerCase().trim();
    if (!firstName?.trim() || !lastName?.trim() || !cleanEmail.endsWith(DOMAIN)) {
        return res.status(400).json({ error: "Informations manquantes ou invalides." });
    }
    if (!destination?.school) {
        return res.status(400).json({ error: "Destination manquante." });
    }

const { data: verifiedRows } = await sbFetch(
    `verified_emails?select=*&email=eq.${encodeURIComponent(cleanEmail)}&limit=1`
    );
    const verifiedRow = verifiedRows && verifiedRows[0];
    const isFresh = verifiedRow && (Date.now() - new Date(verifiedRow.verified_at).getTime() < 30 * 60 * 1000);
    if (!isFresh) {
        return res.status(403).json({ error: "Verifie d'abord ton email avant de t'inscrire." });
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
        looking_for: Array.isArray(lookingFor) && lookingFor.length ? lookingFor.join(",") : null,
        is_seeded: false,
    }),
});

if (!ok) {
    if (status === 409) {
        return res.status(409).json({ error: "Cette adresse email est deja inscrite." });
    }
    console.log("Insert student error:", data);
    return res.status(500).json({ error: "Erreur lors de l'inscription." });
}

await sbFetch(`verified_emails?email=eq.${encodeURIComponent(cleanEmail)}`, { method: "DELETE" });

const student = shape(data[0]);

const { data: schoolRows } = await sbFetch(
    `students?select=*&school=eq.${encodeURIComponent(destination.school)}&order=created_at.asc`
    );
    const matches = (schoolRows || [])
    .filter(s => s.email.toLowerCase() !== cleanEmail)
    .map(shape);

return res.status(200).json({ ok: true, student, matches });
}
