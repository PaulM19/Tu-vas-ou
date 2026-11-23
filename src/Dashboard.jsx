import { useEffect, useMemo, useState } from "react";

// Espace personnel de l'étudiant connecté : un seul endroit, simple et lisible,
// pour retrouver sa destination, ses matchs, sa préparation et son profil.

// Début approximatif de chaque semestre (promo 2026–2027), au mois près
const SEM_START = { fall: new Date(2026, 8, 1), double: new Date(2026, 8, 1), spring: new Date(2027, 0, 1) };
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const SEM_FULL = { fall: "Fall (sept. – déc. 2026)", spring: "Spring (janv. – juin 2027)", double: "Double diplôme (2026–2027)" };
const LOOKING = { coloc: "Une coloc", amis: "Des amis", conseils: "Des conseils", activites: "Des activités" };

// Checklist de préparation, gardée sur l'appareil
const CHECKLIST = [
    ["learning", "Learning agreement validé"],
    ["logement", "Logement trouvé"],
    ["visa", "Visa ou titre de séjour, si besoin"],
    ["assurance", "Assurance santé à l'étranger"],
    ["billet", "Billet aller réservé"],
    ["banque", "Carte bancaire sans frais à l'étranger"],
    ["matchs", "Prendre contact avec mes matchs"],
];

const SECTIONS = [["apercu", "Aperçu"], ["matchs", "Mes matchs"], ["depart", "Mon départ"], ["profil", "Mon profil"]];

