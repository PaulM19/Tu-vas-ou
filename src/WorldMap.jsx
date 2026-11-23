import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAP_W, MAP_H, CITY_POS } from "./mapData";
import { ShareBar, SITE_URL, MAP_MESSAGE } from "./share";

// Une ville n'apparaît que si au moins MIN_SHOW étudiants y partent (avec le filtre de semestre choisi).
// À 1, toutes les villes sont visibles. Passer à 2 masque les villes où un étudiant est seul
// (28 villes sur 58 au 14/10/2026). L'étudiant connecté voit toujours sa propre destination.
const MIN_SHOW = 1;

// Projection « Natural Earth », la même que celle du fond de carte (mapData.js) :
// permet de placer une ville hors liste des partenaires (stage, freemover) à partir de sa latitude / longitude.
function project(lat, lng) {
  const p = (lat * Math.PI) / 180, l = (lng * Math.PI) / 180, p2 = p * p, p4 = p2 * p2;
  const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
  const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
  return [500 + 185 * x, 255.07 - 185 * y];
}
// Continent approximatif à partir des coordonnées (pour la répartition « Par continent »)
function continentOf(lat, lng) {
  if (lng < -30) return lat > 13 ? "Amérique du Nord" : "Amérique du Sud";
  if (lat < -10 && lng > 110) return "Océanie";
  if (lat >= 35 && lng < 60) return "Europe";
  if (lng < 52 && lat < 35) return lng > 34 && lat > 12 ? "Asie" : "Afrique";
  return "Asie";
}
// Inverse de project() : position sur la carte -> latitude / longitude (pour le globe)
function unproject(x, y) {
  const X = (x - 500) / 185, Y = (255.07 - y) / 185;
  let p = Y;
  for (let i = 0; i < 25; i++) {
    const p2 = p * p, p4 = p2 * p2;
    const f = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))) - Y;
    const d = 1.007226 + p2 * (0.045255 + p4 * (-0.311325 + 0.259866 * p2 - 0.065076 * p4));
    p -= f / d;
    if (Math.abs(f) < 1e-9) break;
  }
  const p2 = p * p, p4 = p2 * p2;
  const l = X / (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
  return [(l * 180) / Math.PI, (p * 180) / Math.PI];
}
function cityLngLat(c) {
  if (c.lat != null && c.lng != null) return [c.lng, c.lat];
  const pos = CITY_POS[c.city];
  return pos ? unproject(pos[0], pos[1]) : null;
}

// Le globe n'est chargé qu'à l'ouverture du plein écran
const Globe = lazy(() => import("./Globe"));

// Position d'une ville : liste des partenaires, sinon coordonnées enregistrées
export function cityPos(c) {
  if (CITY_POS[c.city]) return CITY_POS[c.city];
  if (c.lat != null && c.lng != null) return [...project(c.lat, c.lng), continentOf(c.lat, c.lng)];
  return null;
}

