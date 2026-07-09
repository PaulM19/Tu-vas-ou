import { useState, useRef, useEffect } from "react";

const SUPABASE_URL = "https://fckolgfthpkjmtviysba.supabase.co";
const SUPABASE_KEY = "sb_publishable_nX8bK2lPKzaRBWzuGut5JQ_yyiSgE-8";

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function getStudentsFromDB() {
  return await sbFetch("students?select=*&order=created_at.asc") || [];
}

async function insertStudent(student) {
  return await sbFetch("students", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      first_name: student.firstName,
      last_name: student.lastName,
      email: student.email,
      whatsapp: student.whatsappNumber ? `${student.countryCode || "+33"}${student.whatsappNumber.replace(/^0/, "")}` : null,
      semester: student.semester,
      school: student.destination.school,
      city: student.destination.city,
      country: student.destination.country,
    }),
  });
}

const DESTINATIONS = [
  { country: "Allemagne", city: "Francfort", school: "Frankfurt School of Finance & Management" },
  { country: "Allemagne", city: "Würzburg", school: "University of Würzburg" },
  { country: "Allemagne", city: "Munich", school: "Ludwig-Maximilians-Universität München" },
  { country: "Allemagne", city: "Munich", school: "Munich Business School" },
  { country: "Allemagne", city: "Munich", school: "TUM School of Management" },
  { country: "Allemagne", city: "Münster", school: "Westfälische Wilhelms-Universität Münster" },
  { country: "Allemagne", city: "Mannheim", school: "Universität Mannheim Business School" },
  { country: "Allemagne", city: "Cologne", school: "University of Cologne" },
  { country: "Allemagne", city: "Vallendar", school: "WHU – Otto Beisheim School of Management" },
  { country: "Allemagne", city: "Oestrich-Winkel", school: "EBS Business School" },
  { country: "Argentine", city: "Buenos Aires", school: "Universidad Austral" },
  { country: "Argentine", city: "Buenos Aires", school: "Universidad del CEMA" },
  { country: "Argentine", city: "Buenos Aires", school: "Universidad Torcuato Di Tella" },
  { country: "Autriche", city: "Innsbruck", school: "MCI Management Center Innsbruck" },
  { country: "Autriche", city: "Vienne", school: "WU Wirtschaftsuniversität Wien" },
  { country: "Belgique", city: "Louvain", school: "Katholieke Universiteit Leuven" },
  { country: "Belgique", city: "Liège", school: "Université de Liège" },
  { country: "Brésil", city: "São Paulo", school: "Insper – Instituto de Ensino e Pesquisa" },
  { country: "Bulgarie", city: "Sofia", school: "Sofia University St. Kliment Ohridski" },
  { country: "Cambodge", city: "Phnom Penh", school: "NUM National University of Management" },
  { country: "Canada", city: "Ottawa", school: "Carleton University" },
  { country: "Canada", city: "Halifax", school: "Dalhousie University" },
  { country: "Canada", city: "Montréal", school: "ESG UQAM" },
  { country: "Canada", city: "Toronto", school: "Glendon College, York University" },
  { country: "Canada", city: "Calgary", school: "Haskayne Business School, Calgary University" },
  { country: "Canada", city: "Kingston", school: "Smith School of Business, Queen's University" },
  { country: "Canada", city: "Sherbrooke", school: "Université de Sherbrooke" },
  { country: "Canada", city: "Rimouski", school: "Université du Québec à Rimouski" },
  { country: "Canada", city: "Saskatoon", school: "University of Saskatchewan, Edwards School of Business" },
  { country: "Canada", city: "Victoria", school: "University of Victoria" },
  { country: "Canada", city: "Toronto", school: "York University, Schulich School of Business" },
  { country: "Chili", city: "Santiago", school: "Universidad Adolfo Ibáñez" },
  { country: "Chili", city: "Santiago", school: "Universidad de Chile" },
  { country: "Chili", city: "Santiago", school: "Universidad de los Andes" },
  { country: "Chine", city: "Shenzhen", school: "Chinese University of Hong Kong – Shenzhen" },
  { country: "Chine", city: "Shanghai", school: "emlyon campus Shanghai" },
  { country: "Chine", city: "Pékin", school: "Renmin University" },
  { country: "Chine", city: "Shanghai", school: "SILC" },
  { country: "Chine", city: "Shanghai", school: "Tongji University" },
  { country: "Chine", city: "Hangzhou", school: "Zhejiang University" },
  { country: "Corée du Sud", city: "Séoul", school: "Hankuk University of Foreign Studies (HUFS)" },
  { country: "Corée du Sud", city: "Daegu", school: "Kyungpook National University" },
  { country: "Corée du Sud", city: "Séoul", school: "Seoul National University" },
  { country: "Corée du Sud", city: "Séoul", school: "Sungkyunkwan University" },
  { country: "Croatie", city: "Zagreb", school: "University of Zagreb, Faculty of Economics and Business" },
  { country: "Croatie", city: "Zagreb", school: "Zagreb School of Economics and Management" },
  { country: "Danemark", city: "Copenhague", school: "Copenhagen Business School" },
  { country: "Égypte", city: "Le Caire", school: "American University in Cairo (AUC)" },
  { country: "Espagne", city: "Bilbao / Madrid", school: "Deusto Business School" },
  { country: "Espagne", city: "Madrid", school: "ESIC Business and Marketing School" },
  { country: "Espagne", city: "Madrid", school: "IE Universidad" },
  { country: "Espagne", city: "Madrid", school: "Universidad Carlos III" },
  { country: "Espagne", city: "Grenade", school: "Universidad de Granada" },
  { country: "Espagne", city: "Pamplona", school: "Universidad de Navarra" },
  { country: "Espagne", city: "Salamanque", school: "Universidad de Salamanca" },
  { country: "Espagne", city: "Valence", school: "Universidad de Valencia" },
  { country: "Espagne", city: "Barcelone", school: "Universitat Pompeu Fabra" },
  { country: "Estonie", city: "Tallinn", school: "Tallinn University of Technology" },
  { country: "États-Unis", city: "Worcester (MA)", school: "Clark University" },
  { country: "États-Unis", city: "Murray (KY)", school: "Murray State University" },
  { country: "États-Unis", city: "Dartmouth (MA)", school: "University of Massachusetts Dartmouth" },
  { country: "États-Unis", city: "Portland (OR)", school: "University of Portland" },
  { country: "États-Unis", city: "Columbia (SC)", school: "University of South Carolina, Darla Moore School of Business" },
  { country: "États-Unis", city: "Bowling Green (KY)", school: "Western Kentucky University (WKU)" },
  { country: "Finlande", city: "Helsinki", school: "Aalto University School of Business" },
  { country: "Finlande", city: "Turku", school: "Åbo Akademi" },
  { country: "Finlande", city: "Helsinki", school: "Hanken School of Economics" },
  { country: "Grèce", city: "Athènes", school: "Athens University of Economics and Business" },
  { country: "Hong Kong", city: "Hong Kong", school: "City University of Hong Kong" },
  { country: "Hong Kong", city: "Hong Kong", school: "Hong Kong Baptist University" },
  { country: "Hong Kong", city: "Hong Kong", school: "Lingnan University" },
  { country: "Inde", city: "Indore", school: "IIM Indore" },
  { country: "Inde", city: "Sonipat", school: "O.P. Jindal Global University" },
  { country: "Indonésie", city: "Jakarta", school: "Binus University" },
  { country: "Indonésie", city: "Jakarta", school: "IPMI International Business School" },
  { country: "Irlande", city: "Limerick", school: "University of Limerick, Kemmy Business School" },
  { country: "Italie", city: "Venise", school: "Cà Foscari, University of Venice" },
  { country: "Italie", city: "Rome", school: "Luiss Università Guido Carli" },
  { country: "Italie", city: "Milan", school: "Politecnico di Milano" },
  { country: "Italie", city: "Milan", school: "Università Bocconi" },
  { country: "Italie", city: "Milan", school: "Università Cattolica del Sacro Cuore" },
  { country: "Italie", city: "Brescia", school: "Università degli Studi di Brescia" },
  { country: "Italie", city: "Trente", school: "Università degli Studi di Trento" },
  { country: "Japon", city: "Nagoya", school: "Nagoya University of Commerce and Business" },
  { country: "Japon", city: "Tokyo", school: "Waseda University" },
  { country: "Kazakhstan", city: "Almaty", school: "Almaty Management University" },
  { country: "Lettonie", city: "Riga", school: "Stockholm School of Economics in Riga (SSE Riga)" },
  { country: "Lituanie", city: "Vilnius", school: "ISM University of Management and Economics" },
  { country: "Malaisie", city: "Kuala Lumpur", school: "Universiti Kebangsaan Malaysia" },
  { country: "Maroc", city: "Ifrane", school: "Al Akhawayn University" },
  { country: "Maroc", city: "Benguerir", school: "Mohammed VI Polytechnic University (UM6P)" },
  { country: "Maroc", city: "Rabat", school: "Rabat Business School" },
  { country: "Mexique", city: "Mexico", school: "Anáhuac México University" },
  { country: "Mexique", city: "Monterrey", school: "Tecnológico de Monterrey" },
  { country: "Mexique", city: "Puebla", school: "Universidad de las Américas" },
  { country: "Pays-Bas", city: "Rotterdam", school: "Erasmus University, Rotterdam School of Management" },
  { country: "Pays-Bas", city: "Maastricht", school: "Maastricht University" },
  { country: "Pays-Bas", city: "Amsterdam", school: "University of Amsterdam, Economics and Business" },
  { country: "Pays-Bas", city: "Groningue", school: "University of Groningen" },
  { country: "Pérou", city: "Lima", school: "Universidad del Pacifico" },
  { country: "Pérou", city: "Lima", school: "Universidad ESAN" },
  { country: "Philippines", city: "Manille", school: "Ateneo de Manila University" },
  { country: "Pologne", city: "Varsovie", school: "Kozminski University" },
  { country: "Pologne", city: "Varsovie", school: "SGH Warsaw School of Economics" },
  { country: "Portugal", city: "Lisbonne", school: "ISEG – Lisbon School of Economics & Management" },
  { country: "Portugal", city: "Lisbonne", school: "Nova University Lisbon" },
  { country: "Portugal", city: "Lisbonne", school: "Universidade Católica Portuguesa, Lisbon" },
  { country: "Portugal", city: "Porto", school: "Católica Porto Business School" },
  { country: "République tchèque", city: "Prague", school: "Faculty of Social Sciences, Charles University" },
  { country: "République tchèque", city: "Prague", school: "Prague University of Economics and Business (VSE)" },
  { country: "Roumanie", city: "Bucarest", school: "The Bucharest University of Economic Studies" },
  { country: "Royaume-Uni", city: "Birmingham", school: "Aston University" },
  { country: "Royaume-Uni", city: "Belfast", school: "Queen's Business School" },
  { country: "Royaume-Uni", city: "Londres", school: "The London Interdisciplinary School" },
  { country: "Sénégal", city: "Dakar", school: "ISM Dakar" },
  { country: "Singapour", city: "Singapour", school: "Singapore Management University" },
  { country: "Slovaquie", city: "Bratislava", school: "University of Economics in Bratislava" },
  { country: "Slovénie", city: "Ljubljana", school: "University of Ljubljana" },
  { country: "Slovénie", city: "Maribor", school: "University of Maribor" },
  { country: "Suède", city: "Stockholm", school: "Stockholm School of Economics" },
  { country: "Suède", city: "Linköping", school: "Linköping University" },
  { country: "Suède", city: "Lund", school: "Lund University" },
  { country: "Suède", city: "Stockholm", school: "Stockholm University, Stockholm Business School" },
  { country: "Suisse", city: "Bâle", school: "University of Applied Sciences Northwestern Switzerland (FHNW)" },
  { country: "Suisse", city: "Saint-Gall", school: "University of St. Gallen" },
  { country: "Taïwan", city: "Taipei", school: "National Chengchi University" },
  { country: "Taïwan", city: "Chiayi", school: "National Chung Cheng University, College of Management" },
  { country: "Taïwan", city: "Kaohsiung", school: "National Sun Yat-Sen University" },
  { country: "Taïwan", city: "Taipei", school: "National Taiwan University" },
  { country: "Thaïlande", city: "Bangkok", school: "Chulalongkorn Business School" },
  { country: "Thaïlande", city: "Bangkok", school: "Thammasat Business School" },
  { country: "Tunisie", city: "Tunis", school: "Esprit School of Business (ESB)" },
  { country: "Turquie", city: "Istanbul", school: "Bogazici University" },
  { country: "Turquie", city: "Istanbul", school: "Koç University" },
  { country: "Turquie", city: "Istanbul", school: "Ozyegin University (OzU)" },
  { country: "Uruguay", city: "Montevideo", school: "Universidad Católica del Uruguay" },
  { country: "Uruguay", city: "Montevideo", school: "Universidad de Montevideo" },
  { country: "Uruguay", city: "Montevideo", school: "Universidad ORT" },
  { country: "Vietnam", city: "Hô Chi Minh-Ville", school: "Ton Duc Thang University" },
  { country: "Vietnam", city: "Hanoï", school: "VinUniversity" },
];

