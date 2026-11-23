import { useState, useRef, useEffect } from "react";
import WorldMap, { MapPreview } from "./WorldMap";
import { ShareBar, SITE_URL, destinationMessage } from "./share";
import Dashboard from "./Dashboard";
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

// Charte graphique inspirée d'emlyon business school : sobre, beaucoup d'espace, peu d'effets
const T = {
    bg: "#ffffff", bgCard: "#ffffff", bgHover: "#f5f4f2", bgSoft: "#f8f7f5",
    border: "#e7e5e1", borderStrong: "#cfccc6",
    text: "#001931", muted: "#5d6673", faint: "#9aa1ab",
    accent: "#E2001A", accentHover: "#c00016", accentFg: "#ffffff", accentSoft: "#fdf0f1",
    navy: "#001931", navySoft: "#eef1f4", gold: "#D4A94E",
    green: "#15803d", greenBg: "#f1f8f3",
    red: "#c00016", radius: "8px", radiusLg: "12px",
    shadow: "none",
    shadowMd: "0 8px 24px rgba(0,25,49,0.08)",
    serif: "'Noto Serif', Georgia, serif",
};

// Boutons et titres réutilisés partout
const btnPrimary = (enabled = true) => ({
    padding: "14px", background: enabled ? T.accent : T.bgHover, color: enabled ? T.accentFg : T.faint,
    border: "none", borderRadius: T.radius, fontSize: 15, fontWeight: 500, width: "100%",
    cursor: enabled ? "pointer" : "not-allowed", transition: "background 0.15s",
});
const btnSecondary = { padding: "13px", background: T.bgCard, color: T.text, border: `1px solid ${T.borderStrong}`, borderRadius: T.radius, fontSize: 15, fontWeight: 500, cursor: "pointer", width: "100%" };
const btnGhost = { padding: "10px", background: "transparent", color: T.muted, border: "none", borderRadius: T.radius, fontSize: 14, cursor: "pointer", width: "100%", textDecoration: "underline", textUnderlineOffset: 3 };
const pillBack = { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "4px 0", fontSize: 14, color: T.muted, cursor: "pointer" };
const eyebrow = { fontSize: 14, fontWeight: 400, color: T.muted, margin: "0 0 8px" };
const h2Style = { fontFamily: "'Noto Serif', Georgia, serif", fontSize: 30, fontWeight: 600, color: T.text, margin: "0 0 10px", letterSpacing: "-0.4px", lineHeight: 1.2 };

// En-tête commun
function Header({ go, registered }) {
    return (
          <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#ffffff", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <button onClick={() => go("home")} aria-label="Accueil" style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <span style={{ width: 4, height: 22, background: T.accent, borderRadius: 2 }} />
                <span style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 600, color: T.text, whiteSpace: "nowrap" }}>Tu pars où ?</span>
              </button>
              <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <button onClick={() => go("map")} style={{ background: "none", border: "none", color: T.text, fontSize: 14, cursor: "pointer", padding: 0 }}>Carte</button>
                <button onClick={() => go(registered ? "matches" : "register")} style={{ background: T.navy, color: "#fff", border: "none", borderRadius: T.radius, padding: "9px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {registered ? "Mon espace" : "S'inscrire"}
                </button>
              </nav>
            </div>
          </header>
        );
}

// Pied de page commun
function Footer({ go }) {
    const link = { background: "none", border: "none", padding: 0, color: T.muted, fontSize: 13, cursor: "pointer" };
    return (
          <footer style={{ marginTop: "auto", borderTop: `1px solid ${T.border}` }}>
            <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <p style={{ fontSize: 13, color: T.faint }}>Projet étudiant, non affilié à emlyon business school</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                <button style={link} onClick={() => go("map")}>Carte</button>
                <button style={link} onClick={() => go("matches")}>Mon espace</button>
                <button style={link} onClick={() => go("privacy")}>Confidentialité</button>
              </div>
            </div>
          </footer>
        );
}

