import { useEffect, useRef } from "react";
import { geoOrthographic, geoPath, geoGraticule10, geoDistance, geoInterpolate } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json"; // contours des terres, Natural Earth (domaine public)

// Globe en 3D (projection orthographique sur un <canvas>).
// cities : [{ city, country, n, lng, lat }] · se fait tourner au doigt / à la souris, zoom molette / pincement.
const LAND = feature(land110, land110.objects.land);
const GRATICULE = geoGraticule10();

const RED = "#E2001A";
const MINE = "#001931";

export default function Globe({ cities, isMine, selected, onSelect }) {
  const canvasRef = useRef(null);
  const state = useRef({ rotate: [-10, -25], scale: 1, dragging: false, moved: false, last: null, pinch: null, idleUntil: 0, anim: null });
  const pointers = useRef(new Map());
  const propsRef = useRef({ cities, isMine, selected });
  propsRef.current = { cities, isMine, selected };

  // Centre le globe sur la ville sélectionnée (rotation douce)
  useEffect(() => {
    if (!selected || selected.lng == null) return;
    const s = state.current;
    const from = [-s.rotate[0], -s.rotate[1]], to = [selected.lng, Math.max(-60, Math.min(60, selected.lat))];
    const interp = geoInterpolate(from, to);
    const t0 = performance.now();
    s.anim = now => {
      const t = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - t, 3);
      const [lng, lat] = interp(e);
      s.rotate = [-lng, -lat];
      if (t >= 1) s.anim = null;
    };
    s.idleUntil = Infinity; // on arrête la rotation automatique tant qu'une ville est ouverte
  }, [selected]);
  useEffect(() => { if (!selected) state.current.idleUntil = performance.now() + 2500; }, [selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const projection = geoOrthographic().clipAngle(90).precision(0.6);
    const path = geoPath(projection, ctx);
    let raf, w = 0, h = 0, dpr = 1;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = now => {
      const s = state.current;
      if (s.anim) s.anim(now);
      else if (!s.dragging && now > s.idleUntil) s.rotate = [s.rotate[0] + 0.08, s.rotate[1]];

      const base = Math.min(w, h) / 2 - 16;
      projection.scale(base * s.scale).translate([w / 2, h / 2]).rotate(s.rotate);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Océan, quadrillage, terres
      ctx.beginPath(); path({ type: "Sphere" });
      ctx.fillStyle = "#f6f4f1"; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = "#e7e5e1"; ctx.stroke();
      ctx.beginPath(); path(GRATICULE); ctx.strokeStyle = "rgba(0,25,49,0.05)"; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.beginPath(); path(LAND); ctx.fillStyle = "#e4dfd7"; ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 0.6; ctx.stroke();

      // Villes (seulement la face visible)
      const { cities: list, isMine: mineFn, selected: sel } = propsRef.current;
      const center = [-s.rotate[0], -s.rotate[1]];
      const max = Math.max(1, ...list.map(c => c.n));
      const k = Math.pow(s.scale, 0.5);
      s.hits = [];
      const ordered = [...list].sort((a, b) => (mineFn(a) - mineFn(b)) || (a.n - b.n));
      for (const c of ordered) {
        if (c.lng == null || geoDistance([c.lng, c.lat], center) > Math.PI / 2 - 0.02) continue;
        const [x, y] = projection([c.lng, c.lat]);
        const r = (3.5 + 11 * Math.sqrt(c.n / max)) * k;
        const me = mineFn(c), active = sel && sel.city === c.city && sel.country === c.country;
        if (me) { ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.strokeStyle = MINE; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = me ? MINE : RED; ctx.globalAlpha = me || active ? 0.95 : 0.75; ctx.fill(); ctx.globalAlpha = 1;
        ctx.lineWidth = active ? 2 : 1; ctx.strokeStyle = "#ffffff"; ctx.stroke();
        if (r >= 10) {
          ctx.fillStyle = "#fff"; ctx.font = `600 ${Math.round(r * 0.9)}px Poppins, sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(c.n), x, y + 0.5);
        }
        s.hits.push({ c, x, y, r: Math.max(r, 12) });
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // Zoom à la molette / pavé tactile
    const onWheel = e => {
      e.preventDefault();
      const s = state.current;
      s.scale = Math.min(6, Math.max(0.7, s.scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002))));
      s.idleUntil = Math.max(s.idleUntil, performance.now() + 2500);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener("wheel", onWheel); };
  }, []);

  // Glisser pour tourner, pincer pour zoomer, toucher une ville pour l'ouvrir
  const onPointerDown = e => {
    const s = state.current;
    canvasRef.current.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    s.anim = null;
    if (pointers.current.size === 1) { s.dragging = true; s.moved = false; s.last = { x: e.clientX, y: e.clientY }; }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      s.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale: s.scale };
    }
  };
  const onPointerMove = e => {
    const s = state.current;
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && s.pinch) {
      const [a, b] = [...pointers.current.values()];
      s.scale = Math.min(6, Math.max(0.7, s.pinch.scale * Math.hypot(a.x - b.x, a.y - b.y) / (s.pinch.d || 1)));
      s.moved = true;
      return;
    }
    if (!s.dragging || !s.last) return;
    const dx = e.clientX - s.last.x, dy = e.clientY - s.last.y;
    if (!s.moved && Math.hypot(dx, dy) < 4) return;
    s.moved = true;
    const f = 0.35 / s.scale;
    s.rotate = [s.rotate[0] + dx * f, Math.max(-80, Math.min(80, s.rotate[1] - dy * f))];
    s.last = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = e => {
    const s = state.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) s.pinch = null;
    if (pointers.current.size > 0) return;
    s.dragging = false;
    if (!s.moved) {
      // Toucher : ville la plus proche du doigt
      const r = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = (s.hits || []).filter(h => Math.hypot(h.x - x, h.y - y) <= h.r).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
      onSelect(hit ? hit.c : null);
    }
    if (!propsRef.current.selected) s.idleUntil = performance.now() + 2500;
  };

  return (
    <canvas ref={canvasRef} aria-label="Globe des destinations : glisse pour le faire tourner"
            style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
  );
}
