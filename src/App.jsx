import { useState, useRef, useEffect } from "react";
import WorldMap, { MapPreview } from "./WorldMap";
import { ShareBar, SITE_URL, destinationMessage } from "./share";
const DOMAIN = "@edu.em-lyon.com";

async function getStats() {
    const res = await fetch("/api/stats");
    return res.ok ? await res.json() : { total: 0, countries: 0 };
}

async function getDestinationPreview(school) {
    const res = await fetch(`/api/stats?school=${encodeURIComponent(school)}`);
    return res.ok ? await res.json() : { count: 0, initials: [] };
}

// Jeton de session (renvoyé par /api/verify-code) gardé sur l'appareil pour rester connecté.
const TOKEN_KEY = "tpo_session";
function loadToken() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
function saveToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} }
const authHeaders = (token) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

async function getMatches(token) {
    const res = await fetch("/api/matches", {
          method: "POST",
          headers: authHeaders(token),
          body: "{}",
    });
    if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Email introuvable. Vérifie ou inscris-toi.");
    }
    return res.json();
}

async function insertStudent(s, token) {
    const res = await fetch("/api/register", {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({
                  firstName: s.firstName,
                  lastName: s.lastName,
                  email: s.email,
                  whatsapp: s.whatsappNumber?.trim() || null,
                  semester: s.semester,
                  lookingFor: s.lookingFor || [],
                  destination: s.destination,
          }),
    });
    if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erreur lors de l'inscription.");
    }
    return res.json();
}

