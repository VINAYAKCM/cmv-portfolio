// Candidate 5: an articulated desk lamp on a dark page.
// The lamp swivels to aim at what you're reading; a pool of light on the page follows it,
// and the work outside the light stays dim.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, kitScript, writeSite, writePreview, EMAIL } from "../shared/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---------- world ---------- */
const W = 360, H = 360;
const SHOULDER = [0, 0, 20];
const LOWER = 64, LOWER_PITCH = 64;      // degrees above horizontal
const UPPER = 60, UPPER_PITCH = -14;
const HEAD_PITCH = -58;
const POSES = 15;

const rad = (d) => (d * Math.PI) / 180;
const add = (a, b) => a.map((v, i) => v + b[i]);
const mul = (a, s) => a.map((v) => v * s);
function joints(yaw) {
  const f = [Math.cos(rad(yaw)), Math.sin(rad(yaw)), 0], side = [-Math.sin(rad(yaw)), Math.cos(rad(yaw)), 0], up = [0, 0, 1];
  const dir = (pitch) => add(mul(f, Math.cos(rad(pitch))), mul(up, Math.sin(rad(pitch))));
  const E = add(SHOULDER, mul(dir(LOWER_PITCH), LOWER));
  const Hd = add(E, mul(dir(UPPER_PITCH), UPPER));
  return { f, side, E, H: Hd, lower: dir(LOWER_PITCH), upper: dir(UPPER_PITCH), head: dir(HEAD_PITCH) };
}

// choose the yaw at which the lamp leans straight to the right of the screen, and swing about it
const P0 = k.fitProjection(
  [[-26, -26, -2], [26, 26, 0], [-26, 26, 0], [26, -26, 0], ...[-40, 0, 40].flatMap((d) => { const j = joints(d); return [j.E, j.H, add(j.H, mul(j.head, 24))]; })],
  W, H, { pad: 18, azimuth: 40 },
);
const screenAngle = (yaw) => { const j = joints(yaw); const a = k.iso(SHOULDER, P0), b = k.iso(add(SHOULDER, j.f), P0); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
let YAW0 = 0, best = 1e9;
for (let y = -90; y <= 90; y += 1) { const d = Math.abs(screenAngle(y)); if (d < best) { best = d; YAW0 = y; } }
const SWING = 38;
const YAWS = Array.from({ length: POSES }, (_, i) => YAW0 - SWING + (2 * SWING * i) / (POSES - 1));
const P = k.fitProjection(
  [[-26, -26, -2], [26, 26, 0], [-26, 26, 0], [26, -26, 0], ...YAWS.flatMap((d) => { const j = joints(d); return [j.E, j.H, add(j.H, mul(j.head, 24)), add(add(j.H, mul(j.head, 21)), [0, 0, -15])]; })],
  W, H, { pad: 16, azimuth: 40 },
);
const at = (p) => k.iso(p, P);

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);

/* ---------- base (static) ---------- */
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -24, y: -24, w: 48, d: 48, r: 24 }, -2, 6, P)}"/>`];
  out.push(S(k.cylinder(0, 0, 24, 0, 6, P, 72, 1), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 20, 6, P, 64), { tone: "faint" }));
  out.push(S(k.cylinder(0, 0, 15, 6, 3, P, 56, 0.6), { tone: "mid" }));
  // switch on the base
  out.push(S(k.cylinder(14, 10, 3, 6, 2.4, P, 18), { tone: "mid" }), S(k.cylinder(14, 10, 1.8, 8.4, 1.4, P, 14), { tone: "hi" }));
  // turret
  out.push(S(k.cylinder(0, 0, 6, 9, 5, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 4.2, 14, 4, P, 24), { tone: "mid", crease: "none" }));
  out.push(D(k.corners({ x: -12, y: -12, w: 24, d: 24, r: 4 }, 3).map(([x, y]) => at([x, y, 9])), { size: 0.45 }));
  return out.join("");
}

