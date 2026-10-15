// Candidate 1: a Bangalore auto-rickshaw meter.
// Flag up = "For hire" (open to work). Scrolling drops the flag and runs the meter:
// distance is how far you've scrolled, fare follows the city's auto tariff.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, kitScript, byDepthOf, writeSite, writePreview, AVATAR, EMAIL } from "../shared/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---------- truth ---------- */
// Bangalore auto tariff used for the readout: minimum fare for the first 2 km, then per km.
const MIN_FARE = 36, MIN_KM = 2, PER_KM = 18;   // to verify against the current notified tariff
const KM_PER_PX = 0.0012;                          // one screen of scrolling is about a kilometre
const FLAG_POSES = 16;                             // flag drawn every 6° from up (0°) to down (90°)

/* ---------- world ---------- */
const W = 460, H = 330;
const BASE = { x: -60, y: -32, w: 120, d: 64, r: 6 };
const BASE_T = 8, FOOT_H = 4;
const POST_X = 48, BAR_Z = 16, BAR_R = 3.6;
const BOX = { x: -42, y: -22, w: 84, d: 44, r: 5 };
const BOX_Z = 40, BOX_TOP = 86, CAP_H = 5;
const FRONT = BOX.y + BOX.d;                       // y of the front face
const PIVOT = [36, 0, BOX_TOP + CAP_H + 6];
const WIN = { x0: -34, x1: 22, z0: 60, z1: 74 };   // window on the front face

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_T - FOOT_H, 0), [BOX.x, BOX.y, BOX_TOP + CAP_H], [PIVOT[0] + 30, 0, PIVOT[2] + 40], [PIVOT[0] + 40, 0, PIVOT[2] - 30], [70, 0, 50]],
  W, H, { pad: 18, azimuth: 40 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = byDepthOf(P);
const r1 = (n) => Math.round(n * 1000) / 1000;
const vec = (v) => { const o = at([0, 0, 0]), p = at(v); return [p[0] - o[0], p[1] - o[1]]; };
// an SVG matrix that lays text in the plane spanned by `along` (reading direction) and `down`
const planeMatrix = (anchor, along, down) => { const [a, b] = vec(along), [c, d] = vec(down), [e, f] = at(anchor); return `matrix(${r1(a)} ${r1(b)} ${r1(c)} ${r1(d)} ${r1(e)} ${r1(f)})`; };
const poly = (pts) => "M" + pts.map((p) => at(p).map((n) => n.toFixed(1)).join(" ")).join("L") + "Z";

/* ---------- stand ---------- */
function stand() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_T - FOOT_H, BASE_T, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 12))) {
    out.push(S(k.cylinder(x, y, 5.6, -BASE_T - FOOT_H, 1.4, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.2, -BASE_T - FOOT_H + 1.4, FOOT_H - 1.4, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -BASE_T, BASE_T, P, 8, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 4), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 7);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.8, 0, P, 14)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.45 }));
  // a small label plate on the base
  const plate = { x: -26, y: BASE.y + BASE.d - 13, w: 52, d: 8, r: 1 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.4), 0.8, P, 3), { tone: "faint" }));
  out.push(L([[-20, 16], [-20, 4], [-20, 10]].map(([x0, len], i) => k.lineOnTop([x0, plate.y + 2.6 + i * 1.5], [x0 + len + 18, plate.y + 2.6 + i * 1.5], 0.8, P)).join(""), { tone: "lo", free: true }));
  // posts that carry the grab bar
  for (const x of [-POST_X, POST_X]) {
    out.push(S(k.cylinder(x, 0, 5, 0, 3, P, 24), { tone: "mid" }));
    out.push(S(k.cylinder(x, 0, 3, 3, BAR_Z - 3, P, 20), { tone: "mid", crease: "none" }));
  }
  return out.join("");
}
const F_BAR = G.frameAlong([0, 0, BAR_Z], [1, 0, 0]);
function bar() {
  const out = [];
  out.push(S(G.disc(-POST_X - 6, POST_X + 6, BAR_R, F_BAR, P), { tone: "mid", crease: "none" }));
  for (const s of [-POST_X - 7.5, POST_X + 6]) out.push(S(G.disc(s, s + 1.5, BAR_R + 0.9, F_BAR, P), { tone: "lo" }));
  // clamp around the bar, then the stem up to the meter
  const clamp = { x: -7, y: -7, w: 14, d: 14, r: 2 };
  out.push(S(k.slabOf(clamp, BAR_Z - 6, 12, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([-4, 7, BAR_Z + 2]), at([4, 7, BAR_Z + 2])].map((p) => p), { size: 0.5 }));
  out.push(S(k.cylinder(0, 0, 3.2, BAR_Z + 6, BOX_Z - 4 - BAR_Z - 6, P, 20), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(0, 0, 3.2, BAR_Z + 14, P, 14), { tone: "faint" }));
  // cradle under the meter
  out.push(S(k.slabOf({ x: -18, y: -10, w: 36, d: 20, r: 2 }, BOX_Z - 4, 4, P, 4, 0.5), { tone: "mid" }));
  return out.join("");
}