const DESTINATIONS = [
  {country:"Allemagne",city:"Francfort",school:"Frankfurt School of Finance & Management"},
  {country:"Allemagne",city:"Würzburg",school:"University of Würzburg"},
  {country:"Allemagne",city:"Munich",school:"Ludwig-Maximilians-Universität München"},
  {country:"Allemagne",city:"Munich",school:"Munich Business School"},
  {country:"Allemagne",city:"Munich",school:"TUM School of Management"},
  {country:"Allemagne",city:"Münster",school:"Westfälische Wilhelms-Universität Münster"},
  {country:"Allemagne",city:"Mannheim",school:"Universität Mannheim Business School"},
  {country:"Allemagne",city:"Cologne",school:"University of Cologne"},
  {country:"Allemagne",city:"Vallendar",school:"WHU – Otto Beisheim School of Management"},
  {country:"Allemagne",city:"Oestrich-Winkel",school:"EBS Business School"},
  {country:"Argentine",city:"Buenos Aires",school:"Universidad Austral"},
  {country:"Argentine",city:"Buenos Aires",school:"Universidad del CEMA"},
  {country:"Argentine",city:"Buenos Aires",school:"Universidad Torcuato Di Tella"},
  {country:"Autriche",city:"Innsbruck",school:"MCI Management Center Innsbruck"},
  {country:"Autriche",city:"Vienne",school:"WU Wirtschaftsuniversität Wien"},
  {country:"Belgique",city:"Louvain",school:"Katholieke Universiteit Leuven"},
  {country:"Belgique",city:"Liège",school:"Université de Liège"},
  {country:"Brésil",city:"São Paulo",school:"Insper – Instituto de Ensino e Pesquisa"},
  {country:"Bulgarie",city:"Sofia",school:"Sofia University St. Kliment Ohridski"},
  {country:"Cambodge",city:"Phnom Penh",school:"NUM National University of Management"},
  {country:"Canada",city:"Ottawa",school:"Carleton University"},
  {country:"Canada",city:"Halifax",school:"Dalhousie University"},
  {country:"Canada",city:"Montréal",school:"ESG UQAM"},
  {country:"Canada",city:"Toronto",school:"Glendon College, York University"},
  {country:"Canada",city:"Calgary",school:"Haskayne Business School, Calgary University"},
  {country:"Canada",city:"Kingston",school:"Smith School of Business, Queen's University"},
  {country:"Canada",city:"Sherbrooke",school:"Université de Sherbrooke"},
  {country:"Canada",city:"Rimouski",school:"Université du Québec à Rimouski"},
  {country:"Canada",city:"Saskatoon",school:"University of Saskatchewan, Edwards School of Business"},
  {country:"Canada",city:"Victoria",school:"University of Victoria"},
  {country:"Canada",city:"Toronto",school:"York University, Schulich School of Business"},
  {country:"Chili",city:"Santiago",school:"Universidad Adolfo Ibáñez"},
  {country:"Chili",city:"Santiago",school:"Universidad de Chile"},
  {country:"Chili",city:"Santiago",school:"Universidad de los Andes"},
  {country:"Chine",city:"Shenzhen",school:"Chinese University of Hong Kong – Shenzhen"},
  {country:"Chine",city:"Shanghai",school:"emlyon campus Shanghai"},
  {country:"Chine",city:"Pékin",school:"Renmin University"},
  {country:"Chine",city:"Shanghai",school:"SILC"},
  {country:"Chine",city:"Shanghai",school:"Tongji University"},
  {country:"Chine",city:"Hangzhou",school:"Zhejiang University"},
  {country:"Corée du Sud",city:"Séoul",school:"Hankuk University of Foreign Studies (HUFS)"},
  {country:"Corée du Sud",city:"Daegu",school:"Kyungpook National University"},
  {country:"Corée du Sud",city:"Séoul",school:"Seoul National University"},
  {country:"Corée du Sud",city:"Séoul",school:"Sungkyunkwan University"},
  {country:"Croatie",city:"Zagreb",school:"University of Zagreb, Faculty of Economics and Business"},
  {country:"Croatie",city:"Zagreb",school:"Zagreb School of Economics and Management"},
  {country:"Danemark",city:"Copenhague",school:"Copenhagen Business School"},
  {country:"Égypte",city:"Le Caire",school:"American University in Cairo (AUC)"},
  {country:"Espagne",city:"Bilbao / Madrid",school:"Deusto Business School"},
  {country:"Espagne",city:"Madrid",school:"ESIC Business and Marketing School"},
  {country:"Espagne",city:"Madrid",school:"IE Universidad"},
  {country:"Espagne",city:"Madrid",school:"Universidad Carlos III"},
  {country:"Espagne",city:"Grenade",school:"Universidad de Granada"},
  {country:"Espagne",city:"Pamplona",school:"Universidad de Navarra"},
  {country:"Espagne",city:"Salamanque",school:"Universidad de Salamanca"},
  {country:"Espagne",city:"Valence",school:"Universidad de Valencia"},
  {country:"Espagne",city:"Barcelone",school:"Universitat Pompeu Fabra"},
  {country:"Estonie",city:"Tallinn",school:"Tallinn University of Technology"},
  {country:"États-Unis",city:"Worcester (MA)",school:"Clark University"},
  {country:"États-Unis",city:"Murray (KY)",school:"Murray State University"},
  {country:"États-Unis",city:"Dartmouth (MA)",school:"University of Massachusetts Dartmouth"},
  {country:"États-Unis",city:"Portland (OR)",school:"University of Portland"},
  {country:"États-Unis",city:"Columbia (SC)",school:"University of South Carolina, Darla Moore School of Business"},
  {country:"États-Unis",city:"Bowling Green (KY)",school:"Western Kentucky University (WKU)"},
  {country:"Finlande",city:"Helsinki",school:"Aalto University School of Business"},
  {country:"Finlande",city:"Turku",school:"Åbo Akademi"},
  {country:"Finlande",city:"Helsinki",school:"Hanken School of Economics"},
  {country:"Grèce",city:"Athènes",school:"Athens University of Economics and Business"},
  {country:"Hong Kong",city:"Hong Kong",school:"City University of Hong Kong"},
  {country:"Hong Kong",city:"Hong Kong",school:"Hong Kong Baptist University"},
  {country:"Hong Kong",city:"Hong Kong",school:"Lingnan University"},
  {country:"Inde",city:"Indore",school:"IIM Indore"},
  {country:"Inde",city:"Sonipat",school:"O.P. Jindal Global University"},
  {country:"Indonésie",city:"Jakarta",school:"Binus University"},
  {country:"Indonésie",city:"Jakarta",school:"IPMI International Business School"},
  {country:"Irlande",city:"Limerick",school:"University of Limerick, Kemmy Business School"},
  {country:"Italie",city:"Venise",school:"Cà Foscari, University of Venice"},
  {country:"Italie",city:"Rome",school:"Luiss Università Guido Carli"},
  {country:"Italie",city:"Milan",school:"Politecnico di Milano"},
  {country:"Italie",city:"Milan",school:"Università Bocconi"},
  {country:"Italie",city:"Milan",school:"Università Cattolica del Sacro Cuore"},
  {country:"Italie",city:"Brescia",school:"Università degli Studi di Brescia"},
  {country:"Italie",city:"Trente",school:"Università degli Studi di Trento"},
  {country:"Japon",city:"Nagoya",school:"Nagoya University of Commerce and Business"},
  {country:"Japon",city:"Tokyo",school:"Waseda University"},
  {country:"Kazakhstan",city:"Almaty",school:"Almaty Management University"},
  {country:"Lettonie",city:"Riga",school:"Stockholm School of Economics in Riga (SSE Riga)"},
  {country:"Lituanie",city:"Vilnius",school:"ISM University of Management and Economics"},
  {country:"Malaisie",city:"Kuala Lumpur",school:"Universiti Kebangsaan Malaysia"},
  {country:"Maroc",city:"Ifrane",school:"Al Akhawayn University"},
  {country:"Maroc",city:"Benguerir",school:"Mohammed VI Polytechnic University (UM6P)"},
  {country:"Maroc",city:"Rabat",school:"Rabat Business School"},
  {country:"Mexique",city:"Mexico",school:"Anáhuac México University"},
  {country:"Mexique",city:"Monterrey",school:"Tecnológico de Monterrey"},
  {country:"Mexique",city:"Puebla",school:"Universidad de las Américas"},
  {country:"Pays-Bas",city:"Rotterdam",school:"Erasmus University, Rotterdam School of Management"},
  {country:"Pays-Bas",city:"Maastricht",school:"Maastricht University"},
  {country:"Pays-Bas",city:"Amsterdam",school:"University of Amsterdam, Economics and Business"},
  {country:"Pays-Bas",city:"Groningue",school:"University of Groningen"},
  {country:"Pérou",city:"Lima",school:"Universidad del Pacifico"},
  {country:"Pérou",city:"Lima",school:"Universidad ESAN"},
  {country:"Philippines",city:"Manille",school:"Ateneo de Manila University"},
  {country:"Pologne",city:"Varsovie",school:"Kozminski University"},
  {country:"Pologne",city:"Varsovie",school:"SGH Warsaw School of Economics"},
  {country:"Portugal",city:"Lisbonne",school:"ISEG – Lisbon School of Economics & Management"},
  {country:"Portugal",city:"Lisbonne",school:"Nova University Lisbon"},
  {country:"Portugal",city:"Lisbonne",school:"Universidade Católica Portuguesa, Lisbon"},
  {country:"Portugal",city:"Porto",school:"Católica Porto Business School"},
  {country:"République tchèque",city:"Prague",school:"Faculty of Social Sciences, Charles University"},
  {country:"République tchèque",city:"Prague",school:"Prague University of Economics and Business (VSE)"},
  {country:"Roumanie",city:"Bucarest",school:"The Bucharest University of Economic Studies"},
  {country:"Royaume-Uni",city:"Birmingham",school:"Aston University"},
  {country:"Royaume-Uni",city:"Belfast",school:"Queen's Business School"},
  {country:"Royaume-Uni",city:"Londres",school:"The London Interdisciplinary School"},
  {country:"Sénégal",city:"Dakar",school:"ISM Dakar"},
  {country:"Singapour",city:"Singapour",school:"Singapore Management University"},
  {country:"Slovaquie",city:"Bratislava",school:"University of Economics in Bratislava"},
  {country:"Slovénie",city:"Ljubljana",school:"University of Ljubljana"},
  {country:"Slovénie",city:"Maribor",school:"University of Maribor"},
  {country:"Suède",city:"Stockholm",school:"Stockholm School of Economics"},
  {country:"Suède",city:"Linköping",school:"Linköping University"},
  {country:"Suède",city:"Lund",school:"Lund University"},
  {country:"Suède",city:"Stockholm",school:"Stockholm University, Stockholm Business School"},
  {country:"Suisse",city:"Bâle",school:"University of Applied Sciences Northwestern Switzerland (FHNW)"},
  {country:"Suisse",city:"Saint-Gall",school:"University of St. Gallen"},
  {country:"Taïwan",city:"Taipei",school:"National Chengchi University"},
  {country:"Taïwan",city:"Chiayi",school:"National Chung Cheng University, College of Management"},
  {country:"Taïwan",city:"Kaohsiung",school:"National Sun Yat-Sen University"},
  {country:"Taïwan",city:"Taipei",school:"National Taiwan University"},
  {country:"Thaïlande",city:"Bangkok",school:"Chulalongkorn Business School"},
  {country:"Thaïlande",city:"Bangkok",school:"Thammasat Business School"},
  {country:"Tunisie",city:"Tunis",school:"Esprit School of Business (ESB)"},
  {country:"Turquie",city:"Istanbul",school:"Bogazici University"},
  {country:"Turquie",city:"Istanbul",school:"Koç University"},
  {country:"Turquie",city:"Istanbul",school:"Ozyegin University (OzU)"},
  {country:"Uruguay",city:"Montevideo",school:"Universidad Católica del Uruguay"},
  {country:"Uruguay",city:"Montevideo",school:"Universidad de Montevideo"},
  {country:"Uruguay",city:"Montevideo",school:"Universidad ORT"},
  {country:"Vietnam",city:"Hô Chi Minh-Ville",school:"Ton Duc Thang University"},
  {country:"Vietnam",city:"Hanoï",school:"VinUniversity"},
  ];