// Mise en page de chaque écran : en-tête, contenu centré, pied de page
function Page({ go, registered, width = 440, center = false, children }) {
    return (
          <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
            <Header go={go} registered={registered} />
            <main style={{ flex: 1, display: "flex", alignItems: center ? "center" : "flex-start", justifyContent: "center", padding: "56px 20px 88px" }}>
              <div className="tpo-fade" style={{ width: "100%", maxWidth: width }}>{children}</div>
            </main>
            <Footer go={go} />
          </div>
        );
}

const inputStyle = {
    width: "100%", height: 48, padding: "0 14px",
    border: `1px solid ${T.borderStrong}`, borderRadius: T.radius,
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
          <div style={{ display: "flex", gap: 4, marginBottom: 40 }} role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step}>
            {Array.from({ length: total }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < step ? T.navy : T.border, transition: "background 0.3s" }} />
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

function SemBadge({ semester, light = false }) {
    return <span style={{ fontSize: 13, color: light ? "rgba(255,255,255,0.75)" : T.muted }}>{SEMESTER_LABELS[semester] || semester}</span>;
}

// Choix du semestre : trois options simples
const SEMESTER_OPTIONS = [
    { val: "fall", label: "Fall", sub: "Sept – Déc" },
    { val: "spring", label: "Spring", sub: "Janv – Juin" },
    { val: "double", label: "Double diplôme", sub: "Année complète" },
];

function SemCard({ label, sub, active, onClick }) {
    return (
          <button onClick={onClick} aria-pressed={active}
                  style={{ padding: "12px 14px", textAlign: "left", background: active ? T.navySoft : T.bgCard, border: `1px solid ${active ? T.navy : T.borderStrong}`, borderRadius: T.radius, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: T.text }}>{label}</span>
            <span style={{ display: "block", fontSize: 13, color: T.muted, marginTop: 2 }}>{sub}</span>
          </button>
        );
}

const LOOKING_OPTIONS = [["coloc", "Une coloc"], ["amis", "Des amis"], ["conseils", "Des conseils"], ["activites", "Des activités"]];
const LOOKING_LABELS = { coloc: "Coloc", amis: "Amis", conseils: "Conseils", activites: "Activités" };

// Un match : une ligne simple (initiales, nom, infos, bouton de contact)
function StudentCard({ student, isNew = false }) {
    const initials = (student.firstName[0] + student.lastName[0]).toUpperCase();
    const details = [SEMESTER_LABELS[student.semester] || student.semester, ...(student.lookingFor || []).map(lf => LOOKING_LABELS[lf] || lf)].filter(Boolean).join(" · ");
    const contact = student.whatsapp
          ? { href: `https://wa.me/${student.whatsapp.replace(/\D/g, "")}`, label: "WhatsApp", ext: true }
          : student.email ? { href: `mailto:${student.email}?subject=${encodeURIComponent("Tu pars où en échange ? — " + student.destination.school)}`, label: "Email" } : null;
    return (
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.navySoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, color: T.navy, flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: T.text }}>
                {student.firstName} {student.lastName}
                {isNew && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: T.accent }}>Nouveau</span>}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{details}</p>
            </div>
            {contact && (
              <a href={contact.href} {...(contact.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                 style={{ flexShrink: 0, padding: "8px 14px", border: `1px solid ${T.borderStrong}`, borderRadius: T.radius, fontSize: 14, fontWeight: 500, color: T.text, textDecoration: "none", background: T.bgCard }}>
                {contact.label}
              </a>
            )}
          </div>
        );
}