/* ---------- the meter (drawn black) ---------- */
function meter() {
  const out = [`<g class="m-black">`];
  out.push(S(k.slabOf(BOX, BOX_Z, BOX_TOP - BOX_Z, P, 6, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideSeam(BOX, BOX_Z + 8, P, 6), { tone: "lo" }) }));
  out.push(S(k.slabOf(k.insetPlan(BOX, 2), BOX_TOP, CAP_H, P, 6, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(BOX, 6), BOX_TOP + CAP_H, P, 6), { tone: "lo" }));
  out.push(D(k.corners(BOX, 7).map(([x, y]) => at([x, y, BOX_TOP + CAP_H])), { size: 0.5, tone: "mid" }));
  // flag bracket on the cap
  out.push(S(k.slabOf({ x: PIVOT[0] - 6, y: -5, w: 10, d: 10, r: 1.5 }, BOX_TOP + CAP_H, PIVOT[2] - BOX_TOP - CAP_H + 5, P, 3, 0.4), { tone: "hi", crease: "lo" }));
  // winding knob on the right side
  const FK = G.frameAlong([BOX.x + BOX.w, 4, 62], [1, 0, 0]);
  out.push(S(G.disc(0, 2, 5, FK, P), { tone: "hi" }));
  out.push(S(G.disc(2, 7, 7, FK, P), { tone: "hi", crease: "lo" }));
  out.push(k.fadedSvg(G.ribsOf(FK, 2.4, 6.6, 7, 40, P, { fade: [0.05, 0.45] }), { tone: "lo" }));
  out.push(D([at(G.pointOf(FK, 7, 0, 0))], { size: 0.6, tone: "mid" }));
  // rivets along the front lower edge, and the seal screw
  out.push(D([-30, -18, -6, 6, 18, 30].map((x) => at([x, FRONT, BOX_Z + 4])), { size: 0.45, tone: "mid" }));
  out.push(L(k.sideRing([28, FRONT, 48], 2.2, "y", P), { tone: "lo" }), D([at([28, FRONT, 48])], { size: 0.5, tone: "mid" }));
  out.push(`</g>`);
  return out.join("");
}

