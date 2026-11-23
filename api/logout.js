import { clearSessionCookie } from "./_lib/auth.js";

// Déconnexion : efface le cookie de session sur cet appareil.
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