const PARTNER_SCHOOLS = new Set(DESTINATIONS.map(d => d.school)).size;
const PARTNER_COUNTRIES = new Set(DESTINATIONS.map(d => d.country)).size;


const COUNTRY_CODES = [
    ["+33","FR"],["+1","US"],["+44","GB"],["+49","DE"],["+34","ES"],
    ["+39","IT"],["+31","NL"],["+32","BE"],["+41","CH"],["+46","SE"],
    ["+47","NO"],["+45","DK"],["+358","FI"],["+351","PT"],["+48","PL"],
    ["+55","BR"],["+52","MX"],["+54","AR"],["+56","CL"],["+57","CO"],
    ["+51","PE"],["+598","UY"],["+86","CN"],["+81","JP"],["+82","KR"],
    ["+91","IN"],["+65","SG"],["+60","MY"],["+66","TH"],["+84","VN"],
    ["+62","ID"],["+63","PH"],["+971","AE"],["+212","MA"],["+221","SN"],
    ["+20","EG"],["+7","RU"],["+380","UA"],["+420","CZ"],["+36","HU"],
    ["+40","RO"],["+359","BG"],["+385","HR"],["+386","SI"],["+421","SK"],
    ["+370","LT"],["+371","LV"],["+372","EE"],["+30","GR"],["+90","TR"],
    ["+972","IL"],["+61","AU"],["+27","ZA"],["+234","NG"],["+254","KE"],
  ];

const SEMESTER_LABELS = { fall: "Fall", spring: "Spring", double: "Double diplôme" };

// Charte graphique inspirée d'emlyon business school
const T = {
    bg: "#f6f4f1", bgCard: "#ffffff", bgHover: "#f1eeea",
    border: "rgba(0,25,49,0.10)", borderStrong: "rgba(0,25,49,0.22)",
    text: "#001931", muted: "#56606e", faint: "#98a0ab",
    accent: "#E2001A", accentHover: "#c00016", accentFg: "#ffffff", accentSoft: "#fdecee",
    navy: "#001931", navySoft: "#e8ecf1", gold: "#D4A94E",
    green: "#15803d", greenBg: "#eefaf2",
    red: "#c00016", radius: "10px", radiusLg: "16px",
    shadow: "0 1px 2px rgba(0,25,49,0.06), 0 1px 3px rgba(0,25,49,0.05)",
    shadowMd: "0 10px 30px rgba(0,25,49,0.10)",
    serif: "'Noto Serif', Georgia, serif",
};

// Boutons et titres réutilisés partout
const btnPrimary = (enabled = true) => ({
    padding: "14px", background: enabled ? T.accent : T.border, color: enabled ? T.accentFg : T.faint,
    border: "none", borderRadius: T.radius, fontSize: 15, fontWeight: 600, width: "100%",
    cursor: enabled ? "pointer" : "not-allowed", transition: "background 0.15s, box-shadow 0.15s",
    boxShadow: enabled ? "0 6px 16px rgba(226,0,26,0.22)" : "none",
});
const btnSecondary = { padding: "13px", background: T.bgCard, color: T.text, border: `1px solid ${T.borderStrong}`, borderRadius: T.radius, fontSize: 14, fontWeight: 500, cursor: "pointer", width: "100%" };
const btnGhost = { padding: "10px", background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: T.radius, fontSize: 13, cursor: "pointer", width: "100%" };
const pillBack = { display: "inline-flex", alignItems: "center", gap: 6, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 99, padding: "7px 14px", fontSize: 13, fontWeight: 500, color: T.text, cursor: "pointer", boxShadow: T.shadow };
const eyebrow = { fontSize: 12, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" };
const h2Style = { fontSize: 30, fontWeight: 700, color: T.text, margin: "0 0 8px", letterSpacing: "-0.6px", lineHeight: 1.15 };

// En-tête commun : logo du site + raccourcis
function Header({ go, registered }) {
    return (
          <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(246,244,241,0.88)", backdropFilter: "saturate(1.4) blur(10px)", WebkitBackdropFilter: "saturate(1.4) blur(10px)", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <button onClick={() => go("home")} aria-label="Accueil" style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}><i className="ti ti-plane-departure" /></span>
                <span style={{ textAlign: "left", lineHeight: 1.1 }}>
                  <span style={{ display: "block", fontFamily: T.serif, fontSize: 17, fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>Tu pars où ?</span>
                  <span className="tpo-hide-sm" style={{ display: "block", fontSize: 11, color: T.muted }}>Échanges emlyon 2026–2027</span>
                </span>
              </button>
              <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => go("map")} aria-label="Carte des départs" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.text, fontSize: 14, fontWeight: 500, cursor: "pointer", padding: "8px 10px", borderRadius: 8 }}>
                  <i className="ti ti-world" style={{ fontSize: 18, color: T.accent }} /><span className="tpo-hide-sm">Carte</span>
                </button>
                <button onClick={() => go(registered ? "matches" : "register")} style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 99, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {registered ? "Mes matchs" : "S'inscrire"}
                </button>
              </nav>
            </div>
          </header>
        );
}

// Pied de page commun, avec le filet rouge → or
function Footer({ go }) {
    const link = { background: "none", border: "none", padding: 0, color: T.text, fontSize: 13, fontWeight: 500, cursor: "pointer" };
    return (
          <footer style={{ marginTop: "auto" }}>
            <div style={{ height: 3, background: `linear-gradient(90deg, ${T.accent}, ${T.gold})` }} />
            <div style={{ background: T.bgCard }}>
              <div style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
                  <button style={link} onClick={() => go("map")}>Où part la promo</button>
                  <button style={link} onClick={() => go("lookup")}>Retrouver mes matchs</button>
                  <button style={link} onClick={() => go("privacy")}>Confidentialité</button>
                </div>
                <p style={{ fontSize: 12, color: T.muted }}>
                  Projet étudiant, non affilié officiellement à emlyon · {PARTNER_SCHOOLS} universités partenaires dans {PARTNER_COUNTRIES} pays
                </p>
              </div>
            </div>
          </footer>
        );
}