/* the window: a bezel, a paper ground and the drums that roll */
const FARE_CELLS = 4, DIST_CELLS = 3;
const fareCell = (i) => -10 + i * 7.6;           // fare: four big drums on the right
const distCell = (i) => WIN.x0 + 2.5 + i * 6.4;  // distance: three small drums on the left
function windowFace() {
  const y = FRONT + 0.05;
  const out = [];
  const bezel = [[WIN.x0 - 2, y, WIN.z0 - 2], [WIN.x1 + 2, y, WIN.z0 - 2], [WIN.x1 + 2, y, WIN.z1 + 2], [WIN.x0 - 2, y, WIN.z1 + 2]];
  out.push(`<path class="m-bezel" d="${poly(bezel)}"/>`);
  const glass = [[WIN.x0, y, WIN.z0], [WIN.x1, y, WIN.z0], [WIN.x1, y, WIN.z1], [WIN.x0, y, WIN.z1]];
  out.push(`<path class="m-glass" d="${poly(glass)}"/>`);
  // fare row (top) and distance row (bottom)
  const fareZ0 = WIN.z0 + 2, fareZ1 = WIN.z1 - 2, distZ0 = WIN.z0 + 4, distZ1 = WIN.z1 - 4;
  const cell = (x0, x1, z0, z1) => `<path class="m-cell" d="${poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]])}"/>`;
  for (let i = 0; i < FARE_CELLS; i++) out.push(cell(fareCell(i), fareCell(i) + 6.8, fareZ0, fareZ1));
  for (let i = 0; i < DIST_CELLS; i++) out.push(cell(distCell(i), distCell(i) + 5.6, distZ0, distZ1));
  out.push(L(k.segment([-13.5, y, WIN.z0], [-13.5, y, WIN.z1], P), { tone: "lo" }));
  out.push(D([at([distCell(1) + 6, y, distZ0 + 0.5])], { size: 0.5, tone: "hi" }));
  for (let i = 0; i < FARE_CELLS; i++) out.push(`<text class="m-digit" data-fare="${i}" transform="${planeMatrix([fareCell(i) + 3.4, y, fareZ0 + 1.6], [1, 0, 0], [0, 0, -1])}" text-anchor="middle" font-size="7.6">0</text>`);
  for (let i = 0; i < DIST_CELLS; i++) out.push(`<text class="m-digit" data-dist="${i}" transform="${planeMatrix([distCell(i) + 2.8, y, distZ0 + 1.2], [1, 0, 0], [0, 0, -1])}" text-anchor="middle" font-size="4.6">0</text>`);
  // a tariff slot to the right of the window
  out.push(`<path class="m-slot" d="${poly([[26, y, 60], [36, y, 60], [36, y, 74], [26, y, 74]])}"/>`);
  out.push(L(k.segment([28, y, 71], [34, y, 71], P), { tone: "lo", free: true }), L(k.segment([28, y, 68], [33, y, 68], P), { tone: "lo", free: true }), L(k.segment([28, y, 65], [34, y, 65], P), { tone: "lo", free: true }));
  return out.join("");
}

/* ---------- the flag (the lit part), drawn at each angle ---------- */
const flagFrame = (deg) => {
  const t = (deg * Math.PI) / 180;
  return G.frameOf(PIVOT, [0, 1, 0], [Math.sin(t), 0, Math.cos(t)], [Math.cos(t), 0, -Math.sin(t)]);
};
const S0 = 7.4, S1 = 9.6;   // the flag's thickness, in front of the bracket face
function flagPose(deg) {
  const F = flagFrame(deg);
  const arm = `<g class="m-black">${S(G.prismOf(F, [[-3, -1.6], [40, -1.6], [40, 1.6], [-3, 1.6]], S0, S1, P), { tone: "hi", crease: "lo" })}</g>`;
  const plate = S(G.prismOf(F, [[19, 1.6], [40, 1.6], [40, 30], [19, 30]], S0, S1, P), { tone: "hi", lit: true });
  // the one engraved label: plate coordinates p (along the arm) and q (across it); text reads across, down the arm
  const t = (deg * Math.PI) / 180;
  const across = [Math.cos(t), 0, -Math.sin(t)], down = [-Math.sin(t), 0, -Math.cos(t)];
  const anchor = [PIVOT[0] + Math.sin(t) * 31 + Math.cos(t) * 15.8, PIVOT[1] + S1 + 0.05, PIVOT[2] + Math.cos(t) * 31 - Math.sin(t) * 15.8];
  const label = `<text class="m-flag-text" transform="${planeMatrix(anchor, across, down)}" text-anchor="middle" font-size="4.2">FOR HIRE</text>`;
  const rivets = D([[22, 4], [37, 4], [22, 27], [37, 27]].map(([p, q]) => at(G.pointOf(G.frameOf(F.o, F.a, F.u, F.v), S1, 0, 0).map((c, i) => c + F.u[i] * p + F.v[i] * q))), { size: 0.45, tone: "hi" });
  return arm + plate + label + rivets;
}
const flagCap = () => {
  const F = G.frameAlong(PIVOT, [0, 1, 0]);
  return S(G.disc(5, S0, 4, F, P), { tone: "hi", crease: "lo" }) + "";
};
const flagHub = () => {
  const F = G.frameAlong(PIVOT, [0, 1, 0]);
  return S(G.disc(S1, S1 + 1.6, 2.8, F, P), { tone: "hi", crease: "lo" }) + D([at(G.pointOf(F, S1 + 1.6, 0, 0))], { size: 0.55, tone: "mid" });
};
const flagPoses = Array.from({ length: FLAG_POSES }, (_, i) => `<g data-flag="${i}"${i ? ' style="display:none"' : ""}>${flagPose((i / (FLAG_POSES - 1)) * 90)}</g>`).join("");