function departure(semester, now = new Date()) {
    const start = SEM_START[semester];
    if (!start) return null;
    const label = `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
    if (now >= start) return `En échange depuis ${label}`;
    const weeks = Math.max(1, Math.round((start - now) / (7 * 24 * 3600 * 1000)));
    return `Départ en ${label}, dans environ ${weeks} semaine${weeks > 1 ? "s" : ""}`;
}

const read = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* stockage indisponible */ } };

export default function Dashboard({ T, me, matches, StudentCard, ShareBar, ProfileForm, shareProps, go, onLogout, onDelete, onSaveProfile, onMapVisibility }) {
    const [cities, setCities] = useState(null);
    const checksKey = `tpo_checklist_${me.email}`;
    const seenKey = `tpo_seen_${me.email}`;
    const [checks, setChecks] = useState(() => read(checksKey, {}));
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [editing, setEditing] = useState(false);
    const showOnMap = me.showOnMap !== false;
    const [mapBusy, setMapBusy] = useState(false);
    const [mapError, setMapError] = useState("");
    const setVisibility = async v => {
          setMapBusy(true); setMapError("");
          try { await onMapVisibility(v); } catch { setMapError("Impossible d'enregistrer ton choix. Réessaie."); }
          setMapBusy(false);
    };
    // Message d'information sur la carte, affiché une seule fois (par appareil)
    const noticeKey = `tpo_map_notice_${me.email}`;
    const [showNotice, setShowNotice] = useState(() => !read(noticeKey, false));
    const closeNotice = () => { write(noticeKey, true); setShowNotice(false); };
    const [saved, setSaved] = useState(false);
    const [active, setActive] = useState("apercu");
    // Calculé une seule fois à l'ouverture : les matchs absents de la dernière visite sont « nouveaux »
    const [newIds] = useState(() => {
          const seen = read(seenKey, null);
          return seen ? new Set(matches.filter(m => !seen.includes(m.id)).map(m => m.id)) : new Set();
    });
    useEffect(() => { write(seenKey, matches.map(m => m.id)); }, [seenKey, matches]);

    useEffect(() => {
          fetch("/api/map").then(r => (r.ok ? r.json() : Promise.reject())).then(d => setCities(d.cities || [])).catch(() => setCities([]));
    }, []);

    // Surligne la section visible dans le menu
    useEffect(() => {
          const els = SECTIONS.map(([id]) => document.getElementById(`sec-${id}`)).filter(Boolean);
          if (!("IntersectionObserver" in window) || !els.length) return;
          const obs = new IntersectionObserver(entries => {
                  const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
                  if (vis) setActive(vis.target.id.replace("sec-", ""));
          }, { rootMargin: "-100px 0px -55% 0px" });
          els.forEach(el => obs.observe(el));
          return () => obs.disconnect();
    }, []);

    const dest = me.destination;
    const inCountry = useMemo(() => {
          if (!cities) return null;
          return cities.filter(c => c.country === dest.country).reduce((s, c) => s + c.count, 0) || 1;
    }, [cities, dest.country]);

    const doneCount = CHECKLIST.filter(([k]) => checks[k]).length;
    const toggle = k => setChecks(c => { const n = { ...c, [k]: !c[k] }; write(checksKey, n); return n; });
    const scrollTo = id => document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

    const h2 = { fontFamily: T.serif, fontSize: 24, fontWeight: 600, color: T.text, margin: "0 0 6px", letterSpacing: "-0.3px" };
    const lead = { fontSize: 15, color: T.muted, margin: "0 0 20px", lineHeight: 1.6 };
    const textBtn = { background: "none", border: "none", padding: 0, fontSize: 14, color: T.text, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 };
    const section = { scrollMarginTop: 120, paddingBottom: 56, marginBottom: 56, borderBottom: `1px solid ${T.border}` };

    return (
          <div className="tpo-dash">
            <nav className="tpo-dash-nav" aria-label="Sections de mon espace">
              {SECTIONS.map(([id, label]) => (
                <button key={id} onClick={() => scrollTo(id)} aria-current={active === id ? "true" : undefined}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "none", borderRadius: T.radius, cursor: "pointer", fontSize: 14, fontWeight: active === id ? 500 : 400, background: active === id ? T.bgHover : "transparent", color: active === id ? T.text : T.muted, whiteSpace: "nowrap", textAlign: "left" }}>
                  {label}
                  {id === "matchs" && matches.length > 0 && <span style={{ color: T.faint }}>{matches.length}</span>}
                </button>
              ))}
            </nav>

            <div style={{ minWidth: 0, maxWidth: 640 }}>
              {/* ── APERÇU ── */}
              <section id="sec-apercu" style={section}>
                <h1 style={{ fontFamily: T.serif, fontSize: "clamp(30px, 4.5vw, 40px)", fontWeight: 600, color: T.text, margin: "0 0 8px", letterSpacing: "-0.6px", lineHeight: 1.15 }}>
                  Bonjour {me.firstName}
                </h1>
                <p style={{ ...lead, margin: "0 0 32px" }}>
                  {newIds.size > 0
                    ? <>Tu as <button onClick={() => scrollTo("matchs")} style={{ ...textBtn, fontSize: 15, color: T.accent }}>{newIds.size} nouveau{newIds.size > 1 ? "x" : ""} match{newIds.size > 1 ? "s" : ""}</button> depuis ta dernière visite.</>
                    : "Voici où tu en es."}
                </p>

                {showNotice && (
                  <div style={{ marginBottom: 24, padding: "18px 20px", border: `1px solid ${T.borderStrong}`, borderRadius: T.radiusLg }}>
                    <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500, color: T.text }}>Nouveau : vois qui part où sur la carte</p>
                    <p style={{ margin: "0 0 14px", fontSize: 14, color: T.muted, lineHeight: 1.6 }}>
                      Les étudiants emlyon connectés peuvent voir ton prénom, l'initiale de ton nom, ton école et ton semestre sur la carte. Ton numéro et ton email restent privés.
                    </p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button onClick={closeNotice} style={{ padding: "9px 16px", background: T.navy, color: "#fff", border: "none", borderRadius: T.radius, fontSize: 14, cursor: "pointer" }}>J'ai compris</button>
                      <button onClick={async () => { await setVisibility(false); closeNotice(); }} disabled={mapBusy} style={{ padding: "9px 16px", background: T.bgCard, color: T.text, border: `1px solid ${T.borderStrong}`, borderRadius: T.radius, fontSize: 14, cursor: "pointer" }}>Ne pas apparaître</button>
                    </div>
                  </div>
                )}

                <div style={{ background: T.navy, color: "#fff", borderRadius: T.radiusLg, padding: "28px 28px 26px" }}>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Ta destination</p>
                  <p style={{ margin: "0 0 6px", fontFamily: T.serif, fontWeight: 600, fontSize: 30, lineHeight: 1.15 }}>{dest.city}</p>
                  <p style={{ margin: "0 0 20px", fontSize: 15, color: "rgba(255,255,255,0.75)" }}>{dest.school}, {dest.country}</p>
                  <p style={{ margin: 0, fontSize: 14, color: T.gold }}>{departure(me.semester)}</p>
                </div>

                <p style={{ fontSize: 14, color: T.muted, margin: "20px 0 0", lineHeight: 1.7 }}>
                  {matches.length + 1} étudiant{matches.length ? "s" : ""} dans ton école
                  {inCountry != null && <> · {inCountry} en {dest.country}</>}
                  {" · "}
                  <button onClick={() => go("map")} style={textBtn}>Voir la carte de la promo</button>
                </p>
              </section>

              {/* ── MATCHS ── */}
              <section id="sec-matchs" style={section}>
                <h2 style={h2}>Mes matchs</h2>
                <p style={lead}>
                  {matches.length === 0
                    ? "Personne d'autre n'est encore inscrit dans ton école. On te prévient dès que quelqu'un te rejoint."
                    : `${matches.length} étudiant${matches.length > 1 ? "s" : ""} emlyon ${matches.length > 1 ? "partent" : "part"} à ${dest.school}.`}
                </p>
                {matches.length > 0 && (
                  <div style={{ borderTop: `1px solid ${T.border}` }}>
                    {[...matches].sort((a, b) => newIds.has(b.id) - newIds.has(a.id)).map(s => (
                      <StudentCard key={s.id} student={s} isNew={newIds.has(s.id)} />
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 32 }}>
                  <ShareBar T={T} {...shareProps} />
                </div>
              </section>

              {/* ── DÉPART ── */}
              <section id="sec-depart" style={section}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <h2 style={h2}>Mon départ</h2>
                  <span style={{ fontSize: 14, color: T.muted }}>{doneCount} / {CHECKLIST.length}</span>
                </div>
                <p style={lead}>Les étapes à ne pas oublier. Coche-les au fur et à mesure.</p>
                <div style={{ borderTop: `1px solid ${T.border}` }}>
                  {CHECKLIST.map(([k, label]) => {
                    const on = !!checks[k];
                    return (
                      <label key={k} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", cursor: "pointer", borderBottom: `1px solid ${T.border}` }}>
                        <input type="checkbox" checked={on} onChange={() => toggle(k)} style={{ width: 18, height: 18, accentColor: T.navy, cursor: "pointer", flexShrink: 0 }} />
                        <span style={{ fontSize: 15, color: on ? T.faint : T.text, textDecoration: on ? "line-through" : "none" }}>{label}</span>
                      </label>
                    );
                  })}
                </div>
                <p style={{ fontSize: 13, color: T.faint, margin: "12px 0 0" }}>Enregistré sur cet appareil.</p>
              </section>

              {/* ── PROFIL ── */}
              <section id="sec-profil" style={{ ...section, borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <h2 style={h2}>Mon profil</h2>
                  {!editing && <button onClick={() => { setEditing(true); setSaved(false); }} style={textBtn}>Modifier</button>}
                </div>
                <p style={lead}>
                  {editing ? "Modifie tes informations puis enregistre." : "Ce que tes matchs voient de toi. Ton email n'est jamais affiché."}
                  {saved && !editing && <span style={{ color: T.green }}> Modifications enregistrées.</span>}
                </p>
                {editing ? (
                  <ProfileForm me={me} onCancel={() => setEditing(false)}
                               onSave={async f => { await onSaveProfile(f); setEditing(false); setSaved(true); }} />
                ) : (
                <dl style={{ margin: 0, borderTop: `1px solid ${T.border}` }}>
                  {[
                    ["Nom", `${me.firstName} ${me.lastName}`],
                    ["Destination", `${dest.school}, ${dest.city} (${dest.country})`],
                    ["Email", me.email],
                    ["WhatsApp", me.whatsapp || "—"],
                    ["Semestre", SEM_FULL[me.semester] || me.semester],
                    ["Je cherche", (me.lookingFor || []).map(lf => LOOKING[lf] || lf).join(", ") || "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="tpo-row" style={{ padding: "14px 0", borderBottom: `1px solid ${T.border}` }}>
                      <dt style={{ fontSize: 14, color: T.muted }}>{label}</dt>
                      <dd style={{ margin: 0, fontSize: 15, color: T.text, overflowWrap: "anywhere" }}>{value}</dd>
                    </div>
                  ))}
                </dl>
                )}

                <div style={{ marginTop: 32, padding: "18px 20px", border: `1px solid ${T.border}`, borderRadius: T.radiusLg }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: mapBusy ? "default" : "pointer" }}>
                    <input type="checkbox" checked={showOnMap} disabled={mapBusy} onChange={e => setVisibility(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: T.navy, cursor: "pointer", flexShrink: 0 }} />
                    <span>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 500, color: T.text }}>Apparaître sur la carte</span>
                      <span style={{ display: "block", fontSize: 14, color: T.muted, lineHeight: 1.6, marginTop: 2 }}>
                        Les étudiants emlyon connectés voient ton prénom, l'initiale de ton nom, ton école et ton semestre.
                      </span>
                    </span>
                  </label>
                  {mapError && <p style={{ margin: "10px 0 0", fontSize: 14, color: T.red }}>{mapError}</p>}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 32 }}>
                  <button onClick={onLogout} style={textBtn}>Se déconnecter</button>
                  {!confirmDelete && <button onClick={() => setConfirmDelete(true)} style={{ ...textBtn, color: T.muted }}>Supprimer mon inscription</button>}
                  <button onClick={() => go("privacy")} style={{ ...textBtn, color: T.muted }}>Confidentialité</button>
                </div>
                {confirmDelete && (
                  <div style={{ marginTop: 20, padding: "18px 20px", border: `1px solid ${T.borderStrong}`, borderRadius: T.radiusLg }}>
                    <p style={{ margin: "0 0 14px", fontSize: 15, color: T.text, lineHeight: 1.6 }}>Supprimer ton inscription ? Tes matchs ne te verront plus. C'est définitif.</p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button onClick={onDelete} style={{ padding: "10px 16px", background: T.red, color: "#fff", border: "none", borderRadius: T.radius, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Supprimer</button>
                      <button onClick={() => setConfirmDelete(false)} style={{ padding: "10px 16px", background: T.bgCard, color: T.text, border: `1px solid ${T.borderStrong}`, borderRadius: T.radius, fontSize: 14, cursor: "pointer" }}>Annuler</button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        );
}
