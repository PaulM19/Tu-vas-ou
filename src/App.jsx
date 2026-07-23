import { useState, useRef, useEffect } from "react";

const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";
const SUPABASE_KEY = "sb_publishable_nX8bK2lPKzaRBWzuGut5JQ_yyiSgE-8";
const DOMAIN = "@edu.em-lyon.com";

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function getStudentsFromDB() {
  return (await sbFetch("students?select=id,created_at,first_name,last_name,email,semester,school,city,country,looking_for,is_seeded&order=created_at.asc")) || [];
}

async function getStudentsWithWhatsapp(school) {
  return (await sbFetch(`students?select=id,first_name,last_name,email,whatsapp,semester,school,city,country,looking_for&school=eq.${encodeURIComponent(school)}&order=created_at.asc`)) || [];
}

async function insertStudent(s) {
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

const T = {
  bg: "#fafaf9", bgCard: "#ffffff", bgHover: "#f5f4f0",
  border: "rgba(0,0,0,0.09)", borderStrong: "rgba(0,0,0,0.18)",
  text: "#111110", muted: "#6f6f6b", faint: "#a8a8a3",
  accent: "#111110", accentFg: "#ffffff",
  green: "#16a34a", greenBg: "#f0fdf4",
  red: "#dc2626", radius: "10px", radiusLg: "14px",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.08)",
};

const inputStyle = {
  width: "100%", height: 44, padding: "0 14px",
  border: `1px solid ${T.border}`, borderRadius: T.radius,
  background: T.bgCard, color: T.text, fontSize: 15,
  fontFamily: "inherit", outline: "none", transition: "border-color 0.15s",
  boxSizing: "border-box",
};

function norm(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
    <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < step ? T.accent : T.border, transition: "background 0.3s" }} />
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
  const map = { fall: { bg: "#fef9ee", color: "#92400e" }, spring: { bg: T.greenBg, color: T.green }, double: { bg: "#f0f0fd", color: "#4338ca" } };
  const c = map[semester] || map.double;
  return <span style={{ background: c.bg, color: c.color, fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{SEMESTER_LABELS[semester] || semester}</span>;
}

function SemButton({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  const on = active || hovered;
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ padding: "11px 6px", fontSize: 13, fontWeight: on ? 600 : 400, background: on ? T.accent : "transparent", color: on ? T.accentFg : T.muted, border: `1px solid ${on ? T.accent : T.border}`, borderRadius: T.radius, cursor: "pointer", transition: "all 0.12s" }}>
      {label}
    </button>
  );
}

const LOOKING_LABELS = { coloc: "Coloc", amis: "Amis", conseils: "Conseils", activites: "Activités" };