/* ---------- the arm, head and shade, drawn at each yaw ---------- */
const rod = (from, dir, len, r, style) => S(G.disc(0, len, r, G.frameAlong(from, dir), P, { steps: 16 }), style);
function pose(yaw) {
  const j = joints(yaw);
  const parts = [];
  // shoulder knuckle across the arm
  const knuckle = (c, r, half) => S(G.disc(-half, half, r, G.frameAlong(c, j.side), P, { steps: 28 }), { tone: "mid" });
  // the far bar of each pair first, then the near one
  const nearSign = k.depthOf(add(SHOULDER, j.side), P) > k.depthOf(SHOULDER, P) ? 1 : -1;
  const bars = (from, dir, len) => [-nearSign, nearSign].map((sg) => ({ sg, svg: rod(add(from, mul(j.side, sg * 2.8)), dir, len, 1.15, { tone: "hi", crease: "none" }) }));
  const lo = bars(SHOULDER, j.lower, LOWER), up = bars(j.E, j.upper, UPPER);
  // tension spring beside the lower arm: a slim body ringed like a coil
  const springFrom = add(add(SHOULDER, mul(j.lower, 8)), add(mul(j.side, nearSign * 6), [0, 0, -1.5]));
  const FS = G.frameAlong(springFrom, j.lower);
  const spring = S(G.disc(0, 30, 1.5, FS, P, { steps: 16 }), { tone: "mid", crease: "none" }) + L(Array.from({ length: 21 }, (_, i) => G.arcOf(FS, 0.8 + i * 1.4, 1.55, P)).join(""), { tone: "lo" });
  parts.push(lo[0].svg, up[0].svg, knuckle(SHOULDER, 4.2, 5), lo[1].svg, spring, knuckle(j.E, 3.6, 4.6), up[1].svg);
  // head: a neck, then the shade (the lit part)
  const neck = rod(j.H, j.head, 5, 2, { tone: "mid" });
  const FH = G.frameAlong(add(j.H, mul(j.head, 4)), j.head);
  const shade = S(G.solidOf([[0, 3.4], [3, 4.4], [6, 6.4, 1], [13, 11, 1], [19, 14.4, 1], [21, 15]], FH, P, { steps: 48, smooth: { rows: 3 } }), { tone: "hi", lit: true });
  const cap = S(G.disc(-2.6, 0.2, 3.2, FH, P), { tone: "mid" }) + D([at(G.pointOf(FH, -2.6, 0, 0))], { size: 0.5, tone: "mid" });
  parts.push(neck, cap, shade, knuckle(j.H, 2.8, 3.6));
  return parts.join("");
}
const poses = YAWS.map((y, i) => `<g data-pose="${i}"${i === (POSES - 1) / 2 ? "" : ' style="display:none"'}>${pose(y)}</g>`).join("");
// where each pose's light falls: the screen point a little way out of the shade's mouth
const AIM = YAWS.map((y) => { const j = joints(y); return at(add(add(j.H, mul(j.head, 25)), [0, 0, 0])).map((n) => +n.toFixed(1)); });

const svg = k.figureSvg({
  width: W, height: H,
  label: "An articulated desk lamp: a weighted base, a twin-bar arm with a tension spring, and a shade that swivels to light whatever you are reading.",
  body: [base(), `<g data-part="arm">${poses}</g>`],
});

const tokens = `
.fig.iso[data-theme="dark"]{--anatomy-card:var(--canvas);--anatomy-paper:var(--canvas);--anatomy-face:#F2A44B;--anatomy-lit-top:#FFCB7D;--anatomy-lit-shade:#C9782A;--anatomy-lit:#FFE2B0}
`;

const live = `
const AIM = ${JSON.stringify(AIM)}, POSES = ${POSES}, VB = [${W}, ${H}];
const fig = document.querySelector("[data-anatomy]");
const svg = fig.querySelector("svg");
const arms = [...fig.querySelectorAll("[data-pose]")];
const pool = document.querySelector(".pool");
const readout = fig.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let pose = (POSES - 1) / 2, px = innerWidth / 2, py = innerHeight / 2, last = 0, shown = "";
function target() {
  // what you are reading: the intro column, or the frame closest to the middle of the screen
  if ((window.__vkStation || 0) < 0.6) { const r = document.querySelector(".intro .col").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.62]; }
  let bestEl = null, bd = 1e9;
  document.querySelectorAll(".frame").forEach((f) => { const r = f.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - innerWidth / 2); if (d < bd) { bd = d; bestEl = f; } });
  const r = bestEl.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  const [tx, ty] = target();
  const e = still.matches ? 1 : 1 - Math.exp(-dt / 0.18);
  px += (tx - px) * e; py += (ty - py) * e;
  // swivel to the pose whose beam points most nearly at the target
  const b = svg.getBoundingClientRect(), k2 = b.width / VB[0];
  const base = [b.left + VB[0] * 0.5 * k2, b.top + VB[1] * 0.75 * k2];
  const want = Math.atan2(py - base[1], px - base[0]);
  let bi = 0, bd = 1e9;
  AIM.forEach(([ax, ay], i) => { const a = Math.atan2(b.top + ay * k2 - base[1], b.left + ax * k2 - base[0]); const d = Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want))); if (d < bd) { bd = d; bi = i; } });
  if (bi !== pose) { arms[pose].style.display = "none"; arms[bi].style.display = ""; pose = bi; }
  pool.style.setProperty("--px", px.toFixed(0) + "px"); pool.style.setProperty("--py", py.toFixed(0) + "px");
  const s = window.__vkStation || 0, names = ["the intro", "Lumen", "Postcard", "Smart GIF", "Atlas", "what's next"];
  const text = "Lighting " + names[Math.min(5, Math.round(s))];
  if (text !== shown) { readout.textContent = text; shown = text; }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
`;