/* ---------- assemble ---------- */
const svg = k.figureSvg({
  width: W, height: H,
  label: "A mechanical auto-rickshaw meter on a small stand. Its flag stands up while it is for hire and drops when a trip starts; the window shows the fare and the distance, both counted from how far you have scrolled.",
  body: [stand(), bar(), `<g class="m-black">${flagCap()}</g>`, meter(), windowFace(), `<g data-part="flag">${flagPoses}</g>`, `<g class="m-black">${flagHub()}</g>`],
});

const tokens = `
.fig.iso[data-theme="light"]{--anatomy-card:var(--canvas);--anatomy-paper:var(--canvas);--anatomy-face:#F2C200;--anatomy-lit-top:#FFD43B;--anatomy-lit-shade:#D9A900;--anatomy-lit:#1a1a1a}
.fig .m-black{--anatomy-paper:#1E1E1F;--anatomy-top:#2B2B2D;--anatomy-shade-0:#121213;--anatomy-shade-1:#161617;--anatomy-shade-2:#1B1B1C;--anatomy-shade-3:#202022;--anatomy-hi:#0A0A0A;--anatomy-mid:#5A5A5E;--anatomy-lo:#46464A;--anatomy-faint:#38383B;--anatomy-dot:#8A8A8E;--anatomy-halo:#000}
.fig .m-bezel{fill:#2E2E30;stroke:#0A0A0A;stroke-width:var(--anatomy-weight)}
.fig .m-glass{fill:#F5F1E6;stroke:#0A0A0A;stroke-width:var(--anatomy-weight)}
.fig .m-cell{fill:#FFFDF7;stroke:#B8B4AA;stroke-width:.4}
.fig .m-slot{fill:#2B2B2D;stroke:#0A0A0A;stroke-width:var(--anatomy-weight)}
.fig .m-digit{font-family:var(--mono);font-weight:600;fill:#111}
.fig .m-flag-text{font-family:"Barlow Condensed",var(--mono);font-weight:700;fill:#1a1a1a;letter-spacing:.05em}
`;

const live = `
const P = ${JSON.stringify(P)};
const MIN_FARE = ${MIN_FARE}, MIN_KM = ${MIN_KM}, PER_KM = ${PER_KM}, KM_PER_PX = ${KM_PER_PX}, POSES = ${FLAG_POSES};
const fig = document.querySelector("[data-anatomy]");
const flags = [...fig.querySelectorAll("[data-flag]")];
const fare = [...fig.querySelectorAll("[data-fare]")], dist = [...fig.querySelectorAll("[data-dist]")];
const readout = fig.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let angle = 0, pose = 0, last = 0, km = 0, shown = "";
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  const s = window.__vkStation || 0;
  const running = scrollY > 24 && s < 4.6;
  // the flag is a lever on a spring: it drops fast and rises a little slower
  const want = running ? 90 : 0;
  angle = still.matches ? want : angle + (want - angle) * (1 - Math.exp(-dt / (running ? 0.12 : 0.22)));
  const next = Math.round((angle / 90) * (POSES - 1));
  if (next !== pose) { flags[pose].style.display = "none"; flags[next].style.display = ""; pose = next; }
  km = scrollY * KM_PER_PX;
  const rupees = km <= 0.001 ? 0 : MIN_FARE + Math.max(0, km - MIN_KM) * PER_KM;
  const f = String(Math.round(rupees)).padStart(4, "0"), d = String(Math.min(999, Math.round(km * 10))).padStart(3, "0");
  fare.forEach((t, i) => { if (t.textContent !== f[i]) t.textContent = f[i]; });
  dist.forEach((t, i) => { if (t.textContent !== d[i]) t.textContent = d[i]; });
  const text = s >= 4.6 ? "Trip over  ·  ₹" + Math.round(rupees) + "  ·  flag me down" : running ? "Hired  ·  ₹" + Math.round(rupees) + "  ·  " + km.toFixed(1) + " km" : "For hire";
  if (text !== shown) { readout.textContent = text; shown = text; }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
`;

const figure = `<figure class="fig iso" data-theme="light" data-anatomy tabindex="0" aria-label="Auto meter: shows the fare and distance of your scroll through the site">
  ${svg}
  <figcaption><span data-readout>For hire</span><span>Fig 1 · Auto meter</span></figcaption>
</figure>`;