const SEMESTER_LABELS = { fall: "Fall", spring: "Spring", both: "Fall & Spring" };

function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getMatches(query) {
  if (!query || query.length < 2) return [];
  const q = normalize(query);
  return DESTINATIONS.filter(d =>
    normalize(d.country).includes(q) ||
    normalize(d.city).includes(q) ||
    normalize(d.school).includes(q)
  ).slice(0, 8);
}

function formatPhone(raw) {
  return raw.replace(/\s/g, "");
}

function DestinationSearch({ value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const results = getMatches(value);
  const ref = useRef(null);

  useEffect(() => {
    setHighlighted(0);
    setOpen(results.length > 0 && value.length >= 2);
  }, [value]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKey(e) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && results[highlighted]) { e.preventDefault(); onSelect(results[highlighted]); setOpen(false); }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        type="text"
        placeholder="Tapez un pays, une ville ou une école…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        onFocus={() => results.length > 0 && value.length >= 2 && setOpen(true)}
        style={{ width: "100%", boxSizing: "border-box" }}
        autoComplete="off"
      />
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-lg)",
          zIndex: 100, overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)"
        }}>
          {results.map((d, i) => (
            <div
              key={i}
              onMouseDown={() => { onSelect(d); setOpen(false); }}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: "10px 14px",
                background: i === highlighted ? "var(--color-background-secondary)" : "transparent",
                cursor: "pointer",
                display: "flex", alignItems: "baseline", gap: "8px",
                borderBottom: i < results.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none"
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", flex: "0 0 auto" }}>
                {d.school}
              </span>
              <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                {d.city} · {d.country}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailInput({ value, onChange, placeholder }) {
  const DOMAIN = "@edu.em-lyon.com";
  const showSuggestion = value.includes("@") && !value.includes(".") && DOMAIN.startsWith("@" + value.split("@")[1]);
  const showPill = value.length > 0 && !value.includes("@");
  const inputRef = useRef(null);

  function handleKey(e) {
    if ((e.key === "Tab" || e.key === "ArrowRight" || e.key === "Enter") && showSuggestion) {
      e.preventDefault();
      onChange(value.split("@")[0] + DOMAIN);
    }
    if (e.key === "Tab" && showPill) {
      e.preventDefault();
      onChange(value + DOMAIN);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        style={{ width: "100%", boxSizing: "border-box" }}
        autoComplete="off"
        autoCapitalize="none"
      />
      {showPill && (
        <div
          onClick={() => { onChange(value + DOMAIN); inputRef.current?.focus(); }}
          style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            background: "var(--color-background-info)", color: "var(--color-text-info)",
            fontSize: 12, padding: "3px 8px", borderRadius: "var(--border-radius-md)",
            cursor: "pointer", userSelect: "none", whiteSpace: "nowrap"
          }}
        >
          {value + DOMAIN}
        </div>
      )}
    </div>
  );
}

function SemesterBadge({ semester }) {
  const colors = {
    fall:   { bg: "var(--color-background-warning)", color: "var(--color-text-warning)" },
    spring: { bg: "var(--color-background-success)", color: "var(--color-text-success)" },
    both:   { bg: "var(--color-background-info)",    color: "var(--color-text-info)" },
  };
  const c = colors[semester] || colors.both;
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: 11, padding: "2px 7px",
      borderRadius: "var(--border-radius-md)",
      fontWeight: 500, whiteSpace: "nowrap"
    }}>
      {SEMESTER_LABELS[semester] || semester}
    </span>
  );
}

