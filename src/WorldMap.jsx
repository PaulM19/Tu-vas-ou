import { useEffect, useMemo, useRef, useState } from "react";
import { MAP_W, MAP_H, LAND_PATH, CITY_POS } from "./mapData";
import { ShareBar, SITE_URL, MAP_MESSAGE } from "./share";

// Une ville n'apparaît que si au moins MIN_SHOW étudiants y partent (avec le filtre de semestre choisi).
// À 1, toutes les villes sont visibles. Passer à 2 masque les villes où un étudiant est seul
// (28 villes sur 58 au 14/10/2026). L'étudiant connecté voit toujours sa propre destination.
const MIN_SHOW = 1;

const RED = "#dc2626";
const MINE = "#2563eb"; // couleur de "ta destination"

// Cadrages de la carte : x, y, largeur, hauteur (dans le repère de mapData)
const VIEWS = {
  monde: { label: "Monde", box: [0, 0, MAP_W, MAP_H] },
  europe: { label: "Europe", box: [398, 38, 256, 112] },
};

const MIN_W = MAP_W / 14; // zoom maximum (≈ x14)
const RATIO = MAP_H / MAP_W;

// Garde le cadrage dans les limites de la carte
function clampBox([x, y, w]) {
  w = Math.min(MAP_W, Math.max(MIN_W, w));
  const h = w * RATIO;
  x = Math.min(MAP_W - w, Math.max(0, x));
  y = Math.min(MAP_H - h, Math.max(0, y));
  return [x, y, w, h];
}

// Cadre une zone [x, y, w, h] en respectant les proportions de la carte
function fitBox([x, y, w, h]) {
  const W = Math.max(w, h / RATIO);
  return clampBox([x + w / 2 - W / 2, y + h / 2 - (W * RATIO) / 2, W]);
}

const SEMESTERS = [
  ["all", "Tous"],
  ["fall", "Fall"],
  ["spring", "Spring"],
  ["double", "Double diplôme"],
];