// Formulaire de modification du profil (affiché dans « Mon espace »)
function ProfileForm({ me, onSave, onCancel }) {
    const d = me.destination;
    const [f, setF] = useState({
          firstName: me.firstName, lastName: me.lastName, whatsapp: me.whatsapp || "",
          semester: me.semester || "fall", lookingFor: me.lookingFor || [],
          destQuery: `${d.school} – ${d.city}`, destination: d,
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const set = patch => setF(x => ({ ...x, ...patch }));
    const label = { display: "block", fontSize: 14, fontWeight: 500, color: T.text, margin: "0 0 8px" };

    async function save() {
          setErr("");
          if (!f.firstName.trim() || !f.lastName.trim()) return setErr("Entre ton prénom et ton nom.");
          if (!f.whatsapp.trim()) return setErr("Entre ton numéro WhatsApp.");
          if (!f.destination) return setErr("Choisis ta destination dans la liste.");
          setSaving(true);
          try { await onSave(f); }
          catch (e) { setErr(e.message || "Impossible d'enregistrer. Réessaie."); setSaving(false); }
    }

    return (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={label}>Prénom</label><input value={f.firstName} onChange={e => set({ firstName: e.target.value })} style={inputStyle} /></div>
              <div><label style={label}>Nom</label><input value={f.lastName} onChange={e => set({ lastName: e.target.value })} style={inputStyle} /></div>
            </div>
            <div>
              <label style={label}>Email</label>
              <p style={{ margin: 0, fontSize: 15, color: T.muted }}>{me.email} <span style={{ color: T.faint, fontSize: 13 }}>· ne peut pas être modifié</span></p>
            </div>
            <div>
              <label style={label}>WhatsApp</label>
              <input value={f.whatsapp} inputMode="tel" placeholder="+33 6 12 34 56 78" onChange={e => set({ whatsapp: e.target.value })} style={inputStyle} />
              <p style={{ margin: "6px 0 0", fontSize: 13, color: T.faint }}>Avec l'indicatif si ton numéro n'est pas français.</p>
            </div>
            <div>
              <label style={label}>Destination</label>
              <DestSearch value={f.destQuery} onChange={v => set({ destQuery: v, destination: null })} onSelect={x => set({ destQuery: `${x.school} – ${x.city}`, destination: x })} />
              {f.destination && f.destination.school !== d.school && (
                <p style={{ margin: "6px 0 0", fontSize: 13, color: T.muted }}>Tes matchs seront mis à jour pour cette nouvelle école.</p>
              )}
            </div>
            <div>
              <label style={label}>Semestre</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                {SEMESTER_OPTIONS.map(o => <SemCard key={o.val} {...o} active={f.semester === o.val} onClick={() => set({ semester: o.val })} />)}
              </div>
            </div>
            <div>
              <label style={label}>Je cherche <span style={{ fontWeight: 400, color: T.faint }}>(facultatif)</span></label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {LOOKING_OPTIONS.map(([val, text]) => {
                  const on = f.lookingFor.includes(val);
                  return (
                    <button key={val} aria-pressed={on} onClick={() => set({ lookingFor: on ? f.lookingFor.filter(x => x !== val) : [...f.lookingFor, val] })}
                            style={{ padding: "8px 16px", fontSize: 14, borderRadius: 99, background: on ? T.navy : T.bgCard, color: on ? "#fff" : T.text, border: `1px solid ${on ? T.navy : T.borderStrong}`, cursor: "pointer" }}>
                      {text}
                    </button>
                  );
                })}
              </div>
            </div>
            {err && <p style={{ margin: 0, fontSize: 14, color: T.red }}>{err}</p>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={save} disabled={saving} style={{ ...btnPrimary(!saving), width: "auto", padding: "12px 24px" }}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
              <button onClick={onCancel} disabled={saving} style={{ ...btnSecondary, width: "auto", padding: "12px 24px" }}>Annuler</button>
            </div>
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
                // Déjà connecté : on arrive directement dans son espace (sauf lien direct vers la carte)
                setScreen(s => (s === "home" ? "matches" : s));
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
                // Déjà inscrit ? Le code prouve que l'adresse lui appartient : on le connecte
                // directement à son espace au lieu de lui refaire remplir l'inscription.
                if (await openExistingAccount(data.token)) { setLoading(false); return; }
                setRegStep(3);
        } catch { setVerifError("Erreur réseau. Réessaie."); }
        setLoading(false);
  }

  // Charge le compte lié au jeton et ouvre « Mon espace ». Renvoie false s'il n'existe pas encore.
  async function openExistingAccount(t) {
        try {
                const result = await getMatches(t);
                setRegistered(result.student);
                setMatches(result.matches || []);
                setRegStep(1); setVerifCode(""); setError(""); setVerifError("");
                setScreen("matches");
                window.scrollTo(0, 0);
                return true;
        } catch { return false; }
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
                // Filet de sécurité : si le compte existe déjà, on ouvre simplement son espace.
                if (token && await openExistingAccount(token)) { setLoading(false); return; }
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
        if (s === "home" && registered) s = "matches";
        setError(""); setVerifError("");
        setScreen(s);
        window.scrollTo(0, 0);
  }

  // ── HOME ──
  if (screen === "home") return (
        <Page go={go} registered={registered} width={1040} center>
          <div className="tpo-hero">
            <div>
              <p style={{ fontSize: 14, color: T.muted, margin: "0 0 20px" }}>emlyon GBBA · Promo 2026–2027</p>
              <h1 style={{ fontFamily: T.serif, fontSize: "clamp(36px, 5.5vw, 52px)", fontWeight: 600, color: T.text, margin: "0 0 20px", lineHeight: 1.1, letterSpacing: "-0.8px" }}>
                Tu pars où en échange ?
              </h1>
              <p style={{ fontSize: 18, color: T.muted, margin: "0 0 36px", lineHeight: 1.6, maxWidth: 420 }}>
                Retrouve les étudiants emlyon qui partent au même endroit que toi.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
                <button onClick={() => go("register")} style={{ ...btnPrimary(), width: "auto", padding: "14px 28px" }}>Trouver mes matchs</button>
                <button onClick={() => go(registered ? "matches" : "lookup")} style={{ background: "none", border: "none", padding: 0, fontSize: 15, color: T.text, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4 }}>
                  {registered ? "Mon espace" : "J'ai déjà un compte"}
                </button>
              </div>
              <p style={{ fontSize: 14, color: T.faint, margin: "36px 0 0" }}>
                {stats && typeof stats.total === "number" ? `${stats.total} étudiants inscrits · ${stats.countries} pays` : " "}
              </p>
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
          {sub && <p style={{ fontSize: 15, color: T.muted, margin: "0 0 32px", lineHeight: 1.6 }}>{sub}</p>}
        </>
      );
  const errText = msg => msg ? <p style={{ margin: 0, fontSize: 14, color: T.red }}>{msg}</p> : null;

  if (screen === "register") return (
        <Page go={go} registered={registered}>
          <button onClick={() => { if (regStep === 1) go("home"); else setRegStep(s => s - 1); setError(""); setVerifError(""); }} style={{ ...pillBack, marginBottom: 24 }}>
            ← Retour
          </button>
          <ProgressBar step={regStep} total={4} />

          {regStep === 1 && (
            <div>
              {stepHeader(1, "Qui es-tu ?", "Utilise ton adresse email emlyon.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input placeholder="Prénom" value={form.firstName} autoFocus
                         onChange={e => { const firstName = e.target.value; const email = firstName && form.lastName ? `${norm(firstName)}.${norm(form.lastName)}${DOMAIN}` : form.email; setForm(f => ({ ...f, firstName, email })); }}
                         style={inputStyle} />
                  <input placeholder="Nom" value={form.lastName}
                         onChange={e => { const lastName = e.target.value; const email = form.firstName && lastName ? `${norm(form.firstName)}.${norm(lastName)}${DOMAIN}` : form.email; setForm(f => ({ ...f, lastName, email })); }}
                         style={inputStyle} />
                </div>
                <EmailInput value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} onEnter={() => step1Valid() && sendVerifCode()} />
                {errText(verifError)}
                {errText(error)}
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", margin: "8px 0" }}>
                  <input type="checkbox" checked={form.consent} onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))} style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, cursor: "pointer", accentColor: T.navy }} />
                  <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                    J'accepte que mes informations soient partagées avec les étudiants emlyon qui partent au même endroit, et utilisées par l'équipe pour me recommander les bons plans de ma ville.{" "}
                    <span onClick={e => { e.preventDefault(); go("privacy"); }} style={{ color: T.text, textDecoration: "underline", cursor: "pointer" }}>En savoir plus</span>
                  </span>
                </label>
                <button onClick={(e) => { e.preventDefault(); setError(""); if (!form.firstName.trim() || !form.lastName.trim()) { setError("Entre ton prénom et ton nom."); return; } if (!form.email.endsWith(DOMAIN)) { setError("Utilise ton adresse @edu.em-lyon.com"); return; } if (!form.consent) { setError("Tu dois accepter les conditions pour continuer."); return; } setError(""); sendVerifCode(); }}
                        disabled={!step1Valid() || loading}
                        style={{ ...btnPrimary(!!step1Valid()), opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Envoi du code…" : "Continuer"}
                </button>
              </div>
            </div>
          )}

          {regStep === 2 && (
            <div>
              {stepHeader(2, "Vérifie ton email")}
              <p style={{ fontSize: 15, color: T.muted, margin: "0 0 32px", lineHeight: 1.6 }}>
                Entre le code à 6 chiffres envoyé à <span style={{ color: T.text, fontWeight: 500, wordBreak: "break-all" }}>{form.email}</span>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="000000" value={verifCode}
                       onChange={e => setVerifCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                       onKeyDown={e => e.key === "Enter" && verifCode.length === 6 && verifyCode()}
                       autoFocus style={{ ...inputStyle, height: 56, fontSize: 24, fontWeight: 500, letterSpacing: 8, textAlign: "center" }} />
                {errText(verifError)}
                <button onClick={verifyCode} disabled={loading || verifCode.length !== 6}
                        style={{ ...btnPrimary(verifCode.length === 6), opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Vérification…" : "Confirmer"}
                </button>
                <button onClick={() => { setVerifCode(""); sendVerifCode(); }} disabled={loading} style={btnGhost}>
                  Renvoyer le code
                </button>
              </div>
            </div>
          )}

          {regStep === 3 && (
            <div>
              {stepHeader(3, "Tu pars où ?", "Tape le pays, la ville ou le nom de l'école.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <div>
                  <DestSearch value={form.destQuery} onChange={v => setForm(f => ({ ...f, destQuery: v, destination: null }))} onSelect={d => { setForm(f => ({ ...f, destQuery: `${d.school} – ${d.city}`, destination: d })); getDestinationPreview(d.school).then(setDestPreview).catch(() => setDestPreview({ count: 0, initials: [] })); }} />
                  {form.destination && (
                    <p style={{ margin: "10px 0 0", fontSize: 14, color: destPreview.count > 0 ? T.green : T.muted }}>
                      {destPreview.count > 0
                        ? `${destPreview.count} étudiant${destPreview.count > 1 ? "s" : ""} emlyon ${destPreview.count > 1 ? "y sont" : "y est"} déjà inscrit${destPreview.count > 1 ? "s" : ""}.`
                        : "Tu es le premier pour cette destination."}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: T.text, margin: "0 0 12px" }}>Semestre</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                    {SEMESTER_OPTIONS.map(o => (
                      <SemCard key={o.val} {...o} active={form.semester === o.val} onClick={() => setForm(f => ({ ...f, semester: o.val }))} />
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: T.text, margin: "0 0 12px" }}>Je cherche <span style={{ fontWeight: 400, color: T.faint }}>(facultatif)</span></p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {LOOKING_OPTIONS.map(([val, label]) => {
                      const active = form.lookingFor.includes(val);
                      return (
                        <button key={val} aria-pressed={active} onClick={() => setForm(f => ({ ...f, lookingFor: active ? f.lookingFor.filter(x => x !== val) : [...f.lookingFor, val] }))}
                                style={{ padding: "8px 16px", fontSize: 14, borderRadius: 99, background: active ? T.navy : T.bgCard, color: active ? "#fff" : T.text, border: `1px solid ${active ? T.navy : T.borderStrong}`, cursor: "pointer", transition: "all 0.12s" }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => step2Valid() && setRegStep(4)} disabled={!step2Valid()} style={btnPrimary(step2Valid())}>
                  Continuer
                </button>
              </div>
            </div>
          )}

          {regStep === 4 && (
            <div>
              {stepHeader(4, "Ton numéro WhatsApp", "Tes matchs pourront te contacter directement.")}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input type="text" placeholder="+33 6 12 34 56 78" value={form.whatsappNumber} autoFocus pattern=".*" inputMode="tel"
                       onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                       style={inputStyle} />
                <p style={{ margin: 0, fontSize: 13, color: T.faint }}>Avec l'indicatif si ton numéro n'est pas français.</p>
                {errText(error)}
                <button onClick={() => { if (!form.whatsappNumber.trim()) { setError("Entre ton numéro WhatsApp pour continuer."); return; } handleSubmit(); }} disabled={loading}
                        style={{ ...btnPrimary(!!form.whatsappNumber.trim()), cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Inscription en cours…" : "Voir mes matchs"}
                </button>
              </div>
            </div>
          )}
        </Page>
      );

    // ── LOOKUP ──
    if (screen === "lookup") return (
          <Page go={go} registered={registered}>
            <button onClick={() => go("home")} style={{ ...pillBack, marginBottom: 40 }}>← Retour</button>
            <h2 style={h2Style}>Accéder à mon espace</h2>
            <p style={{ fontSize: 15, color: T.muted, margin: "0 0 32px", lineHeight: 1.6 }}>
              {!lookupCodeSent ? "Entre l'adresse avec laquelle tu t'es inscrit. On t'envoie un code." : <>Entre le code à 6 chiffres envoyé à <span style={{ color: T.text, fontWeight: 500 }}>{lookupEmail}</span></>}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {!lookupCodeSent ? (<>
                <EmailInput value={lookupEmail} onChange={setLookupEmail} onEnter={sendLookupCode} />
                {errText(error)}
                <button onClick={sendLookupCode} disabled={loading || !lookupEmail.includes("@")}
                        style={btnPrimary(!loading && lookupEmail.includes("@"))}>
                  {loading ? "Envoi du code…" : "Recevoir un code"}
                </button>
              </>) : (<>
                <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={lookupCode} autoFocus
                       onChange={e => setLookupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                       onKeyDown={e => e.key === "Enter" && lookupCode.length === 6 && handleLookup()}
                       style={{ ...inputStyle, height: 56, fontSize: 24, fontWeight: 500, letterSpacing: 8, textAlign: "center" }} />
                {errText(error)}
                <button onClick={handleLookup} disabled={loading || lookupCode.length !== 6}
                        style={btnPrimary(!loading && lookupCode.length === 6)}>
                  {loading ? "Vérification…" : "Accéder à mon espace"}
                </button>
                <button onClick={() => { setLookupCodeSent(false); setLookupCode(""); setError(""); }} style={btnGhost}>
                  Changer d'adresse
                </button>
              </>)}
              <p style={{ margin: "24px 0 0", fontSize: 14, color: T.muted, textAlign: "center" }}>
                Pas encore inscrit ?{" "}
                <button onClick={() => go("register")} style={{ background: "none", border: "none", padding: 0, fontSize: 14, color: T.text, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>S'inscrire</button>
              </p>
            </div>
          </Page>
        );

    // ── MON ESPACE (étudiant connecté) ──
    if (screen === "matches" && registered) return (
          <Page go={go} registered={registered} width={1040}>
            <Dashboard T={T} me={registered} matches={matches} go={go}
                       StudentCard={StudentCard} ShareBar={ShareBar} ProfileForm={ProfileForm}
                       onSaveProfile={async f => {
                         const res = await fetch("/api/update-profile", { method: "POST", headers: authHeaders(token),
                           body: JSON.stringify({ firstName: f.firstName, lastName: f.lastName, whatsapp: f.whatsapp, semester: f.semester, lookingFor: f.lookingFor, destination: f.destination }) });
                         const data = await res.json().catch(() => ({}));
                         if (!res.ok) throw new Error(data.error || "Impossible d'enregistrer. Réessaie.");
                         setRegistered(data.student);
                         setMatches(data.matches || []);
                       }}
                       shareProps={{ url: SITE_URL, message: destinationMessage(registered.destination, registered.semester), title: "Plus on est d'inscrits, plus tu as de matchs", subtitle: "Envoie le lien dans ton groupe de promo." }}
                       onLogout={() => { saveToken(null); setToken(null); setRegistered(null); setMatches([]); setScreen("home"); window.scrollTo(0, 0); }}
                       onDelete={async () => {
                         try {
                           const res = await fetch("/api/delete-me", { method: "POST", headers: authHeaders(token), body: "{}" });
                           if (!res.ok) throw new Error();
                           saveToken(null); setToken(null);
                           setRegistered(null); setMatches([]); setScreen("home"); window.scrollTo(0, 0);
                         } catch { alert("Erreur lors de la suppression. Contacte monzatpaul@gmail.com"); }
                       }} />
          </Page>
        );
  // ── CARTE ──
if (screen === "map") {
      const fromMatches = !!registered;
      return (
        <Page go={go} registered={registered} width={820}>
          <WorldMap T={T} myDest={registered?.destination || null}
                    backLabel={fromMatches ? "Mon espace" : "Retour"}
                    onBack={() => { if (window.location.search) window.history.replaceState(null, "", window.location.pathname); go(fromMatches ? "matches" : "home"); }} />
        </Page>
      );
    }
    // ── PRIVACY ──
    if (screen === "privacy") return (
          <Page go={go} registered={registered} width={620}>
                        <button onClick={() => go(registered ? "matches" : "home")} style={{ ...pillBack, marginBottom: 40 }}>← Retour</button>
                        <h1 style={{ ...h2Style, fontSize: 34 }}>Politique de confidentialité</h1>
                        <p style={{ fontSize: 14, color: T.faint, margin: "0 0 48px" }}>Dernière mise à jour : novembre 2026</p>
                  {[
            { title: "Qui sommes-nous ?", content: "Tu pars où en échange ? est une application créée par des étudiants emlyon pour les étudiants emlyon qui partent en échange académique. Ce projet n'est pas affilié officiellement à emlyon business school." },
            { title: "Quelles données collectons-nous ?", content: "Lors de ton inscription, nous collectons : ton prénom et ton nom, ton adresse email @edu.em-lyon.com, ta destination d'échange (école, ville, pays), ton semestre, ce que tu recherches (coloc, amis…) et ton numéro WhatsApp." },
            { title: "Pourquoi collectons-nous ces données ?", content: "Pour deux raisons. D'abord, te mettre en relation avec les autres étudiants emlyon qui partent au même endroit que toi. Ensuite, t'aider à t'installer dans ta ville : notre équipe s'appuie sur l'expérience des anciens étudiants partis aux mêmes endroits pour repérer les meilleurs bons plans de chaque ville (logement, transports, démarches, vie sur place). Ta destination, ton semestre, ce que tu recherches et tes coordonnées peuvent être utilisés pour te recommander ces bons plans." },
            { title: "Qui peut voir mes données ?", content: "Les étudiants emlyon inscrits qui partent dans la même école que toi voient ton nom, ton semestre, ce que tu recherches et ton numéro WhatsApp. L'équipe du projet y a accès pour t'envoyer des recommandations adaptées à ta destination. Ton email n'est jamais affiché aux autres étudiants. Tes données ne sont ni vendues ni transmises à des tiers." },
            { title: "Ne plus recevoir de bons plans", content: "Tu peux à tout moment demander à ne plus recevoir de recommandations en écrivant à monzatpaul@gmail.com. Tu restes inscrit et tu gardes l'accès à tes matchs." },
            { title: "Combien de temps garde-t-on tes données ?", content: "Tes données sont conservées jusqu'à la fin de l'année académique 2026-2027, ou jusqu'à ce que tu demandes leur suppression." },
            { title: "Tes droits (RGPD)", content: "Tu as le droit d'accéder à tes données, de les corriger, de t'opposer à leur utilisation pour les recommandations et de les supprimer à tout moment, via « Supprimer mon inscription » dans ton espace. Pour toute question, contacte monzatpaul@gmail.com." },
            { title: "Sécurité", content: "Les données sont stockées sur Supabase, une infrastructure sécurisée hébergée en Europe. Ton numéro WhatsApp n'est visible que par les étudiants qui partent dans la même école que toi et par l'équipe du projet." },
                    ].map(({ title, content }) => (
                                <div key={title} style={{ marginBottom: 32 }}>
                                            <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: "0 0 6px" }}>{title}</h2>
                                            <p style={{ fontSize: 15, color: T.muted, lineHeight: 1.75, margin: 0 }}>{content}</p>
                                </div>
                              ))}
                        <p style={{ margin: "16px 0 0", paddingTop: 24, borderTop: `1px solid ${T.border}`, fontSize: 14, color: T.muted }}>Contact : <span style={{ color: T.text }}>monzatpaul@gmail.com</span></p>
          </Page>
        );
  
    return null;
}
