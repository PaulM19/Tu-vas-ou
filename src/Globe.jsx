import { useEffect, useRef } from "react";
import { geoOrthographic, geoPath, geoDistance, geoInterpolate } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json"; // contours des terres, Natural Earth (domaine public)

// Globe en 3D (projection orthographique sur un <canvas>), habillé avec l'image satellite
// « Whole world – land and oceans » de la NASA (domaine public, public/earth.jpg).
// cities : [{ city, country, n, lng, lat }] · se fait tourner au doigt / à la souris, zoom molette / pincement.
const LAND = feature(land110, land110.objects.land);

const RED = "#E2001A";
const DEG = 180 / Math.PI;

// Charge l'image de la Terre une seule fois et garde ses pixels
let texturePromise = null;
function loadTexture() {
  if (!texturePromise) {
    texturePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const x = c.getContext("2d");
        x.drawImage(img, 0, 0);
        resolve({ w: img.width, h: img.height, px: new Uint32Array(x.getImageData(0, 0, img.width, img.height).data.buffer) });
      };
      img.onerror = reject;
      img.src = "/earth.jpg";
    });
  }
  return texturePromise;
}
const MINE = "#001931";

// zoomable : molette / pincement pour zoomer (désactivé sur l'accueil pour ne pas bloquer le défilement)
// touchAction : "none" en plein écran ; "pan-y" sur l'accueil (glisser vertical = défiler la page)
export default function Globe({ cities, isMine, selected, onSelect, zoomable = true, touchAction = "none" }) {
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
    // Pas de calcul quand le globe n'est pas à l'écran
    let visible = true;
    const io = "IntersectionObserver" in window ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }) : null;
    io?.observe(canvas);
    let tex = null;
    loadTexture().then(t => { tex = t; }).catch(() => {});
    // Tampon de rendu (résolution réduite, agrandie ensuite) et géométrie précalculée des pixels du disque
    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d");
    let geo = null, img = null, out = null;
    const prepare = (q, R) => {
      const bw = Math.max(1, Math.round(w * q)), bh = Math.max(1, Math.round(h * q));
      if (geo && geo.bw === bw && geo.bh === bh && geo.R === R) return;
      buf.width = bw; buf.height = bh;
      img = bctx.createImageData(bw, bh);
      out = new Uint32Array(img.data.buffer);
      const idx = [], xs = [], ys = [], zs = [], shade = [];
      const L = [-0.45, 0.5, 0.74]; // direction de la lumière (haut gauche, vers l'avant)
      for (let j = 0; j < bh; j++) {
        const y = (h / 2 - (j + 0.5) / q) / R;
        if (y < -1 || y > 1) continue;
        for (let i = 0; i < bw; i++) {
          const x = ((i + 0.5) / q - w / 2) / R;
          const r2 = x * x + y * y;
          if (r2 >= 1) continue;
          const z = Math.sqrt(1 - r2);
          idx.push(j * bw + i); xs.push(x); ys.push(y); zs.push(z);
          const lambert = Math.max(0, x * L[0] + y * L[1] + z * L[2]);
          shade.push(Math.min(1.12, 0.38 + 0.8 * lambert)); // côté nuit assombri, jamais complètement noir
        }
      }
      geo = { bw, bh, R, idx: Int32Array.from(idx), x: Float32Array.from(xs), y: Float32Array.from(ys), z: Float32Array.from(zs), shade: Float32Array.from(shade) };
    };
    // Dessine la Terre texturée pour la rotation actuelle
    const renderEarth = (rot, R) => {
      const q = Math.min(dpr, 720 / Math.max(w, h, 1));
      prepare(q, R);
      out.fill(0);
      const lam0 = -rot[0] / DEG, phi0 = -rot[1] / DEG;
      const sp = Math.sin(phi0), cp = Math.cos(phi0);
      const { idx, x, y, z, shade } = geo, n = idx.length, tw = tex.w, th = tex.h, tp = tex.px;
      for (let k = 0; k < n; k++) {
        const lat = Math.asin(Math.max(-1, Math.min(1, z[k] * sp + y[k] * cp)));
        let lng = lam0 + Math.atan2(x[k], z[k] * cp - y[k] * sp);
        let u = ((lng * DEG + 180) / 360) % 1; if (u < 0) u += 1;
        const v = (90 - lat * DEG) / 180;
        const c = tp[Math.min(th - 1, (v * th) | 0) * tw + ((u * tw) | 0)];
        const f = shade[k];
        const r = Math.min(255, (c & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, ((c >> 16) & 255) * f);
        out[idx[k]] = 0xff000000 | (b << 16) | (g << 8) | r;
      }
      bctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(buf, 0, 0, w, h);
    };

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
      if (!visible || document.hidden) { raf = requestAnimationFrame(draw); return; }
      const s = state.current;
      if (s.anim) s.anim(now);
      else if (!s.dragging && now > s.idleUntil) s.rotate = [s.rotate[0] + 0.08, s.rotate[1]];

      const base = Math.min(w, h) / 2 - 28;
      projection.scale(base * s.scale).translate([w / 2, h / 2]).rotate(s.rotate);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const R = base * s.scale, cx = w / 2, cy = h / 2;
      // Halo de l'atmosphère autour de la Terre
      const glow = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.12);
      glow.addColorStop(0, "rgba(120,180,255,0.45)"); glow.addColorStop(1, "rgba(120,180,255,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2); ctx.fill();

      if (tex) {
        renderEarth(s.rotate, R);
      } else {
        // En attendant l'image : océan bleu et continents verts
        ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = "#1b4f8a"; ctx.fill();
        ctx.beginPath(); path(LAND); ctx.fillStyle = "#5f7f4a"; ctx.fill();
      }
      // Reflet léger et bord de l'atmosphère
      const sheen = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
      sheen.addColorStop(0, "rgba(255,255,255,0.10)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.strokeStyle = "rgba(160,205,255,0.55)"; ctx.lineWidth = 1.2; ctx.stroke();

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
        if (me) { ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = me ? MINE : RED; ctx.globalAlpha = me || active ? 0.95 : 0.75; ctx.fill(); ctx.globalAlpha = 1;
        ctx.lineWidth = active ? 2.5 : 1.5; ctx.strokeStyle = "#ffffff"; ctx.stroke();
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
    if (zoomable) canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => { cancelAnimationFrame(raf); ro.disconnect(); io?.disconnect(); canvas.removeEventListener("wheel", onWheel); };
  }, []);

  // Glisser pour tourner, pincer pour zoomer, toucher une ville pour l'ouvrir
  const onPointerDown = e => {
    const s = state.current;
    canvasRef.current.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    s.anim = null;
    if (pointers.current.size === 1) { s.dragging = true; s.moved = false; s.last = { x: e.clientX, y: e.clientY }; }
    if (pointers.current.size === 2 && zoomable) {
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
            style={{ width: "100%", height: "100%", display: "block", touchAction, cursor: "grab" }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
  );
}
