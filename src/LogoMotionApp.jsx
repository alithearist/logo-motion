import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Upload, Play, Pause, RotateCcw, Layers, AlertTriangle } from "lucide-react";

/* =========================================================================
   FONT / GLOBAL STYLE
   ========================================================================= */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,500;0,600;1,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    .lm-root { font-family: 'Inter', sans-serif; }
    .lm-display { font-family: 'Fraunces', serif; }
    .lm-mono { font-family: 'JetBrains Mono', monospace; }
    .lm-checker {
      background-image:
        linear-gradient(45deg, #1c1c22 25%, transparent 25%),
        linear-gradient(-45deg, #1c1c22 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1c1c22 75%),
        linear-gradient(-45deg, transparent 75%, #1c1c22 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
      background-color: #131316;
    }
    .lm-slider::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 13px; height: 13px; border-radius: 999px;
      background: #F3F1EE; cursor: pointer; margin-top: -5px;
      box-shadow: 0 0 0 3px rgba(156,140,255,0.35);
    }
    .lm-slider::-webkit-slider-runnable-track { height: 3px; border-radius: 999px; background: #2c2c34; }
    .lm-slider { -webkit-appearance: none; appearance: none; background: transparent; }
    .lm-scroll::-webkit-scrollbar { height: 6px; }
    .lm-scroll::-webkit-scrollbar-thumb { background: #2c2c34; border-radius: 999px; }

    /* THEME — defined as plain CSS rather than Tailwind arbitrary-value classes
       (bg-[#0B0B0E] etc.), which don't always compile in every host. */
    .lm-root { background: #0B0B0E; color: #F3F1EE; min-height: 100vh; width: 100%; }
    .lm-eyebrow { color: #8A8A93; }
    .lm-muted { color: #8A8A93; }
    .lm-panel { background: #141418; border: 1px solid #24242B; }
    .lm-panel:hover { border-color: #33333d; }
    .lm-panel-active { background: rgba(156,140,255,0.08); border: 1px solid #9C8CFF; }
    .lm-drop-active { background: rgba(156,140,255,0.06); border: 1px solid #9C8CFF; }
    .lm-card-outline { border: 1px solid #24242B; }
    .lm-canvas { background: #FAFAF7; }
    .lm-btn-primary { background: #F3F1EE; color: #0B0B0E; }
    .lm-btn-primary:hover { background: #ffffff; }
    .lm-btn-ghost { border: 1px solid #24242B; color: #8A8A93; }
    .lm-btn-ghost:hover { color: #F3F1EE; border-color: #3a3a44; }
    .lm-chip { border: 1px solid #24242B; color: #8A8A93; }
    .lm-chip-active { border: 1px solid #9C8CFF; color: #F3F1EE; }
    .lm-accent { color: #9C8CFF; }

    /* panel UI */
    .lm-input {
      background: #0E0E12; border: 1px solid #24242B; color: #F3F1EE;
      outline: none; font-family: inherit;
    }
    .lm-input:focus { border-color: #4b4b57; }
    .lm-input::placeholder { color: #6a6a73; }
    select.lm-input { appearance: none; -webkit-appearance: none; }
    .lm-seg { background: #0E0E12; border: 1px solid #24242B; }
    .lm-seg-item { background: transparent; color: #8A8A93; cursor: pointer; font-family: inherit; }
    .lm-seg-on { background: #2A2A33; color: #F3F1EE; }
    .lm-toggle {
      width: 44px; height: 26px; border-radius: 999px; background: #3a3a44;
      display: inline-flex; align-items: center; padding: 3px; transition: background .18s ease; flex-shrink: 0;
    }
    .lm-toggle-knob {
      width: 20px; height: 20px; border-radius: 999px; background: #0B0B0E;
      transition: transform .18s ease;
    }
    .lm-toggle-on { background: #C9C4D6; }
    .lm-toggle-on .lm-toggle-knob { transform: translateX(18px); }
    .lm-warn { background: rgba(229,169,74,0.08); border: 1px solid rgba(229,169,74,0.35); }
    .lm-note { background: #0E0E12; border: 1px solid #24242B; }
    .lm-btn-accent { color: #0B0B0E; cursor: pointer; font-family: inherit; }
  `}</style>
);

/* =========================================================================
   EASING — cubic-bezier(0.65, 0, 0.35, 1) solved numerically (GSAP-free)
   ========================================================================= */
function makeCubicBezierEase(x1, y1, x2, y2) {
  const A = (a1, a2) => 1.0 - 3.0 * a2 + 3.0 * a1;
  const B = (a1, a2) => 3.0 * a2 - 6.0 * a1;
  const C = (a1) => 3.0 * a1;
  const calcBezier = (t, a1, a2) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
  const calcSlope = (t, a1, a2) => 3.0 * A(a1, a2) * t * t + 2.0 * B(a1, a2) * t + C(a1);
  return function (x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const slope = calcSlope(t, x1, x2);
      if (Math.abs(slope) < 1e-6) break;
      t -= (calcBezier(t, x1, x2) - x) / slope;
    }
    return calcBezier(t, y1, y2);
  };
}
const EASE = makeCubicBezierEase(0.65, 0, 0.35, 1);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const localT = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp01((t - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;

/* =========================================================================
   DEMO SVG
   ========================================================================= */
const DEMO_SVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 20 C140 40 160 78 160 100 C160 122 140 160 100 180 C60 160 40 122 40 100 C40 78 60 40 100 20 Z" fill="#4C3BCF"/>
  <path d="M100 42 C88 70 88 130 100 158" fill="none" stroke="#E8734A" stroke-width="4" stroke-linecap="round"/>
  <path d="M100 180 L100 194" fill="none" stroke="#E8734A" stroke-width="4" stroke-linecap="round"/>
  <circle cx="100" cy="24" r="7" fill="#E8734A"/>
</svg>`.trim();

/* =========================================================================
   SVG -> AST (pure, in-memory DOMParser — never touches the live page DOM).
   Rendering the original artwork is 100% declarative from this AST via
   React.createElement, so there is no cloneNode/innerHTML step that can
   silently fail: if the AST parsed, React WILL render it.
   ========================================================================= */
const DRAWABLE_TAGS = ["path", "circle", "ellipse", "rect", "polygon", "polyline", "line"];
const CONSTRUCTION_ALLOWED_TAGS = new Set(["g", ...DRAWABLE_TAGS]);

function sanitizeSvgText(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function parseStyleString(str) {
  const out = {};
  String(str).split(";").forEach((decl) => {
    const idx = decl.indexOf(":");
    if (idx === -1) return;
    const prop = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!prop || !val) return;
    const camel = prop.startsWith("--") ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = val;
  });
  return out;
}

// element -> {tag, attrs, children, text}. class->className and inline
// style strings -> objects are handled here so React can render the result
// directly and identically to the source markup.
function elementToAst(el) {
  const tag = el.tagName.toLowerCase();
  const attrs = {};
  Array.from(el.attributes).forEach((a) => {
    let name = a.name;
    if (name.toLowerCase().startsWith("on")) return;
    if (name === "class") { attrs.className = a.value; return; }
    if (name === "style") { attrs.style = parseStyleString(a.value); return; }
    attrs[name] = a.value;
  });
  const children = Array.from(el.children).map(elementToAst);
  const text = el.children.length === 0 ? (el.textContent || "").trim() : "";
  return { tag, attrs, children, text: text || null };
}

function parseSvgToAst(rawText) {
  try {
    const clean = sanitizeSvgText(rawText);
    const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
    if (doc.querySelector("parsererror")) return null;
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") return null;
    return elementToAst(root);
  } catch (e) {
    return null;
  }
}

// Renders the AST tree with React.createElement — no dangerouslySetInnerHTML,
// no cloneNode. mode "original" passes every attribute through untouched.
// mode "construction" keeps only structural <g> + drawable geometry tags,
// and overrides fill/stroke/dash directly (never spreads the source's own
// fill/stroke/style/class, so nothing from the artwork can leak through).
function renderAstNode(node, keyPrefix, mode, ctx) {
  if (!node) return null;
  const { tag, attrs, children, text } = node;

  if (mode === "construction" && !CONSTRUCTION_ALLOWED_TAGS.has(tag)) return null;

  let outAttrs;
  if (mode === "construction" && DRAWABLE_TAGS.includes(tag)) {
    const idx = ctx.counter.i++;
    const len = ctx.model?.shapes?.[idx]?.length || 0;
    outAttrs = {
      transform: attrs.transform,
      d: attrs.d, cx: attrs.cx, cy: attrs.cy, r: attrs.r, rx: attrs.rx, ry: attrs.ry,
      x: attrs.x, y: attrs.y, width: attrs.width, height: attrs.height, points: attrs.points,
      x1: attrs.x1, y1: attrs.y1, x2: attrs.x2, y2: attrs.y2,
      fill: "rgba(255,255,255,0.12)",
      stroke: ctx.accent || "#7867ff",
      strokeWidth: ctx.strokeW,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    };
    if (len > 0) {
      outAttrs.strokeDasharray = len;
      // RTL marks read right-to-left, so the dash offset is negated to draw
      // from the opposite end of each contour.
      const remaining = len * (1 - (ctx.layer?.outlineProgress ?? 0));
      outAttrs.strokeDashoffset = ctx.rtl ? -remaining : remaining;
    }
    Object.keys(outAttrs).forEach((k) => outAttrs[k] === undefined && delete outAttrs[k]);
  } else {
    outAttrs = { ...attrs }; // original mode: exact pass-through, untouched
    // LOGO FILL override — the one permitted deviation from pass-through. Only
    // recolours shapes that actually had a fill, so strokes and "fill:none"
    // construction paths in the source keep their behaviour.
    if (ctx?.fillOverride && DRAWABLE_TAGS.includes(tag)) {
      const f = attrs.fill;
      if (f !== "none") outAttrs.fill = ctx.fillOverride;
      if (attrs.stroke && attrs.stroke !== "none") outAttrs.stroke = ctx.fillOverride;
    }
  }

  const kids = (children || []).map((c, i) => renderAstNode(c, `${keyPrefix}-${i}`, mode, ctx));
  return React.createElement(tag, { key: keyPrefix, ...outAttrs }, text || undefined, ...kids);
}

/* =========================================================================
   LIVE GEOMETRY — measured from the already-mounted, visible original-layer
   <svg> (via ref), never from an off-screen hidden clone. Whatever is on
   screen is exactly what gets measured.
   ========================================================================= */
function getEffectiveTransform(el, root) {
  const chain = [];
  let node = el;
  while (node && node !== root) {
    const t = node.getAttribute && node.getAttribute("transform");
    if (t) chain.unshift(t);
    node = node.parentNode;
  }
  return chain.join(" ");
}

// Returns the element's bbox in the ROOT SVG's user coordinate system.
//
// Important: el.getCTM() maps the element to the nearest *viewport*, which
// means it already includes the root viewBox -> pixel mapping. Using it raw
// yields pixel coordinates that don't line up with the user-space viewBox we
// animate, which makes the computed camera frame wrong (logo cropped/offset).
// Multiplying by the inverse of the root's own CTM cancels that mapping and
// leaves only the element's own transform chain.
function ctmTransformedBBox(el, rootEl) {
  try {
    const bbox = el.getBBox();
    let m = el.getCTM();
    if (rootEl && rootEl.getCTM) {
      const rootCTM = rootEl.getCTM();
      if (rootCTM && m) {
        try { m = rootCTM.inverse().multiply(m); } catch (e) { /* keep m */ }
      }
    }
    if (!m || (bbox.width === 0 && bbox.height === 0 && bbox.x === 0 && bbox.y === 0)) {
      return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
    }
    const corners = [
      [bbox.x, bbox.y], [bbox.x + bbox.width, bbox.y],
      [bbox.x, bbox.y + bbox.height], [bbox.x + bbox.width, bbox.y + bbox.height],
    ].map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }));
    const xs = corners.map((c) => c.x), ys = corners.map((c) => c.y);
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  } catch (e) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}

function parsePathHandles(d) {
  const segs = [];
  try {
    let i = 0;
    const n = d.length;
    const isCmd = (c) => "MLHVCSQTAZmlhvcsqtaz".includes(c);
    const readNum = () => {
      while (i < n && /[\s,]/.test(d[i])) i++;
      const start = i;
      if (d[i] === "-" || d[i] === "+") i++;
      let hasDigits = false;
      while (i < n && /[0-9]/.test(d[i])) { i++; hasDigits = true; }
      if (d[i] === ".") { i++; while (i < n && /[0-9]/.test(d[i])) { i++; hasDigits = true; } }
      if (hasDigits && (d[i] === "e" || d[i] === "E")) {
        i++;
        if (d[i] === "-" || d[i] === "+") i++;
        while (i < n && /[0-9]/.test(d[i])) i++;
      }
      if (!hasDigits) throw new Error("bad number");
      return parseFloat(d.slice(start, i));
    };
    let cmd = null, cx = 0, cy = 0, sx = 0, sy = 0, lastC2 = null, lastQC = null;
    while (i < n) {
      while (i < n && /[\s,]/.test(d[i])) i++;
      if (i >= n) break;
      if (isCmd(d[i])) { cmd = d[i]; i++; }
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();
      if (C === "M") {
        const x = readNum(), y = readNum();
        cx = rel ? cx + x : x; cy = rel ? cy + y : y;
        sx = cx; sy = cy; lastC2 = null; lastQC = null;
        cmd = rel ? "l" : "L";
      } else if (C === "L") {
        const x = readNum(), y = readNum();
        cx = rel ? cx + x : x; cy = rel ? cy + y : y; lastC2 = null; lastQC = null;
      } else if (C === "H") { const x = readNum(); cx = rel ? cx + x : x; lastC2 = null; lastQC = null; }
      else if (C === "V") { const y = readNum(); cy = rel ? cy + y : y; lastC2 = null; lastQC = null; }
      else if (C === "C") {
        const x1 = readNum(), y1 = readNum(), x2 = readNum(), y2 = readNum(), x = readNum(), y = readNum();
        const p1 = { x: rel ? cx + x1 : x1, y: rel ? cy + y1 : y1 };
        const p2 = { x: rel ? cx + x2 : x2, y: rel ? cy + y2 : y2 };
        const from = { x: cx, y: cy };
        cx = rel ? cx + x : x; cy = rel ? cy + y : y;
        segs.push({ from, c1: p1, c2: p2, to: { x: cx, y: cy } });
        lastC2 = p2; lastQC = null;
      } else if (C === "S") {
        const x2 = readNum(), y2 = readNum(), x = readNum(), y = readNum();
        const p1 = lastC2 ? { x: 2 * cx - lastC2.x, y: 2 * cy - lastC2.y } : { x: cx, y: cy };
        const p2 = { x: rel ? cx + x2 : x2, y: rel ? cy + y2 : y2 };
        const from = { x: cx, y: cy };
        cx = rel ? cx + x : x; cy = rel ? cy + y : y;
        segs.push({ from, c1: p1, c2: p2, to: { x: cx, y: cy } });
        lastC2 = p2; lastQC = null;
      } else if (C === "Q") {
        const x1 = readNum(), y1 = readNum(), x = readNum(), y = readNum();
        const p1 = { x: rel ? cx + x1 : x1, y: rel ? cy + y1 : y1 };
        const from = { x: cx, y: cy };
        cx = rel ? cx + x : x; cy = rel ? cy + y : y;
        segs.push({ from, c1: p1, c2: p1, to: { x: cx, y: cy } });
        lastQC = p1; lastC2 = null;
      } else if (C === "T") {
        const x = readNum(), y = readNum();
        const p1 = lastQC ? { x: 2 * cx - lastQC.x, y: 2 * cy - lastQC.y } : { x: cx, y: cy };
        const from = { x: cx, y: cy };
        cx = rel ? cx + x : x; cy = rel ? cy + y : y;
        segs.push({ from, c1: p1, c2: p1, to: { x: cx, y: cy } });
        lastQC = p1; lastC2 = null;
      } else if (C === "A") {
        readNum(); readNum(); readNum();
        while (i < n && /[\s,]/.test(d[i])) i++; i++;
        while (i < n && /[\s,]/.test(d[i])) i++; i++;
        const x = readNum(), y = readNum();
        cx = rel ? cx + x : x; cy = rel ? cy + y : y; lastC2 = null; lastQC = null;
      } else if (C === "Z") { cx = sx; cy = sy; lastC2 = null; lastQC = null; }
      else break;
    }
  } catch (e) { return []; }
  return segs;
}

function clusterCoords(values, span) {
  const thresh = Math.max(span * 0.035, 0.5);
  const sorted = [...values].sort((a, b) => a - b);
  const out = [];
  let bucket = [];
  for (const v of sorted) {
    if (bucket.length === 0 || v - bucket[bucket.length - 1] <= thresh) bucket.push(v);
    else { out.push(bucket.reduce((a, b) => a + b, 0) / bucket.length); bucket = [v]; }
  }
  if (bucket.length) out.push(bucket.reduce((a, b) => a + b, 0) / bucket.length);
  return out;
}

// Builds the geometry model by measuring the LIVE, VISIBLE original-layer
// <svg> (passed in via ref). The camera "base" viewBox is derived from the
// artwork's actual measured bounds, with the declared viewBox only as a
// fallback — see the CAMERA FRAME note below for why.
// SAFE_AREA = fraction of the canvas the artwork itself should occupy. The
// camera's base viewBox is deliberately larger than the logo's own bounds so
// the mark sits with generous breathing room instead of filling the frame.
const SAFE_AREA = 0.48;

function buildGeometryModel(rootEl) {
  if (!rootEl) return null;
  let declared = null;
  const vb = rootEl.getAttribute("viewBox");
  if (vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p.every(Number.isFinite) && p[2] > 0 && p[3] > 0) {
      declared = { x: p[0], y: p[1], w: p[2], h: p[3] };
    }
  }
  if (!declared) {
    const w = parseFloat(rootEl.getAttribute("width"));
    const h = parseFloat(rootEl.getAttribute("height"));
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) declared = { x: 0, y: 0, w, h };
  }
  if (!declared) declared = { x: 0, y: 0, w: 200, h: 200 };

  const els = Array.from(rootEl.querySelectorAll(DRAWABLE_TAGS.join(",")));
  const allX = [], allY = [];
  const shapes = els.map((el, idx) => {
    const tag = el.tagName.toLowerCase();
    const transform = getEffectiveTransform(el, rootEl);
    let length = 0;
    try { length = el.getTotalLength ? el.getTotalLength() : 0; } catch (e) { length = 0; }
    const bbox = ctmTransformedBBox(el, rootEl);
    if (bbox.width > 0 || bbox.height > 0) {
      allX.push(bbox.x, bbox.x + bbox.width);
      allY.push(bbox.y, bbox.y + bbox.height);
    }
    let handles = [];
    let subpaths = 0;
    if (tag === "path") {
      const d = el.getAttribute("d") || "";
      handles = parsePathHandles(d);
      subpaths = (d.match(/[Mm]/g) || []).length;
    } else {
      subpaths = 1;
    }
    // is this shape (near-)circular? used for the "circles fitted" stat and the
    // Geometry template's construction circles
    let circular = tag === "circle" || tag === "ellipse";
    if (!circular && bbox.width > 0 && bbox.height > 0) {
      const ratio = bbox.width / bbox.height;
      if (ratio > 0.88 && ratio < 1.14 && length > 0) {
        const perimeterOfCircle = Math.PI * ((bbox.width + bbox.height) / 2);
        if (Math.abs(length - perimeterOfCircle) / perimeterOfCircle < 0.14) circular = true;
      }
    }
    const fillAttr = el.getAttribute("fill");
    return { id: `s${idx}`, tag, transform, length, bbox, handles, anchors: [], subpaths, circular, fillAttr };
  });

  // CAMERA FRAME — derived from the artwork's ACTUAL measured bounds (the union
  // of every shape's transformed bbox), not the declared viewBox. Exports often
  // declare a viewBox that doesn't match where the paths really sit; trusting it
  // crops the logo so the animation looks permanently zoomed in. The declared
  // viewBox is only a fallback when measurement fails.
  // Anything that renders but isn't a drawable path (live <text>, <image>,
  // <use>) still occupies space. It can't be animated, but it MUST be inside
  // the camera frame or it gets cropped — so fold its bounds in here.
  Array.from(rootEl.querySelectorAll("text, image, use")).forEach((el) => {
    const b = ctmTransformedBBox(el, rootEl);
    if (b.width > 0 || b.height > 0) {
      allX.push(b.x, b.x + b.width);
      allY.push(b.y, b.y + b.height);
    }
  });

  let art;
  if (allX.length && allY.length) {
    const minX = Math.min(...allX), maxX = Math.max(...allX);
    const minY = Math.min(...allY), maxY = Math.max(...allY);
    if (maxX > minX && maxY > minY) {
      art = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
  }

  // AUTHORITATIVE UNION — the root's own getBBox() covers EVERY rendered
  // descendant at once, including anything the per-element pass missed
  // (nested groups, <use>, elements whose individual getBBox threw). Folding
  // it in guarantees the frame can never be smaller than the real drawing,
  // which is what causes the logo to overflow and look permanently zoomed.
  try {
    const rb = rootEl.getBBox();
    if (rb && rb.width > 0 && rb.height > 0) {
      if (!art) {
        art = { x: rb.x, y: rb.y, w: rb.width, h: rb.height };
      } else {
        const minX = Math.min(art.x, rb.x);
        const minY = Math.min(art.y, rb.y);
        const maxX = Math.max(art.x + art.w, rb.x + rb.width);
        const maxY = Math.max(art.y + art.h, rb.y + rb.height);
        art = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      }
    }
  } catch (e) { /* fall through to what we have */ }

  if (!art) art = { x: declared.x, y: declared.y, w: declared.w, h: declared.h };

  // Square frame around the artwork's true centre, expanded so the logo fills
  // ~SAFE_AREA of it. Square keeps margins consistent for wide and tall marks.
  const artCx = art.x + art.w / 2;
  const artCy = art.y + art.h / 2;
  const frameSpan = Math.max(art.w, art.h) / SAFE_AREA;
  const base = {
    x: artCx - frameSpan / 2,
    y: artCy - frameSpan / 2,
    w: frameSpan,
    h: frameSpan,
  };

  const totalLen = shapes.reduce((s, sh) => s + sh.length, 0) || 1;
  const BUDGET = 64;
  shapes.forEach((sh, idx) => {
    if (sh.length <= 0) return;
    const el = els[idx];
    let count = Math.round((sh.length / totalLen) * BUDGET);
    count = Math.min(Math.max(count, 4), 26);
    try {
      for (let k = 0; k <= count; k++) {
        const pt = el.getPointAtLength((k / count) * sh.length);
        sh.anchors.push({ x: pt.x, y: pt.y });
      }
    } catch (e) { /* skip */ }
  });

  const guideXs = allX.length ? clusterCoords(allX, base.w) : [];
  const guideYs = allY.length ? clusterCoords(allY, base.h) : [];

  let focus = shapes.reduce((best, sh) => (sh.handles.length > (best?.handles.length ?? -1) ? sh : best), null);
  if (!focus || focus.handles.length === 0) {
    focus = shapes.reduce((best, sh) => (sh.bbox.width * sh.bbox.height > (best?.bbox.width * best?.bbox.height || -1) ? sh : best), shapes[0] || null);
  }
  const fb = focus?.bbox;
  let zoomTarget;
  // Zoom depth is expressed as a fraction of the BASE frame (not the shape's own
  // bbox), so magnification stays consistent no matter how small the focus shape
  // is. ~46% of the frame is a readable detail view, not an extreme close-up.
  const zoomSpan = Math.max(base.w, base.h) * 0.46;
  if (fb && fb.width > 0 && fb.height > 0) {
    zoomTarget = {
      x: fb.x + fb.width * 0.5 - zoomSpan / 2,
      y: fb.y + fb.height * 0.5 - zoomSpan / 2,
      w: zoomSpan,
      h: zoomSpan,
    };
  } else {
    zoomTarget = {
      x: base.x + base.w * 0.5 - zoomSpan / 2,
      y: base.y + base.h * 0.5 - zoomSpan / 2,
      w: zoomSpan,
      h: zoomSpan,
    };
  }

  // CAMERA SPOTS — the 3 densest regions of the drawing, found by bucketing
  // every sampled anchor point into a grid and taking the fullest cells. These
  // become the automatic detail shots (and the numbered boxes in the picker).
  const allPts = [];
  shapes.forEach((sh) => sh.anchors.forEach((a) => allPts.push(a)));
  const spots = [];
  if (allPts.length > 0) {
    const GRID = 6;
    const cellW = base.w / GRID, cellH = base.h / GRID;
    const cells = new Map();
    allPts.forEach((p) => {
      const gx = Math.min(GRID - 1, Math.max(0, Math.floor((p.x - base.x) / cellW)));
      const gy = Math.min(GRID - 1, Math.max(0, Math.floor((p.y - base.y) / cellH)));
      const key = `${gx}:${gy}`;
      if (!cells.has(key)) cells.set(key, { gx, gy, pts: [] });
      cells.get(key).pts.push(p);
    });
    const ranked = Array.from(cells.values()).sort((a, b) => b.pts.length - a.pts.length);
    const chosen = [];
    for (const c of ranked) {
      // keep spots spread out — skip cells adjacent to one already chosen
      if (chosen.some((o) => Math.abs(o.gx - c.gx) <= 1 && Math.abs(o.gy - c.gy) <= 1)) continue;
      chosen.push(c);
      if (chosen.length === 3) break;
    }
    while (chosen.length < 3 && ranked.length > chosen.length) {
      const next = ranked.find((c) => !chosen.includes(c));
      if (!next) break;
      chosen.push(next);
    }
    chosen.forEach((c) => {
      const xs = c.pts.map((p) => p.x), ys = c.pts.map((p) => p.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      spots.push({
        x: cx - zoomSpan / 2,
        y: cy - zoomSpan / 2,
        w: zoomSpan,
        h: zoomSpan,
        cx, cy,
      });
    });
  }
  if (spots.length === 0) spots.push({ ...zoomTarget, cx: base.x + base.w / 2, cy: base.y + base.h / 2 });

  // ENGINE STATS — everything reported in "What the engine found"
  const stats = {
    shapes: shapes.length,
    contours: shapes.reduce((s, sh) => s + (sh.subpaths || 0), 0),
    anchorPoints: shapes.reduce((s, sh) => s + sh.anchors.length, 0),
    partsDetected: rootEl.querySelectorAll("g").length || 1,
    // a path with more than one subpath almost always encloses a counter
    // (the hole in an "o", "ه", "و" and so on)
    counters: shapes.reduce((s, sh) => s + Math.max(0, (sh.subpaths || 1) - 1), 0),
    circlesFitted: shapes.filter((sh) => sh.circular).length,
    guideLines: guideXs.length + guideYs.length,
  };

  // colours actually present in the artwork, for the "from your logo" swatches
  const logoColors = [];
  shapes.forEach((sh) => {
    const f = sh.fillAttr;
    if (f && f !== "none" && !f.startsWith("url(") && !logoColors.includes(f)) logoColors.push(f);
  });

  return { declared, art, base, shapes, guideXs, guideYs, zoomTarget, spots, stats, logoColors };
}

// Detects live <text>/<tspan> in the AST. SVG text renders with whatever fonts
// the viewer has, and has no path geometry to measure or draw — so it can't be
// animated and may vanish entirely. Worth warning about explicitly.
/* =========================================================================
   AST -> MARKUP STRING
   Mirrors renderAstNode exactly, but emits an SVG string instead of React
   elements. Used by the video exporter so every rendered frame is identical
   to what the live preview shows.
   ========================================================================= */
const SVG_ATTR_NAME = { className: "class", strokeWidth: "stroke-width", strokeDasharray: "stroke-dasharray", strokeDashoffset: "stroke-dashoffset", strokeLinecap: "stroke-linecap", strokeLinejoin: "stroke-linejoin" };

function escapeAttr(v) {
  return String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attrsToString(attrs) {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => {
      if (k === "style" && typeof v === "object") {
        const css = Object.entries(v).map(([p, val]) => `${p.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}:${val}`).join(";");
        return `style="${escapeAttr(css)}"`;
      }
      const name = SVG_ATTR_NAME[k] || k;
      return `${name}="${escapeAttr(v)}"`;
    })
    .join(" ");
}

function astToMarkup(node, mode, ctx) {
  if (!node) return "";
  const { tag, attrs, children, text } = node;
  if (mode === "construction" && !CONSTRUCTION_ALLOWED_TAGS.has(tag)) return "";

  let outAttrs;
  if (mode === "construction" && DRAWABLE_TAGS.includes(tag)) {
    const idx = ctx.counter.i++;
    const len = ctx.model?.shapes?.[idx]?.length || 0;
    outAttrs = {
      transform: attrs.transform,
      d: attrs.d, cx: attrs.cx, cy: attrs.cy, r: attrs.r, rx: attrs.rx, ry: attrs.ry,
      x: attrs.x, y: attrs.y, width: attrs.width, height: attrs.height, points: attrs.points,
      x1: attrs.x1, y1: attrs.y1, x2: attrs.x2, y2: attrs.y2,
      fill: "rgba(255,255,255,0.12)",
      stroke: ctx.accent || "#7867ff",
      strokeWidth: ctx.strokeW,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    };
    if (len > 0) {
      outAttrs.strokeDasharray = len;
      const remaining = len * (1 - (ctx.layer?.outlineProgress ?? 0));
      outAttrs.strokeDashoffset = ctx.rtl ? -remaining : remaining;
    }
  } else {
    outAttrs = { ...attrs };
    if (ctx?.fillOverride && DRAWABLE_TAGS.includes(tag)) {
      if (attrs.fill !== "none") outAttrs.fill = ctx.fillOverride;
      if (attrs.stroke && attrs.stroke !== "none") outAttrs.stroke = ctx.fillOverride;
    }
  }

  const inner = (children || []).map((c) => astToMarkup(c, mode, ctx)).join("");
  const body = (text || "") + inner;
  const a = attrsToString(outAttrs);
  return body ? `<${tag}${a ? " " + a : ""}>${body}</${tag}>` : `<${tag}${a ? " " + a : ""}/>`;
}

/* =========================================================================
   FRAME BUILDER — full SVG markup for a single moment on the timeline.
   Mirrors the three preview layers (original / construction / guides) plus
   background and vignette, so the exported video matches the preview.
   ========================================================================= */
function buildFrameSvg(t, opts) {
  const { ast, model, tpl, feel, overlays, spot, accent, fillOverride, rtl, bg, outW, outH } = opts;
  const layer = getLayerState(t, tpl, model, { ease: feel.ease, spot, overlays });
  const vb = layer.camViewBox;
  const M = model;
  const strokeW = Math.max(M.base.w * 0.006, 1);

  // FULL-BLEED RECT — the viewBox is square, but the output can be portrait
  // (Story) or landscape (Wide). With preserveAspectRatio="meet" the square is
  // fitted inside the frame, leaving empty bars on two sides. Anything meant to
  // cover the WHOLE canvas (background, grain, vignette) must therefore be
  // drawn on this expanded rect, not on the viewBox.
  const outAspect = outW / outH;
  const vbAspect = vb.w / vb.h;
  let bleedW, bleedH;
  if (outAspect > vbAspect) {
    bleedH = vb.h;
    bleedW = vb.h * outAspect;
  } else {
    bleedW = vb.w;
    bleedH = vb.w / outAspect;
  }
  const bleed = {
    x: vb.x + vb.w / 2 - bleedW / 2,
    y: vb.y + vb.h / 2 - bleedH / 2,
    w: bleedW,
    h: bleedH,
  };
  const bleedRect = `x="${bleed.x}" y="${bleed.y}" width="${bleed.w}" height="${bleed.h}"`;

  const defs = [];
  let bgMarkup = "";
  if (bg.type === "solid") {
    bgMarkup = `<rect ${bleedRect} fill="${bg.color}"/>`;
  } else if (bg.type === "linear") {
    defs.push(`<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bg.color}"/><stop offset="100%" stop-color="${bg.color2}"/></linearGradient>`);
    bgMarkup = `<rect ${bleedRect} fill="url(#bg)"/>`;
  } else {
    defs.push(`<radialGradient id="bg"><stop offset="0%" stop-color="${bg.color}"/><stop offset="100%" stop-color="${bg.color2}"/></radialGradient>`);
    bgMarkup = `<rect ${bleedRect} fill="url(#bg)"/>`;
  }

  // layer A — original artwork
  const originalCtx = { fillOverride };
  const original = `<g opacity="${layer.baseOpacity.toFixed(4)}">${ast.children.map((c) => astToMarkup(c, "original", originalCtx)).join("")}</g>`;

  // layer B — construction clone
  let construction = "";
  if (layer.outlineOpacity > 0.002) {
    const cctx = { counter: { i: 0 }, model: M, layer, strokeW, accent, rtl };
    construction = `<g opacity="${layer.outlineOpacity.toFixed(4)}">${ast.children.map((c) => astToMarkup(c, "construction", cctx)).join("")}</g>`;
  }

  // layer C — guides / anchors / handles
  let guides = "";
  const wantGuides = overlays.guides !== false;
  const wantCircles = overlays.circles !== false;
  if (layer.guideOpacity > 0.002) {
    const parts = [];
    const gw = M.base.w * 0.0018;
    if (tpl.showGuides && wantGuides) {
      const cx0 = M.base.x + M.base.w / 2, cy0 = M.base.y + M.base.h / 2;
      // extend guides across the full bleed so they reach the canvas edges on
      // tall/wide formats instead of stopping at the square viewBox
      const halfW = (bleed.w / 2 + bleed.w * 0.5) * layer.guideDrawT;
      const halfH = (bleed.h / 2 + bleed.h * 0.5) * layer.guideDrawT;
      M.guideYs.forEach((y) => parts.push(`<line x1="${cx0 - halfW}" x2="${cx0 + halfW}" y1="${y}" y2="${y}" stroke="${accent}" stroke-width="${gw}" opacity="0.5"/>`));
      M.guideXs.forEach((x) => parts.push(`<line y1="${cy0 - halfH}" y2="${cy0 + halfH}" x1="${x}" x2="${x}" stroke="${accent}" stroke-width="${gw}" opacity="0.5"/>`));
    }
    if (tpl.showCircles && wantCircles) {
      M.shapes.forEach((sh) => {
        const cx = sh.bbox.x + sh.bbox.width / 2, cy = sh.bbox.y + sh.bbox.height / 2;
        const r = (Math.max(sh.bbox.width, sh.bbox.height) / 2) * 1.06 * layer.guideDrawT;
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accent}" stroke-width="${gw}" opacity="0.45"/>`);
      });
    }
    if (tpl.showBBox) {
      M.shapes.forEach((sh) => {
        parts.push(`<rect x="${sh.bbox.x}" y="${sh.bbox.y}" width="${sh.bbox.width}" height="${sh.bbox.height}" fill="none" stroke="${accent}" stroke-width="${M.base.w * 0.0016}" stroke-dasharray="${M.base.w * 0.01} ${M.base.w * 0.008}" opacity="0.6"/>`);
      });
    }
    if (parts.length) guides += `<g opacity="${layer.guideOpacity.toFixed(4)}">${parts.join("")}</g>`;
  }
  if (layer.anchorOpacity > 0.002) {
    const s = M.base.w * 0.012;
    const parts = M.shapes.map((sh) => {
      const pts = sh.anchors.map((a) => `<rect x="${a.x - s / 2}" y="${a.y - s / 2}" width="${s}" height="${s}" fill="#FAFAF7" stroke="${accent}" stroke-width="${M.base.w * 0.002}"/>`).join("");
      return sh.transform ? `<g transform="${escapeAttr(sh.transform)}">${pts}</g>` : pts;
    }).join("");
    guides += `<g opacity="${layer.anchorOpacity.toFixed(4)}">${parts}</g>`;
  }
  if (layer.handleOpacity > 0.002) {
    const hw = M.base.w * 0.0014, r = M.base.w * 0.006;
    const parts = M.shapes.map((sh) => {
      const hs = sh.handles.map((sg) =>
        `<line x1="${sg.from.x}" y1="${sg.from.y}" x2="${sg.c1.x}" y2="${sg.c1.y}" stroke="${accent}" stroke-width="${hw}" opacity="0.5"/>` +
        `<line x1="${sg.to.x}" y1="${sg.to.y}" x2="${sg.c2.x}" y2="${sg.c2.y}" stroke="${accent}" stroke-width="${hw}" opacity="0.5"/>` +
        `<circle cx="${sg.c1.x}" cy="${sg.c1.y}" r="${r}" fill="#FAFAF7" stroke="${accent}" stroke-width="${M.base.w * 0.0016}"/>` +
        `<circle cx="${sg.c2.x}" cy="${sg.c2.y}" r="${r}" fill="#FAFAF7" stroke="${accent}" stroke-width="${M.base.w * 0.0016}"/>`
      ).join("");
      return sh.transform ? `<g transform="${escapeAttr(sh.transform)}">${hs}</g>` : hs;
    }).join("");
    guides += `<g opacity="${layer.handleOpacity.toFixed(4)}">${parts}</g>`;
  }

  // grain — matches the preview's overlay so exports aren't unexpectedly clean
  let grainMarkup = "";
  if (bg.grain > 0) {
    defs.push(`<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`);
    grainMarkup = `<rect ${bleedRect} filter="url(#grain)" opacity="${(bg.grain * 0.5).toFixed(3)}" style="mix-blend-mode:multiply"/>`;
  }

  // vignette
  let vig = "";
  if (bg.vignette > 0) {
    defs.push(`<radialGradient id="vig"><stop offset="45%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${(bg.vignette * 0.72).toFixed(3)}"/></radialGradient>`);
    vig = `<rect ${bleedRect} fill="url(#vig)"/>`;
  }

  const defsMarkup = defs.length ? `<defs>${defs.join("")}</defs>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid meet">${defsMarkup}${bgMarkup}${original}${construction}${guides}${grainMarkup}${vig}</svg>`,
    layer,
  };
}

// CREDIT LAYOUTS — how the credit block is arranged on the artwork.
const CREDIT_LAYOUTS = [
  { id: "split",   name: "Split",        hint: "You on the left, client on the right" },
  { id: "stacked", name: "Stacked",      hint: "Everything in one bottom-left block" },
  { id: "center",  name: "Centered",     hint: "Centred under the mark, editorial" },
  { id: "corners", name: "Corners",      hint: "Handle top-left, site bottom-right" },
  { id: "topbar",  name: "Top bar",      hint: "A single line across the top" },
  { id: "none",    name: "None",         hint: "No credits on the artwork" },
];

// Credits are drawn straight onto the canvas rather than into the SVG, because
// an SVG loaded through an <img> can't reach webfonts and would render them in
// a fallback face (or drop them entirely).
function drawCreditsOnCanvas(ctx, w, h, credits, opacity, layout = "split", scale = 1) {
  if (!credits || layout === "none") return;
  const any = credits.handle || credits.role || credits.client || credits.website;
  if (!any || opacity <= 0.01) return;

  const pad = Math.round(w * 0.045);
  const big = Math.max(9, Math.round(w * 0.022 * scale));
  const small = Math.max(8, Math.round(w * 0.019 * scale));
  const lead = 1.5;
  const mono = (px) => `${px}px "JetBrains Mono", ui-monospace, monospace`;
  const sans = (px) => `${px}px Inter, system-ui, sans-serif`;

  ctx.save();
  ctx.fillStyle = "#0B0B0E";
  ctx.textBaseline = "alphabetic";

  const put = (text, x, y, font, alpha) => {
    if (!text) return false;
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity * alpha));
    ctx.font = font;
    ctx.fillText(text, x, y);
    return true;
  };

  if (layout === "split") {
    ctx.textAlign = "left";
    let y = h - pad;
    if (put(credits.role, pad, y, sans(small), 0.55)) y -= small * lead;
    put(credits.handle, pad, y, mono(big), 0.75);

    ctx.textAlign = "right";
    let y2 = h - pad;
    if (put(credits.website, w - pad, y2, mono(small), 0.45)) y2 -= small * lead;
    put(credits.client, w - pad, y2, sans(small), 0.55);
  } else if (layout === "stacked") {
    ctx.textAlign = "left";
    let y = h - pad;
    if (put(credits.website, pad, y, mono(small), 0.45)) y -= small * lead;
    if (put(credits.client, pad, y, sans(small), 0.55)) y -= small * lead;
    if (put(credits.role, pad, y, sans(small), 0.55)) y -= small * lead;
    put(credits.handle, pad, y, mono(big), 0.75);
  } else if (layout === "center") {
    ctx.textAlign = "center";
    const cx = w / 2;
    let y = h - pad;
    if (put(credits.website, cx, y, mono(small), 0.45)) y -= small * lead;
    // client and role share one line when both are present
    const mid = [credits.role, credits.client].filter(Boolean).join("  ·  ");
    if (put(mid, cx, y, sans(small), 0.55)) y -= small * lead;
    put(credits.handle, cx, y, mono(big), 0.75);
  } else if (layout === "corners") {
    ctx.textAlign = "left";
    put(credits.handle, pad, pad + big, mono(big), 0.75);
    let y = pad + big + small * lead;
    put(credits.role, pad, y, sans(small), 0.5);

    ctx.textAlign = "right";
    let y2 = h - pad;
    if (put(credits.website, w - pad, y2, mono(small), 0.45)) y2 -= small * lead;
    put(credits.client, w - pad, y2, sans(small), 0.55);
  } else if (layout === "topbar") {
    ctx.textAlign = "left";
    put(credits.handle, pad, pad + big, mono(big), 0.7);
    ctx.textAlign = "right";
    const right = [credits.role, credits.client, credits.website].filter(Boolean).join("  ·  ");
    put(right, w - pad, pad + big, sans(small), 0.5);
  }

  ctx.restore();
}

// Picks the best container/codec the browser will actually record.
// Chrome 130+ and Safari can do MP4/H.264; everything else falls back to WebM.
function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    { mime: 'video/mp4;codecs="avc1.42E01E"', ext: "mp4", label: "MP4 · H.264" },
    { mime: "video/mp4", ext: "mp4", label: "MP4" },
    { mime: 'video/webm;codecs="vp9"', ext: "webm", label: "WebM · VP9" },
    { mime: 'video/webm;codecs="vp8"', ext: "webm", label: "WebM · VP8" },
    { mime: "video/webm", ext: "webm", label: "WebM" },
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c.mime)) || null;
}

function astHasLiveText(node) {
  if (!node) return false;
  if (node.tag === "text" || node.tag === "tspan") return true;
  return (node.children || []).some(astHasLiveText);
}

function extractInnerMarkup(svgText) {
  try {
    const clean = sanitizeSvgText(svgText);
    const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
    if (doc.querySelector("parsererror")) return "";
    const root = doc.documentElement;
    const serializer = new XMLSerializer();
    return Array.from(root.children).map((c) => serializer.serializeToString(c)).join("");
  } catch (e) { return ""; }
}

// Same declared-viewBox logic as buildGeometryModel, but usable on the raw
// AST attrs before any live DOM measurement exists — avoids a mis-scaled
// first frame while the geometry model is still being measured.
function declaredViewBoxFromAttrs(attrs) {
  if (!attrs) return null;
  const vb = attrs.viewBox;
  if (vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p.every(Number.isFinite) && p[2] > 0 && p[3] > 0) return { x: p[0], y: p[1], w: p[2], h: p[3] };
  }
  const w = parseFloat(attrs.width), h = parseFloat(attrs.height);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { x: 0, y: 0, w, h };
  return null;
}

/* =========================================================================
   TEMPLATES
   ========================================================================= */
const TEMPLATES = [
  { id: "blueprint", name: "Blueprint", blurb: "Grid, anchors & camera", desc: "Technical guides sweep in, the outline draws, then the camera moves in on the details. The full construction read.", showGuides: true, showAnchors: true, showHandles: false, showZoom: true, showBBox: false, showCircles: false, showShine: false, phaseSet: "full" },
  { id: "pathdraw", name: "Path Draw", blurb: "Paths draw before they fill", desc: "Every contour draws itself stroke-first, then the artwork resolves into its real colours. Clean and quick.", showGuides: false, showAnchors: false, showHandles: false, showZoom: false, showBBox: false, showCircles: false, showShine: false, phaseSet: "compact" },
  { id: "geometry", name: "Geometry", blurb: "Construction circles & guides", desc: "Circles are fitted to the round forms and alignment guides extend across the frame, like a classic grid study.", showGuides: true, showAnchors: false, showHandles: false, showZoom: false, showBBox: false, showCircles: true, showShine: false, phaseSet: "full" },
  { id: "minimal", name: "Minimal", blurb: "Simple outline into fill", desc: "No grid, no anchors. The outline appears and fills. Use it when the mark should speak on its own.", showGuides: false, showAnchors: false, showHandles: false, showZoom: false, showBBox: false, showCircles: false, showShine: false, phaseSet: "compact" },
  { id: "designer", name: "Designer Mode", blurb: "Illustrator-style full rig", desc: "Bounding boxes, anchor points and Bézier handles all visible at once — the closest thing to watching someone work.", showGuides: true, showAnchors: true, showHandles: true, showZoom: true, showBBox: true, showCircles: false, showShine: false, phaseSet: "full" },
  { id: "shine", name: "Shine", blurb: "Soft highlight sweep", desc: "The mark settles in and a soft highlight travels across it. Quiet, and the closest to a premium brand sting.", showGuides: false, showAnchors: false, showHandles: false, showZoom: false, showBBox: false, showCircles: false, showShine: true, phaseSet: "compact" },
];

// FEEL — how the motion is paced. Each preset swaps the master easing curve and
// nudges the overall speed, without changing the phase structure.
const FEELS = {
  snappy: { label: "Snappy", ease: makeCubicBezierEase(0.22, 1, 0.36, 1), scale: 0.78 },
  smooth: { label: "Smooth", ease: makeCubicBezierEase(0.65, 0, 0.35, 1), scale: 1 },
  dramatic: { label: "Dramatic", ease: makeCubicBezierEase(0.83, 0, 0.17, 1), scale: 1.25 },
};

// OUTPUT FORMATS — canvas aspect + pixel dimensions used for export specs
const FORMATS = [
  { id: "1:1", short: "1:1", label: "Square", hint: "Feed post, profile", w: 1080, h: 1080 },
  { id: "4:5", short: "4:5", label: "Feed", hint: "Instagram feed", w: 1080, h: 1350 },
  { id: "9:16", short: "9:16", label: "Story", hint: "Story, Reels, TikTok", w: 1080, h: 1920 },
  { id: "16:9", short: "16:9", label: "Wide", hint: "YouTube, presentations", w: 1920, h: 1080 },
];

const HOLD_SECONDS = 0.8; // final logo stays fully visible before looping

/* =========================================================================
   LAYER STATE — master timeline, fixed-duration regardless of element count.
   Full timeline is ~5.0s of motion (+ a separate hold, added outside this
   function by the playback loop) mapped to the requested breakdown:
     0.0–0.5s  grid fades in
     0.3–1.3s  vector outlines draw
     0.8–1.7s  anchors appear
     1.4–2.5s  camera zooms into detail
     2.5–3.4s  hold / inspect detail
     3.4–4.2s  camera zooms back out
     4.0–4.7s  grid + anchors + technical layers fade away
     4.3–5.0s  original logo reaches full opacity
   ========================================================================= */
function getLayerState(t, tpl, model, opts = {}) {
  const {
    ease = EASE,
    spot = null,          // chosen camera spot (defaults to auto zoomTarget)
    overlays = null,      // per-overlay on/off overrides from the Overlays panel
  } = opts;

  const base = model.base;
  const zt = spot || model.zoomTarget;
  const BASE_CONSTRUCTION_OPACITY = 0.35;

  // overlay toggles gate the template's own flags — a template can't show an
  // overlay the user switched off, but switching one on won't force it into a
  // template that never had it.
  const on = (key, tplFlag) => (overlays ? overlays[key] !== false && tplFlag : tplFlag);
  const wantGuides = on("guides", tpl.showGuides);
  const wantAnchors = on("anchors", tpl.showAnchors);
  const wantHandles = on("handles", tpl.showHandles);
  const wantCircles = on("circles", tpl.showCircles);
  const wantBBox = on("handles", tpl.showBBox);

  let out = {
    guideOpacity: 0, guideDrawT: 0, outlineProgress: 0, outlineOpacity: 0,
    anchorOpacity: 0, handleOpacity: 0, bboxOpacity: 0, circleOpacity: 0,
    baseOpacity: 0, camViewBox: base, phaseLabel: "", shineT: -1,
  };

  if (tpl.phaseSet === "full") {
    // phase boundaries as fractions of the master timeline (duration-independent)
    const gridEnd = 0.10;
    const outlineStart = 0.06, outlineEnd = 0.26;
    const anchorStart = 0.16, anchorEnd = 0.34;
    const zoomInStart = 0.28, zoomInEnd = 0.50, zoomHoldEnd = 0.68, zoomBackEnd = 0.84;
    const fadeStart = 0.80, fadeEnd = 0.94;
    const revealStart = 0.86, revealEnd = 1.0;

    out.guideDrawT = ease(localT(t, 0, gridEnd));
    out.guideOpacity = (wantGuides || wantBBox || wantCircles) ? localT(t, 0, gridEnd * 0.7) : 0;
    out.outlineProgress = ease(localT(t, outlineStart, outlineEnd));
    out.outlineOpacity = t >= outlineStart ? 1 : 0;
    out.baseOpacity = BASE_CONSTRUCTION_OPACITY * ease(localT(t, 0, gridEnd * 0.7));
    const anchorIn = ease(localT(t, anchorStart, anchorEnd));
    out.anchorOpacity = wantAnchors ? anchorIn : 0;
    out.handleOpacity = wantHandles ? anchorIn : 0;
    out.circleOpacity = wantCircles ? out.guideOpacity * 0.9 : 0;
    out.bboxOpacity = wantBBox ? out.guideOpacity * 0.8 : 0;
    if (!wantGuides) out.guideOpacity = wantCircles || wantBBox ? out.guideOpacity : 0;

    if (tpl.showZoom) {
      let vb;
      if (t < zoomInStart) vb = base;
      else if (t < zoomInEnd) vb = lerpViewBox(base, zt, ease(localT(t, zoomInStart, zoomInEnd)));
      else if (t < zoomHoldEnd) vb = zt;
      else if (t < zoomBackEnd) vb = lerpViewBox(zt, base, ease(localT(t, zoomHoldEnd, zoomBackEnd)));
      else vb = base;
      out.camViewBox = vb;
    } else out.camViewBox = base;

    if (t >= fadeStart) {
      const span = fadeEnd - fadeStart;
      const cGrid = ease(localT(t, fadeStart, fadeStart + span * 0.4));
      const cAnchor = ease(localT(t, fadeStart, fadeStart + span * 0.6));
      const cHandle = ease(localT(t, fadeStart + span * 0.15, fadeEnd));
      const cOutline = ease(localT(t, fadeStart + span * 0.3, fadeEnd));
      out.guideOpacity *= (1 - cGrid);
      out.circleOpacity *= (1 - cGrid);
      out.bboxOpacity *= (1 - cGrid);
      out.anchorOpacity *= (1 - cAnchor);
      out.handleOpacity *= (1 - cHandle);
      out.outlineOpacity *= (1 - cOutline);
    }
    if (t >= revealStart) out.baseOpacity = lerp(BASE_CONSTRUCTION_OPACITY, 1, ease(localT(t, revealStart, revealEnd)));
    if (t >= zoomBackEnd) out.camViewBox = base;
    if (t >= revealEnd - 1e-6) {
      out.baseOpacity = 1;
      out.guideOpacity = 0; out.circleOpacity = 0; out.bboxOpacity = 0;
      out.anchorOpacity = 0; out.handleOpacity = 0; out.outlineOpacity = 0;
      out.camViewBox = base;
    }

    out.phaseLabel =
      t < gridEnd ? "construction grid" :
      t < outlineEnd ? "vector outline" :
      t < anchorEnd ? "anchor points" :
      t < zoomHoldEnd ? "detail inspection" :
      t < zoomBackEnd ? "camera pullback" :
      t < fadeEnd ? "logo construction" : "final mark";
  } else {
    const outlineEnd = 0.28;
    const revealStart = 0.42, revealEnd = 0.66;
    out.outlineProgress = ease(localT(t, 0, outlineEnd));
    out.baseOpacity = BASE_CONSTRUCTION_OPACITY * ease(localT(t, 0, outlineEnd * 0.7));
    const reveal = ease(localT(t, revealStart, revealEnd));
    out.outlineOpacity = 1 - reveal;
    out.baseOpacity = lerp(out.baseOpacity, 1, reveal);
    out.camViewBox = base;
    if (t >= revealEnd - 1e-6) { out.baseOpacity = 1; out.outlineOpacity = 0; }

    // SHINE — a highlight band sweeps across the settled mark. -1 means "off";
    // 0..1 is the band's position across the frame.
    if (tpl.showShine) {
      const shineStart = 0.70, shineEnd = 0.97;
      out.shineT = t >= shineStart && t <= shineEnd ? localT(t, shineStart, shineEnd) : -1;
    }

    out.phaseLabel =
      t < outlineEnd ? "vector outline" :
      t < revealEnd ? "logo construction" :
      (tpl.showShine && out.shineT >= 0) ? "shine" : "final mark";
  }
  return out;
}

function lerpViewBox(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) };
}

/* =========================================================================
   CREDITS OVERLAY (preview) — mirrors drawCreditsOnCanvas so what you see in
   the preview is what lands in the exported video and PNG.
   ========================================================================= */
function CreditLine({ text, size, opacity, mono }) {
  if (!text) return null;
  return (
    <div className={mono ? "lm-mono" : undefined} style={{ fontSize: size, opacity, lineHeight: 1.35 }}>
      {text}
    </div>
  );
}

function CreditsOverlay({ credits, layout, scale, opacity, compact }) {
  if (!credits || layout === "none") return null;
  const { handle, role, client, website } = credits;
  if (!handle && !role && !client && !website) return null;

  const pad = compact ? 14 : 18;
  const big = (compact ? 12 : 11) * scale;
  const sm = (compact ? 11 : 10) * scale;
  const base = { position: "absolute", zIndex: 7, pointerEvents: "none", opacity, color: "#0B0B0E" };

  if (layout === "stacked") {
    return (
      <div style={{ ...base, left: 0, bottom: 0, padding: pad, maxWidth: "70%" }}>
        <CreditLine text={handle} size={big} opacity={0.75} mono />
        <CreditLine text={role} size={sm} opacity={0.55} />
        <CreditLine text={client} size={sm} opacity={0.55} />
        <CreditLine text={website} size={sm} opacity={0.45} mono />
      </div>
    );
  }

  if (layout === "center") {
    const mid = [role, client].filter(Boolean).join("  ·  ");
    return (
      <div style={{ ...base, left: 0, right: 0, bottom: 0, padding: pad, textAlign: "center" }}>
        <CreditLine text={handle} size={big} opacity={0.75} mono />
        <CreditLine text={mid} size={sm} opacity={0.55} />
        <CreditLine text={website} size={sm} opacity={0.45} mono />
      </div>
    );
  }

  if (layout === "corners") {
    return (
      <>
        <div style={{ ...base, left: 0, top: 0, padding: pad, maxWidth: "60%" }}>
          <CreditLine text={handle} size={big} opacity={0.75} mono />
          <CreditLine text={role} size={sm} opacity={0.5} />
        </div>
        <div style={{ ...base, right: 0, bottom: 0, padding: pad, textAlign: "right", maxWidth: "60%" }}>
          <CreditLine text={client} size={sm} opacity={0.55} />
          <CreditLine text={website} size={sm} opacity={0.45} mono />
        </div>
      </>
    );
  }

  if (layout === "topbar") {
    const right = [role, client, website].filter(Boolean).join("  ·  ");
    return (
      <div style={{ ...base, left: 0, right: 0, top: 0, padding: pad, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <CreditLine text={handle} size={big} opacity={0.7} mono />
        <div style={{ fontSize: sm, opacity: 0.5, textAlign: "right" }}>{right}</div>
      </div>
    );
  }

  // "split" — the default
  return (
    <div style={{ ...base, left: 0, right: 0, bottom: 0, padding: pad, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <CreditLine text={handle} size={big} opacity={0.75} mono />
        <CreditLine text={role} size={sm} opacity={0.55} />
      </div>
      <div style={{ textAlign: "right", minWidth: 0 }}>
        <CreditLine text={client} size={sm} opacity={0.55} />
        <CreditLine text={website} size={sm} opacity={0.45} mono />
      </div>
    </div>
  );
}

/* =========================================================================
   PANEL UI PRIMITIVES
   ========================================================================= */
function Panel({ title, children, P }) {
  return (
    <div className="lm-panel" style={{ marginTop: P.gap, padding: P.pad, borderRadius: 20 }}>
      <div className="font-medium" style={{ fontSize: P.title, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, hint, children, P }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="lm-mono lm-muted" style={{ fontSize: P.label, letterSpacing: "0.12em" }}>{label}</span>
        {hint && <span className="lm-muted" style={{ fontSize: P.small }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Segmented({ options, value, onChange, P }) {
  return (
    <div className="lm-seg" style={{ display: "flex", padding: 4, borderRadius: 999 }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={value === o.id ? "lm-seg-item lm-seg-on" : "lm-seg-item"}
          style={{ flex: 1, padding: "10px 8px", borderRadius: 999, fontSize: P.body, border: "none" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ColorRow({ value, onChange, P }) {
  return (
    <div className="flex items-center gap-2.5">
      <label
        style={{
          width: 44, height: 44, borderRadius: 12, background: value,
          border: "1px solid #2c2c34", cursor: "pointer", flexShrink: 0, position: "relative", overflow: "hidden",
        }}
      >
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
        />
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="lm-mono lm-input"
        style={{ flex: 1, minWidth: 0, fontSize: P.body, padding: "12px 16px", borderRadius: 999 }}
      />
    </div>
  );
}

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */
export default function LogoMotionApp() {
  const [svgText, setSvgText] = useState(DEMO_SVG);
  const [fileName, setFileName] = useState("demo-mark.svg");
  const [model, setModel] = useState(null);
  const [tplId, setTplId] = useState("blueprint");
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  // OUTPUT
  const [formatId, setFormatId] = useState("4:5");
  const [feelId, setFeelId] = useState("smooth");
  const [reads, setReads] = useState("ltr");
  const [duration, setDuration] = useState(7.0);

  // COLOR
  const [accent, setAccent] = useState("#AC4EFF");
  const [logoFillMode, setLogoFillMode] = useState("original"); // "original" | "custom"
  const [logoFill, setLogoFill] = useState("#AC4EFF");

  // BACKGROUND
  const [bgType, setBgType] = useState("solid"); // solid | linear | radial
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [bgColor2, setBgColor2] = useState("#E9E4FF");
  const [grain, setGrain] = useState(0);
  const [vignette, setVignette] = useState(0);

  // OVERLAYS
  const [overlays, setOverlays] = useState({ guides: true, anchors: true, handles: true, circles: true });

  // CREDITS
  const [credits, setCredits] = useState({ handle: "@yourhandle", role: "Logo design", client: "", website: "" });
  const [creditLayout, setCreditLayout] = useState("split");
  const [creditScale, setCreditScale] = useState(1);

  // CAMERA
  const [cameraMode, setCameraMode] = useState("auto"); // auto | spots
  const [spotIndex, setSpotIndex] = useState(0);

  // EXPORT
  const [exportState, setExportState] = useState({ status: "idle", progress: 0, message: "" });

  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const elapsedSecRef = useRef(0); // raw seconds within the current cycle, including hold
  const originalSvgRef = useRef(null); // the VISIBLE, mounted original-layer <svg>
  const rootRef = useRef(null);

  // ---------------------------------------------------------------------
  // COMPACT MODE — driven by this component's OWN measured width, not by
  // the viewport. Viewport media queries (Tailwind `sm:`, @media max-width)
  // are unreliable here: if the app is laid out at a desktop width and then
  // visually scaled to fit the phone, `min-width:640px` matches and every
  // desktop value wins, so mobile rules never apply. Measuring the rendered
  // element sidesteps that entirely.
  // ---------------------------------------------------------------------
  const [shellWidth, setShellWidth] = useState(0);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const read = () => setShellWidth(el.getBoundingClientRect().width);
    read();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", read);
      return () => window.removeEventListener("resize", read);
    }
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const compact = shellWidth > 0 && shellWidth < 560;

  // shared sizing tokens for the control panels
  const P = compact
    ? { gap: 16, pad: 16, title: 16, label: 11, body: 15, small: 13 }
    : { gap: 24, pad: 20, title: 15, label: 10, body: 13, small: 12 };

  const tpl = TEMPLATES.find((t) => t.id === tplId) || TEMPLATES[0];
  const feel = FEELS[feelId] || FEELS.smooth;
  const format = FORMATS.find((f) => f.id === formatId) || FORMATS[1];
  // "Feel" nudges the effective speed around the user's chosen duration
  const effDuration = Math.max(1.2, duration * feel.scale);

  // Mobile preview box: matches the chosen format's aspect ratio, fitted inside
  // both the available width and a height budget so a 9:16 Story preview stays
  // on screen instead of pushing the controls out of view.
  const previewBox = useMemo(() => {
    if (!compact) return null;
    const availW = Math.max(200, shellWidth - 40 /* page pad */ - 40 /* card pad */);
    const maxH = 420;
    const ratio = format.w / format.h;
    let w = availW;
    let h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    return { w: Math.round(w), h: Math.round(h) };
  }, [compact, shellWidth, format]);

  // Pure, DOM-independent parse. If this returns null the markup was invalid —
  // surfaced directly in the UI instead of failing silently.
  const ast = useMemo(() => parseSvgToAst(svgText), [svgText]);
  const parseFailed = svgText.trim().length > 0 && ast === null;

  // Measure the live, on-screen original-layer <svg> once it (re)renders the
  // new AST. No hidden host, no off-screen positioning, no timing hacks —
  // this runs right after the visible DOM updates.
  useEffect(() => {
    if (!ast || !originalSvgRef.current) { setModel(null); return; }
    const m = buildGeometryModel(originalSvgRef.current);
    setModel(m);
    elapsedSecRef.current = 0;
    setProgress(0);
  }, [ast]);

  // Playback: elapsed seconds run through [0, duration] (the motion) and then
  // through [duration, duration + HOLD_SECONDS] (a genuine hold where progress
  // stays pinned at 1 — the fully-resolved final frame). Only after the full
  // cycle completes does it wrap back to 0. This is what actually fixes the
  // "final logo flashes for one frame" bug: previously progress reset to 0 the
  // instant it reached 1, so the resolved final frame was visible for a single
  // ~16ms tick.
  useEffect(() => {
    if (!playing) { lastTsRef.current = null; return; }
    const cycleLen = effDuration + HOLD_SECONDS;
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      elapsedSecRef.current = (elapsedSecRef.current + dt) % cycleLen;
      setProgress(Math.min(elapsedSecRef.current / effDuration, 1));
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, effDuration]);

  const handleFile = useCallback((file) => {
    if (!file || !file.name.toLowerCase().endsWith(".svg")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setSvgText(String(e.target.result));
      setFileName(file.name);
      setPlaying(true);
    };
    reader.readAsText(file);
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const hasLiveText = useMemo(() => astHasLiveText(ast), [ast]);
  const activeSpot = useMemo(() => {
    if (!model) return null;
    if (cameraMode === "spots" && model.spots?.length) {
      return model.spots[Math.min(spotIndex, model.spots.length - 1)];
    }
    return null;
  }, [model, cameraMode, spotIndex]);

  const layer = useMemo(
    () => (model ? getLayerState(progress, tpl, model, { ease: feel.ease, spot: activeSpot, overlays }) : null),
    [progress, tpl, model, feel, activeSpot, overlays]
  );

  const constructionCtx = useMemo(() => {
    if (!model) return null;
    return {
      counter: { i: 0 },
      model, layer,
      strokeW: Math.max(model.base.w * 0.006, 1),
      accent,
      rtl: reads === "rtl",
    };
  }, [model, layer, accent, reads]);

  // context for the untouched original layer — carries only the optional fill
  // override, nothing else
  const originalCtx = useMemo(
    () => ({ fillOverride: logoFillMode === "custom" ? logoFill : null }),
    [logoFillMode, logoFill]
  );

  // PNG EXPORT — renders the CURRENT frame of the timeline to a canvas at the
  // chosen format's full resolution and downloads it. Uses the same
  // buildFrameSvg path as the video exporter, so the still matches the preview
  // exactly, including whatever phase the scrubber is parked on.
  const exportImage = useCallback(async () => {
    if (!model || !ast) return;
    setExportState({ status: "rendering", progress: 0, message: "" });
    try {
      const outW = Math.round(format.w / 2) * 2;
      const outH = Math.round(format.h / 2) * 2;
      const { svg, layer: frameLayer } = buildFrameSvg(progress, {
        ast, model, tpl, feel, overlays,
        spot: activeSpot, accent,
        fillOverride: logoFillMode === "custom" ? logoFill : null,
        rtl: reads === "rtl",
        bg: { type: bgType, color: bgColor, color2: bgColor2, grain, vignette },
        outW, outH,
      });

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const c = canvas.getContext("2d");

      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error("render failed"));
        img.src = url;
      });
      c.fillStyle = bgColor;
      c.fillRect(0, 0, outW, outH);
      c.drawImage(img, 0, 0, outW, outH);
      URL.revokeObjectURL(url);

      drawCreditsOnCanvas(c, outW, outH, credits, frameLayer.baseOpacity, creditLayout, creditScale);

      canvas.toBlob((png) => {
        if (!png) {
          setExportState({ status: "error", progress: 0, message: "Couldn't create the image." });
          return;
        }
        const u = URL.createObjectURL(png);
        const a = document.createElement("a");
        a.href = u;
        a.download = `${fileName.replace(/\.svg$/i, "")}-${formatId.replace(":", "x")}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(u), 4000);
        setExportState({ status: "done", progress: 1, message: "PNG" });
      }, "image/png");
    } catch (err) {
      setExportState({ status: "error", progress: 0, message: "Couldn't create the image." });
    }
  }, [
    model, ast, tpl, feel, overlays, activeSpot, accent, logoFillMode, logoFill,
    reads, bgType, bgColor, bgColor2, grain, vignette, format, formatId, progress,
    fileName, credits, creditLayout, creditScale,
  ]);

  const downloadStaticSvg = () => {
    if (!model) return;
    const cw = format.w, ch = format.h;
    const vb = model.base;
    const markup = extractInnerMarkup(svgText);

    // same full-bleed rect as the video/PNG exporters, so a Story or Wide
    // export doesn't end up with empty bars above and below the artwork
    const outAspect = cw / ch;
    const vbAspect = vb.w / vb.h;
    let bw, bh;
    if (outAspect > vbAspect) { bh = vb.h; bw = vb.h * outAspect; }
    else { bw = vb.w; bh = vb.w / outAspect; }
    const bx = vb.x + vb.w / 2 - bw / 2;
    const by = vb.y + vb.h / 2 - bh / 2;
    const bleedRect = `x="${bx}" y="${by}" width="${bw}" height="${bh}"`;

    let bgMarkup = "";
    const defs = [];
    if (bgType === "solid") {
      bgMarkup = `<rect ${bleedRect} fill="${bgColor}"/>`;
    } else if (bgType === "linear") {
      defs.push(`<linearGradient id="lmbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bgColor}"/><stop offset="100%" stop-color="${bgColor2}"/></linearGradient>`);
      bgMarkup = `<rect ${bleedRect} fill="url(#lmbg)"/>`;
    } else {
      defs.push(`<radialGradient id="lmbg"><stop offset="0%" stop-color="${bgColor}"/><stop offset="100%" stop-color="${bgColor2}"/></radialGradient>`);
      bgMarkup = `<rect ${bleedRect} fill="url(#lmbg)"/>`;
    }
    const defsMarkup = defs.length ? `<defs>${defs.join("")}</defs>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${defsMarkup}${bgMarkup}${markup}</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${fileName.replace(/\.svg$/i, "")}-${formatId.replace(":", "x")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const camVb = layer
    ? layer.camViewBox
    : (model ? model.base : (declaredViewBoxFromAttrs(ast?.attrs) || { x: 0, y: 0, w: 200, h: 200 }));
  const camViewBoxStr = `${camVb.x} ${camVb.y} ${camVb.w} ${camVb.h}`;

  // resolved once — decides whether the button says MP4 or WebM
  const videoCodec = useMemo(() => pickRecorderMime(), []);

  const bgCss =
    bgType === "solid" ? bgColor
    : bgType === "linear" ? `linear-gradient(180deg, ${bgColor} 0%, ${bgColor2} 100%)`
    : `radial-gradient(circle at 50% 45%, ${bgColor} 0%, ${bgColor2} 100%)`;

  /* ---------------------------------------------------------------------
     VIDEO EXPORT — renders each frame of the master timeline to an offscreen
     canvas and records the canvas stream with MediaRecorder.
     Frames are pushed manually via track.requestFrame(), paced to wall clock
     so the recorded duration matches the timeline.
     --------------------------------------------------------------------- */
  const exportVideo = useCallback(async () => {
    if (!model || !ast || exportState.status === "rendering") return;
    const codec = pickRecorderMime();
    if (!codec) {
      setExportState({ status: "error", progress: 0, message: "This browser can't record video. Try Chrome or Safari." });
      return;
    }

    setPlaying(false);
    setExportState({ status: "rendering", progress: 0, message: "" });

    const FPS = 60;
    // Export at the format's FULL native resolution — no downscaling.
    // Story is a true 1080×1920, Wide a true 1920×1080.
    const outW = Math.round(format.w / 2) * 2; // even dims required by H.264
    const outH = Math.round(format.h / 2) * 2;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const cctx = canvas.getContext("2d");

    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const recorder = new MediaRecorder(stream, {
      mimeType: codec.mime,
      // raised to match the higher resolution and frame rate — at 1440p60 the
      // old 12 Mbps would have been spread thin and reintroduced blockiness
      videoBitsPerSecond: 28_000_000,
    });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const done = new Promise((resolve) => { recorder.onstop = resolve; });
    recorder.start();

    const totalSec = effDuration + HOLD_SECONDS;
    const totalFrames = Math.max(2, Math.round(totalSec * FPS));
    const frameOpts = {
      ast, model, tpl, feel, overlays,
      spot: activeSpot, accent,
      fillOverride: logoFillMode === "custom" ? logoFill : null,
      rtl: reads === "rtl",
      bg: { type: bgType, color: bgColor, color2: bgColor2, grain, vignette },
      outW, outH,
    };

    const startedAt = performance.now();
    try {
      for (let i = 0; i < totalFrames; i++) {
        const elapsed = (i / FPS);
        const t = Math.min(elapsed / effDuration, 1); // pinned at 1 through the hold
        const { svg, layer: frameLayer } = buildFrameSvg(t, frameOpts);

        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = () => rej(new Error("frame render failed"));
          img.src = url;
        });
        // paint the base colour first: belt-and-braces so a frame can never
        // come out with transparent (black) edges
        cctx.clearRect(0, 0, outW, outH);
        cctx.fillStyle = bgColor;
        cctx.fillRect(0, 0, outW, outH);
        cctx.drawImage(img, 0, 0, outW, outH);
        URL.revokeObjectURL(url);

        drawCreditsOnCanvas(cctx, outW, outH, credits, frameLayer.baseOpacity, creditLayout, creditScale);

        track.requestFrame();
        setExportState({ status: "rendering", progress: (i + 1) / totalFrames, message: "" });

        // pace to real time so the recorder timestamps frames correctly
        const target = startedAt + (i + 1) * (1000 / FPS);
        const wait = target - performance.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      }
    } catch (err) {
      recorder.stop();
      setExportState({ status: "error", progress: 0, message: "Rendering failed partway through. Try a smaller format." });
      return;
    }

    recorder.stop();
    await done;

    const blob = new Blob(chunks, { type: codec.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.svg$/i, "")}-${formatId.replace(":", "x")}.${codec.ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setExportState({ status: "done", progress: 1, message: codec.label });
  }, [
    model, ast, tpl, feel, overlays, activeSpot, accent, logoFillMode, logoFill,
    reads, bgType, bgColor, bgColor2, grain, vignette, format, formatId, effDuration,
    fileName, credits, creditLayout, creditScale, exportState.status,
  ]);

  // Extracted so compact mode can render it INSIDE the preview card (matching
  // the reference) while desktop keeps it below the card, unchanged.
  const transportControls = (
    <div
      className={`flex items-center ${compact ? "gap-2.5" : "gap-2.5 sm:gap-4 mt-3 sm:mt-5"}`}
      style={compact ? { marginTop: 14, height: 48 } : undefined}
    >
      <button
        onClick={() => setPlaying((p) => !p)}
        className={`rounded-full lm-btn-primary flex items-center justify-center shrink-0 active:scale-95 transition-transform ${compact ? "" : "w-9 h-9 sm:w-10 sm:h-10"}`}
        style={compact ? { width: 44, height: 44 } : undefined}
      >
        {playing ? <Pause size={compact ? 16 : 15} fill="#0B0B0E" /> : <Play size={compact ? 16 : 15} fill="#0B0B0E" className="ml-0.5" />}
      </button>
      <button
        onClick={() => { elapsedSecRef.current = 0; setProgress(0); setPlaying(true); }}
        className={`rounded-full lm-btn-ghost flex items-center justify-center shrink-0 transition-colors ${compact ? "" : "w-8 h-8 sm:w-9 sm:h-9"}`}
        style={compact ? { width: 40, height: 40 } : undefined}
      >
        <RotateCcw size={14} />
      </button>
      <input
        type="range" min={0} max={1} step={0.001} value={progress}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setPlaying(false);
          elapsedSecRef.current = v * effDuration;
          setProgress(v);
        }}
        className="lm-slider flex-1 h-[3px]"
      />
      <span
        className={`lm-mono lm-muted text-right shrink-0 ${compact ? "" : "text-[11px] sm:text-[12px] w-[52px] sm:w-16"}`}
        style={compact ? { fontSize: 13, width: 54 } : undefined}
      >
        {(progress * effDuration).toFixed(2)}s
      </span>
    </div>
  );

  return (
    <div ref={rootRef} className="lm-root">
      <GlobalStyle />

      <div
        className={compact ? "mx-auto" : "max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-10"}
        style={compact ? { width: "100%", maxWidth: 430, paddingLeft: 20, paddingRight: 20, paddingTop: 12, paddingBottom: 20, boxSizing: "border-box" } : undefined}
      >
        {/* header — side-by-side on mobile like the reference: title left, upload right */}
        <div
          className={compact ? "" : "flex items-start sm:items-center justify-between gap-3 sm:gap-4 flex-col sm:flex-row mb-4 sm:mb-8"}
          style={compact ? { display: "grid", gridTemplateColumns: "1fr 170px", gap: 12, alignItems: "start", marginBottom: 18 } : undefined}
        >
          <div>
            <p
              className={`lm-mono lm-eyebrow tracking-[0.2em] ${compact ? "" : "text-[10px] sm:text-[11px] mb-0.5 sm:mb-1"}`}
              style={compact ? { fontSize: 11, marginBottom: 5, lineHeight: 1.3 } : undefined}
            >
              VECTOR CONSTRUCTION STUDIO
            </p>
            <h1
              className={`lm-display italic font-medium ${compact ? "" : "text-[32px] leading-none sm:text-4xl sm:leading-tight"}`}
              style={compact ? { fontSize: 26, lineHeight: 1.05 } : undefined}
            >
              Logo Construction
            </h1>
            <p
              className="lm-muted"
              style={{ fontSize: compact ? 12 : 11, marginTop: compact ? 5 : 4 }}
            >
              By Ali Alarbash
            </p>
          </div>
          <label
            className={`flex items-center gap-2.5 rounded-2xl border cursor-pointer transition-colors ${compact ? "" : "px-[18px] py-[14px] sm:px-4 sm:py-3 w-fit min-w-[210px] sm:min-w-0"} ${dragOver ? "lm-drop-active" : "lm-panel"}`}
            style={compact ? { height: 80, padding: "12px 14px", width: "100%", boxSizing: "border-box" } : undefined}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <Upload size={compact ? 15 : 16} className="lm-accent shrink-0" />
            <div className="leading-tight min-w-0">
              <div className="font-medium" style={compact ? { fontSize: 13 } : { fontSize: 13 }}>Drop an SVG</div>
              <div className="lm-mono lm-muted truncate" style={compact ? { fontSize: 11 } : { fontSize: 11 }}>{fileName}</div>
            </div>
            <input type="file" accept=".svg,image/svg+xml" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </div>

        {/* canvas */}
        <div
          className={`lm-checker lm-card-outline ${compact ? "" : "rounded-2xl sm:rounded-3xl p-2 sm:p-6"}`}
          style={compact ? { padding: 20, borderRadius: 28 } : undefined}
        >
          <div
            className={`overflow-hidden ${compact ? "" : "rounded-xl sm:rounded-2xl"}`}
            style={{
              ...(compact
                ? {
                    // The preview now MATCHES the chosen output format instead of
                    // being a fixed box, so picking Story actually looks like a
                    // Story. Width is derived from a height budget for tall
                    // formats so a 9:16 preview can't run off the screen.
                    width: previewBox.w,
                    height: previewBox.h,
                    margin: "0 auto",
                    borderRadius: 22,
                  }
                : { aspectRatio: `${format.w} / ${format.h}`, maxHeight: 560, margin: "0 auto" }),
              background: bgCss,
              position: "relative",
            }}
          >
            {parseFailed && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#0B0B0E] p-6 text-center">
                <AlertTriangle size={20} />
                <p className="text-[13px] font-medium">This file couldn't be parsed as SVG</p>
                <p className="text-[11px] text-[#666]">Check that it's a valid, well-formed .svg export and try again.</p>
              </div>
            )}

            {!parseFailed && ast && (
              <div className="motion-stage relative w-full h-full">
                {/* LAYER A — logo-original-layer: rendered directly from the
                    parsed AST via React.createElement, attribute-for-attribute,
                    with zero DOM cloning. This is the untouched source of truth;
                    the ref only READS geometry from it, never writes to it. */}
                <svg
                  ref={originalSvgRef}
                  className="logo-original-layer absolute inset-0 w-full h-full"
                  style={{ zIndex: 1 }}
                  viewBox={camViewBoxStr}
                >
                  <g opacity={layer ? layer.baseOpacity : 1}>
                    {ast.children.map((c, i) => renderAstNode(c, `o${i}`, "original", originalCtx))}
                  </g>
                </svg>

                {/* LAYER B — construction-layer: the SAME ast, rendered a second
                    time through the "construction" branch of renderAstNode,
                    which only keeps <g>/geometry tags and always overrides
                    fill/stroke — it can never inherit the source's own styling. */}
                {constructionCtx && (
                  <svg
                    className="construction-layer absolute inset-0 w-full h-full"
                    style={{ zIndex: 2 }}
                    viewBox={camViewBoxStr}
                  >
                    <g opacity={layer ? layer.outlineOpacity : 0}>
                      {ast.children.map((c, i) => renderAstNode(c, `c${i}`, "construction", constructionCtx))}
                    </g>
                  </svg>
                )}

                {/* LAYER C — guides-layer: grid -> anchors -> handles, entirely
                    synthetic, generated only from sampled geometry. */}
                {model && layer && (
                  <svg className="guides-layer absolute inset-0 w-full h-full" style={{ zIndex: 3 }} viewBox={camViewBoxStr}>
                    {layer.guideOpacity > 0.002 && (tpl.showGuides || tpl.showBBox || tpl.showCircles) && (
                      <g className="construction-grid" opacity={layer.guideOpacity}>
                        {tpl.showGuides && model.guideYs.map((y, i) => {
                          const cx0 = model.base.x + model.base.w / 2;
                          const half = (model.base.w / 2 + model.base.w * 0.5) * layer.guideDrawT;
                          return <line key={`h${i}`} x1={cx0 - half} x2={cx0 + half} y1={y} y2={y} stroke={accent} strokeWidth={model.base.w * 0.0018} opacity={0.5} />;
                        })}
                        {tpl.showGuides && model.guideXs.map((x, i) => {
                          const cy0 = model.base.y + model.base.h / 2;
                          const half = (model.base.h / 2 + model.base.h * 0.5) * layer.guideDrawT;
                          return <line key={`v${i}`} y1={cy0 - half} y2={cy0 + half} x1={x} x2={x} stroke={accent} strokeWidth={model.base.w * 0.0018} opacity={0.5} />;
                        })}
                        {tpl.showCircles && model.shapes.map((sh) => {
                          const cx = sh.bbox.x + sh.bbox.width / 2, cy = sh.bbox.y + sh.bbox.height / 2;
                          const r = (Math.max(sh.bbox.width, sh.bbox.height) / 2) * 1.06;
                          return <circle key={`gc${sh.id}`} cx={cx} cy={cy} r={r * layer.guideDrawT} fill="none" stroke={accent} strokeWidth={model.base.w * 0.0018} opacity={0.45} />;
                        })}
                        {tpl.showBBox && model.shapes.map((sh) => (
                          <rect key={`bb${sh.id}`} x={sh.bbox.x} y={sh.bbox.y} width={sh.bbox.width} height={sh.bbox.height}
                            fill="none" stroke={accent} strokeWidth={model.base.w * 0.0016} strokeDasharray={`${model.base.w * 0.01} ${model.base.w * 0.008}`} opacity={0.6} />
                        ))}
                      </g>
                    )}

                    {layer.anchorOpacity > 0.002 && model.shapes.map((sh) => (
                      <g key={`an-${sh.id}`} className="anchor-overlay" transform={sh.transform}>
                        {sh.anchors.map((a, i) => {
                          const s = model.base.w * 0.012;
                          return <rect key={`an${i}`} x={a.x - s / 2} y={a.y - s / 2} width={s} height={s}
                            fill="#FAFAF7" stroke={accent} strokeWidth={model.base.w * 0.002} opacity={layer.anchorOpacity} />;
                        })}
                      </g>
                    ))}

                    {layer.handleOpacity > 0.002 && model.shapes.map((sh) => (
                      <g key={`bz-${sh.id}`} className="bezier-overlay" transform={sh.transform} opacity={layer.handleOpacity}>
                        {sh.handles.map((seg, i) => (
                          <g key={`hd${i}`}>
                            <line x1={seg.from.x} y1={seg.from.y} x2={seg.c1.x} y2={seg.c1.y} stroke={accent} strokeWidth={model.base.w * 0.0014} opacity={0.5} />
                            <line x1={seg.to.x} y1={seg.to.y} x2={seg.c2.x} y2={seg.c2.y} stroke={accent} strokeWidth={model.base.w * 0.0014} opacity={0.5} />
                            <circle cx={seg.c1.x} cy={seg.c1.y} r={model.base.w * 0.006} fill="#FAFAF7" stroke={accent} strokeWidth={model.base.w * 0.0016} />
                            <circle cx={seg.c2.x} cy={seg.c2.y} r={model.base.w * 0.006} fill="#FAFAF7" stroke={accent} strokeWidth={model.base.w * 0.0016} />
                          </g>
                        ))}
                      </g>
                    ))}
                  </svg>
                )}

                {/* SHINE — highlight band sweeping across the settled mark */}
                {layer && layer.shineT >= 0 && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
                      background: `linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.75) 50%, transparent 62%)`,
                      transform: `translateX(${(layer.shineT * 220 - 110).toFixed(2)}%)`,
                      mixBlendMode: "overlay",
                    }}
                  />
                )}

                {/* GRAIN — the <svg> needs explicit 100% width/height, otherwise
                    the browser falls back to its default 300×150 intrinsic size
                    and the noise only covers the top strip of the canvas. */}
                {grain > 0 && (
                  <svg
                    aria-hidden
                    width="100%"
                    height="100%"
                    style={{
                      position: "absolute", inset: 0, width: "100%", height: "100%",
                      zIndex: 5, pointerEvents: "none", opacity: grain * 0.5,
                      mixBlendMode: "multiply",
                    }}
                  >
                    <filter id="lm-grain">
                      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
                      <feColorMatrix type="saturate" values="0" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#lm-grain)" />
                  </svg>
                )}

                {/* VIGNETTE */}
                {vignette > 0 && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none",
                      background: `radial-gradient(circle at 50% 50%, transparent 45%, rgba(0,0,0,${(vignette * 0.72).toFixed(3)}) 100%)`,
                    }}
                  />
                )}

                {/* CREDITS overlay — a real top-level component (see
                    CreditsOverlay). It must NOT be defined inline here: React
                    treats components created during render as brand-new types
                    on every pass, which remounts them and made the layout
                    switch fail to take effect. */}
                <CreditsOverlay
                  credits={credits}
                  layout={creditLayout}
                  scale={creditScale}
                  opacity={layer ? Math.max(0, layer.baseOpacity * 0.9) : 0}
                  compact={compact}
                />
              </div>
            )}
          </div>

          {/* HUD readout strip */}
          <div
            className={`lm-mono lm-muted flex items-center justify-between px-1 tracking-wide ${compact ? "" : "text-[9px] sm:text-[11px] pt-2 sm:pt-3"}`}
            style={compact ? { fontSize: 9, paddingTop: 8 } : undefined}
          >
            <span>PHASE · {(layer?.phaseLabel || (parseFailed ? "parse error" : "loading")).toUpperCase()}</span>
            <span>{tpl.name.toUpperCase()} · {model?.shapes.length ?? 0} ELEMENTS</span>
          </div>

          {compact && transportControls}
        </div>

        {/* transport controls — rendered inside the card in compact mode */}
        {!compact && transportControls}

        {/* templates */}
        <div className={compact ? "" : "mt-6 sm:mt-10"} style={compact ? { marginTop: 26 } : undefined}>
          <div
            className={`flex items-center gap-2 lm-muted ${compact ? "" : "mb-2.5 sm:mb-3"}`}
            style={compact ? { marginBottom: 10 } : undefined}
          >
            <Layers size={12} />
            <span
              className={`lm-mono tracking-[0.15em] ${compact ? "" : "text-[10px] sm:text-[11px]"}`}
              style={compact ? { fontSize: 10 } : undefined}
            >
              TEMPLATES
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto lm-scroll pb-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTplId(t.id); elapsedSecRef.current = 0; setProgress(0); setPlaying(true); }}
                className={`shrink-0 text-left border transition-colors ${compact ? "rounded-2xl" : "w-[132px] sm:w-40 rounded-xl sm:rounded-2xl p-3 sm:p-4"} ${t.id === tplId ? "lm-panel-active" : "lm-panel"}`}
                style={compact ? { width: 190, height: 110, padding: 14, boxSizing: "border-box" } : undefined}
              >
                <div
                  className={`font-medium ${compact ? "" : "text-[12px] sm:text-[13px] mb-0.5 sm:mb-1"}`}
                  style={compact ? { fontSize: 15, marginBottom: 4 } : undefined}
                >
                  {t.name}
                </div>
                <div
                  className={`lm-muted leading-snug ${compact ? "" : "text-[10px] sm:text-[11px]"}`}
                  style={compact ? { fontSize: 12 } : undefined}
                >
                  {t.blurb}
                </div>
              </button>
            ))}
          </div>
          <p className="lm-muted leading-relaxed" style={{ fontSize: compact ? 12 : 11, marginTop: 8 }}>
            {tpl.desc}
          </p>
        </div>

        {/* live-text warning */}
        {hasLiveText && (
          <div className="lm-warn" style={{ marginTop: P.gap, padding: P.pad, borderRadius: 16 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <AlertTriangle size={14} style={{ color: "#E5A94A" }} />
              <span className="font-medium" style={{ fontSize: P.label }}>1 thing to check</span>
            </div>
            <p className="lm-muted leading-relaxed" style={{ fontSize: P.small }}>
              This SVG contains live text. Convert it to outlines in your design tool, or the text will be
              missing from the animation.
            </p>
          </div>
        )}

        {/* OUTPUT */}
        <Panel title="Output" P={P}>
          <Field label="FORMAT" hint={`${format.w}×${format.h}`} P={P}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {FORMATS.map((f) => {
                const active = f.id === formatId;
                // little proportional thumbnail of each aspect ratio
                const boxH = 30;
                const boxW = Math.max(10, Math.min(34, (f.w / f.h) * boxH));
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormatId(f.id)}
                    className={active ? "lm-panel-active" : "lm-panel"}
                    style={{
                      padding: "10px 4px", borderRadius: 14, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: boxW, height: boxH, borderRadius: 3,
                        border: `1.5px solid ${active ? accent : "#4b4b57"}`,
                        background: active ? `${accent}22` : "transparent",
                        display: "block", flexShrink: 0,
                      }}
                    />
                    <span className="lm-mono" style={{ fontSize: P.small, color: active ? "#F3F1EE" : "#8A8A93" }}>
                      {f.short}
                    </span>
                    <span style={{ fontSize: P.small - 2, color: active ? "#F3F1EE" : "#6a6a73" }}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="lm-muted" style={{ fontSize: P.small, marginTop: 8 }}>
              {format.hint}
            </p>
          </Field>

          <Field label="FEEL" P={P}>
            <Segmented
              options={Object.entries(FEELS).map(([id, f]) => ({ id, label: f.label }))}
              value={feelId}
              onChange={(v) => { setFeelId(v); elapsedSecRef.current = 0; setProgress(0); setPlaying(true); }}
              P={P}
            />
          </Field>

          <Field label="READS" hint={reads === "rtl" ? "Right to left" : "Left to right"} P={P}>
            <Segmented
              options={[{ id: "ltr", label: "Left → right" }, { id: "rtl", label: "Right → left" }]}
              value={reads}
              onChange={setReads}
              P={P}
            />
            <p className="lm-muted leading-relaxed" style={{ fontSize: P.small, marginTop: 8 }}>
              Sets which end the mark reveals from. Choose right to left for Arabic, Hebrew and other RTL scripts.
            </p>
          </Field>

          <Field label="DURATION" hint={`${duration.toFixed(1)}s`} P={P}>
            <input
              type="range" min={2} max={10} step={0.1} value={duration}
              onChange={(e) => { setDuration(parseFloat(e.target.value)); elapsedSecRef.current = 0; setProgress(0); }}
              className="lm-slider" style={{ width: "100%", height: 3 }}
            />
          </Field>
        </Panel>

        {/* COLOR */}
        <Panel title="Color" P={P}>
          <Field label="ACCENT" P={P}>
            <ColorRow value={accent} onChange={setAccent} P={P} />
          </Field>

          {model?.logoColors?.length > 0 && (
            <Field label="FROM YOUR LOGO" P={P}>
              <div className="flex gap-2 flex-wrap">
                {model.logoColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccent(c)}
                    title={c}
                    style={{ width: 34, height: 34, borderRadius: 999, background: c, border: "1px solid #2c2c34" }}
                  />
                ))}
              </div>
            </Field>
          )}

          <Field label="LOGO FILL" P={P}>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setLogoFillMode("original")}
                className={logoFillMode === "original" ? "lm-chip-active" : "lm-chip"}
                style={{ padding: "9px 16px", borderRadius: 999, fontSize: P.body }}
              >
                Original
              </button>
              <button
                onClick={() => setLogoFillMode("custom")}
                aria-label="Use a custom logo fill"
                style={{
                  width: 40, height: 40, borderRadius: 12, background: logoFill,
                  border: logoFillMode === "custom" ? "2px solid #F3F1EE" : "1px solid #2c2c34",
                }}
              />
              <input
                value={logoFill}
                onChange={(e) => { setLogoFill(e.target.value); setLogoFillMode("custom"); }}
                className="lm-mono lm-input"
                style={{ flex: 1, minWidth: 120, fontSize: P.body, padding: "10px 14px", borderRadius: 999 }}
              />
            </div>
          </Field>
        </Panel>

        {/* BACKGROUND */}
        <Panel title="Background" P={P}>
          <Segmented
            options={[{ id: "solid", label: "Solid" }, { id: "linear", label: "Linear" }, { id: "radial", label: "Radial" }]}
            value={bgType}
            onChange={setBgType}
            P={P}
          />
          <Field label="COLOR" P={P}>
            <ColorRow value={bgColor} onChange={setBgColor} P={P} />
          </Field>
          {bgType !== "solid" && (
            <Field label="SECOND COLOR" P={P}>
              <ColorRow value={bgColor2} onChange={setBgColor2} P={P} />
            </Field>
          )}
          <Field label="GRAIN" hint={grain === 0 ? "Off" : `${Math.round(grain * 100)}%`} P={P}>
            <input type="range" min={0} max={1} step={0.01} value={grain}
              onChange={(e) => setGrain(parseFloat(e.target.value))}
              className="lm-slider" style={{ width: "100%", height: 3 }} />
          </Field>
          <Field label="VIGNETTE" hint={vignette === 0 ? "Off" : `${Math.round(vignette * 100)}%`} P={P}>
            <input type="range" min={0} max={1} step={0.01} value={vignette}
              onChange={(e) => setVignette(parseFloat(e.target.value))}
              className="lm-slider" style={{ width: "100%", height: 3 }} />
          </Field>
        </Panel>

        {/* OVERLAYS */}
        <Panel title="Overlays" P={P}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["guides", "Guides"], ["anchors", "Anchors"],
              ["handles", "Handles"], ["circles", "Circles"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setOverlays((o) => ({ ...o, [key]: !o[key] }))}
                className="flex items-center gap-2.5"
                style={{ background: "none", border: "none", padding: 0, textAlign: "left" }}
              >
                <span className={overlays[key] ? "lm-toggle lm-toggle-on" : "lm-toggle"}>
                  <span className="lm-toggle-knob" />
                </span>
                <span style={{ fontSize: P.body }}>{label}</span>
              </button>
            ))}
          </div>
          <p className="lm-muted leading-relaxed" style={{ fontSize: P.small, marginTop: 10 }}>
            Turns overlays off for templates that use them. It won't add an overlay to a template built without it.
          </p>
        </Panel>

        {/* CAMERA */}
        <Panel title="Camera" P={P}>
          <Segmented
            options={[{ id: "auto", label: "Automatic" }, { id: "spots", label: "Choose spots" }]}
            value={cameraMode}
            onChange={setCameraMode}
            P={P}
          />
          {model && (
            <div style={{ marginTop: 14 }}>
              <div
                className="lm-canvas"
                style={{ width: "100%", maxWidth: 260, margin: "0 auto", aspectRatio: "4 / 5", borderRadius: 14, overflow: "hidden", position: "relative" }}
              >
                <svg viewBox={`${model.base.x} ${model.base.y} ${model.base.w} ${model.base.h}`} style={{ width: "100%", height: "100%" }}>
                  <g opacity={0.22}>
                    {ast?.children.map((c, i) => renderAstNode(c, `cam${i}`, "original", originalCtx))}
                  </g>
                  {model.spots.map((sp, i) => {
                    const chosen = cameraMode === "spots" && i === spotIndex;
                    return (
                      <g key={`sp${i}`}>
                        <rect
                          x={sp.x} y={sp.y} width={sp.w} height={sp.h}
                          fill="none" stroke={accent}
                          strokeWidth={model.base.w * (chosen ? 0.006 : 0.003)}
                          opacity={chosen ? 1 : 0.6}
                        />
                        <circle cx={sp.x + sp.w * 0.12} cy={sp.y + sp.h * 0.12} r={model.base.w * 0.035} fill="#FAFAF7" stroke={accent} strokeWidth={model.base.w * 0.003} />
                        <text
                          x={sp.x + sp.w * 0.12} y={sp.y + sp.h * 0.12}
                          textAnchor="middle" dominantBaseline="central"
                          fontSize={model.base.w * 0.045} fill="#0B0B0E"
                        >
                          {i + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              {cameraMode === "spots" && (
                <div className="flex gap-2 justify-center" style={{ marginTop: 12 }}>
                  {model.spots.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setSpotIndex(i); elapsedSecRef.current = 0; setProgress(0); setPlaying(true); }}
                      className={i === spotIndex ? "lm-chip-active" : "lm-chip"}
                      style={{ padding: "8px 18px", borderRadius: 999, fontSize: P.body }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
              <p className="lm-muted leading-relaxed" style={{ fontSize: P.small, marginTop: 10 }}>
                {cameraMode === "auto"
                  ? `The engine picked these ${model.spots.length} details by where the drawing is densest. Switch to Choose spots to override it.`
                  : "Pick which detail the camera moves in on."}
              </p>
            </div>
          )}
        </Panel>

        {/* CREDITS */}
        <Panel title="Credits" P={P}>
          {[
            ["handle", "@yourhandle"], ["role", "Logo design"],
            ["client", "Client"], ["website", "Website"],
          ].map(([key, placeholder]) => (
            <input
              key={key}
              value={credits[key]}
              placeholder={placeholder}
              onChange={(e) => setCredits((c) => ({ ...c, [key]: e.target.value }))}
              className="lm-input"
              style={{ width: "100%", fontSize: P.body, padding: "12px 16px", borderRadius: 999, marginBottom: 10, boxSizing: "border-box" }}
            />
          ))}

          <Field label="LAYOUT" hint={CREDIT_LAYOUTS.find((l) => l.id === creditLayout)?.name} P={P}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {CREDIT_LAYOUTS.map((l) => {
                const active = l.id === creditLayout;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setCreditLayout(l.id)}
                    className={active ? "lm-panel-active" : "lm-panel"}
                    style={{ padding: "9px 6px", borderRadius: 12, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                  >
                    {/* tiny diagram of where the text sits in the frame */}
                    <span style={{ position: "relative", width: 30, height: 24, borderRadius: 3, border: `1px solid ${active ? accent : "#4b4b57"}`, display: "block", flexShrink: 0 }}>
                      {l.id === "split" && (<>
                        <i style={{ position: "absolute", left: 3, bottom: 3, width: 9, height: 2, background: active ? accent : "#6a6a73" }} />
                        <i style={{ position: "absolute", right: 3, bottom: 3, width: 7, height: 2, background: active ? accent : "#6a6a73" }} />
                      </>)}
                      {l.id === "stacked" && (<>
                        <i style={{ position: "absolute", left: 3, bottom: 3, width: 11, height: 2, background: active ? accent : "#6a6a73" }} />
                        <i style={{ position: "absolute", left: 3, bottom: 7, width: 8, height: 2, background: active ? accent : "#6a6a73" }} />
                      </>)}
                      {l.id === "center" && (<>
                        <i style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 3, width: 14, height: 2, background: active ? accent : "#6a6a73" }} />
                        <i style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 7, width: 9, height: 2, background: active ? accent : "#6a6a73" }} />
                      </>)}
                      {l.id === "corners" && (<>
                        <i style={{ position: "absolute", left: 3, top: 3, width: 9, height: 2, background: active ? accent : "#6a6a73" }} />
                        <i style={{ position: "absolute", right: 3, bottom: 3, width: 7, height: 2, background: active ? accent : "#6a6a73" }} />
                      </>)}
                      {l.id === "topbar" && (<>
                        <i style={{ position: "absolute", left: 3, top: 3, width: 8, height: 2, background: active ? accent : "#6a6a73" }} />
                        <i style={{ position: "absolute", right: 3, top: 3, width: 8, height: 2, background: active ? accent : "#6a6a73" }} />
                      </>)}
                    </span>
                    <span style={{ fontSize: P.small - 1, color: active ? "#F3F1EE" : "#8A8A93", textAlign: "center", lineHeight: 1.2 }}>
                      {l.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="lm-muted leading-relaxed" style={{ fontSize: P.small, marginTop: 8 }}>
              {CREDIT_LAYOUTS.find((l) => l.id === creditLayout)?.hint}
            </p>
          </Field>

          {creditLayout !== "none" && (
            <Field label="SIZE" hint={`${Math.round(creditScale * 100)}%`} P={P}>
              <input
                type="range" min={0.6} max={2} step={0.05} value={creditScale}
                onChange={(e) => setCreditScale(parseFloat(e.target.value))}
                className="lm-slider" style={{ width: "100%", height: 3 }}
              />
            </Field>
          )}
        </Panel>

        {/* WHAT THE ENGINE FOUND */}
        {model && (
          <Panel title="What the engine found" P={P}>
            {[
              ["Shapes", model.stats.shapes],
              ["Contours", model.stats.contours],
              ["Anchor points", model.stats.anchorPoints],
              ["Parts detected", model.stats.partsDetected],
              ["Counters", model.stats.counters],
              ["Circles fitted", model.stats.circlesFitted],
              ["Guide lines", model.stats.guideLines],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between" style={{ padding: "7px 0" }}>
                <span className="lm-muted" style={{ fontSize: P.body }}>{label}</span>
                <span className="lm-mono" style={{ fontSize: P.body }}>{val}</span>
              </div>
            ))}
          </Panel>
        )}

        {/* EXPORT */}
        <Panel title="Export" P={P}>
          <button
            onClick={exportVideo}
            disabled={exportState.status === "rendering" || !model}
            className="lm-btn-accent"
            style={{
              width: "100%", padding: "15px 20px", borderRadius: 999,
              fontSize: P.body, fontWeight: 600, border: "none",
              background: accent,
              opacity: exportState.status === "rendering" ? 0.6 : 1,
              cursor: exportState.status === "rendering" ? "default" : "pointer",
            }}
          >
            {exportState.status === "rendering"
              ? `Rendering… ${Math.round(exportState.progress * 100)}%`
              : `Export ${videoCodec ? videoCodec.label : "video"}`}
          </button>

          {exportState.status === "rendering" && (
            <div style={{ height: 3, borderRadius: 999, background: "#2c2c34", marginTop: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${exportState.progress * 100}%`, background: accent, transition: "width .12s linear" }} />
            </div>
          )}

          <p className="lm-muted" style={{ fontSize: P.small, marginTop: 10 }}>
            {format.w}×{format.h} · 60fps · {(effDuration + HOLD_SECONDS).toFixed(1)}s
          </p>

          {exportState.status === "rendering" && (
            <p className="lm-muted leading-relaxed" style={{ fontSize: P.small, marginTop: 8 }}>
              Keep this tab in the foreground — browsers throttle background tabs and the render will stall.
              At 60fps this takes about twice as long as the clip itself.
            </p>
          )}
          {exportState.status === "done" && (
            <p className="lm-muted" style={{ fontSize: P.small, marginTop: 8 }}>
              Saved as {exportState.message}. Check your downloads.
            </p>
          )}
          {exportState.status === "error" && (
            <p style={{ fontSize: P.small, marginTop: 8, color: "#E5A94A" }}>{exportState.message}</p>
          )}

          <button
            onClick={downloadStaticSvg}
            className="lm-chip"
            style={{ width: "100%", padding: "13px 16px", borderRadius: 999, fontSize: P.body, marginTop: 10, cursor: "pointer" }}
          >
            Export still SVG · {formatId}
          </button>

          <button
            onClick={exportImage}
            disabled={exportState.status === "rendering" || !model}
            className="lm-chip"
            style={{ width: "100%", padding: "13px 16px", borderRadius: 999, fontSize: P.body, marginTop: 10, cursor: "pointer" }}
          >
            Export image PNG · {format.w}×{format.h}
          </button>
          <p className="lm-muted leading-relaxed" style={{ fontSize: P.small, marginTop: 8 }}>
            The PNG captures the frame you're currently paused on — scrub to the moment you want first.
          </p>

          {videoCodec && videoCodec.ext === "webm" && (
            <div className="lm-note" style={{ marginTop: 12, padding: 12, borderRadius: 12 }}>
              <p className="lm-muted leading-relaxed" style={{ fontSize: P.small }}>
                This browser records <span className="lm-mono">WebM</span>, not MP4. WebM uploads fine to Instagram,
                TikTok and X. For a true MP4, open this in Chrome 130+ or Safari, or convert the file with
                <span className="lm-mono"> ffmpeg</span> or CloudConvert.
              </p>
            </div>
          )}
          {!videoCodec && (
            <div className="lm-note" style={{ marginTop: 12, padding: 12, borderRadius: 12 }}>
              <p className="lm-muted leading-relaxed" style={{ fontSize: P.small }}>
                Video recording isn't supported in this browser. The still SVG export still works.
              </p>
            </div>
          )}
        </Panel>

        {/* MUSIC */}
        <Panel title="Music" P={P}>
          <p className="lm-muted leading-relaxed" style={{ fontSize: P.small, marginBottom: 10 }}>
            Not wired up yet. The recorder captures video only, so adding a track means muxing audio in after the
            fact — and beat detection on top of that. Tell me if you want it and I'll build it.
          </p>
          <button
            disabled
            className="lm-chip"
            style={{ width: "100%", padding: "13px 16px", borderRadius: 999, fontSize: P.body, opacity: 0.45 }}
          >
            Choose audio — not available yet
          </button>
        </Panel>

      </div>
    </div>
  );
}