function StudentCard({ student }) {
  const initials = student.firstName[0] + student.lastName[0];
  const waNumber = formatPhone(student.whatsapp || "");
  const sameSchool = true;

  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      padding: "1rem 1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: student.whatsapp ? 10 : 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "var(--color-background-info)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 500, fontSize: 14, color: "var(--color-text-info)", flexShrink: 0
        }}>{initials.toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: "var(--color-text-primary)" }}>
              {student.firstName} {student.lastName}
            </p>
            <SemesterBadge semester={student.semester} />
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {student.destination.school} · {student.destination.city}
          </p>
        </div>
      </div>
      {student.whatsapp && (
        <a
          href={`https://wa.me/${waNumber.replace("+", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", padding: "8px", boxSizing: "border-box",
            background: "#25D366", color: "#fff",
            borderRadius: "var(--border-radius-md)",
            fontSize: 13, fontWeight: 500, textDecoration: "none",
            border: "none", cursor: "pointer"
          }}
        >
          <i className="ti ti-brand-whatsapp" style={{ fontSize: 16 }} aria-hidden="true"></i>
          Contacter sur WhatsApp
        </a>
      )}
    </div>
  );
}

const STEPS = { HOME: "home", REGISTER: "register", MATCHES: "matches", LOOKUP: "lookup", DIRECTORY: "directory", GUIDE: "guide" };

function DestinationGuide({ destination, onBack }) {
  const [status, setStatus] = useState("idle");
  const [sections, setSections] = useState(null);
  const [error, setError] = useState("");

  async function generate() {
    setStatus("loading");
    setError("");
    try {
      const prompt = `Tu es un conseiller expert pour les étudiants en échange universitaire. 
Génère une fiche pratique concise pour un étudiant emlyon qui part à ${destination.school} à ${destination.city}, ${destination.country}.

Réponds UNIQUEMENT en JSON valide, sans balises markdown, avec exactement cette structure :
{
  "budget": {
    "mensuel_estime": "fourchette en euros",
    "loyer": "prix moyen chambre/studio",
    "nourriture": "budget alimentaire mensuel",
    "transport": "coût transport mensuel",
    "conseil": "un conseil budgétaire clé"
  },
  "logement": {
    "meilleur_moment": "quand chercher",
    "plateformes": ["plateforme 1", "plateforme 2", "plateforme 3"],
    "quartiers": ["quartier 1", "quartier 2"],
    "conseil": "un conseil logement clé"
  },
  "culture": {
    "a_savoir": ["info culturelle 1", "info culturelle 2", "info culturelle 3"],
    "langue": "langue principale + niveau anglais local",
    "a_faire": ["activité incontournable 1", "activité incontournable 2"],
    "conseil": "un conseil culturel clé"
  }
}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content.map(b => b.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      setSections(JSON.parse(clean));
      setStatus("done");
    } catch (e) {
      setError("Impossible de générer la fiche. Réessaie.");
      setStatus("idle");
    }
  }

  const sectionConfig = [
    {
      key: "budget",
      icon: "ti-coin",
      label: "Budget mensuel",
      render: (d) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[["Loyer", d.loyer], ["Nourriture", d.nourriture], ["Transport", d.transport]].map(([k, v]) => (
              <div key={k} style={{ background: "var(--color-background-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px" }}>
                <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>{k}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 12px", background: "var(--color-background-warning)", borderRadius: "var(--border-radius-md)" }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-warning)" }}>
              <strong>Budget estimé :</strong> {d.mensuel_estime} / mois
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <i className="ti ti-bulb" style={{ fontSize: 13, marginRight: 5, verticalAlign: "-1px" }} aria-hidden="true"></i>
            {d.conseil}
          </p>
        </div>
      )
    },
    {
      key: "logement",
      icon: "ti-home",
      label: "Logement",
      render: (d) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {d.plateformes.map(p => (
              <span key={p} style={{ background: "var(--color-background-info)", color: "var(--color-text-info)", fontSize: 12, padding: "3px 9px", borderRadius: "var(--border-radius-md)" }}>{p}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {d.quartiers.map(q => (
              <span key={q} style={{ background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", fontSize: 12, padding: "3px 9px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
                <i className="ti ti-map-pin" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true"></i>{q}
              </span>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <i className="ti ti-calendar" style={{ fontSize: 13, marginRight: 5, verticalAlign: "-1px" }} aria-hidden="true"></i>
            <strong>Quand chercher :</strong> {d.meilleur_moment}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <i className="ti ti-bulb" style={{ fontSize: 13, marginRight: 5, verticalAlign: "-1px" }} aria-hidden="true"></i>
            {d.conseil}
          </p>
        </div>
      )
    },
    {
      key: "culture",
      icon: "ti-world",
      label: "Culture & conseils",
      render: (d) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {d.a_savoir.map((info, i) => (
              <p key={i} style={{ margin: 0, fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.5, paddingLeft: 14, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: "var(--color-text-tertiary)" }}>·</span>
                {info}
              </p>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <i className="ti ti-language" style={{ fontSize: 13, marginRight: 5, verticalAlign: "-1px" }} aria-hidden="true"></i>
            {d.langue}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {d.a_faire.map(a => (
              <span key={a} style={{ background: "var(--color-background-success)", color: "var(--color-text-success)", fontSize: 12, padding: "3px 9px", borderRadius: "var(--border-radius-md)" }}>
                <i className="ti ti-star" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true"></i>{a}
              </span>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <i className="ti ti-bulb" style={{ fontSize: 13, marginRight: 5, verticalAlign: "-1px" }} aria-hidden="true"></i>
            {d.conseil}
          </p>
        </div>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "2rem 1rem" }}>
      <button onClick={onBack} style={{ fontSize: 13, marginBottom: "1.5rem", padding: "6px 12px" }}>
        ← Retour
      </button>

      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>
          {destination.city}, {destination.country}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)" }}>{destination.school}</p>
      </div>

      {status === "idle" && (
        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Génère une fiche pratique personnalisée pour ta destination : budget, logement, culture et conseils clés.
          </p>
          {error && <p style={{ fontSize: 13, color: "var(--color-text-danger)", marginBottom: "1rem" }}>{error}</p>}
          <button onClick={generate} style={{ padding: "10px 24px", fontWeight: 500 }}>
            Générer ma fiche destination ↗
          </button>
        </div>
      )}

      {status === "loading" && (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            <i className="ti ti-loader" style={{ fontSize: 16, marginRight: 8, verticalAlign: "-2px" }} aria-hidden="true"></i>
            Génération de ta fiche en cours…
          </p>
        </div>
      )}

      {status === "done" && sections && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sectionConfig.map(({ key, icon, label, render }) => (
            <div key={key} style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              padding: "1rem 1.25rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <i className={`ti ${icon}`} style={{ fontSize: 16, color: "var(--color-text-secondary)" }} aria-hidden="true"></i>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: "var(--color-text-primary)" }}>{label}</p>
              </div>
              {render(sections[key])}
            </div>
          ))}
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center", lineHeight: 1.5 }}>
            Informations générées par IA — à vérifier et compléter avec les retours d'anciens.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ExchangeMatch() {
  const [step, setStep] = useState(STEPS.HOME);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", whatsapp: "", semester: "fall", destQuery: "", destination: null });
  const [lookupEmail, setLookupEmail] = useState("");
  const [registered, setRegistered] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");
  const [guideDestination, setGuideDestination] = useState(null);

  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState([]);

  useEffect(() => {
    getStudentsFromDB().then(data => {
      setAllStudents(data.map(s => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        email: s.email,
        whatsapp: s.whatsapp,
        semester: s.semester,
        destination: { school: s.school, city: s.city, country: s.country }
      })));
    }).catch(() => {});
  }, []);

  function countMatchesFor(destination) {
    if (!destination) return 0;
    return allStudents.filter(s => s.destination.school === destination.school).length;
  }

  async function handleRegister() {
    setError("");
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError("Merci de remplir tous les champs."); return;
    }
    if (!form.destination) {
      setError("Sélectionne une destination dans la liste."); return;
    }
    const emailLower = form.email.toLowerCase().trim();
    if (!emailLower.endsWith("@edu.em-lyon.com")) {
      setError("Seuls les étudiants emlyon peuvent s'inscrire. Utilise ton adresse @edu.em-lyon.com."); return;
    }
    setLoading(true);
    try {
      await insertStudent(form);
      const data = await getStudentsFromDB();
      const students = data.map(s => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        email: s.email,
        whatsapp: s.whatsapp,
        semester: s.semester,
        destination: { school: s.school, city: s.city, country: s.country }
      }));
      setAllStudents(students);
      const me = students.find(s => s.email.toLowerCase() === form.email.toLowerCase());
      const myMatches = students.filter(s => s.id !== me.id && s.destination.school === me.destination.school);
      setRegistered(me);
      setMatches(myMatches);

      // Envoyer les notifications email
      if (myMatches.length > 0) {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newStudent: me, matches: myMatches })
        }).catch(() => {});
      }

      setStep(STEPS.MATCHES);
    } catch (e) {
      if (e.message.includes("unique")) {
        setError("Cette adresse email est déjà enregistrée.");
      } else {
        setError("Une erreur est survenue. Réessaie.");
      }
    }
    setLoading(false);
  }

  async function handleLookup() {
    setError("");
    setLoading(true);
    try {
      const data = await getStudentsFromDB();
      const students = data.map(s => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        email: s.email,
        whatsapp: s.whatsapp,
        semester: s.semester,
        destination: { school: s.school, city: s.city, country: s.country }
      }));
      setAllStudents(students);
      const me = students.find(s => s.email.toLowerCase() === lookupEmail.toLowerCase());
      if (!me) { setError("Email introuvable. Vérifie l'adresse ou inscris-toi."); setLoading(false); return; }
      const myMatches = students.filter(s => s.id !== me.id && s.destination.school === me.destination.school);
      setRegistered(me);
      setMatches(myMatches);
      setStep(STEPS.MATCHES);
    } catch {
      setError("Une erreur est survenue. Réessaie.");
    }
    setLoading(false);
  }

  function getDirectoryData() {
    const map = {};
    allStudents.forEach(s => {
      const key = s.destination.school;
      if (!map[key]) map[key] = { ...s.destination, count: 0, semesters: new Set() };
      map[key].count++;
      map[key].semesters.add(s.semester);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }

  const stats = (() => {
    const countries = new Set(allStudents.map(x => x.destination.country));
    return { total: allStudents.length, countries: countries.size };
  })();

  // ── PAGE GUIDE ──
  if (step === STEPS.GUIDE && guideDestination) {
    return <DestinationGuide destination={guideDestination} onBack={() => setStep(STEPS.MATCHES)} />;
  }

  // ── PAGE MATCHS ──
  if (step === STEPS.MATCHES && registered) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "2rem 1rem" }}>
        <button onClick={() => setStep(STEPS.HOME)} style={{ fontSize: 13, marginBottom: "1.5rem", padding: "6px 12px" }}>
          ← Accueil
        </button>

        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
          <p style={{ margin: "0 0 2px", fontSize: 12, color: "var(--color-text-secondary)" }}>Ta destination</p>
          <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)" }}>
            {registered.destination.school}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>
              {registered.destination.city} · {registered.destination.country}
            </p>
            <SemesterBadge semester={registered.semester} />
          </div>
        </div>

        <button
          onClick={() => { setGuideDestination(registered.destination); setStep(STEPS.GUIDE); }}
          style={{ width: "100%", marginBottom: "1.5rem", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}
        >
          <i className="ti ti-world" style={{ fontSize: 16 }} aria-hidden="true"></i>
          Découvrir ma destination
        </button>

        <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 12px", color: "var(--color-text-primary)" }}>
          {matches.length === 0
            ? "Aucun autre étudiant pour l'instant"
            : `${matches.length} étudiant${matches.length > 1 ? "s" : ""} part${matches.length > 1 ? "ent" : ""} au même endroit`}
        </h2>

        {matches.length === 0 ? (
          <div style={{
            background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)",
            padding: "1.5rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14, lineHeight: 1.6
          }}>
            Tu seras le premier ! Partage l'app à tes camarades pour voir qui te rejoindra.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {matches.map(s => <StudentCard key={s.id} student={s} />)}
          </div>
        )}
      </div>
    );
  }

  // ── INSCRIPTION ──
  if (step === STEPS.REGISTER) {
    const previewCount = countMatchesFor(form.destination);
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem" }}>
        <button onClick={() => { setStep(STEPS.HOME); setError(""); }} style={{ fontSize: 13, marginBottom: "1.5rem", padding: "6px 12px" }}>
          ← Retour
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 1.5rem", color: "var(--color-text-primary)" }}>
          S'inscrire
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input placeholder="Prénom" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            <input placeholder="Nom" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>

          <EmailInput placeholder="prenom.nom@edu.em-lyon.com" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />

          <div>
            <p style={{ margin: "0 0 6px", fontSize: 13, color: "#6b6b6b" }}>WhatsApp (optionnel)</p>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={form.countryCode || "+33"}
                onChange={e => setForm(f => ({ ...f, countryCode: e.target.value }))}
                style={{
                  height: 42, padding: "0 8px", border: "0.5px solid rgba(0,0,0,0.25)",
                  borderRadius: 8, background: "#fff", fontSize: 14, color: "#1a1a1a",
                  fontFamily: "inherit", flexShrink: 0, width: 110, cursor: "pointer"
                }}
              >
                <option value="+33">🇫🇷 +33</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+39">🇮🇹 +39</option>
                <option value="+31">🇳🇱 +31</option>
                <option value="+32">🇧🇪 +32</option>
                <option value="+41">🇨🇭 +41</option>
                <option value="+46">🇸🇪 +46</option>
                <option value="+47">🇳🇴 +47</option>
                <option value="+45">🇩🇰 +45</option>
                <option value="+358">🇫🇮 +358</option>
                <option value="+351">🇵🇹 +351</option>
                <option value="+48">🇵🇱 +48</option>
                <option value="+55">🇧🇷 +55</option>
                <option value="+52">🇲🇽 +52</option>
                <option value="+54">🇦🇷 +54</option>
                <option value="+56">🇨🇱 +56</option>
                <option value="+57">🇨🇴 +57</option>
                <option value="+51">🇵🇪 +51</option>
                <option value="+598">🇺🇾 +598</option>
                <option value="+86">🇨🇳 +86</option>
                <option value="+81">🇯🇵 +81</option>
                <option value="+82">🇰🇷 +82</option>
                <option value="+91">🇮🇳 +91</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+60">🇲🇾 +60</option>
                <option value="+66">🇹🇭 +66</option>
                <option value="+84">🇻🇳 +84</option>
                <option value="+62">🇮🇩 +62</option>
                <option value="+63">🇵🇭 +63</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+212">🇲🇦 +212</option>
                <option value="+221">🇸🇳 +221</option>
                <option value="+20">🇪🇬 +20</option>
                <option value="+7">🇷🇺 +7</option>
                <option value="+380">🇺🇦 +380</option>
                <option value="+420">🇨🇿 +420</option>
                <option value="+36">🇭🇺 +36</option>
                <option value="+40">🇷🇴 +40</option>
                <option value="+359">🇧🇬 +359</option>
                <option value="+385">🇭🇷 +385</option>
                <option value="+386">🇸🇮 +386</option>
                <option value="+421">🇸🇰 +421</option>
                <option value="+370">🇱🇹 +370</option>
                <option value="+371">🇱🇻 +371</option>
                <option value="+372">🇪🇪 +372</option>
                <option value="+30">🇬🇷 +30</option>
                <option value="+90">🇹🇷 +90</option>
                <option value="+972">🇮🇱 +972</option>
                <option value="+880">🇧🇩 +880</option>
                <option value="+94">🇱🇰 +94</option>
                <option value="+977">🇳🇵 +977</option>
                <option value="+855">🇰🇭 +855</option>
                <option value="+7">🇰🇿 +7</option>
                <option value="+998">🇺🇿 +998</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+64">🇳🇿 +64</option>
                <option value="+27">🇿🇦 +27</option>
                <option value="+234">🇳🇬 +234</option>
                <option value="+254">🇰🇪 +254</option>
                <option value="+250">🇷🇼 +250</option>
              </select>
              <input
                type="tel"
                placeholder="Numéro (sans indicatif)"
                value={form.whatsappNumber || ""}
                onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6b6b6b" }}>Semestre</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[["fall", "🍂 Fall"], ["spring", "🌸 Spring"], ["both", "Les deux"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setForm(f => ({ ...f, semester: val }))}
                  style={{
                    padding: "12px 8px",
                    fontSize: 14,
                    fontWeight: form.semester === val ? 600 : 400,
                    background: form.semester === val ? "#1a1a1a" : "transparent",
                    color: form.semester === val ? "#fff" : "#6b6b6b",
                    border: form.semester === val ? "0.5px solid #1a1a1a" : "0.5px solid rgba(0,0,0,0.15)",
                    borderRadius: 8,
                    transition: "all 0.15s"
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--color-text-secondary)" }}>
              Destination (pays, ville ou école)
            </p>
            <DestinationSearch
              value={form.destQuery}
              onChange={v => setForm(f => ({ ...f, destQuery: v, destination: null }))}
              onSelect={d => setForm(f => ({ ...f, destQuery: `${d.school} – ${d.city}`, destination: d }))}
            />
            {form.destination && previewCount > 0 && (
              <div style={{
                marginTop: 8, padding: "8px 12px",
                background: "var(--color-background-success)",
                borderRadius: "var(--border-radius-md)",
                display: "flex", alignItems: "center", gap: 6
              }}>
                <i className="ti ti-users" style={{ fontSize: 15, color: "var(--color-text-success)" }} aria-hidden="true"></i>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-success)" }}>
                  {previewCount} étudiant{previewCount > 1 ? "s" : ""} déjà inscrit{previewCount > 1 ? "s" : ""} pour cette destination — inscris-toi pour voir qui !
                </p>
              </div>
            )}
            {form.destination && previewCount === 0 && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>
                Aucun inscrit pour l'instant — tu seras le premier !
              </p>
            )}
          </div>

          {error && <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-danger)" }}>{error}</p>}
          <button onClick={handleRegister} disabled={loading} style={{ marginTop: 4, padding: "10px", fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Inscription en cours…" : "Voir mes matchs ↗"}
          </button>
        </div>
      </div>
    );
  }

  // ── LOOKUP ──
  if (step === STEPS.LOOKUP) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem" }}>
        <button onClick={() => { setStep(STEPS.HOME); setError(""); }} style={{ fontSize: 13, marginBottom: "1.5rem", padding: "6px 12px" }}>
          ← Retour
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 1.5rem", color: "var(--color-text-primary)" }}>
          Retrouver mes matchs
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <EmailInput placeholder="Ton email emlyon" value={lookupEmail} onChange={setLookupEmail} />
          {error && <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-danger)" }}>{error}</p>}
          <button onClick={handleLookup} disabled={loading} style={{ padding: "10px", fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Recherche en cours…" : "Voir mes matchs ↗"}
          </button>
        </div>
      </div>
    );
  }

  // ── ANNUAIRE ──
  if (step === STEPS.DIRECTORY) {
    const data = getDirectoryData();
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1rem" }}>
        <button onClick={() => setStep(STEPS.HOME)} style={{ fontSize: 13, marginBottom: "1.5rem", padding: "6px 12px" }}>
          ← Retour
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 1.5rem", color: "var(--color-text-primary)" }}>
          Destinations populaires
        </h2>
        {data.length === 0 ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Aucun étudiant inscrit pour l'instant.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.map((d, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)"
              }}>
                <div style={{
                  minWidth: 28, height: 28, borderRadius: "50%",
                  background: "var(--color-background-info)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 500, color: "var(--color-text-info)"
                }}>{d.count}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{d.school}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{d.city} · {d.country}</p>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {[...d.semesters].map(s => <SemesterBadge key={s} semester={s} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── HOME ──
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2.5rem 1rem" }}>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>
        ExchangeMatch
      </h2>
      <p style={{ margin: "0 0 2rem", fontSize: 15, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        Découvre qui part à l'autre bout du monde en même temps que toi.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "2rem" }}>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "1rem", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)" }}>{stats.total}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>étudiants inscrits</p>
        </div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "1rem", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)" }}>{stats.countries}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>pays représentés</p>
        </div>
      </div>

      {stats.total === 0 && (
        <div style={{
          padding: "12px 14px", marginBottom: "1.5rem",
          background: "var(--color-background-warning)",
          borderRadius: "var(--border-radius-md)"
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-warning)", lineHeight: 1.5 }}>
            <i className="ti ti-star" style={{ fontSize: 14, marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true"></i>
            Sois le premier à t'inscrire — et découvre très vite qui part avec toi.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => setStep(STEPS.REGISTER)} style={{ padding: "12px", fontWeight: 500, fontSize: 15 }}>
          Je m'inscris et découvre mes matchs ↗
        </button>
        <button onClick={() => setStep(STEPS.LOOKUP)} style={{ padding: "12px", fontSize: 14 }}>
          J'ai déjà un compte, voir mes matchs
        </button>
        <button onClick={() => setStep(STEPS.DIRECTORY)} style={{ padding: "12px", fontSize: 14 }}>
          Voir les destinations populaires
        </button>
      </div>

      <p style={{ marginTop: "2rem", fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
        140 universités partenaires · 32 pays · Année 2026–2027
      </p>
    </div>
  );
}