const RED = "#E2001A"; // rouge emlyon
const MINE = "#001931"; // bleu marine emlyon : couleur de "ta destination"
const OCEAN = "#0b1f33"; // fond autour de l'image satellite
// Image satellite NASA (domaine public) reprojetée dans la même projection que la carte (repère 1000 x 438)
const EARTH_FLAT = "/earth-flat.jpg";

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
export default function WorldMap({ T, onBack, myDest = null, backLabel = "← Retour", token = null, onLogin = null, me = null, onMapSettings = null }) {
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
  const [full, setFull] = useState(false);
  // Plein écran : Échap pour fermer, page bloquée derrière
  useEffect(() => {
    if (!full) return;
    const onKey = e => { if (e.key === "Escape") setFull(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [full]);
  // Noms par ville : seulement pour les étudiants connectés
  const [people, setPeople] = useState(null);
  const [reload, setReload] = useState(0);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState("");
  // Case « nom complet » : on enregistre puis on recharge la liste pour voir le changement
  const toggleFullName = async v => {
    setNameBusy(true); setNameError("");
    try { await onMapSettings({ fullName: v }); setReload(x => x + 1); }
    catch (e) { setNameError(e.message || "Impossible d'enregistrer ton choix. Réessaie."); }
    setNameBusy(false);
  };
  useEffect(() => {
    if (!token) { setPeople(null); return; }
    fetch("/api/map-people", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: "{}" })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setPeople(d.cities || []))
      .catch(() => setPeople([]));
  }, [token, reload]);

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
        .filter(c => cityPos(c) && (c.n >= MIN_SHOW || (isMine(c) && c.n > 0)))
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
      const cont = cityPos(c)[2];
      acc[cont] = (acc[cont] || 0) + c.n;
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [cities]);
  const shown = cities.reduce((s, c) => s + c.n, 0);
  const mine = cities.find(isMine);

  const card = { background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, boxShadow: T.shadow };
  const pill = active => ({
    padding: "6px 12px", fontSize: 13, borderRadius: 999, cursor: "pointer",
    border: `1px solid ${active ? T.navy || T.text : T.border}`,
    background: active ? T.navy || T.text : T.bgCard, color: active ? "#fff" : T.text,
    fontWeight: active ? 600 : 400,
  });

  // Panneau « qui part dans cette ville » (sous la carte, et en bas du globe en plein écran)
  const renderPanel = (extra = {}) => {
              const entry = (people || []).find(c => c.city === selected.city && c.country === selected.country);
              const list = (entry?.people || []).filter(p => sem === "all" || p.semester === sem);
              const hidden = Math.max(0, selected.n - list.length);
              const SEM = { fall: "Fall", spring: "Spring", double: "Double diplôme" };
              return (
                <div style={{ ...card, padding: "18px 20px", marginTop: 10, ...extra }}>
                  <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 500, color: T.text }}>{selected.city} <span style={{ color: T.muted, fontWeight: 400 }}>· {selected.country}</span></p>
                  <p style={{ margin: "0 0 12px", fontSize: 14, color: T.muted }}>{selected.n} étudiant{selected.n > 1 ? "s" : ""}{sem !== "all" ? " ce semestre" : ""}</p>
                  {!token ? (
                    <p style={{ margin: 0, fontSize: 14, color: T.muted }}>
                      {onLogin
                        ? <><button onClick={onLogin} style={{ background: "none", border: "none", padding: 0, fontSize: 14, color: T.text, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Connecte-toi</button> pour voir qui part dans cette ville.</>
                        : "Connecte-toi pour voir qui part dans cette ville."}
                    </p>
                  ) : people === null ? (
                    <p style={{ margin: 0, fontSize: 14, color: T.faint }}>Chargement…</p>
                  ) : (
                    <>
                      {list.map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: `1px solid ${T.border}`, fontSize: 14 }}>
                          <span style={{ color: T.text }}>{p.name}{p.me && <span style={{ color: T.muted }}> (toi)</span>}</span>
                          <span style={{ color: T.muted, textAlign: "right", minWidth: 0 }}>{p.tripType === "internship" ? `Stage · ${p.school}` : p.tripType === "freemover" ? `Freemover · ${p.school}` : p.school}{p.semester && SEM[p.semester] ? ` · ${p.tripType && p.tripType !== "exchange" && p.semester === "double" ? "Année complète" : SEM[p.semester]}` : ""}</span>
                        </div>
                      ))}
                      {hidden > 0 && <p style={{ margin: "10px 0 0", fontSize: 13, color: T.faint }}>{hidden === selected.n ? "Personne ne s'affiche ici." : `+ ${hidden} qui ne s'affiche${hidden > 1 ? "nt" : ""} pas sur la carte.`}</p>}
                    </>
                  )}
                </div>
              );
  };

  // Villes du globe (avec latitude / longitude)
  const globeCities = useMemo(() => cities.map(c => { const ll = cityLngLat(c); return ll ? { ...c, lng: ll[0], lat: ll[1] } : null; }).filter(Boolean), [cities]);
  const globeSelected = selected ? globeCities.find(c => c.city === selected.city && c.country === selected.country) || null : null;

  return (
    <div>
      <div>
        <button onClick={onBack} style={{ background: "none", border: "none", padding: "4px 0", fontSize: 14, color: T.muted, cursor: "pointer", marginBottom: 40 }}>
          ← {backLabel.replace(/^←\s*/, "")}
        </button>

        <h1 style={{ fontFamily: T.serif || "inherit", fontSize: 34, fontWeight: 600, color: T.text, margin: "0 0 10px", letterSpacing: "-0.5px" }}>Où part la promo ?</h1>
        <p style={{ fontSize: 14, color: T.muted, margin: "0 0 20px", lineHeight: 1.6 }}>
          {token ? "Clique sur une ville pour voir qui y part." : "Chaque point rouge est une ville d'échange. Plus il est gros, plus il y a d'étudiants."}
        </p>

        {token && me && onMapSettings && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", margin: "0 0 20px", border: `1px solid ${T.border}`, borderRadius: T.radiusLg }}>
            {me.showOnMap === false ? (
              <span style={{ fontSize: 14, color: T.muted }}>Tu n'apparais pas sur la carte. Tu peux changer ça dans ton espace.</span>
            ) : (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: nameBusy ? "default" : "pointer" }}>
                <input type="checkbox" checked={me.showFullName === true} disabled={nameBusy} onChange={e => toggleFullName(e.target.checked)}
                       style={{ width: 18, height: 18, marginTop: 2, accentColor: T.navy, cursor: "pointer", flexShrink: 0 }} />
                <span>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 500, color: T.text }}>Afficher mon nom de famille en entier</span>
                  <span style={{ display: "block", fontSize: 14, color: T.muted, marginTop: 2 }}>
                    Tu apparais comme « {me.firstName} {me.showFullName ? me.lastName : `${(me.lastName || "").trim().charAt(0).toUpperCase()}.`} ».
                  </span>
                </span>
              </label>
            )}
            {nameError && <span style={{ fontSize: 14, color: T.red }}>{nameError}</span>}
          </div>
        )}

        {error && <p style={{ color: T.red, fontSize: 14 }}>{error}</p>}
        {!data && !error && <p style={{ color: T.muted, fontSize: 14 }}>Chargement de la carte…</p>}

        {data && full && createPortal(
          <div role="dialog" aria-modal="true" aria-label="Globe des destinations"
               style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#ffffff", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px", padding: "12px 20px", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontFamily: T.serif || "inherit", fontSize: 20, fontWeight: 600, color: T.text, flex: "1 1 auto" }}>Où part la promo ?</span>
              <button onClick={() => setFull(false)} style={{ ...pill(false), padding: "8px 14px", fontSize: 14, order: 2 }}>Fermer ✕</button>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, order: 3, flexBasis: "100%" }}>
                {SEMESTERS.map(([v, label]) => (
                  <button key={v} style={pill(sem === v)} onClick={() => { setSem(v); setSelected(null); }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ position: "relative", flex: 1, minHeight: 0, background: "radial-gradient(ellipse at 50% 45%, #0b2a4a 0%, #001931 55%, #000a14 100%)" }}>
              <Suspense fallback={<p style={{ textAlign: "center", marginTop: 80, color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Chargement du globe…</p>}>
                <Globe cities={globeCities} isMine={isMine} selected={globeSelected} onSelect={setSelected} />
              </Suspense>
              <p style={{ position: "absolute", left: 0, right: 0, top: 12, margin: 0, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.55)", pointerEvents: "none" }}>
                Glisse pour faire tourner · molette ou pincement pour zoomer · touche une ville
              </p>
              {selected && (
                <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, display: "flex", justifyContent: "flex-start", pointerEvents: "none" }}>
                  <div style={{ width: "100%", maxWidth: 420, maxHeight: "45vh", overflowY: "auto", pointerEvents: "auto" }}>
                    {renderPanel({ marginTop: 0, boxShadow: T.shadowMd })}
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

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
                <button style={{ ...pill(true), display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setFull(true)}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" /></svg>
                  Plein écran
                </button>
              </div>
            </div>

            <div style={{ ...card, padding: 0, position: "relative", overflow: "hidden", background: OCEAN, border: "none" }}>
              <svg ref={svgRef} viewBox={`${bx} ${by} ${bw} ${bh}`}
                   style={{ width: "100%", height: "auto", display: "block", aspectRatio: `${MAP_W} / ${MAP_H}`, touchAction: "none", cursor: gesture.current?.type === "pan" && dragged.current ? "grabbing" : "grab", userSelect: "none" }}
                   preserveAspectRatio="xMidYMid meet"
                   onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
                   onDoubleClick={e => { const [mx, my] = toMap(e.clientX, e.clientY); zoomAt(e.shiftKey ? 2 : 0.5, mx, my); }}
                   onClick={() => { if (!dragged.current) setSelected(null); }}>
                <image href={EARTH_FLAT} x={0} y={0} width={MAP_W} height={MAP_H} preserveAspectRatio="none" />
                {[...cities].reverse().sort((a, b) => isMine(a) - isMine(b)).map(c => {
                  const [x, y] = cityPos(c);
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
                              stroke="#ffffff" strokeWidth={(active ? 2.2 : 1.3) * z} />
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

            {selected && renderPanel()}

            <p style={{ margin: "8px 0 0", fontSize: 12, color: T.faint }}>
              Glisse pour te déplacer · molette, pincement ou double-clic pour zoomer
            </p>

            {myDest && (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: MINE, display: "inline-block", marginRight: 6, verticalAlign: "-1px" }} />
                {mine
                  ? <>Ta destination : <strong style={{ color: T.text }}>{mine.city}</strong> · {mine.n} étudiant{mine.n > 1 ? "s" : ""}{sem !== "all" ? " ce semestre" : ""} (toi compris)
                      <button onClick={() => { const [x, y] = cityPos(mine); animateTo([x - 60, y - 26, 120, 52]); setSelected(mine); }}
                              style={{ marginLeft: 4, background: "none", border: "none", padding: 0, color: MINE, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Voir sur la carte</button></>
                  : <>Ta destination ({myDest.city}) n'apparaît pas avec ce filtre.</>}
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginTop: 10 }}>
              <div style={{ ...card, padding: 20 }}>
                <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 500, color: T.text }}>Top destinations</p>
                {cities.slice(0, 5).map((c, i) => (
                  <div key={c.country + c.city} onClick={() => { const [x, y] = cityPos(c); animateTo([x - 60, y - 26, 120, 52]); setSelected(c); }}
                       style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, color: isMine(c) ? MINE : T.text, cursor: "pointer", borderTop: i ? `1px solid ${T.border}` : "none" }}>
                    <span>{i + 1}. {c.city} <span style={{ color: T.faint }}>· {c.country}</span></span>
                    <strong>{c.n}</strong>
                  </div>
                ))}
                {!cities.length && <p style={{ margin: 0, fontSize: 14, color: T.muted }}>Pas encore assez d'inscrits.</p>}
              </div>

              <div style={{ ...card, padding: 20 }}>
                <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 500, color: T.text }}>Par continent</p>
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
      .then(d => setCities((d.cities || []).filter(c => c.count >= MIN_SHOW && cityPos(c))))
      .catch(() => setCities([]));
  }, []);
  const max = Math.max(1, ...(cities || []).map(c => c.count));
  const VB_Y = 20, VB_H = MAP_H - 60;
  return (
    <button onClick={onOpen} aria-label="Voir la carte des départs"
            style={{ width: "100%", padding: 0, textAlign: "left", cursor: "pointer", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, overflow: "hidden", display: "block" }}>
      <span style={{ position: "relative", display: "block" }}>
      <svg viewBox={`0 ${VB_Y} ${MAP_W} ${VB_H}`} style={{ width: "100%", height: "auto", display: "block", background: OCEAN }} aria-hidden="true">
        <image href={EARTH_FLAT} x={0} y={0} width={MAP_W} height={MAP_H} preserveAspectRatio="none" />
        {(cities || []).map(c => {
          const [x, y] = cityPos(c);
          return <circle key={c.country + c.city} cx={x} cy={y} r={4 + 9 * Math.sqrt(c.count / max)} fill={RED} fillOpacity={0.85} stroke="#fff" strokeWidth={1.2} />;
        })}
      </svg>
      </span>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "16px 18px", borderTop: `1px solid ${T.border}` }}>
        <span>
          <span style={{ display: "block", fontSize: 15, fontWeight: 500, color: T.text }}>Où part la promo ?</span>
          <span style={{ display: "block", fontSize: 13, color: T.muted, marginTop: 2 }}>
            {cities ? `${cities.length} villes sur la carte` : "Chargement…"}
          </span>
        </span>
        <span style={{ fontSize: 14, color: T.text, textDecoration: "underline", textUnderlineOffset: 3, whiteSpace: "nowrap" }}>Voir la carte</span>
      </span>
    </button>
  );
}
