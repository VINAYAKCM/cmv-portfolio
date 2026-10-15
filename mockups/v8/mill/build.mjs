// Candidate 4: the annoyance mill.
// Rough stones (annoyances) wait in the hopper. Each scroll station sends one along the belt,
// under the press, and out as a finished tile into the tray: one tile per project.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, kitScript, byDepthOf, writeSite, writePreview, EMAIL } from "../shared/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---------- world ---------- */
const W = 470, H = 320;
const BASE = { x: -96, y: -34, w: 192, d: 68, r: 5 };
const BASE_T = 8, FOOT_H = 4;
const BELT_X0 = -58, BELT_X1 = 52, BELT_Y = 9, BELT_Z = 24, ROLLER_R = 4.2;
const PRESS_X = 0;
const TRAY = { x: 64, y: -26, w: 26, d: 52, r: 2 };
const SLOT_Y = (i) => TRAY.y + 4 + i * 12;
const HOPPER = { x: -92, y: -15, w: 28, d: 30, r: 2 };
const HOPPER_Z = 22, HOPPER_TOP = 50;
const PIECE = 9;                                 // a finished tile is 9 by 9

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_T - FOOT_H, 0), [PRESS_X, 0, 74], [HOPPER.x, 0, HOPPER_TOP + 8], [TRAY.x + TRAY.w, TRAY.y + TRAY.d, 12]],
  W, H, { pad: 16, azimuth: 38 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = byDepthOf(P);
const rough = (cx, cy, r, seed, n = 7) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + seed; const rr = r * (0.72 + 0.28 * Math.abs(Math.sin(seed * 7.3 + i * 2.1))); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });

/* ---------- base ---------- */
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_T - FOOT_H, BASE_T, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 12))) {
    out.push(S(k.cylinder(x, y, 6, -BASE_T - FOOT_H, 1.4, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.4, -BASE_T - FOOT_H + 1.4, FOOT_H - 1.4, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -BASE_T, BASE_T, P, 8, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 4), 0, P), { tone: "faint" }));
  const screws = k.corners(BASE, 7);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.8, 0, P, 14)).join(""), { tone: "lo" }), D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.45 }));
  // a hazard strip along the front edge, painted on: closed stripes on a closed band
  const band = { x: -60, y: BASE.y + BASE.d - 8, w: 110, d: 4, r: 0.6 };
  out.push(L(k.planOutline(band, 0, P, 2), { tone: "lo" }));
  out.push(Array.from({ length: 22 }, (_, i) => `<path class="ml-stripe" d="M${[[band.x + i * 5, band.y], [band.x + i * 5 + 2.5, band.y], [band.x + i * 5 + 2.5 - 2, band.y + band.d], [band.x + i * 5 - 2, band.y + band.d]].map(([x, y]) => at([Math.max(band.x, Math.min(band.x + band.w, x)), y, 0.02]).map((n) => n.toFixed(1)).join(" ")).join("L")}Z"/>`).join(""));
  return out.join("");
}

/* ---------- hopper with the annoyances in it, and the chute ---------- */
function hopper() {
  const out = [];
  out.push(S(k.cylinder(HOPPER.x + 6, 0, 3.2, 0, HOPPER_Z, P, 18), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(HOPPER.x + HOPPER.w - 6, 0, 3.2, 0, HOPPER_Z, P, 18), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(HOPPER, HOPPER_Z, HOPPER_TOP - HOPPER_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(HOPPER, HOPPER_Z + 8, P, 4), { tone: "faint" }) }));
  out.push(`<path class="ml-mouth" d="M${k.ringOf(k.insetPlan(HOPPER, 2.4), 4).map(([x, y]) => at([x, y, HOPPER_TOP]).map((n) => n.toFixed(1)).join(" ")).join("L")}Z"/>`);
  // the stones heaped in the mouth
  [[-84, -8, 4.2, 1.1], [-76, -6, 3.6, 2.7], [-80, 2, 4.4, 0.4], [-72, 4, 3.4, 3.9], [-86, 6, 3.2, 5.2], [-77, 10, 3.0, 2.2]]
    .sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
    .forEach(([x, y, r, s]) => out.push(S(k.extrude(rough(x, y, r, s), HOPPER_TOP - 3, 3 + r * 0.6, P), { tone: "hi", crease: "lo" })));
  // chute down to the start of the belt
  out.push(S(k.slabOf({ x: HOPPER.x + HOPPER.w, y: BELT_Y - 7, w: BELT_X0 - HOPPER.x - HOPPER.w + 2, d: 14, r: 1 }, BELT_Z + 1.6, 2, P, 2), { tone: "mid" }));
  return out.join("");
}

