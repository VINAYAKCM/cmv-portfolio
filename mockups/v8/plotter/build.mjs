// Candidate 2: a pen plotter that draws the page.
// On load it plots the intro; each scroll station plots the next work frame and its project's mark.
// The gantry and the pen carriage follow the pen; the ink stays on the paper.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, kitScript, byDepthOf, writeSite, writePreview, EMAIL } from "../shared/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---------- world ---------- */
const W = 470, H = 330;
const BED = { x: -96, y: -66, w: 192, d: 132, r: 5 };
const BED_T = 8, FOOT_H = 4;
const PAPER = { x: -74, y: -52, w: 148, d: 104, r: 0.6 };
const PAPER_Z = 0.5;
const INK_Z = PAPER_Z + 0.05;
const RAIL_X = 86, RAIL_W = 7, RAIL_H = 7;
const TRUCK = { w: 14, d: 22 }, TRUCK_H = 26;
const BRIDGE_Z = 24, BRIDGE_H = 9, BRIDGE_D = 12;
const PEN_UP = 2.2;

/* ---------- the drawing: strokes on the paper, grouped by station ---------- */
// paper coordinates: x across, y toward the viewer
const rect = (x, y, w, d) => [[[x, y], [x + w, y]], [[x + w, y], [x + w, y + d]], [[x + w, y + d], [x, y + d]], [[x, y + d], [x, y]]];
const poly = (pts, closed) => pts.slice(0, closed ? pts.length : -1).map((p, i) => [p, pts[(i + 1) % pts.length]]);
const circle = (cx, cy, r, n = 18, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const FW = 22, FD = 15, FY = 12, GAP = 5;
const fx = (i) => -((5 * FW + 4 * GAP) / 2) + i * (FW + GAP);
const groups = [];
// 0: the intro block, an avatar square and four lines of text
groups.push([...rect(-26, -42, 52, 34), ...rect(-21, -37, 6, 6), [[-21, -27], [19, -27]], [[-21, -23], [15, -23]], [[-21, -19], [21, -19]], [[-21, -15], [9, -15]]]);
// 1-4: a frame each, with the project's mark inside
const marks = [
  (x, y) => poly([[x + 9, y + 3.5], [x + 9, y + 11.5], [x + 11, y + 9.6], [x + 12.4, y + 12.4], [x + 13.6, y + 11.8], [x + 12.3, y + 9.1], [x + 15, y + 9.1]], true),                          // Lumen: a cursor
  (x, y) => [...rect(x + 5, y + 4, 12, 8), [[x + 11, y + 5], [x + 11, y + 11]], ...rect(x + 13.6, y + 5, 2.4, 2.8), [[x + 6.4, y + 7], [x + 9.6, y + 7]], [[x + 6.4, y + 9], [x + 9, y + 9]]], // Postcard
  (x, y) => [...poly(circle(x + 11, y + 7.5, 4.4, 20), false), [[x + 9.4, y + 6.4], [x + 9.4, y + 6.9]], [[x + 12.6, y + 6.4], [x + 12.6, y + 6.9]], ...poly(circle(x + 11, y + 7.6, 2.4, 8, 0.35, Math.PI - 0.35), false)], // Smart GIF: a face
  (x, y) => [...poly([[x + 11, y + 13], ...circle(x + 11, y + 6, 3.6, 16, Math.PI * 0.75, Math.PI * 2.25), [x + 11, y + 13]], false), ...poly(circle(x + 11, y + 6, 1.3, 10), false)], // Atlas: a pin
];
for (let i = 0; i < 4; i++) groups.push([...rect(fx(i), FY, FW, FD), ...marks[i](fx(i), FY)]);
// 5: the last frame, three dots for "more soon"
groups.push([...rect(fx(4), FY, FW, FD), ...[7, 11, 15].map((dx) => [[fx(4) + dx, FY + 7.5], [fx(4) + dx + 0.6, FY + 7.5]])]);

const STROKES = [];
groups.forEach((g, gi) => g.forEach(([a, b]) => STROKES.push({ g: gi, a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) })));
const GROUP_LEN = groups.map((_, gi) => STROKES.filter((s) => s.g === gi).reduce((t, s) => t + s.len, 0));

