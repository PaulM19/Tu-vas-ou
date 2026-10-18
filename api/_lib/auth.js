// Jetons de session signés (HMAC-SHA256), émis après vérification du code email.
// Le dossier _lib n'est pas exposé comme route par Vercel.
import crypto from "crypto";

const SESSION_DAYS = 30;

function secret() {
  // SESSION_SECRET dédié si défini dans Vercel, sinon dérivé de la clé serveur Supabase
  // (qui ne quitte jamais le serveur).
  const base = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_KEY;
  if (!base) throw new Error("Missing session secret");
  return crypto.createHash("sha256").update("tu-pars-ou-session:" + base).digest();
}

const b64 = (buf) => Buffer.from(buf).toString("base64url");

export function signSession(email) {
  const payload = b64(JSON.stringify({ email, exp: Date.now() + SESSION_DAYS * 864e5 }));
  const sig = b64(crypto.createHmac("sha256", secret()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifySession(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = b64(crypto.createHmac("sha256", secret()).update(payload).digest());
  const a = Buffer.from(sig || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.email || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

// Renvoie l'email de l'utilisateur connecté, ou répond 401 et renvoie null.
export function requireUser(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const session = verifySession(token);
  if (!session) {
    res.status(401).json({ error: "Session expirée. Reconnecte-toi avec ton email." });
    return null;
  }
  return session.email;
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