/* ---------- belt ---------- */
const F_ROLL = (x) => G.frameAlong([x, BELT_Y, BELT_Z - ROLLER_R + 1.2], [0, 1, 0]);
function beltBack() {
  const out = [];
  for (const x of [BELT_X0 + 4, BELT_X1 - 4, (BELT_X0 + BELT_X1) / 2]) out.push(S(k.slabOf({ x: x - 2, y: BELT_Y - 11, w: 4, d: 3, r: 0.6 }, 0, BELT_Z - 6, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: BELT_X0 - 4, y: BELT_Y - 11, w: BELT_X1 - BELT_X0 + 8, d: 2.4, r: 0.6 }, BELT_Z - 8, 6.6, P, 2, 0.3), { tone: "mid" }));
  for (const x of [BELT_X0, BELT_X1]) out.push(S(G.disc(-8.6, 8.6, ROLLER_R, F_ROLL(x), P), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: BELT_X0, y: BELT_Y - 8.6, w: BELT_X1 - BELT_X0, d: 17.2, r: 0.4 }, BELT_Z, 1.2, P, 2), { tone: "lo" }));
  return out.join("");
}
function beltFront() {
  const out = [];
  out.push(S(k.slabOf({ x: BELT_X0 - 4, y: BELT_Y + 8.6, w: BELT_X1 - BELT_X0 + 8, d: 2.4, r: 0.6 }, BELT_Z - 8, 6.6, P, 2, 0.3), { tone: "mid" }));
  out.push(D([BELT_X0, BELT_X1].map((x) => at([x, BELT_Y + 11, BELT_Z - 4.7])), { size: 0.6, tone: "mid" }));
  for (const x of [BELT_X0 + 4, BELT_X1 - 4, (BELT_X0 + BELT_X1) / 2]) out.push(S(k.slabOf({ x: x - 2, y: BELT_Y + 8.6, w: 4, d: 3, r: 0.6 }, 0, BELT_Z - 8, P, 2), { tone: "mid", crease: "none" }));
  // drive motor and guard on the right end
  const m = { x: BELT_X1 - 2, y: BELT_Y + 11, w: 12, d: 10, r: 1.6 };
  out.push(S(k.slabOf(m, 0, 16, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(m, 1.6), 16, P, 3), { tone: "faint" }));
  return out.join("");
}