const P = k.fitProjection(
  [...k.boxCorners(BED, -BED_T - FOOT_H, 0), [-RAIL_X, BED.y, BRIDGE_Z + BRIDGE_H + 6], [RAIL_X + 14, BED.y, BRIDGE_Z + BRIDGE_H + 14], [RAIL_X, BED.y + BED.d, BRIDGE_Z + BRIDGE_H]],
  W, H, { pad: 14, azimuth: 36 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = byDepthOf(P);

/* ---------- bed, paper and rails ---------- */
function bed() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BED, -BED_T - FOOT_H, BED_T, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BED, 14))) {
    out.push(S(k.cylinder(x, y, 6, -BED_T - FOOT_H, 1.4, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, -BED_T - FOOT_H + 1.4, FOOT_H - 1.4, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BED, -BED_T, BED_T, P, 8, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BED, 4), 0, P), { tone: "faint" }));
  // the sheet, held by four corner clips
  const sheet = [[PAPER.x, PAPER.y], [PAPER.x + PAPER.w, PAPER.y], [PAPER.x + PAPER.w, PAPER.y + PAPER.d], [PAPER.x, PAPER.y + PAPER.d]];
  out.push(`<path class="pl-paper" d="M${sheet.map(([x, y]) => at([x, y, PAPER_Z]).map((n) => n.toFixed(1)).join(" ")).join("L")}Z"/>`);
  for (const [x, y] of k.corners(PAPER, 0)) {
    const c = { x: x - 4, y: y - 4, w: 8, d: 8, r: 1 };
    out.push(S(k.slabOf(c, PAPER_Z, 1.2, P, 2, 0.3), { tone: "mid" }));
    out.push(D([at([x, y, PAPER_Z + 1.2])], { size: 0.45 }));
  }
  // registration ticks along the front edge of the bed
  const strip = { x: PAPER.x, y: BED.y + BED.d - 9, w: PAPER.w, d: 5, r: 0.8 };
  out.push(S(k.slabOf(strip, 0, 0.5, P, 2), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 4, 5, strip.y + 0.6, 0.5, [1.6, 3], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}
function rail(x) {
  const plan = { x: x - RAIL_W / 2, y: BED.y + 4, w: RAIL_W, d: BED.d - 8, r: 1.2 };
  const out = [S(k.slabOf(plan, 0, RAIL_H, P, 3, 0.4), { tone: "mid" })];
  out.push(L(k.lineOnTop([x, plan.y], [x, plan.y + plan.d], RAIL_H, P), { tone: "faint" }));
  out.push(D(Array.from({ length: 7 }, (_, i) => at([x - 2, plan.y + 8 + i * 19, RAIL_H])), { size: 0.4, tone: "lo" }));
  for (const y of [plan.y - 1, plan.y + plan.d - 4]) out.push(S(k.slabOf({ x: x - 5, y, w: 10, d: 5, r: 1 }, 0, RAIL_H + 3, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}
function motorY() {
  // the y motor and its belt, on the back of the right rail
  const m = { x: RAIL_X - 7, y: BED.y - 12, w: 14, d: 12, r: 1.6 };
  const out = [S(k.slabOf(m, 0, 14, P, 3, 0.5), { tone: "mid" })];
  out.push(L(k.planOutline(k.insetPlan(m, 1.6), 14, P, 3), { tone: "faint" }));
  out.push(D(k.corners(m, 2.4).map(([x, y]) => at([x, y, 14])), { size: 0.4 }));
  return out.join("");
}

/* ---------- gantry (moves along y), carriage (along x), pen (up and down) ---------- */
function gantry() {
  const out = [];
  for (const x of [-RAIL_X, RAIL_X]) {
    const t = { x: x - TRUCK.w / 2, y: -TRUCK.d / 2, w: TRUCK.w, d: TRUCK.d, r: 2 };
    out.push(S(k.slabOf(t, RAIL_H, BRIDGE_Z - RAIL_H, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x, -TRUCK.d / 2 + 4, BRIDGE_Z]), at([x, TRUCK.d / 2 - 4, BRIDGE_Z])], { size: 0.45 }));
  }
  const bridge = { x: -RAIL_X - TRUCK.w / 2, y: -BRIDGE_D / 2, w: 2 * RAIL_X + TRUCK.w, d: BRIDGE_D, r: 1.5 };
  out.push(S(k.slabOf(bridge, BRIDGE_Z, BRIDGE_H, P, 3, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideSeam(bridge, BRIDGE_Z + 3, P, 3), { tone: "faint" }) }));
  out.push(L(k.lineOnTop([bridge.x, 0], [bridge.x + bridge.w, 0], BRIDGE_Z + BRIDGE_H, P), { tone: "faint" }));
  // x motor on the right end of the bridge
  const m = { x: RAIL_X - 6, y: -7, w: 12, d: 14, r: 1.6 };
  out.push(S(k.slabOf(m, BRIDGE_Z + BRIDGE_H, 11, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(m, 1.6), BRIDGE_Z + BRIDGE_H + 11, P, 3), { tone: "faint" }));
  out.push(D(k.corners(m, 2.4).map(([x, y]) => at([x, y, BRIDGE_Z + BRIDGE_H + 11])), { size: 0.4 }));
  return out.join("");
}
const CAR = { x: -8, y: BRIDGE_D / 2, w: 16, d: 7, r: 1.4 };
function carriage() {
  const out = [];
  out.push(S(k.slabOf(CAR, BRIDGE_Z - 6, BRIDGE_H + 10, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  out.push(D([at([-5, CAR.y + CAR.d, BRIDGE_Z + 10]), at([5, CAR.y + CAR.d, BRIDGE_Z + 10])], { size: 0.45 }));
  // pen-lift solenoid on top
  out.push(S(k.cylinder(0, CAR.y + 3.5, 3.4, BRIDGE_Z + BRIDGE_H + 4, 5, P, 20), { tone: "mid" }));
  out.push(L(k.sideArc(0, CAR.y + 3.5, 3.4, BRIDGE_Z + BRIDGE_H + 6.5, P, 14), { tone: "faint" }));
  // pen clamp sleeve on the front of the carriage
  out.push(S(k.cylinder(0, CAR.y + CAR.d + 3, 3.6, BRIDGE_Z - 6, 7, P, 20), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -1.4, y: CAR.y + CAR.d, w: 2.8, d: 1.2, r: 0.4 }, BRIDGE_Z - 4, 4, P, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}
const PEN_Y = CAR.y + CAR.d + 3;
function pen() {
  // the lit part: the pen, barrel to tip; built with its tip on the paper and lifted with translateAlong
  const out = [];
  out.push(S(k.cylinder(0, PEN_Y, 2.4, 3.6, BRIDGE_Z + 4 - 3.6, P, 20), { tone: "hi", lit: true, crease: "none" }));
  out.push(S(k.cylinder(0, PEN_Y, 2.8, BRIDGE_Z + 4, 3, P, 20), { tone: "hi", lit: true }));
  out.push(S(k.cylinder(0, PEN_Y, 1.4, 1.2, 2.4, P, 16), { tone: "hi", lit: true }));
  out.push(S(k.cylinder(0, PEN_Y, 0.6, PAPER_Z, 0.8, P, 12), { tone: "hi", lit: true }));
  return out.join("");
}

/* ---------- ink: one path per stroke, revealed in order ---------- */
const ink = STROKES.map((s, i) => `<path class="ink" data-s="${i}" d="${k.segment([s.a[0], s.a[1], INK_Z], [s.b[0], s.b[1], INK_Z], P)}"/>`).join("");

const svg = k.figureSvg({
  width: W, height: H,
  label: "A pen plotter on a bench. A gantry rides two rails over a sheet of paper and its pen draws the page: the intro first, then one frame for each project with a small mark inside.",
  body: [bed(), `<g class="inks">${ink}</g>`, rail(-RAIL_X), motorY(), rail(RAIL_X),
    `<g data-part="gantry">${gantry()}</g>`, `<g data-part="carriage">${carriage()}</g>`, `<g data-part="pen">${pen()}</g>`],
});

const tokens = `
.fig.iso[data-theme="light"]{--anatomy-card:var(--canvas);--anatomy-paper:var(--canvas);--anatomy-face:#2F4BF0;--anatomy-lit-top:#5B72F5;--anatomy-lit-shade:#2238C4;--anatomy-lit:#0E1A6B}
.fig .pl-paper{fill:#FFFFFF;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.fig .ink{fill:none;stroke:#2440E8;stroke-width:.9;stroke-linecap:round}
`;

const live = `
const P = ${JSON.stringify(P)};
const STROKES = ${JSON.stringify(STROKES)};
const GROUP_LEN = ${JSON.stringify(GROUP_LEN)};
const PEN_UP = ${PEN_UP}, PEN_Y = ${PEN_Y};
const fig = document.querySelector("[data-anatomy]");
const gantry = fig.querySelector('[data-part="gantry"]'), car = fig.querySelector('[data-part="carriage"]'), penEl = fig.querySelector('[data-part="pen"]');
const inks = [...fig.querySelectorAll(".ink")].map((el) => { const L = el.getTotalLength(); el.style.strokeDasharray = L + " " + (L + 1); el.style.strokeDashoffset = L; return { el, L, f: -1 }; });
const readout = fig.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const t0 = performance.now();
let px = STROKES[0].a[0], py = STROKES[0].a[1], lift = PEN_UP, last = 0, shown = "";
// where the pen is after drawing q groups' worth of ink (q runs 0..6)
function state(q) {
  let g = Math.floor(q), f = q - g, drawn = 0, tip = STROKES[0].a, down = false;
  const want = GROUP_LEN.slice(0, g).reduce((a, b) => a + b, 0) + (GROUP_LEN[g] || 0) * f;
  const out = STROKES.map((s) => { const left = want - drawn; drawn += s.len; if (left <= 0) return 0; if (left >= s.len) { tip = s.b; return 1; } tip = [s.a[0] + (s.b[0] - s.a[0]) * left / s.len, s.a[1] + (s.b[1] - s.a[1]) * left / s.len]; down = true; return left / s.len; });
  return { out, tip, down, mm: want };
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  const s = window.__vkStation || 0;
  const load = Math.min(1, (now - t0) / 2400);                 // the intro plots itself on load
  // intro on load, then one group per station: Lumen's frame is plotted by the time it is centred
  const q = Math.min(GROUP_LEN.length - 0.0001, load + s);
  const st = state(q);
  st.out.forEach((f, i) => { const k = inks[i]; if (Math.abs(k.f - f) > 0.002) { k.el.style.strokeDashoffset = k.L * (1 - f); k.f = f; } });
  const ease = still.matches ? 1 : 1 - Math.exp(-dt / 0.06);
  px += (st.tip[0] - px) * ease; py += (st.tip[1] - py) * ease;
  const moving = Math.hypot(st.tip[0] - px, st.tip[1] - py) > 0.6;
  lift += ((st.down && !moving ? 0 : PEN_UP) - lift) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.05));
  // the pen sits PEN_Y in front of the gantry, so the gantry rides that far behind the tip
  gantry.setAttribute("transform", translateAlong(P, [0, py - PEN_Y, 0]));
  car.setAttribute("transform", translateAlong(P, [px, py - PEN_Y, 0]));
  penEl.setAttribute("transform", translateAlong(P, [px, py - PEN_Y, lift]));
  const text = "X " + px.toFixed(1).padStart(6) + "  Y " + (-py).toFixed(1).padStart(6) + "  ·  " + Math.round(st.mm) + " mm";
  if (text !== shown) { readout.textContent = text; shown = text; }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
`;

const figure = `<figure class="fig iso" data-theme="light" data-anatomy tabindex="0" aria-label="Pen plotter: draws the page as you scroll">
  ${svg}
  <figcaption><span data-readout>X 0 Y 0</span><span>Fig 1 · Plotter</span></figcaption>
</figure>`;

writeSite({
  dir: HERE,
  title: "Vinayak CM · Plotter",
  fonts: `<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">`,
  tokens,
  css: `
  :root { --canvas:#F6F6F3; --paper:#FFFFFF; --ink:#16181D; --gray:#8A8C93; --rule:#DCDDE1; --accent:#2440E8;
          --font:"IBM Plex Sans", system-ui, sans-serif; --mono:"IBM Plex Mono", ui-monospace, monospace; --fig-w: 460px; }
  body { background-color: var(--canvas);
    background-image: linear-gradient(rgba(36,64,232,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(36,64,232,.045) 1px, transparent 1px);
    background-size: 8px 8px; }
  ::selection { background: var(--accent); color: #fff; }
  /* intro: a drawing sheet with crop marks and a title block */
  .sheet { position: relative; padding: 22px 24px 20px; background: var(--paper); }
  .sheet::before, .sheet::after { content: ""; position: absolute; width: 14px; height: 14px; border: 0 solid var(--accent); }
  .sheet::before { left: -8px; top: -8px; border-width: 1px 0 0 1px; }
  .sheet::after { right: -8px; bottom: -8px; border-width: 0 1px 1px 0; }
  .sheet p + p { margin-top: 12px; }
  .titleblock { display: grid; grid-template-columns: 1.4fr 1fr 1fr; margin-top: 20px; border: 1px solid var(--ink); font: 12px/1.3 var(--mono); }
  .titleblock div { padding: 7px 9px; border-right: 1px solid var(--ink); }
  .titleblock div:last-child { border-right: 0; }
  .titleblock div:nth-child(n+4) { border-top: 1px solid var(--ink); }
  .titleblock div:nth-child(3n) { border-right: 0; }
  .titleblock span { display: block; color: var(--gray); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 2px; }
  .titleblock a { color: var(--accent); }
  .label, .hint, .frame .tag, .frame .kind, .case .tl, .case .close, footer .row, .case-kicker { font-family: var(--mono); font-size: 12px; }
  .case-kicker { color: var(--accent); margin-bottom: 8px; }
  /* frames are sheets; the one in focus gets plotted: a blue outline drawn round it */
  .frame { outline: 1px solid var(--rule); }
  .frame::after { content: ""; position: absolute; inset: 6px; border: 1px solid var(--accent); clip-path: inset(0 100% 100% 0); transition: clip-path .9s cubic-bezier(.6,0,.2,1); pointer-events: none; }
  .frame.cur::after { clip-path: inset(0 0 0 0); }
  .frame .tag b { color: var(--accent); font-weight: 500; }
  .frame.end { background: rgba(255,255,255,.5); }
  .frame.end a { color: var(--accent); border-bottom: 1px solid var(--accent); }
  .case h2 { font: 500 22px/1.2 var(--font); }
  `,
  figure,
  figureScript: kitScript() + live,
  intro: `
    <div class="sheet">
      <p>I build AI stuff for problems that are just annoying enough for everyone to complain about, but not annoying enough for anyone else to fix.</p>
      <p class="gray">I also care way too much about design, because ugly interfaces deserve consequences.</p>
      <div class="titleblock">
        <div><span>Drawn by</span>Vinayak CM</div><div><span>Title</span>Design &amp; AI Eng.</div><div><span>Location</span>Bangalore</div>
        <div><span>Contact</span><a href="mailto:${EMAIL}">${EMAIL}</a></div><div><span>Status</span>Open to work</div><div><span>Sheet</span>1 of 6</div>
      </div>
    </div>`,
  cue: "Scroll to keep plotting ↓",
  tag: (i, p) => `<b>Sheet 0${i + 2}</b>  ${p.name}`,
  endFrame: `<p>Sheet 06, still blank.<br><a href="mailto:${EMAIL}">Plot something with me</a></p>`,
  footer: `<span>© 2026 Vinayak CM</span><span>Plotted in Bangalore · 0.35 mm pen</span>`,
  site: { caseTag: (i) => "Sheet 0" + (i + 2), caseKicker: (i) => "Sheet 0" + (i + 2), nextLabel: "Next sheet", dockWidth: 300 },
});
writePreview({ dir: HERE, svg, tokens, title: "Plotter" });