// Mise en page de chaque écran : en-tête, contenu centré, pied de page
function Page({ go, registered, width = 460, center = false, children }) {
    return (
          <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
            <Header go={go} registered={registered} />
            <main style={{ flex: 1, display: "flex", alignItems: center ? "center" : "flex-start", justifyContent: "center", padding: "32px 16px 56px" }}>
              <div className="tpo-fade" style={{ width: "100%", maxWidth: width }}>{children}</div>
            </main>
            <Footer go={go} />
          </div>
        );
}

const inputStyle = {
    width: "100%", height: 44, padding: "0 14px",
    border: `1px solid ${T.border}`, borderRadius: T.radius,
    background: T.bgCard, color: T.text, fontSize: 15,
    fontFamily: "inherit", outline: "none", transition: "border-color 0.15s",
    boxSizing: "border-box",
};

function norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function getResults(q) {
    if (!q || q.length < 2) return [];
    const n = norm(q);
    return DESTINATIONS.filter(d =>
          norm(d.country).includes(n) || norm(d.city).includes(n) || norm(d.school).includes(n)
                                 ).slice(0, 7);
}

function ProgressBar({ step, total }) {
    return (
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }} role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step}>
            {Array.from({ length: total }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: i < step ? T.accent : "rgba(0,25,49,0.08)", transition: "background 0.3s" }} />
                  ))}
          </div>
        );
}

function EmailInput({ value, onChange, onEnter }) {
    const showPill = value.length > 0 && !value.includes("@");
    const ref = useRef(null);
    function complete() { if (value.length > 0 && !value.includes("@")) onChange(value + DOMAIN); }
    function handleKey(e) {
          if ((e.key === "Tab" || e.key === "ArrowRight") && showPill) { e.preventDefault(); complete(); }
          if (e.key === "Enter") { complete(); if (onEnter) setTimeout(onEnter, 50); }
    }
    return (
          <div style={{ position: "relative" }}>
                  <input type="text" placeholder="prenom.nom@edu.em-lyon.com" value={value}
                            onChange={e => onChange(e.target.value)} onKeyDown={handleKey} onBlur={complete}
                            autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck="false"
                            pattern=".*"
                            style={{ ...inputStyle, paddingRight: showPill ? 200 : 14 }} ref={ref} />
            {showPill && (
                    <div onMouseDown={e => { e.preventDefault(); complete(); ref.current?.focus(); }}
                                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#f0f0ed", color: T.muted, fontSize: 12, padding: "3px 8px", borderRadius: 6, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {value + DOMAIN}
                    </div>
                  )}
          </div>
        );
}

function DestSearch({ value, onChange, onSelect }) {
    const [open, setOpen] = useState(false);
    const [hi, setHi] = useState(0);
    const results = getResults(value);
    const ref = useRef(null);
    useEffect(() => { setHi(0); setOpen(results.length > 0 && value.length >= 2); }, [value]);
    useEffect(() => {
          const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
          document.addEventListener("mousedown", fn);
          return () => document.removeEventListener("mousedown", fn);
    }, []);
    function handleKey(e) {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(h + 1, results.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
          if (e.key === "Enter" && results[hi]) { e.preventDefault(); onSelect(results[hi]); setOpen(false); }
          if (e.key === "Escape") setOpen(false);
    }
    return (
          <div ref={ref} style={{ position: "relative" }}>
                  <input type="text" placeholder="Milan, Corée du Sud, Bocconi…" value={value}
                            onChange={e => onChange(e.target.value)} onKeyDown={handleKey}
                            onFocus={() => results.length > 0 && value.length >= 2 && setOpen(true)}
                            autoComplete="off" style={inputStyle} />
            {open && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, zIndex: 9999, overflow: "hidden", boxShadow: T.shadowMd }}>
                      {results.map((d, i) => (
                                  <div key={i} onMouseDown={() => { onSelect(d); setOpen(false); }} onMouseEnter={() => setHi(i)}
                                                  style={{ padding: "11px 14px", background: i === hi ? T.bgHover : "transparent", cursor: "pointer", borderBottom: i < results.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                                  <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{d.school}</span>
                                                  <span style={{ fontSize: 12, color: T.muted, marginLeft: 8 }}>{d.city} · {d.country}</span>
                                  </div>
                                ))}
                    </div>
                  )}
          </div>
        );
}

function SemBadge({ semester }) {
    const map = { fall: { bg: "#fbf3e2", color: "#8a6416" }, spring: { bg: T.greenBg, color: T.green }, double: { bg: T.navySoft, color: T.navy } };
    const c = map[semester] || map.double;
    return <span style={{ background: c.bg, color: c.color, fontSize: 11, padding: "2px 9px", borderRadius: 99, fontWeight: 600 }}>{SEMESTER_LABELS[semester] || semester}</span>;
}

// Choix du semestre sous forme de cartes (icône + période)
const SEMESTER_OPTIONS = [
    { val: "fall", label: "Fall", sub: "Sept – Déc", icon: "ti-leaf" },
    { val: "spring", label: "Spring", sub: "Janv – Juin", icon: "ti-flower" },
    { val: "double", label: "Double diplôme", sub: "Année complète", icon: "ti-school" },
];

function SemCard({ label, sub, icon, active, onClick }) {
    return (
          <button onClick={onClick} aria-pressed={active}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", textAlign: "left", background: active ? T.accentSoft : T.bgCard, border: `1.5px solid ${active ? T.accent : T.border}`, borderRadius: 12, cursor: "pointer", transition: "all 0.15s", boxShadow: active ? "0 0 0 3px rgba(226,0,26,0.08)" : T.shadow }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: active ? T.accent : T.bgHover, color: active ? "#fff" : T.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}><i className={`ti ${icon}`} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: T.text }}>{label}</span>
              <span style={{ display: "block", fontSize: 12, color: T.muted }}>{sub}</span>
            </span>
          </button>
        );
}

const LOOKING_OPTIONS = [["coloc", "Une coloc", "ti-home"], ["amis", "Des amis", "ti-users"], ["conseils", "Des conseils", "ti-bulb"], ["activites", "Des activités", "ti-ball-football"]];
const LOOKING_LABELS = { coloc: "Coloc", amis: "Amis", conseils: "Conseils", activites: "Activités" };

// Ligne de « preuve sociale » affichée pendant l'inscription
function SocialProof({ stats }) {
    if (!stats || typeof stats.total !== "number" || stats.total < 1) return null;
    return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.muted, marginBottom: 24 }}>
            <span style={{ position: "relative", width: 8, height: 8 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.accent, animation: "tpo-pulse 1.8s ease-out infinite" }} />
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.accent }} />
            </span>
            <span><strong style={{ color: T.text }}>{stats.total} étudiants emlyon</strong> déjà inscrits</span>
          </div>
        );
}

