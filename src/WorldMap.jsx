import { useEffect, useMemo, useState } from "react";
import { MAP_W, MAP_H, LAND_PATH, CITY_POS } from "./mapData";

// Une ville n'apparaît que si au moins MIN_SHOW étudiants y partent.
// Passe à 2 ou 3 si tu veux éviter qu'un étudiant seul dans sa ville soit reconnaissable.
const MIN_SHOW = 1;

const RED = "#dc2626";

export default function WorldMap({ T, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch("/api/map")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError("Impossible de charger la carte. Réessaie plus tard."));
  }, []);

  const cities = useMemo(
    () => (data?.cities || []).filter(c => c.count >= MIN_SHOW && CITY_POS[c.city]),
    [data]
  );
  const max = Math.max(1, ...cities.map(c => c.count));
  const radius = n => 4 + 14 * Math.sqrt(n / max);

  const continents = useMemo(() => {
    const acc = {};
    for (const c of cities) {
      const cont = CITY_POS[c.city][2];
      acc[cont] = (acc[cont] || 0) + c.count;
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [cities]);
  const shown = cities.reduce((s, c) => s + c.count, 0);

  const card = { background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, boxShadow: T.shadow };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "2rem 1rem", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 760 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "0 0 24px", display: "flex", alignItems: "center", gap: 4 }}>← Retour</button>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: T.text, margin: "0 0 8px", letterSpacing: "-0.5px" }}>Où part la promo ?</h1>
        <p style={{ fontSize: 14, color: T.muted, margin: "0 0 24px", lineHeight: 1.6 }}>
          Chaque point rouge est une ville d'échange. Plus il est gros, plus il y a d'étudiants. Aucun nom n'est affiché.
        </p>

        {error && <p style={{ color: T.red, fontSize: 14 }}>{error}</p>}
        {!data && !error && <p style={{ color: T.muted, fontSize: 14 }}>Chargement de la carte…</p>}

        {data && (
          <>
            <div style={{ ...card, padding: 8, position: "relative" }}>
              <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", height: "auto", display: "block" }} onClick={() => setSelected(null)}>
                <path d={LAND_PATH} fill="#e7e5e0" stroke="#ffffff" strokeWidth={0.6} />
                {[...cities].reverse().map(c => {
                  const [x, y] = CITY_POS[c.city];
                  const r = radius(c.count);
                  const active = selected?.city === c.city;
                  return (
                    <g key={c.country + c.city} style={{ cursor: "pointer" }}
                       onClick={e => { e.stopPropagation(); setSelected(c); }}>
                      <circle cx={x} cy={y} r={Math.max(r, 10)} fill="transparent" />
                      <circle cx={x} cy={y} r={r} fill={RED} fillOpacity={active ? 0.95 : 0.7}
                              stroke="#ffffff" strokeWidth={active ? 2 : 1} />
                      {r >= 11 && (
                        <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#ffffff" pointerEvents="none">{c.count}</text>
                      )}
                      <title>{`${c.city} · ${c.count} étudiant${c.count > 1 ? "s" : ""}`}</title>
                    </g>
                  );
                })}
              </svg>
              {selected && (
                <div style={{ position: "absolute", left: 16, bottom: 16, ...card, padding: "8px 12px", fontSize: 13, color: T.text }}>
                  <strong>{selected.city}</strong> <span style={{ color: T.muted }}>({selected.country})</span> · {selected.count} étudiant{selected.count > 1 ? "s" : ""}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginTop: 10 }}>
              <div style={{ ...card, padding: 16 }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Top destinations</p>
                {cities.slice(0, 5).map((c, i) => (
                  <div key={c.country + c.city} onClick={() => setSelected(c)}
                       style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, color: T.text, cursor: "pointer", borderTop: i ? `1px solid ${T.border}` : "none" }}>
                    <span>{i + 1}. {c.city} <span style={{ color: T.faint }}>· {c.country}</span></span>
                    <strong>{c.count}</strong>
                  </div>
                ))}
                {!cities.length && <p style={{ margin: 0, fontSize: 14, color: T.muted }}>Pas encore assez d'inscrits.</p>}
              </div>

              <div style={{ ...card, padding: 16 }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Par continent</p>
                {continents.map(([name, n]) => (
                  <div key={name} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.text, marginBottom: 4 }}>
                      <span>{name}</span><span style={{ color: T.muted }}>{Math.round((n / shown) * 100)} %</span>
                    </div>
                    <div style={{ height: 6, background: T.bgHover, borderRadius: 3 }}>
                      <div style={{ height: 6, width: `${(n / shown) * 100}%`, background: RED, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ marginTop: 16, fontSize: 12, color: T.faint, textAlign: "center" }}>
              {data.total} étudiants · {cities.length} villes · {new Set(cities.map(c => c.country)).size} pays
            </p>
          </>
        )}
      </div>
    </div>
  );
}