/* ---------- press over the middle of the belt ---------- */
function pressBack() {
  return S(k.cylinder(PRESS_X, BELT_Y - 16, 3.6, 0, 66, P, 20), { tone: "mid", crease: "none" }) + S(k.cylinder(PRESS_X, BELT_Y - 16, 5.2, 0, 4, P, 22), { tone: "mid" });
}
function pressTop() {
  const out = [];
  const beam = { x: PRESS_X - 8, y: BELT_Y - 20, w: 16, d: 40, r: 2 };
  out.push(S(k.slabOf(beam, 62, 9, P, 3, 0.6), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(PRESS_X, BELT_Y, 7, 71, 8, P, 28, 0.5), { tone: "mid" }));
  out.push(L(k.sideArc(PRESS_X, BELT_Y, 7, 75, P, 24), { tone: "faint" }));
  out.push(D(k.corners(beam, 3).map(([x, y]) => at([x, y, 71])), { size: 0.45 }));
  return out.join("");
}
function pressFront() {
  return S(k.cylinder(PRESS_X, BELT_Y + 16, 5.2, 0, 4, P, 22), { tone: "mid" }) + S(k.cylinder(PRESS_X, BELT_Y + 16, 3.6, 4, 58, P, 20), { tone: "mid", crease: "none" });
}
// the ram is built down (touching a piece on the belt) and lifted with translateAlong
const RAM_LIFT = 20;
function ram() {
  return S(k.cylinder(PRESS_X, BELT_Y, 2.4, BELT_Z + 4 + 8, 62 - BELT_Z - 12, P, 18), { tone: "mid", crease: "none" })
    + S(k.slabOf({ x: PRESS_X - 6, y: BELT_Y - 6, w: 12, d: 12, r: 1.4 }, BELT_Z + 4, 8, P, 3, 0.5), { tone: "hi", crease: "lo" });
}

