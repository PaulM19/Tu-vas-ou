import { useState } from "react";

// Adresse publique du site (utilisée dans les messages partagés)
export const SITE_URL = "https://tu-pars-ou.vercel.app";
export const MAP_URL = `${SITE_URL}/?carte`;

const SEM_LABEL = { fall: "au Fall", spring: "au Spring", double: "en double diplôme" };

// Message partagé par un étudiant inscrit
export function destinationMessage(dest, semester) {
  const when = SEM_LABEL[semester] ? ` ${SEM_LABEL[semester]}` : "";
  return `Je pars à ${dest.city}${when}. Et toi, tu pars où en échange ?\n` +
         `Trouve les étudiants emlyon qui partent au même endroit que toi : ${SITE_URL}`;
}

// Message partagé depuis la carte
export const MAP_MESSAGE = `Regarde où part la promo emlyon en échange :\n${MAP_URL}`;

const WA_GREEN = "#25D366";

function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

// Boutons « Partager sur WhatsApp » + « Copier le lien »
export function ShareBar({ T, message, url, title, subtitle }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // vieux navigateurs : copie via un champ temporaire
      const ta = document.createElement("textarea");
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch { /* rien */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btn = { flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: T.radius, fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "none" };

  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: 16, boxShadow: T.shadow }}>
      {title && <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: T.text }}>{title}</p>}
      {subtitle && <p style={{ margin: "0 0 12px", fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{subtitle}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"
           style={{ ...btn, background: WA_GREEN, color: "#fff", border: "none" }}>
          <WhatsAppIcon /> WhatsApp
        </a>
        <button onClick={copy} style={{ ...btn, background: "transparent", color: T.text, border: `1px solid ${T.border}`, fontWeight: 500 }}>
          {copied ? "Lien copié ✓" : "Copier le lien"}
        </button>
      </div>
    </div>
  );
}
