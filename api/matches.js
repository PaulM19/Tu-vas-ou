import { requireUser } from "./_lib/auth.js";
import { sbFetch, shapeMe, findMatches } from "./_lib/students.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // L'email vient du jeton de session signé, jamais du corps de la requête.
  const cleanEmail = requireUser(req, res);
  if (!cleanEmail) return;

  const { data: meRows } = await sbFetch(
    `students?select=*&email=eq.${encodeURIComponent(cleanEmail)}&limit=1`
  );
  if (!meRows || meRows.length === 0) {
    return res.status(404).json({ error: "Email introuvable. Verifie ou inscris-toi." });
  }
  const me = meRows[0];
  const matches = await findMatches(me);

  return res.status(200).json({ student: shapeMe(me), matches });
}