/* ---------- output tray ---------- */
function tray() {
  const out = [S(k.slabOf(TRAY, 0, 9, P, 4, 0.6), { tone: "mid" })];
  for (let i = 0; i < 4; i++) out.push(`<path class="ml-mouth" d="M${k.ringOf({ x: TRAY.x + 7, y: SLOT_Y(i) + 0.5, w: 12, d: 10, r: 1 }, 3).map(([x, y]) => at([x, y, 9]).map((n) => n.toFixed(1)).join(" ")).join("L")}Z"/>`);
  out.push(D(k.corners(TRAY, 3).map(([x, y]) => at([x, y, 9])), { size: 0.45 }));
  // a short ramp from the belt end into the tray
  out.push(S(k.slabOf({ x: BELT_X1 + 4, y: BELT_Y - 6, w: TRAY.x - BELT_X1 - 4, d: 12, r: 0.6 }, 12, 1.4, P, 2), { tone: "mid" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: W, height: H,
  label: "A small mill on a bench. Rough stones wait in a hopper; one at a time they ride a belt under a press and come out as finished tiles in a four-slot tray, one tile for each project.",
  body: [base(), hopper(), pressBack(), beltBack(), `<g data-part="stripes"></g>`, `<g data-part="belt-pieces"></g>`, `<g data-part="ram">${ram()}</g>`, pressTop(), beltFront(), pressFront(), tray(), `<g data-part="tray-pieces"></g>`],
});

const tokens = `
.fig.iso[data-theme="light"]{--anatomy-card:var(--canvas);--anatomy-paper:var(--canvas);--anatomy-face:#FF5A1F;--anatomy-lit-top:#FF7A47;--anatomy-lit-shade:#D9430D;--anatomy-lit:#5C1A04}
.fig .ml-stripe{fill:#1C1C1C;opacity:.85}
.fig .ml-mouth{fill:#2A2A2A;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight)}
.fig .ml-belt{stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight);fill:none}
`;

const live = `
const P = ${JSON.stringify(P)};
const BELT_X0 = ${BELT_X0}, BELT_X1 = ${BELT_X1}, BELT_Y = ${BELT_Y}, BELT_Z = ${BELT_Z}, PRESS_X = ${PRESS_X}, RAM_LIFT = ${RAM_LIFT}, PIECE = ${PIECE};
const TRAY = ${JSON.stringify(TRAY)};
const SLOTS = ${JSON.stringify([0, 1, 2, 3].map(SLOT_Y))};
const NAMES = ["Lumen", "Postcard", "Smart GIF", "Atlas"];
const fig = document.querySelector("[data-anatomy]");
const stripes = fig.querySelector('[data-part="stripes"]'), onBelt = fig.querySelector('[data-part="belt-pieces"]'), inTray = fig.querySelector('[data-part="tray-pieces"]'), ramEl = fig.querySelector('[data-part="ram"]');
const readout = fig.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const rough = (cx, cy, r, seed, n = 7) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + seed; const rr = r * (0.72 + 0.28 * Math.abs(Math.sin(seed * 7.3 + i * 2.1))); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
let q = 0, last = 0, shown = "", key = "", trayKey = "", lift = RAM_LIFT;
function piece(x, made, lit) {
  // before the press it is a rough stone; after, a finished tile
  const z = BELT_Z + 1.2;
  if (!made) return solidSvg(extrude(rough(x, BELT_Y, 4.6, 1.7), z, 5.2, P), { tone: "hi", crease: "lo", lit });
  return solidSvg(slabOf({ x: x - PIECE / 2, y: BELT_Y - PIECE / 2, w: PIECE, d: PIECE, r: 1.4 }, z, 3.2, P, 3, 0.5), { tone: "hi", crease: "lo", lit });
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  const s = window.__vkStation || 0;
  q = still.matches ? s : q + (s - q) * (1 - Math.exp(-dt / 0.12));
  // piece n (0-based) rides the belt while q runs from n to n + 1, then sits in slot n
  const qs = q + 0.03;                                         // scroll lands a hair short of a station
  const shipped = Math.max(0, Math.min(4, Math.floor(qs)));
  const f = Math.max(0, qs - Math.floor(qs) - 0.03);
  let html = "", x = null, made = false;
  if (q < 4) { x = BELT_X0 + 4 + (BELT_X1 - BELT_X0 - 6) * f; made = x > PRESS_X + 1; html = piece(x, made, true); }
  else { x = BELT_X0 + 4 + 8 * Math.min(1, (q - 4) * 2); html = piece(x, false, true); }   // the next annoyance, waiting
  const k2 = (x === null ? "-" : x.toFixed(1)) + made;
  if (k2 !== key) { onBelt.innerHTML = html; key = k2; }
  const tk = String(shipped);
  if (tk !== trayKey) {
    let t = "";
    for (let i = 0; i < shipped; i++) t += solidSvg(slabOf({ x: TRAY.x + 8.5, y: SLOTS[i] + 1.5, w: PIECE, d: PIECE - 1, r: 1.4 }, 9 - 1.2, 3.2, P, 3, 0.5), { tone: "hi", crease: "lo" });
    inTray.innerHTML = t; trayKey = tk;
  }
  // the ram comes down while a piece is under it
  const under = x !== null && Math.abs(x - PRESS_X) < 5;
  lift += ((under ? 0 : RAM_LIFT) - lift) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.05));
  ramEl.setAttribute("transform", translateAlong(P, [0, 0, lift]));
  // belt stripes move with the belt
  const phase = (q * (BELT_X1 - BELT_X0 - 6)) % 8;
  let d = "";
  for (let sx = BELT_X0 + 2 + phase; sx < BELT_X1 - 1; sx += 8) d += lineOnTop([sx, BELT_Y - 8.6], [sx, BELT_Y + 8.6], BELT_Z + 1.2, P);
  stripes.innerHTML = '<path class="ml-belt" d="' + d + '"/>';
  const text = shipped >= 4 ? "4 shipped  ·  hopper still full" : "Shipped " + shipped + " of 4  ·  next: " + NAMES[shipped];
  if (text !== shown) { readout.textContent = text; shown = text; }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
`;

const figure = `<figure class="fig iso" data-theme="light" data-anatomy tabindex="0" aria-label="Annoyance mill: each project is a stone milled into a finished tile">
  ${svg}
  <figcaption><span data-readout>Shipped 0 of 4</span><span>Fig 1 · Annoyance mill</span></figcaption>
</figure>`;

writeSite({
  dir: HERE,
  title: "Vinayak CM · Mill",
  fonts: `<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700&family=Big+Shoulders+Stencil+Display:wght@700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">`,
  tokens,
  css: `
  :root { --canvas:#E7E7E3; --paper:#F7F7F4; --ink:#151515; --gray:#7F7F7A; --rule:#CACAC4; --accent:#FF5A1F;
          --font:"Schibsted Grotesk", system-ui, sans-serif; --display:"Big Shoulders Stencil Display", sans-serif; --mono:"DM Mono", ui-monospace, monospace; --fig-w: 470px; }
  ::selection { background: var(--accent); color: #fff; }
  /* intro: a spec plate riveted to the machine */
  .plate { position: relative; background: var(--paper); border: 1.5px solid var(--ink); padding: 20px 22px; }
  .plate::before, .plate::after { content: ""; position: absolute; width: 6px; height: 6px; border-radius: 50%; background: var(--ink); top: 8px; }
  .plate::before { left: 8px; } .plate::after { right: 8px; }
  .plate h1 { font: 700 40px/0.9 var(--display); letter-spacing: .02em; text-transform: uppercase; }
  .plate dl { display: grid; grid-template-columns: 1fr 1fr 1fr; border-block: 1.5px solid var(--ink); margin: 16px 0; }
  .plate dl div { padding: 8px 10px 9px 0; }
  .plate dl div + div { border-left: 1px solid var(--rule); padding-left: 10px; }
  .plate dt { font: 500 10px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--gray); margin-bottom: 5px; }
  .plate dd { font-size: 14px; }
  .plate p + p { margin-top: 10px; }
  .plate .go { display: flex; gap: 20px; margin-top: 16px; font: 500 12px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; }
  .plate .go a { background: linear-gradient(var(--accent), var(--accent)) 0 100%/100% 2px no-repeat; padding-bottom: 3px; }
  .label, .hint, .frame .tag, .frame .kind, .case .tl, .case .close, footer .row, .case-kicker { font-family: var(--mono); font-size: 12px; letter-spacing: .04em; text-transform: uppercase; }
  .frame .tag b { font: 700 18px/1 var(--display); letter-spacing: .04em; margin-right: 6px; color: var(--accent); vertical-align: -2px; }
  .frame.cur { box-shadow: inset 0 -4px 0 var(--accent); }
  .frame.end a { color: var(--accent); }
  .case-kicker { color: var(--accent); margin-bottom: 8px; }
  .case h2 { font: 700 44px/0.95 var(--display); text-transform: uppercase; letter-spacing: .02em; }
  `,
  figure,
  figureScript: kitScript() + live,
  intro: `
    <div class="plate">
      <h1>Vinayak CM</h1>
      <dl><div><dt>Input</dt><dd>Annoyances</dd></div><div><dt>Output</dt><dd>Products</dd></div><div><dt>Operator</dt><dd>Design &amp; AI Eng.</dd></div></dl>
      <p>I build AI stuff for problems that are just annoying enough for everyone to complain about, but not annoying enough for anyone else to fix.</p>
      <p class="gray">I also care way too much about design, because ugly interfaces deserve consequences.</p>
      <div class="go"><a href="mailto:${EMAIL}">Feed me one</a><a href="#">Résumé</a><a href="#">GitHub</a><a href="#">LinkedIn</a></div>
    </div>`,
  cue: "Scroll to run the mill ↓",
  tag: (i, p) => `<b>0${i + 1}</b>${p.name}`,
  endFrame: `<p>The hopper's still full.<br><a href="mailto:${EMAIL}">Bring me an annoyance</a></p>`,
  footer: `<span>© 2026 Vinayak CM</span><span>Milled in Bangalore</span>`,
  site: { caseTag: (i) => "Batch 0" + (i + 1), caseKicker: (i) => "Batch 0" + (i + 1) + " · shipped", nextLabel: "Next batch", dockWidth: 300 },
});
writePreview({ dir: HERE, svg, tokens, title: "Annoyance mill" });