// myDest : { city, country } de l'étudiant connecté (ou null)
export default function WorldMap({ T, onBack, myDest = null, backLabel = "← Retour" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [box, setBox] = useState(VIEWS.monde.box);
  const svgRef = useRef(null);
  const boxRef = useRef(box);
  boxRef.current = box;
  const anim = useRef(0);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const dragged = useRef(false);

  // Transition douce vers un cadrage
  const animateTo = target => {
    cancelAnimationFrame(anim.current);
    const from = boxRef.current, to = fitBox(target), t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / 350), e = 1 - Math.pow(1 - t, 3);
      setBox(from.map((v, i) => v + (to[i] - v) * e));
      if (t < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };

  // Position du curseur/doigt dans le repère de la carte
  const toMap = (clientX, clientY, b = boxRef.current) => {
    const r = svgRef.current.getBoundingClientRect();
    return [b[0] + ((clientX - r.left) / r.width) * b[2], b[1] + ((clientY - r.top) / r.height) * b[3]];
  };

  // Zoom de facteur f centré sur le point (mx, my) de la carte
  const zoomAt = (f, mx, my) => {
    cancelAnimationFrame(anim.current);
    const [x, y, w, h] = boxRef.current;
    const nw = Math.min(MAP_W, Math.max(MIN_W, w * f)), s = nw / w;
    setBox(clampBox([mx - (mx - x) * s, my - (my - y) * s, nw]));
  };
  const zoomCenter = f => { const [x, y, w, h] = boxRef.current; zoomAt(f, x + w / 2, y + h / 2); };

  // Molette / pavé tactile (écouteur natif pour pouvoir bloquer le défilement de la page)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = e => {
      e.preventDefault();
      const [mx, my] = toMap(e.clientX, e.clientY);
      zoomAt(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), mx, my);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  // Glisser (1 doigt / souris) et pincer (2 doigts)
  const startGesture = () => {
    const pts = [...pointers.current.values()];
    const b = boxRef.current;
    if (pts.length === 1) gesture.current = { type: "pan", start: pts[0], box: b };
    else if (pts.length >= 2) {
      const [a, c] = pts;
      gesture.current = {
        type: "pinch", box: b,
        dist: Math.hypot(a.x - c.x, a.y - c.y),
        center: toMap((a.x + c.x) / 2, (a.y + c.y) / 2, b),
      };
    }
  };
  const onPointerDown = e => {
    cancelAnimationFrame(anim.current);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) dragged.current = false;
    startGesture();
  };
  const onPointerMove = e => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const r = svgRef.current.getBoundingClientRect();
    const pts = [...pointers.current.values()];
    if (g.type === "pan") {
      const dx = pts[0].x - g.start.x, dy = pts[0].y - g.start.y;
      if (!dragged.current && Math.hypot(dx, dy) < 5) return;
      if (!dragged.current) { dragged.current = true; svgRef.current.setPointerCapture?.(e.pointerId); }
      const [x, y, w, h] = g.box;
      setBox(clampBox([x - (dx / r.width) * w, y - (dy / r.height) * h, w]));
    } else if (g.type === "pinch" && pts.length >= 2) {
      dragged.current = true;
      const [a, c] = pts;
      const d = Math.hypot(a.x - c.x, a.y - c.y) || 1;
      const w = g.box[2];
      const nw = Math.min(MAP_W, Math.max(MIN_W, w * (g.dist / d)));
      const [mx, my] = g.center;
      // le point de la carte pris entre les deux doigts reste sous les doigts
      const cx = ((a.x + c.x) / 2 - r.left) / r.width, cy = ((a.y + c.y) / 2 - r.top) / r.height;
      setBox(clampBox([mx - cx * nw, my - cy * nw * RATIO, nw]));
    }
  };
  const onPointerUp = e => {
    pointers.current.delete(e.pointerId);
    startGesture();
  };
  const [sem, setSem] = useState("all");

  useEffect(() => {
    fetch("/api/map")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError("Impossible de charger la carte. Réessaie plus tard."));
  }, []);

  const isMine = c => !!myDest && c.city === myDest.city && c.country === myDest.country;

  const cities = useMemo(
    () =>
      (data?.cities || [])
        .map(c => ({ ...c, n: sem === "all" ? c.count : c.bySem?.[sem] || 0 }))
        .filter(c => CITY_POS[c.city] && (c.n >= MIN_SHOW || (isMine(c) && c.n > 0)))
        .sort((a, b) => b.n - a.n),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, sem, myDest?.city, myDest?.country]
  );

  const [bx, by, bw, bh] = box;
  const k = bw / MAP_W; // < 1 quand on zoome : on réduit la taille des points en conséquence
  const max = Math.max(1, ...cities.map(c => c.n));
  const z = Math.pow(k, 0.8); // les points grossissent un peu en zoomant, mais moins que la carte : les villes proches se séparent
  const radius = n => (4 + 14 * Math.sqrt(n / max)) * z;

  const continents = useMemo(() => {
    const acc = {};
    for (const c of cities) {
      const cont = CITY_POS[c.city][2];
      acc[cont] = (acc[cont] || 0) + c.n;
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [cities]);
  const shown = cities.reduce((s, c) => s + c.n, 0);
  const mine = cities.find(isMine);

  const card = { background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, boxShadow: T.shadow };
  const pill = active => ({
    padding: "6px 12px", fontSize: 13, borderRadius: 999, cursor: "pointer",
    border: `1px solid ${active ? T.text : T.border}`,
    background: active ? T.text : T.bgCard, color: active ? T.bgCard : T.text,
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "2rem 1rem", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 760 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "0 0 24px", display: "flex", alignItems: "center", gap: 4 }}>{backLabel}</button>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: T.text, margin: "0 0 8px", letterSpacing: "-0.5px" }}>Où part la promo ?</h1>
        <p style={{ fontSize: 14, color: T.muted, margin: "0 0 20px", lineHeight: 1.6 }}>
          Chaque point rouge est une ville d'échange. Plus il est gros, plus il y a d'étudiants. Aucun nom n'est affiché.
        </p>

        {error && <p style={{ color: T.red, fontSize: 14 }}>{error}</p>}
        {!data && !error && <p style={{ color: T.muted, fontSize: 14 }}>Chargement de la carte…</p>}

        {data && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SEMESTERS.map(([v, label]) => (
                  <button key={v} style={pill(sem === v)} onClick={() => { setSem(v); setSelected(null); }}>{label}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {Object.entries(VIEWS).map(([v, { label, box: target }]) => (
                  <button key={v} style={pill(false)} onClick={() => animateTo(target)}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ ...card, padding: 8, position: "relative", overflow: "hidden" }}>
              <svg ref={svgRef} viewBox={`${bx} ${by} ${bw} ${bh}`}
                   style={{ width: "100%", height: "auto", display: "block", aspectRatio: `${MAP_W} / ${MAP_H}`, touchAction: "none", cursor: gesture.current?.type === "pan" && dragged.current ? "grabbing" : "grab", userSelect: "none" }}
                   preserveAspectRatio="xMidYMid meet"
                   onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
                   onDoubleClick={e => { const [mx, my] = toMap(e.clientX, e.clientY); zoomAt(e.shiftKey ? 2 : 0.5, mx, my); }}
                   onClick={() => { if (!dragged.current) setSelected(null); }}>
                <path d={LAND_PATH} fill="#e7e5e0" stroke="#ffffff" strokeWidth={0.6 * k} />
                {[...cities].reverse().sort((a, b) => isMine(a) - isMine(b)).map(c => {
                  const [x, y] = CITY_POS[c.city];
                  const r = radius(c.n);
                  const me = isMine(c);
                  const active = selected?.city === c.city && selected?.country === c.country;
                  return (
                    <g key={c.country + c.city} style={{ cursor: "pointer" }}
                       onClick={e => { e.stopPropagation(); if (!dragged.current) setSelected(c); }}
                       onDoubleClick={e => e.stopPropagation()}>
                      <circle cx={x} cy={y} r={Math.max(r, 10 * k)} fill="transparent" />
                      {me && <circle cx={x} cy={y} r={r + 4 * z} fill="none" stroke={MINE} strokeWidth={1.5 * z} />}
                      <circle cx={x} cy={y} r={r} fill={me ? MINE : RED} fillOpacity={active || me ? 0.95 : 0.7}
                              stroke="#ffffff" strokeWidth={(active ? 2 : 1) * z} />
                      {r >= 11 * z && (
                        <text x={x} y={y + 4 * z} textAnchor="middle" fontSize={11 * z} fontWeight={700} fill="#ffffff" pointerEvents="none">{c.n}</text>
                      )}
                      <title>{`${c.city} · ${c.n} étudiant${c.n > 1 ? "s" : ""}`}</title>
                    </g>
                  );
                })}
              </svg>
              <div style={{ position: "absolute", right: 16, top: 16, display: "flex", flexDirection: "column", ...card, overflow: "hidden" }}>
                {[["+", 0.6, "Zoomer"], ["−", 1 / 0.6, "Dézoomer"]].map(([t, f, label], i) => (
                  <button key={t} aria-label={label} onClick={() => zoomCenter(f)}
                          style={{ width: 34, height: 34, border: "none", borderTop: i ? `1px solid ${T.border}` : "none", background: T.bgCard, color: T.text, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>{t}</button>
                ))}
              </div>
              {selected && (
                <div style={{ position: "absolute", left: 16, bottom: 16, ...card, padding: "8px 12px", fontSize: 13, color: T.text }}>
                  <strong>{selected.city}</strong> <span style={{ color: T.muted }}>({selected.country})</span> · {selected.n} étudiant{selected.n > 1 ? "s" : ""}
                  {isMine(selected) && <span style={{ color: MINE, fontWeight: 600 }}> · ta destination</span>}
                </div>
              )}
            </div>

            <p style={{ margin: "8px 0 0", fontSize: 12, color: T.faint }}>
              Glisse pour te déplacer · molette, pincement ou double-clic pour zoomer
            </p>

            {myDest && (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: MINE, display: "inline-block", marginRight: 6, verticalAlign: "-1px" }} />
                {mine
                  ? <>Ta destination : <strong style={{ color: T.text }}>{mine.city}</strong> · {mine.n} étudiant{mine.n > 1 ? "s" : ""}{sem !== "all" ? " ce semestre" : ""} (toi compris)
                      <button onClick={() => { const [x, y] = CITY_POS[mine.city]; animateTo([x - 60, y - 26, 120, 52]); setSelected(mine); }}
                              style={{ marginLeft: 4, background: "none", border: "none", padding: 0, color: MINE, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Voir sur la carte</button></>
                  : <>Ta destination ({myDest.city}) n'apparaît pas avec ce filtre.</>}
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginTop: 10 }}>
              <div style={{ ...card, padding: 16 }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Top destinations</p>
                {cities.slice(0, 5).map((c, i) => (
                  <div key={c.country + c.city} onClick={() => { const [x, y] = CITY_POS[c.city]; animateTo([x - 60, y - 26, 120, 52]); setSelected(c); }}
                       style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, color: isMine(c) ? MINE : T.text, cursor: "pointer", borderTop: i ? `1px solid ${T.border}` : "none" }}>
                    <span>{i + 1}. {c.city} <span style={{ color: T.faint }}>· {c.country}</span></span>
                    <strong>{c.n}</strong>
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

            <div style={{ marginTop: 10 }}>
              <ShareBar T={T} url={SITE_URL} message={MAP_MESSAGE}
                        title="Partage la carte"
                        subtitle="Le lien ouvre la page d'accueil du site." />
            </div>

            <p style={{ marginTop: 16, fontSize: 12, color: T.faint, textAlign: "center" }}>
              {shown} étudiants · {cities.length} villes · {new Set(cities.map(c => c.country)).size} pays
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Aperçu cliquable de la carte, pour la page d'accueil
export function MapPreview({ T, onOpen }) {
  const [cities, setCities] = useState(null);
  useEffect(() => {
    fetch("/api/map")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setCities((d.cities || []).filter(c => c.count >= MIN_SHOW && CITY_POS[c.city])))
      .catch(() => setCities([]));
  }, []);
  const max = Math.max(1, ...(cities || []).map(c => c.count));
  return (
    <button onClick={onOpen} aria-label="Voir la carte des départs"
            style={{ width: "100%", padding: 0, textAlign: "left", cursor: "pointer", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, boxShadow: T.shadow, overflow: "hidden", display: "block" }}>
      <svg viewBox={`0 20 ${MAP_W} ${MAP_H - 60}`} style={{ width: "100%", height: "auto", display: "block", background: "#fbfaf8" }} aria-hidden="true">
        <path d={LAND_PATH} fill="#e7e5e0" stroke="#ffffff" strokeWidth={0.6} />
        {(cities || []).map(c => {
          const [x, y] = CITY_POS[c.city];
          return <circle key={c.country + c.city} cx={x} cy={y} r={4 + 9 * Math.sqrt(c.count / max)} fill={RED} fillOpacity={0.7} stroke="#fff" strokeWidth={1} />;
        })}
      </svg>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderTop: `1px solid ${T.border}` }}>
        <span>
          <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: T.text }}>Où part la promo ?</span>
          <span style={{ display: "block", fontSize: 12, color: T.muted, marginTop: 2 }}>
            {cities ? `${cities.length} villes sur la carte` : "Chargement…"}
          </span>
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Voir la carte →</span>
      </span>
    </button>
  );
}