function StudentCard({ student }) {
    const initials = (student.firstName[0] + student.lastName[0]).toUpperCase();
    return (
          <div className="tpo-fade" style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: "16px 18px", boxShadow: T.shadow }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: (student.whatsapp || student.lookingFor?.length > 0) ? 12 : 0 }}>
                            <div style={{ width: 42, height: 42, borderRadius: "50%", background: T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14, color: "#fff", flexShrink: 0, boxShadow: `0 0 0 3px ${T.bgCard}, 0 0 0 4px ${T.gold}` }}>{initials}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                      <span style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{student.firstName} {student.lastName}</span>
                                                      <SemBadge semester={student.semester} />
                                        </div>
                                        <p style={{ margin: "2px 0 0", fontSize: 12, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{student.destination.school} · {student.destination.city}</p>
                            </div>
                  </div>
            {student.lookingFor?.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: student.whatsapp ? 10 : 0 }}>
                      {student.lookingFor.map(lf => (
                                  <span key={lf} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, background: T.accentSoft, color: T.accent, fontWeight: 500 }}>{LOOKING_LABELS[lf] || lf}</span>
                                ))}
                    </div>
                  )}
            {student.whatsapp ? (
                    <a href={`https://wa.me/${student.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px", background: "#25D366", color: "#fff", borderRadius: T.radius, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                                <i className="ti ti-brand-whatsapp" style={{ fontSize: 17 }} /> Contacter sur WhatsApp
                    </a>
                  ) : student.email ? (
                    <a href={`mailto:${student.email}?subject=${encodeURIComponent("Tu pars où en échange ? — " + student.destination.school)}`}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px", background: T.navy, color: "#fff", borderRadius: T.radius, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                                <i className="ti ti-mail" style={{ fontSize: 16 }} /> Contacter par email
                    </a>
                  ) : null}
          </div>
        );
}

export default function App() {
    const [screen, setScreen] = useState(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("carte") ? "map" : "home"));
    const [regStep, setRegStep] = useState(1);
    const [form, setForm] = useState({ firstName: "", lastName: "", email: "", destQuery: "", destination: null, semester: "fall", lookingFor: [], countryCode: "+33", whatsappNumber: "", consent: false });
    const [verifCode, setVerifCode] = useState("");
    const [verifError, setVerifError] = useState("");
    const [lookupEmail, setLookupEmail] = useState("");
    const [lookupCodeSent, setLookupCodeSent] = useState(false);
    const [lookupCode, setLookupCode] = useState("");
    const [token, setToken] = useState(null);
    const [registered, setRegistered] = useState(null);
    const [matches, setMatches] = useState([]);
    const [stats, setStats] = useState(null); // null tant que les chiffres chargent
    const [destPreview, setDestPreview] = useState({ count: 0, initials: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

  useEffect(() => {
        // Reconnexion automatique si un jeton valide est présent sur cet appareil.
        const saved = loadToken();
        if (saved) getMatches(saved).then(result => {
                setToken(saved); setRegistered(result.student); setMatches(result.matches || []);
        }).catch(() => saveToken(null));
  }, []);

  useEffect(() => {
        getStats().then(setStats).catch(() => setStats({ total: "—", countries: "—" }));
  }, []);

  function step1Valid() { return form.firstName.trim() && form.lastName.trim() && form.email.endsWith(DOMAIN) && form.consent; }
    function step2Valid() { return !!form.destination; }

  async function sendVerifCode() {
        setLoading(true); setVerifError("");
        try {
                const res = await fetch("/api/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) });
                const data = await res.json();
                if (!res.ok) { setVerifError(data.error); setLoading(false); return; }
                setRegStep(2);
        } catch { setVerifError("Erreur réseau. Réessaie."); }
        setLoading(false);
  }

  async function verifyCode() {
        setLoading(true); setVerifError("");
        try {
                const res = await fetch("/api/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, code: verifCode }) });
                const data = await res.json();
                if (!res.ok) { setVerifError(data.error); setLoading(false); return; }
                setToken(data.token); saveToken(data.token);
                setRegStep(3);
        } catch { setVerifError("Erreur réseau. Réessaie."); }
        setLoading(false);
  }

  async function handleSubmit() {
        setError(""); setLoading(true);
        try {
                const result = await insertStudent(form, token);
                setRegistered(result.student);
                setMatches(result.matches || []);
                if (result.matches && result.matches.length > 0) {
                          fetch("/api/notify", { method: "POST", headers: authHeaders(token), body: "{}" }).catch(() => {});
                }
                setScreen("matches");
        } catch (e) {
                setError(e.message || "Une erreur est survenue.");
        }
        setLoading(false);
  }

  // Retrouver ses matchs : on prouve qu'on possède l'adresse avec un code envoyé par email.
  async function sendLookupCode() {
        setError(""); setLoading(true);
        try {
                const res = await fetch("/api/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: lookupEmail.toLowerCase().trim() }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setLookupCodeSent(true);
        } catch (e) { setError(e.message || "Erreur réseau. Réessaie."); }
        setLoading(false);
  }

  async function handleLookup() {
        setError(""); setLoading(true);
        try {
                const vr = await fetch("/api/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: lookupEmail.toLowerCase().trim(), code: lookupCode }) });
                const vdata = await vr.json();
                if (!vr.ok) throw new Error(vdata.error);
                setToken(vdata.token); saveToken(vdata.token);
                const result = await getMatches(vdata.token);
                setRegistered(result.student);
                setMatches(result.matches || []);
                setScreen("matches");
        } catch (e) {
                setError(e.message || "Une erreur est survenue.");
        }
        setLoading(false);
  }

  // Navigation entre les écrans (en-tête, pied de page, boutons)
  function go(s) {
        if (s === "register") setRegStep(1);
        if (s === "matches" && !registered) s = "lookup";
        setError(""); setVerifError("");
        setScreen(s);
        window.scrollTo(0, 0);
  }

  // ── HOME ──
  if (screen === "home") return (
        <Page go={go} registered={registered} width={1040} center>
          <div className="tpo-hero">
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 99, padding: "5px 12px 5px 10px", marginBottom: 22, boxShadow: T.shadow }}>
                <span style={{ position: "relative", width: 8, height: 8 }}>
                  <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.accent, animation: "tpo-pulse 1.8s ease-out infinite" }} />
                  <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.accent }} />
                </span>
                <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>emlyon GBBA · 2026–2027</span>
              </div>
              <h1 style={{ fontFamily: T.serif, fontSize: "clamp(36px, 6vw, 54px)", fontWeight: 700, color: T.text, margin: "0 0 16px", lineHeight: 1.08, letterSpacing: "-1px" }}>
                Tu pars où en <span style={{ color: T.accent, fontStyle: "italic", fontWeight: 600 }}>échange</span> ?
              </h1>
              <p style={{ fontSize: 17, color: T.muted, margin: "0 0 28px", lineHeight: 1.6, maxWidth: 440 }}>
                Découvre qui part à la même destination que toi et prépare ton départ ensemble. En 30 secondes.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
                <button onClick={() => go("register")} style={btnPrimary()}>Trouver mes matchs →</button>
                <button onClick={() => go(registered ? "matches" : "lookup")} style={btnSecondary}>
                  {registered ? "Voir mes matchs" : "J'ai déjà un compte"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", marginTop: 28, maxWidth: 420, background: T.navy, borderRadius: T.radiusLg, overflow: "hidden" }}>
                {[{ value: stats?.total, label: "inscrits" }, { value: stats?.countries, label: "pays" }, { value: PARTNER_SCHOOLS, label: "universités" }].map(({ value, label }, i) => (
                  <div key={label} style={{ padding: "16px 8px", textAlign: "center", borderLeft: i ? "1px solid rgba(255,255,255,0.12)" : "none" }}>
                    {value == null
                      ? <span style={{ display: "block", width: 40, height: 28, margin: "0 auto", borderRadius: 6, background: "rgba(255,255,255,0.12)" }} />
                      : <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.1 }}>{value}</p>}
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: T.gold, fontWeight: 500 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <MapPreview T={T} onOpen={() => go("map")} />
          </div>
        </Page>
      );

  // ── REGISTER ──
  const stepHeader = (n, title, sub) => (
        <>
          <p style={eyebrow}>Étape {n} sur 4</p>
          <h2 style={h2Style}>{title}</h2>
          {sub && <p style={{ fontSize: 15, color: T.muted, margin: "0 0 24px", lineHeight: 1.5 }}>{sub}</p>}
        </>
      );

  if (screen === "register") return (
        <Page go={go} registered={registered}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <button onClick={() => { if (regStep === 1) go("home"); else setRegStep(s => s - 1); setError(""); setVerifError(""); }} style={pillBack}>
              <i className="ti ti-arrow-left" /> Retour
            </button>
            {form.destination && regStep === 4 && (
              <span style={{ ...pillBack, cursor: "default", color: T.muted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <i className="ti ti-map-pin" style={{ color: T.accent }} /> {form.destination.city}
              </span>
            )}
          </div>
          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: "24px 22px 26px", boxShadow: T.shadowMd }}>
            <ProgressBar step={regStep} total={4} />
            <SocialProof stats={stats} />

            {regStep === 1 && (
              <div className="tpo-fade">
                {stepHeader(1, "Qui es-tu ?", "Utilise ton adresse email emlyon.")}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input placeholder="Prénom" value={form.firstName} autoFocus
                           onChange={e => { const firstName = e.target.value; const email = firstName && form.lastName ? `${norm(firstName)}.${norm(form.lastName)}${DOMAIN}` : form.email; setForm(f => ({ ...f, firstName, email })); }}
                           style={inputStyle} />
                    <input placeholder="Nom" value={form.lastName}
                           onChange={e => { const lastName = e.target.value; const email = form.firstName && lastName ? `${norm(form.firstName)}.${norm(lastName)}${DOMAIN}` : form.email; setForm(f => ({ ...f, lastName, email })); }}
                           style={inputStyle} />
                  </div>
                  <div>
                    <EmailInput value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} onEnter={() => step1Valid() && sendVerifCode()} />
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: T.faint }}>{form.firstName && form.lastName ? "Généré automatiquement — modifie si besoin" : "Remplis prénom et nom pour générer ton email"}</p>
                  </div>
                  {verifError && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{verifError}</p>}
                  {error && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{error}</p>}
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", background: T.bgHover, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
                    <input type="checkbox" checked={form.consent} onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))} style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: "pointer", accentColor: T.accent }} />
                    <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                      J'accepte que mes données (nom, email, destination, WhatsApp) soient partagées uniquement avec les étudiants emlyon partant à la même destination.{" "}
                      <span onClick={e => { e.preventDefault(); go("privacy"); }} style={{ color: T.text, textDecoration: "underline", cursor: "pointer" }}>Politique de confidentialité</span>
                    </span>
                  </label>
                  <button onClick={(e) => { e.preventDefault(); setError(""); if (!form.firstName.trim() || !form.lastName.trim()) { setError("Entre ton prénom et ton nom."); return; } if (!form.email.endsWith(DOMAIN)) { setError("Utilise ton adresse @edu.em-lyon.com"); return; } if (!form.consent) { setError("Tu dois accepter les conditions pour continuer."); return; } setError(""); sendVerifCode(); }}
                          disabled={!step1Valid() || loading}
                          style={{ ...btnPrimary(!!step1Valid()), opacity: loading ? 0.7 : 1 }}>
                    {loading ? "Envoi du code…" : "Vérifier mon email →"}
                  </button>
                </div>
              </div>
            )}

            {regStep === 2 && (
              <div className="tpo-fade">
                {stepHeader(2, "Vérifie ton email")}
                <p style={{ fontSize: 15, color: T.muted, margin: "0 0 4px" }}>On a envoyé un code à 6 chiffres à</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 24px", wordBreak: "break-all" }}>{form.email}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="_ _ _ _ _ _" value={verifCode}
                         onChange={e => setVerifCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                         onKeyDown={e => e.key === "Enter" && verifCode.length === 6 && verifyCode()}
                         autoFocus style={{ ...inputStyle, height: 60, fontSize: 28, fontWeight: 700, letterSpacing: 10, textAlign: "center" }} />
                  {verifError && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{verifError}</p>}
                  <button onClick={verifyCode} disabled={loading || verifCode.length !== 6}
                          style={{ ...btnPrimary(verifCode.length === 6), opacity: loading ? 0.7 : 1 }}>
                    {loading ? "Vérification…" : "Confirmer →"}
                  </button>
                  <button onClick={() => { setVerifCode(""); sendVerifCode(); }} disabled={loading} style={btnGhost}>
                    Renvoyer le code
                  </button>
                </div>
              </div>
            )}

            {regStep === 3 && (
              <div className="tpo-fade">
                {stepHeader(3, "Tu pars où ?", "Tape le pays, la ville ou le nom de l'école.")}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <DestSearch value={form.destQuery} onChange={v => setForm(f => ({ ...f, destQuery: v, destination: null }))} onSelect={d => { setForm(f => ({ ...f, destQuery: `${d.school} – ${d.city}`, destination: d })); getDestinationPreview(d.school).then(setDestPreview).catch(() => setDestPreview({ count: 0, initials: [] })); }} />
                  {form.destination && (() => { const count = destPreview.count; return (
                    <div className="tpo-fade" style={{ padding: "14px 16px", background: count > 0 ? T.greenBg : T.bgHover, borderRadius: 12, border: `1px solid ${count > 0 ? "#bfe6cc" : T.border}`, marginTop: -6 }}>
                      {count > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ display: "flex" }}>
                            {destPreview.initials.slice(0, 4).map((initials, i) => (
                              <div key={i} style={{ width: 32, height: 32, marginLeft: i ? -8 : 0, borderRadius: "50%", background: T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff", filter: "blur(3px)", border: `2px solid ${T.greenBg}` }}>
                                {initials}
                              </div>
                            ))}
                            {count > 4 && <div style={{ width: 32, height: 32, marginLeft: -8, borderRadius: "50%", background: T.bgCard, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: T.text, border: `2px solid ${T.greenBg}` }}>+{count - 4}</div>}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 14, color: T.green, fontWeight: 600 }}>{count} étudiant{count > 1 ? "s" : ""} déjà inscrit{count > 1 ? "s" : ""}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: T.green }}>Inscris-toi pour voir leurs profils →</p>
                          </div>
                        </div>
                      ) : <p style={{ margin: 0, fontSize: 13, color: T.muted, fontWeight: 500 }}><i className="ti ti-sparkles" style={{ color: T.gold }} /> Tu seras le premier pour cette destination !</p>}
                    </div>
                  ); })()}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 10px" }}>Quand pars-tu ?</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                      {SEMESTER_OPTIONS.map(o => (
                        <SemCard key={o.val} {...o} active={form.semester === o.val} onClick={() => setForm(f => ({ ...f, semester: o.val }))} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 10px" }}>Je cherche <span style={{ fontWeight: 400, color: T.faint }}>(optionnel)</span></p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {LOOKING_OPTIONS.map(([val, label, icon]) => {
                        const active = form.lookingFor.includes(val);
                        return (
                          <button key={val} aria-pressed={active} onClick={() => setForm(f => ({ ...f, lookingFor: active ? f.lookingFor.filter(x => x !== val) : [...f.lookingFor, val] }))}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: active ? 600 : 500, borderRadius: 99, background: active ? T.accent : T.bgCard, color: active ? "#fff" : T.text, border: `1px solid ${active ? T.accent : T.borderStrong}`, cursor: "pointer", transition: "all 0.12s" }}>
                            <i className={`ti ${active ? "ti-check" : icon}`} style={{ fontSize: 15 }} /> {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={() => step2Valid() && setRegStep(4)} disabled={!step2Valid()} style={btnPrimary(step2Valid())}>
                    Continuer →
                  </button>
                </div>
              </div>
            )}

            {regStep === 4 && (
              <div className="tpo-fade">
                {stepHeader(4, "Ton WhatsApp", "Obligatoire — tes matchs pourront te contacter directement.")}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ position: "relative" }}>
                    <i className="ti ti-brand-whatsapp" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "#25D366" }} />
                    <input type="text" placeholder="+33 6 12 34 56 78" value={form.whatsappNumber} autoFocus pattern=".*" inputMode="tel"
                           onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                           style={{ ...inputStyle, paddingLeft: 44 }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: T.faint }}>Inclus l'indicatif si tu n'es pas en France (ex : +34 6 12 34 56 78)</p>
                  {error && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{error}</p>}
                  <button onClick={() => { if (!form.whatsappNumber.trim()) { setError("Entre ton numéro WhatsApp pour continuer."); return; } handleSubmit(); }} disabled={loading}
                          style={{ ...btnPrimary(!!form.whatsappNumber.trim()), cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                    {loading ? "Inscription en cours…" : "Voir mes matchs →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Page>
      );

    // ── LOOKUP ──
    if (screen === "lookup") return (
          <Page go={go} registered={registered}>
            <button onClick={() => go("home")} style={{ ...pillBack, marginBottom: 18 }}><i className="ti ti-arrow-left" /> Retour</button>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: "26px 22px", boxShadow: T.shadowMd }}>
              <p style={eyebrow}>Bon retour</p>
              <h2 style={h2Style}>Retrouver mes matchs</h2>
              <p style={{ fontSize: 15, color: T.muted, margin: "0 0 24px" }}>Entre l'adresse avec laquelle tu t'es inscrit.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {!lookupCodeSent ? (<>
                  <EmailInput value={lookupEmail} onChange={setLookupEmail} onEnter={sendLookupCode} />
                  {error && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{error}</p>}
                  <button onClick={sendLookupCode} disabled={loading || !lookupEmail.includes("@")}
                          style={{ ...btnPrimary(!loading && lookupEmail.includes("@")) }}>
                    {loading ? "Envoi du code…" : "Recevoir un code →"}
                  </button>
                </>) : (<>
                  <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>Code à 6 chiffres envoyé à <strong style={{ color: T.text }}>{lookupEmail}</strong></p>
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="_ _ _ _ _ _" value={lookupCode} autoFocus
                         onChange={e => setLookupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                         onKeyDown={e => e.key === "Enter" && lookupCode.length === 6 && handleLookup()}
                         style={{ ...inputStyle, height: 60, fontSize: 28, fontWeight: 700, letterSpacing: 10, textAlign: "center" }} />
                  {error && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{error}</p>}
                  <button onClick={handleLookup} disabled={loading || lookupCode.length !== 6}
                          style={btnPrimary(!loading && lookupCode.length === 6)}>
                    {loading ? "Vérification…" : "Voir mes matchs →"}
                  </button>
                  <button onClick={() => { setLookupCodeSent(false); setLookupCode(""); setError(""); }} style={btnGhost}>
                    Changer d'adresse
                  </button>
                </>)}
                <div style={{ height: 1, background: T.border, margin: "6px 0" }} />
                <button onClick={() => go("register")} style={btnSecondary}>
                  Pas encore inscrit ? S'inscrire
                </button>
              </div>
            </div>
          </Page>
        );

    // ── MATCHES ──
    if (screen === "matches" && registered) return (
          <Page go={go} registered={registered} width={560}>
            <div style={{ position: "relative", overflow: "hidden", background: T.navy, color: "#fff", borderRadius: 20, padding: "22px 22px 20px", marginBottom: 28, boxShadow: T.shadowMd }}>
              <i className="ti ti-plane-departure" aria-hidden="true" style={{ position: "absolute", right: -14, bottom: -26, fontSize: 130, color: "rgba(255,255,255,0.06)" }} />
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: T.gold, textTransform: "uppercase", letterSpacing: "0.12em" }}>Ta destination</p>
              <p style={{ margin: "0 0 6px", fontFamily: T.serif, fontWeight: 700, fontSize: 24, lineHeight: 1.2 }}>{registered.destination.city}</p>
              <p style={{ margin: "0 0 12px", fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{registered.destination.school} · {registered.destination.country}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", position: "relative" }}>
                <SemBadge semester={registered.semester} />
                <button onClick={() => go("map")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 99, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  <i className="ti ti-world" /> Où part la promo
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ ...h2Style, fontSize: 26 }}>
                {matches.length === 0 ? "Aucun match pour l'instant" : `${matches.length} match${matches.length > 1 ? "s" : ""} trouvé${matches.length > 1 ? "s" : ""}`}
              </h2>
              <p style={{ margin: 0, fontSize: 15, color: T.muted }}>
                {matches.length === 0 ? "Partage le lien à ta promo pour trouver des camarades." : "Des étudiants qui partent au même endroit que toi."}
              </p>
            </div>
            {matches.length === 0 ? (
              <div style={{ background: T.bgCard, border: `1.5px dashed ${T.borderStrong}`, borderRadius: T.radiusLg, padding: "32px 20px", textAlign: "center" }}>
                <i className="ti ti-sparkles" style={{ fontSize: 28, color: T.gold }} />
                <p style={{ margin: "8px 0 0", fontSize: 14, color: T.muted, lineHeight: 1.6 }}>Tu es le premier à cette destination.<br />Reviens bientôt !</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {matches.map(s => <StudentCard key={s.id} student={s} />)}
              </div>
            )}
            <div style={{ marginTop: 24 }}>
              <ShareBar T={T} url={SITE_URL}
                        message={destinationMessage(registered.destination, registered.semester)}
                        title="Plus on est d'inscrits, plus tu as de matchs"
                        subtitle="Envoie le lien dans ton groupe de promo." />
            </div>
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 12, color: T.faint, marginBottom: 12, textAlign: "center" }}>
                Tes données sont partagées uniquement avec tes matchs.{" "}
                <span onClick={() => go("privacy")} style={{ textDecoration: "underline", cursor: "pointer" }}>Politique de confidentialité</span>
              </p>
              <button onClick={() => { saveToken(null); setToken(null); setRegistered(null); setMatches([]); setScreen("home"); }}
                      style={{ ...btnGhost, marginBottom: 8 }}>
                Se déconnecter
              </button>
              <button onClick={async () => {
                        if (!window.confirm("Supprimer ton inscription ? Cette action est irréversible.")) return;
                        try {
                          const res = await fetch("/api/delete-me", { method: "POST", headers: authHeaders(token), body: "{}" });
                          if (!res.ok) throw new Error();
                          saveToken(null); setToken(null);
                          setRegistered(null); setMatches([]); setScreen("home");
                        } catch { alert("Erreur lors de la suppression. Contacte monzatpaul@gmail.com"); }
                      }} style={{ ...btnGhost, color: T.red, border: "1px solid rgba(192,0,22,0.2)" }}>
                Supprimer mon inscription
              </button>
            </div>
          </Page>
        );
  // ── CARTE ──
if (screen === "map") {
      const fromMatches = !!registered;
      return (
        <Page go={go} registered={registered} width={820}>
          <WorldMap T={T} myDest={registered?.destination || null}
                    backLabel={fromMatches ? "Mes matchs" : "Retour"}
                    onBack={() => { if (window.location.search) window.history.replaceState(null, "", window.location.pathname); go(fromMatches ? "matches" : "home"); }} />
        </Page>
      );
    }
    // ── PRIVACY ──
    if (screen === "privacy") return (
          <Page go={go} registered={registered} width={620}>
                        <button onClick={() => go(registered ? "matches" : "home")} style={{ ...pillBack, marginBottom: 24 }}><i className="ti ti-arrow-left" /> Retour</button>
                        <p style={eyebrow}>RGPD</p>
                        <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 700, color: T.text, margin: "0 0 6px", letterSpacing: "-0.5px" }}>Politique de confidentialité</h1>
                        <p style={{ fontSize: 13, color: T.faint, margin: "0 0 32px" }}>Dernière mise à jour : juillet 2026</p>
                  {[
            { title: "Qui sommes-nous ?", content: "Tu pars où en échange ? est une application étudiante créée par des étudiants emlyon pour les étudiants emlyon partant en échange académique. Ce projet n'est pas affilié officiellement à emlyon business school." },
            { title: "Quelles données collectons-nous ?", content: "Lors de ton inscription, nous collectons : ton prénom et nom, ton adresse email @edu.em-lyon.com, ta destination d'échange (école, ville, pays), ton semestre, et ton numéro WhatsApp." },
            { title: "Pourquoi collectons-nous ces données ?", content: "Uniquement pour te mettre en relation avec d'autres étudiants emlyon partant à la même destination. Aucune donnée n'est utilisée à des fins commerciales ou transmise à des tiers." },
            { title: "Qui peut voir mes données ?", content: "Seuls les étudiants emlyon inscrits sur la plateforme partant à la même destination que toi peuvent voir ton nom et ton numéro WhatsApp. Ton email n'est jamais affiché publiquement." },
            { title: "Combien de temps garde-t-on tes données ?", content: "Tes données sont conservées jusqu'à la fin de l'année académique 2026-2027, ou jusqu'à ce que tu demandes leur suppression." },
            { title: "Tes droits (RGPD)", content: "Tu as le droit d'accéder à tes données, de les corriger, et de les supprimer à tout moment via le bouton 'Supprimer mon inscription' sur ta page de matchs. Pour toute question, contacte : monzatpaul@gmail.com" },
            { title: "Sécurité", content: "Les données sont stockées sur Supabase (infrastructure sécurisée basée en Europe). Ton numéro WhatsApp n'est visible que par les étudiants qui partagent ta destination." },
                    ].map(({ title, content }) => (
                                <div key={title} style={{ marginBottom: 24 }}>
                                            <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: "0 0 6px" }}>{title}</h2>
                                            <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, margin: 0 }}>{content}</p>
                                </div>
                              ))}
                        <div style={{ padding: "14px 16px", background: T.bgCard, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.accent}`, borderRadius: T.radius, marginTop: 12 }}>
                                  <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Contact RGPD : <strong style={{ color: T.text }}>monzatpaul@gmail.com</strong></p>
                        </div>
          </Page>
        );
  
    return null;
}