writeSite({
  dir: HERE,
  title: "Vinayak CM · Meter",
  fonts: `<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500&family=Barlow+Condensed:wght@500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">`,
  tokens,
  css: `
  :root { --canvas:#EFEEEA; --paper:#FFFFFF; --ink:#141414; --gray:#85847F; --rule:#D3D1CB; --accent:#F2C200;
          --font: Barlow, system-ui, sans-serif; --display: "Barlow Condensed", Barlow, sans-serif; --mono: "JetBrains Mono", ui-monospace, monospace; }
  .fig figcaption { font-family: var(--display); font-size: 13px; letter-spacing: .04em; text-transform: uppercase; }
  /* the intro is a fare card: a printed table with a heavy top rule */
  .card { background: var(--paper); border-top: 6px solid var(--ink); padding: 18px 22px 22px; box-shadow: 0 1px 0 var(--rule); }
  .card .head { display: flex; justify-content: space-between; align-items: baseline; font: 600 13px/1 var(--display); letter-spacing: .08em; text-transform: uppercase; padding-bottom: 12px; border-bottom: 1px solid var(--ink); }
  .card table { width: 100%; border-collapse: collapse; margin: 6px 0 16px; }
  .card td { padding: 9px 0; border-bottom: 1px solid var(--rule); font-size: 15px; vertical-align: baseline; }
  .card td:first-child { width: 34%; font: 600 13px/1 var(--display); letter-spacing: .08em; text-transform: uppercase; color: var(--gray); }
  .card .hire { display: inline-flex; align-items: center; gap: 8px; }
  .card .hire::before { content: ""; width: 10px; height: 10px; background: var(--accent); outline: 1px solid var(--ink); }
  .card p + p { margin-top: 12px; }
  .card .go { display: flex; gap: 22px; margin-top: 18px; font: 600 14px/1 var(--display); letter-spacing: .08em; text-transform: uppercase; }
  .card .go a { border-bottom: 2px solid var(--accent); padding-bottom: 3px; }
  .label, .hint, .frame .tag, .frame .kind, .case .tl, .case .close { font-family: var(--display); letter-spacing: .06em; text-transform: uppercase; }
  .label { font-size: 14px; }
  .frame { border-top: 4px solid var(--ink); }
  .frame .tag b { font-weight: 600; }
  .frame.end { border-top: 1px dashed var(--rule); }
  .frame.end a { border-bottom: 2px solid var(--accent); }
  .case-kicker { font: 600 13px/1 var(--display); letter-spacing: .08em; text-transform: uppercase; color: var(--gray); margin-bottom: 8px; }
  .case h2 { font: 600 30px/1.05 var(--display); text-transform: uppercase; letter-spacing: .01em; }
  .case dl { border-top: 3px solid var(--ink); }
  .case dt { font-family: var(--display); letter-spacing: .08em; text-transform: uppercase; }
  footer .row { font-family: var(--display); letter-spacing: .06em; text-transform: uppercase; }
  `,
  figure,
  figureScript: kitScript() + live,
  intro: `
    <div class="card">
      <div class="head"><span>Vinayak CM</span><span class="gray">Tariff card · 2026</span></div>
      <table>
        <tr><td>Role</td><td>Design &amp; AI Engineer</td></tr>
        <tr><td>Based in</td><td>Bangalore</td></tr>
        <tr><td>Status</td><td><span class="hire">For hire</span></td></tr>
      </table>
      <p>I build AI stuff for problems that are just annoying enough for everyone to complain about, but not annoying enough for anyone else to fix.</p>
      <p class="gray">I also care way too much about design, because ugly interfaces deserve consequences.</p>
      <div class="go"><a href="mailto:${EMAIL}">Flag me down</a><a href="#">Résumé</a><a href="#">GitHub</a><a href="#">LinkedIn</a></div>
    </div>`,
  cue: "Scroll to start the meter ↓",
  tag: (i, p) => `<b>Trip 0${i + 1}</b> · ${p.name}`,
  endFrame: `<p>End of the line, for now.<br><a href="mailto:${EMAIL}">Flag me down</a></p>`,
  footer: `<span>© 2026 Vinayak CM</span><span>Metered in Bangalore</span>`,
  site: { caseTag: (i) => 'Trip 0' + (i + 1), caseKicker: (i) => 'Trip 0' + (i + 1), nextLabel: "Next trip", dockWidth: 300 },
});
writePreview({ dir: HERE, svg, tokens, title: "Auto meter" });