const figure = `<figure class="fig iso" data-theme="dark" data-anatomy tabindex="0" aria-label="Desk lamp: swivels to light whatever you are reading">
  ${svg}
  <figcaption><span data-readout>Lighting the intro</span><span>Fig 1 · Desk lamp</span></figcaption>
</figure>`;

writeSite({
  dir: HERE,
  title: "Vinayak CM · Lamp",
  fonts: `<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400&family=Newsreader:ital,opsz,wght@1,6..72,400&display=swap" rel="stylesheet">`,
  tokens,
  css: `
  :root { --canvas:#0E0E0F; --paper:#18181A; --ink:#ECE8E1; --gray:#77756F; --rule:#2A2A2C; --accent:#F2A44B;
          --font: Geist, system-ui, sans-serif; --mono: "Geist Mono", ui-monospace, monospace; --fig-w: 340px; }
  ::selection { background: var(--accent); color: #111; }
  /* the pool of light that follows the lamp's aim */
  .pool { position: fixed; inset: 0; pointer-events: none; z-index: 1;
    background: radial-gradient(520px 380px at var(--px, 50%) var(--py, 50%), rgba(255, 196, 120, .13), rgba(255, 180, 100, .05) 45%, transparent 72%); }
  .intro, .work, footer { position: relative; z-index: 2; }
  .fig { position: relative; z-index: 3; }
  .lede { font: italic 400 30px/1.15 Newsreader, Georgia, serif; letter-spacing: -0.01em; }
  .lede em { color: var(--accent); }
  .who { margin-top: 22px; display: flex; justify-content: space-between; font: 13px/1.4 var(--mono); color: var(--gray); border-top: 1px solid var(--rule); padding-top: 14px; }
  .who b { color: var(--ink); font-weight: 400; }
  .intro p.body { margin-top: 18px; color: #B7B3AB; }
  .go { display: flex; gap: 20px; margin-top: 20px; font-size: 14px; }
  .go a { color: var(--ink); border-bottom: 1px solid #4A4844; padding-bottom: 2px; transition: border-color .2s; }
  .go a:hover { border-color: var(--accent); }
  .label, .hint, .frame .tag, .frame .kind, .case .tl, .case .close, footer .row, .case-kicker { font-family: var(--mono); font-size: 12px; }
  .ruler .win { border-color: var(--ink); }
  /* the work sits in the dark until the lamp finds it */
  .frame { filter: brightness(.38) saturate(.6); transition: filter .6s ease; background: #F3F1EC; }
  .frame.cur { filter: none; }
  .frame .tag { color: #121212; } .frame .kind { color: #8a877f; }
  .frame.end { filter: none; color: var(--gray); }
  .frame.end a { color: var(--accent); }
  .case { background: #F3F1EC; color: #121212; }
  .case .body { background: var(--canvas); color: var(--ink); }
  .case .close, .case .tl { color: #121212; }
  .case-kicker { color: var(--accent); margin-bottom: 8px; }
  .case h2 { font: italic 400 34px/1.1 Newsreader, Georgia, serif; }
  .case .next button { color: var(--ink); }
  `,
  figure,
  figureScript: kitScript() + live,
  intro: `
    <p class="lede">I build AI stuff for problems that are just <em>annoying enough</em> for everyone to complain about, but not annoying enough for anyone else to fix.</p>
    <p class="body">I also care way too much about design, because ugly interfaces deserve consequences.</p>
    <div class="who"><span><b>Vinayak CM</b> · Design &amp; AI Engineer</span><span>Bangalore</span></div>
    <div class="go"><a href="mailto:${EMAIL}">Email</a><a href="#">Résumé</a><a href="#">GitHub</a><a href="#">LinkedIn</a></div>`,
  cue: "Scroll, the lamp will follow ↓",
  tag: (i, p) => p.name,
  endFrame: `<p>Nothing here yet.<br><a href="mailto:${EMAIL}">Bring something to light</a></p>`,
  footer: `<span>© 2026 Vinayak CM</span><span>Lit in Bangalore</span>`,
  site: { caseTag: (i) => ["Lumen", "Postcard", "Smart GIF", "Atlas"][i], caseKicker: (i) => "Project 0" + (i + 1), nextLabel: "Next", dockWidth: 230 },
  bodyClass: "dark",
  extra: `<div class="pool" aria-hidden="true"></div>`,
});
writePreview({ dir: HERE, svg, tokens, title: "Desk lamp" });