function StudentCard({ student }) {
  const initials = (student.firstName[0] + student.lastName[0]).toUpperCase();
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: "14px 16px", boxShadow: T.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: (student.whatsapp || student.lookingFor?.length > 0) ? 12 : 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.bgHover, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, color: T.muted, flexShrink: 0 }}>{initials}</div>
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
            <span key={lf} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: T.bgHover, color: T.muted, border: `1px solid ${T.border}` }}>{LOOKING_LABELS[lf] || lf}</span>
          ))}
        </div>
      )}
      {student.whatsapp && (
        <a href={`https://wa.me/${student.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px", background: "#25D366", color: "#fff", borderRadius: T.radius, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          Contacter sur WhatsApp
        </a>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [regStep, setRegStep] = useState(1);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", destQuery: "", destination: null, semester: "fall", lookingFor: [], countryCode: "+33", whatsappNumber: "", consent: false });
  const [verifCode, setVerifCode] = useState("");
  const [verifError, setVerifError] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [registered, setRegistered] = useState(null);
  const [matches, setMatches] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentsFromDB().then(data => setAllStudents(mapStudents(data))).catch(() => {});
  }, []);

  function mapStudents(data) {
    return data.map(s => ({
      id: s.id, firstName: s.first_name, lastName: s.last_name,
      email: s.email, whatsapp: s.whatsapp, semester: s.semester,
      lookingFor: s.looking_for ? s.looking_for.split(",") : [],
      destination: { school: s.school, city: s.city, country: s.country },
    }));
  }

  const stats = { total: allStudents.length, countries: new Set(allStudents.map(s => s.destination.country)).size };

  function previewCount(dest) {
    if (!dest) return 0;
    return allStudents.filter(s => s.destination.school === dest.school).length;
  }

  function step1Valid() { return form.firstName.trim() && form.lastName.trim() && form.email.endsWith(DOMAIN) && form.consent; }
  function step2Valid() { return !!form.destination; }

  async function sendVerifCode() {
    setLoading(true); setVerifError("");
    try {
      const res = await fetch("/api/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) });
      const data = await res.json();
      if (!res.ok) { setVerifError(data.error); setLoading(false); return; }
      setScreen("verify");
    } catch { setVerifError("Erreur réseau. Réessaie."); }
    setLoading(false);
  }

  async function verifyCode() {
    setLoading(true); setVerifError("");
    try {
      const res = await fetch("/api/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, code: verifCode }) });
      const data = await res.json();
      if (!res.ok) { setVerifError(data.error); setLoading(false); return; }
      setScreen("destination");
    } catch { setVerifError("Erreur réseau. Réessaie."); }
    setLoading(false);
  }

  async function handleSubmit() {
    setError(""); setLoading(true);
    try {
      await insertStudent(form);
      const data = await getStudentsFromDB();
      const students = mapStudents(data);
      setAllStudents(students);
      const me = students.find(s => s.email.toLowerCase() === form.email.toLowerCase());
      const matchData = await getStudentsWithWhatsapp(form.destination.school);
      const matchStudents = mapStudents(matchData);
      const myMatches = matchStudents.filter(s => s.email.toLowerCase() !== form.email.toLowerCase());
      setRegistered(me);
      setMatches(myMatches);
      if (myMatches.length > 0) {
        fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newStudent: me, matches: myMatches }) }).catch(() => {});
      }
      setScreen("matches");
    } catch (e) {
      setError(e.message || "Une erreur est survenue.");
    }
    setLoading(false);
  }

  async function handleLookup() {
    setError(""); setLoading(true);
    try {
      const data = await getStudentsFromDB();
      const students = mapStudents(data);
      setAllStudents(students);
      const me = students.find(s => s.email.toLowerCase() === lookupEmail.toLowerCase().trim());
      if (!me) { setError("Email introuvable. Vérifie ou inscris-toi."); setLoading(false); return; }
      const matchData = await getStudentsWithWhatsapp(me.destination.school);
      const matchStudents = mapStudents(matchData);
      setRegistered(me);
      setMatches(matchStudents.filter(s => s.email.toLowerCase() !== me.email.toLowerCase()));
      setScreen("matches");
    } catch { setError("Une erreur est survenue."); }
    setLoading(false);
  }

  // ── HOME ──
  if (screen === "home") return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 99, padding: "4px 12px", marginBottom: 24, boxShadow: T.shadow }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>emlyon GBBA · 2026–2027</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: T.text, margin: "0 0 12px", lineHeight: 1.15, letterSpacing: "-0.5px" }}>Tu pars où en échange ?</h1>
          <p style={{ fontSize: 16, color: T.muted, margin: 0, lineHeight: 1.6 }}>Découvre qui part à la même destination que toi. En 30 secondes.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
          {[{ value: stats.total, label: "étudiants inscrits" }, { value: stats.countries, label: "pays représentés" }].map(({ value, label }) => (
            <div key={label} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: "16px", textAlign: "center", boxShadow: T.shadow }}>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: "-0.5px" }}>{value}</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: T.muted }}>{label}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => { setRegStep(1); setScreen("register"); }} style={{ padding: "14px", background: T.accent, color: T.accentFg, border: "none", borderRadius: T.radius, fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%" }}>
            Trouver mes matchs →
          </button>
          <button onClick={() => setScreen("lookup")} style={{ padding: "13px", background: "transparent", color: T.text, border: `1px solid ${T.border}`, borderRadius: T.radius, fontSize: 14, cursor: "pointer", width: "100%" }}>
            J'ai déjà un compte
          </button>
        </div>
        <p style={{ marginTop: 24, fontSize: 12, color: T.faint, textAlign: "center" }}>
          140 universités partenaires dans {stats.countries} pays ·{" "}
          <span onClick={() => setScreen("privacy")} style={{ textDecoration: "underline", cursor: "pointer" }}>Confidentialité</span>
        </p>
      </div>
    </div>
  );

  // ── REGISTER ──
  if (screen === "register") return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <button onClick={() => { if (regStep === 1) setScreen("home"); else setRegStep(s => s - 1); setError(""); setVerifError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "0 0 24px", display: "flex", alignItems: "center", gap: 4 }}>
          ← {regStep === 1 ? "Retour" : "Étape précédente"}
        </button>
        <ProgressBar step={regStep} total={4} />

        {regStep === 1 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Étape 1 sur 4</p>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: T.text, margin: "0 0 6px", letterSpacing: "-0.3px" }}>C'est qui toi ?</h2>
            <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>Utilise ton adresse email emlyon.</p>
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
              {error && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{error}</p>}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", background: T.bgHover, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
                <input type="checkbox" checked={form.consent} onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))} style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: "pointer" }} />
                <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                  J'accepte que mes données (nom, email, destination, WhatsApp) soient partagées uniquement avec les étudiants emlyon partant à la même destination.{" "}
                  <span onClick={e => { e.preventDefault(); setScreen("privacy"); }} style={{ color: T.text, textDecoration: "underline", cursor: "pointer" }}>Politique de confidentialité</span>
                </span>
              </label>
              <button onClick={(e) => { e.preventDefault(); setError(""); if (!form.firstName.trim() || !form.lastName.trim()) { setError("Entre ton prénom et ton nom."); return; } if (!form.email.endsWith(DOMAIN)) { setError("Utilise ton adresse @edu.em-lyon.com"); return; } if (!form.consent) { setError("Tu dois accepter les conditions pour continuer."); return; } setError(""); sendVerifCode(); }}
                disabled={!step1Valid() || loading}
                style={{ padding: "13px", background: step1Valid() ? T.accent : T.border, color: step1Valid() ? T.accentFg : T.faint, border: "none", borderRadius: T.radius, fontSize: 15, fontWeight: 600, cursor: step1Valid() ? "pointer" : "not-allowed", width: "100%", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Envoi du code…" : "Vérifier mon email →"}
              </button>
            </div>
          </div>
        )}

        {regStep === 2 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Étape 2 sur 4</p>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: T.text, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Vérifie ton email</h2>
            <p style={{ fontSize: 14, color: T.muted, margin: "0 0 6px" }}>On a envoyé un code à 4 chiffres à</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "0 0 28px" }}>{form.email}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="text" inputMode="numeric" maxLength={4} placeholder="_ _ _ _" value={verifCode}
                onChange={e => setVerifCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={e => e.key === "Enter" && verifCode.length === 4 && verifyCode()}
                autoFocus style={{ ...inputStyle, fontSize: 28, fontWeight: 700, letterSpacing: 16, textAlign: "center" }} />
              {verifError && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{verifError}</p>}
              <button onClick={verifyCode} disabled={loading || verifCode.length !== 4}
                style={{ padding: "13px", background: verifCode.length === 4 ? T.accent : T.border, color: verifCode.length === 4 ? T.accentFg : T.faint, border: "none", borderRadius: T.radius, fontSize: 15, fontWeight: 600, cursor: verifCode.length === 4 ? "pointer" : "not-allowed", width: "100%", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Vérification…" : "Confirmer →"}
              </button>
              <button onClick={() => { setVerifCode(""); sendVerifCode(); }} disabled={loading}
                style={{ padding: "10px", background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: T.radius, fontSize: 13, cursor: "pointer", width: "100%" }}>
                Renvoyer le code
              </button>
            </div>
          </div>
        )}

        {regStep === 3 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Étape 3 sur 4</p>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: T.text, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Tu pars où ?</h2>
            <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>Tape le pays, la ville ou le nom de l'école.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <DestSearch value={form.destQuery} onChange={v => setForm(f => ({ ...f, destQuery: v, destination: null }))} onSelect={d => setForm(f => ({ ...f, destQuery: `${d.school} – ${d.city}`, destination: d }))} />
              {form.destination && (() => { const count = previewCount(form.destination); return (
                <div style={{ padding: "12px 14px", background: count > 0 ? T.greenBg : T.bgHover, borderRadius: T.radius, border: `1px solid ${count > 0 ? "#bbf7d0" : T.border}` }}>
                  {count > 0 ? (
                    <div>
                      <p style={{ margin: "0 0 10px", fontSize: 13, color: T.green, fontWeight: 600 }}>{count} étudiant{count > 1 ? "s" : ""} déjà inscrit{count > 1 ? "s" : ""}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {allStudents.filter(s => s.destination.school === form.destination.school).slice(0, 5).map((s, i) => (
                          <div key={i} style={{ width: 34, height: 34, borderRadius: "50%", background: T.bgHover, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: T.muted, filter: "blur(4px)", border: `2px solid ${T.bgCard}` }}>
                            {(s.firstName[0] + s.lastName[0]).toUpperCase()}
                          </div>
                        ))}
                        {count > 5 && <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: T.muted }}>+{count - 5}</div>}
                      </div>
                      <p style={{ margin: "8px 0 0", fontSize: 12, color: T.green }}>Inscris-toi pour voir leurs profils →</p>
                    </div>
                  ) : <p style={{ margin: 0, fontSize: 13, color: T.muted, fontWeight: 500 }}>Tu seras le premier pour cette destination !</p>}
                </div>
              ); })()}
              <div>
                <p style={{ fontSize: 13, color: T.muted, margin: "0 0 10px" }}>Je cherche (optionnel)</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[["coloc", "Une coloc"], ["amis", "Des amis"], ["conseils", "Des conseils"], ["activites", "Des activités"]].map(([val, label]) => {
                    const active = form.lookingFor.includes(val);
                    return <button key={val} onClick={() => setForm(f => ({ ...f, lookingFor: active ? f.lookingFor.filter(x => x !== val) : [...f.lookingFor, val] }))} style={{ padding: "8px 14px", fontSize: 13, borderRadius: 99, background: active ? T.accent : "transparent", color: active ? T.accentFg : T.muted, border: `1px solid ${active ? T.accent : T.border}`, cursor: "pointer", transition: "all 0.12s" }}>{label}</button>;
                  })}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 13, color: T.muted, margin: "0 0 10px" }}>Semestre</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[["fall", "Fall"], ["spring", "Spring"], ["double", "Double diplôme"]].map(([val, label]) => (
                    <SemButton key={val} label={label} active={form.semester === val} onClick={() => setForm(f => ({ ...f, semester: val }))} />
                  ))}
                </div>
              </div>
              <button onClick={() => step2Valid() && setScreen("whatsapp")} disabled={!step2Valid()}
                style={{ padding: "13px", background: step2Valid() ? T.accent : T.border, color: step2Valid() ? T.accentFg : T.faint, border: "none", borderRadius: T.radius, fontSize: 15, fontWeight: 600, cursor: step2Valid() ? "pointer" : "not-allowed", width: "100%" }}>
                Continuer →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  // ── WHATSAPP (étape 4 isolée pour Safari) ──
  if (screen === "whatsapp") return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <button onClick={() => setScreen("register")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "0 0 24px", display: "flex", alignItems: "center", gap: 4 }}>
          ← Étape précédente
        </button>
        <ProgressBar step={4} total={4} />
        <p style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Étape 4 sur 4</p>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: T.text, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Ton WhatsApp</h2>
        <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>Obligatoire — tes matchs pourront te contacter directement.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Ton numéro (avec indicatif si hors France)</p>
          <input
            type="text"
            placeholder="+33 6 12 34 56 78"
            value={form.whatsappNumber}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
            style={inputStyle}
          />
          {error && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{error}</p>}
          <button
            onClick={() => { if (!form.whatsappNumber.trim()) { setError("Entre ton numéro WhatsApp pour continuer."); return; } handleSubmit(); }}
            disabled={loading}
            style={{ padding: "13px", background: form.whatsappNumber.trim() ? T.accent : T.border, color: form.whatsappNumber.trim() ? T.accentFg : T.faint, border: "none", borderRadius: T.radius, fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", opacity: loading ? 0.7 : 1, transition: "all 0.15s" }}
          >
            {loading ? "Inscription en cours…" : "Voir mes matchs →"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── LOOKUP ──
  if (screen === "lookup") return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <button onClick={() => { setScreen("home"); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "0 0 32px", display: "flex", alignItems: "center", gap: 4 }}>← Retour</button>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: T.text, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Retrouver mes matchs</h2>
        <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>Entre l'adresse avec laquelle tu t'es inscrit.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <EmailInput value={lookupEmail} onChange={setLookupEmail} onEnter={handleLookup} />
          {error && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{error}</p>}
          <button onClick={handleLookup} disabled={loading || !lookupEmail.includes("@")}
            style={{ padding: "13px", background: T.accent, color: T.accentFg, border: "none", borderRadius: T.radius, fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", opacity: (loading || !lookupEmail.includes("@")) ? 0.5 : 1 }}>
            {loading ? "Recherche…" : "Voir mes matchs →"}
          </button>
          <button onClick={() => { setRegStep(1); setScreen("register"); }} style={{ padding: "12px", background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: T.radius, fontSize: 13, cursor: "pointer", width: "100%" }}>
            Pas encore inscrit ? S'inscrire
          </button>
        </div>
      </div>
    </div>
  );

  // ── MATCHES ──
  if (screen === "matches" && registered) return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "0 0 24px", display: "flex", alignItems: "center", gap: 4 }}>← Accueil</button>
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: "16px 18px", marginBottom: 24, boxShadow: T.shadow }}>
          <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em" }}>Ta destination</p>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16, color: T.text }}>{registered.destination.school}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: T.muted }}>{registered.destination.city} · {registered.destination.country}</span>
            <SemBadge semester={registered.semester} />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: "0 0 4px", letterSpacing: "-0.2px" }}>
            {matches.length === 0 ? "Aucun match pour l'instant" : `${matches.length} match${matches.length > 1 ? "s" : ""} trouvé${matches.length > 1 ? "s" : ""}`}
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: T.muted }}>
            {matches.length === 0 ? "Partage l'app à tes amis pour trouver des camarades." : "Des étudiants qui partent au même endroit que toi."}
          </p>
        </div>
        {matches.length === 0 ? (
          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: "32px 20px", textAlign: "center", boxShadow: T.shadow }}>
            <p style={{ margin: 0, fontSize: 14, color: T.muted, lineHeight: 1.6 }}>Tu seras le premier à cette destination.<br />Reviens bientôt !</p>
            <button onClick={() => { if (navigator.share) navigator.share({ title: "Tu pars où en échange ?", text: "Trouve qui part en échange avec toi !", url: "https://tu-pars-ou.vercel.app" }); }}
              style={{ marginTop: 16, padding: "10px 20px", background: T.accent, color: T.accentFg, border: "none", borderRadius: T.radius, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Partager l'app
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {matches.map(s => <StudentCard key={s.id} student={s} />)}
          </div>
        )}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 12, color: T.faint, marginBottom: 12, textAlign: "center" }}>
            Tes données sont partagées uniquement avec tes matchs.{" "}
            <span onClick={() => setScreen("privacy")} style={{ textDecoration: "underline", cursor: "pointer" }}>Politique de confidentialité</span>
          </p>
          <button onClick={async () => {
            if (!window.confirm("Supprimer ton inscription ? Cette action est irréversible.")) return;
            try {
              await sbFetch(`students?email=eq.${encodeURIComponent(registered.email)}`, { method: "DELETE" });
              setRegistered(null); setMatches([]); setScreen("home");
            } catch { alert("Erreur lors de la suppression. Contacte [adresse à compléter]"); }
          }} style={{ width: "100%", padding: "10px", background: "transparent", color: T.red, border: `1px solid ${T.red}20`, borderRadius: T.radius, fontSize: 13, cursor: "pointer" }}>
            Supprimer mon inscription
          </button>
        </div>
      </div>
    </div>
  );

  // ── PRIVACY ──
  if (screen === "privacy") return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <button onClick={() => setScreen(registered ? "matches" : "home")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "0 0 32px", display: "flex", alignItems: "center", gap: 4 }}>← Retour</button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Politique de confidentialité</h1>
        <p style={{ fontSize: 13, color: T.faint, margin: "0 0 32px" }}>Dernière mise à jour : juillet 2026</p>
        {[
          { title: "Qui sommes-nous ?", content: "Tu pars où en échange ? est une application étudiante créée par des étudiants emlyon pour les étudiants emlyon partant en échange académique. Ce projet n'est pas affilié officiellement à emlyon business school." },
          { title: "Quelles données collectons-nous ?", content: "Lors de ton inscription, nous collectons : ton prénom et nom, ton adresse email @edu.em-lyon.com, ta destination d'échange (école, ville, pays), ton semestre, et ton numéro WhatsApp." },
          { title: "Pourquoi collectons-nous ces données ?", content: "Uniquement pour te mettre en relation avec d'autres étudiants emlyon partant à la même destination. Aucune donnée n'est utilisée à des fins commerciales ou transmise à des tiers." },
          { title: "Qui peut voir mes données ?", content: "Seuls les étudiants emlyon inscrits sur la plateforme partant à la même destination que toi peuvent voir ton nom et ton numéro WhatsApp. Ton email n'est jamais affiché publiquement." },
          { title: "Combien de temps garde-t-on tes données ?", content: "Tes données sont conservées jusqu'à la fin de l'année académique 2026-2027, ou jusqu'à ce que tu demandes leur suppression." },
          { title: "Tes droits (RGPD)", content: "Tu as le droit d'accéder à tes données, de les corriger, et de les supprimer à tout moment via le bouton 'Supprimer mon inscription' sur ta page de matchs. Pour toute question, contacte : [adresse à compléter]" },
          { title: "Sécurité", content: "Les données sont stockées sur Supabase (infrastructure sécurisée basée en Europe). Ton numéro WhatsApp n'est visible que par les étudiants qui partagent ta destination." },
        ].map(({ title, content }) => (
          <div key={title} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 6px" }}>{title}</h2>
            <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, margin: 0 }}>{content}</p>
          </div>
        ))}
        <div style={{ padding: "14px 16px", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius, marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Contact RGPD : <strong>[adresse à compléter]</strong></p>
        </div>
      </div>
    </div>
  );

  return null;
}
