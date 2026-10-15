// Candidate 3: a printer's type cabinet.
// Each project is a case (a drawer); the current one slides out to show its type.
// The composing stick on top fills with sorts as you scroll: the page is being set.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { k, kitScript, byDepthOf, writeSite, writePreview, EMAIL } from "../shared/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---------- world ---------- */
const W = 440, H = 340;
const CAB = { x: -60, y: -34, w: 120, d: 68, r: 2 };
const PLINTH = { x: -62, y: -36, w: 124, d: 72, r: 2.5 };
const PLINTH_H = 6, FOOT_H = 3;
const DRAWERS = 4, DR_H = 14, DR_GAP = 2.4, DR_Z0 = PLINTH_H + 3;
const CAB_TOP = DR_Z0 + DRAWERS * (DR_H + DR_GAP) + 1.6;
const FRONT = CAB.y + CAB.d;              // y of the cabinet's front
const TRAY_D = 52, OPEN = 40;            // how deep a tray is, and how far it slides out
const drawerZ = (i) => DR_Z0 + (DRAWERS - 1 - i) * (DR_H + DR_GAP);   // drawer 0 at the top
const STICK = { x: -46, y: -16, w: 74, d: 8, r: 0.6 };
const SORTS = 26;                        // sorts in a full line

const P = k.fitProjection(
  [...k.boxCorners(PLINTH, -FOOT_H, CAB_TOP + 12), [CAB.x, FRONT + OPEN + 6, drawerZ(3)], [CAB.x + CAB.w, FRONT + OPEN + 6, drawerZ(3)]],
  W, H, { pad: 16, azimuth: 34 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = byDepthOf(P);

/* ---------- carcass ---------- */
function carcass() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLINTH, -FOOT_H, PLINTH_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLINTH, 6))) out.push(S(k.slabOf({ x: x - 4, y: y - 4, w: 8, d: 8, r: 1 }, -FOOT_H, FOOT_H, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf(PLINTH, 0, PLINTH_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(PLINTH, 2, P, 4), { tone: "faint" }) }));
  out.push(S(k.slabOf(CAB, PLINTH_H, CAB_TOP - PLINTH_H, P, 4, 0.8), { tone: "mid" }));
  // the drawer openings are dark slots on the front face
  for (let i = 0; i < DRAWERS; i++) {
    const z = drawerZ(i);
    out.push(`<path class="t-slot" d="M${[[CAB.x + 4, FRONT + 0.02, z - 0.6], [CAB.x + CAB.w - 4, FRONT + 0.02, z - 0.6], [CAB.x + CAB.w - 4, FRONT + 0.02, z + DR_H + 0.6], [CAB.x + 4, FRONT + 0.02, z + DR_H + 0.6]].map((p) => at(p).map((n) => n.toFixed(1)).join(" ")).join("L")}Z"/>`);
  }
  // the top: a lipped board
  const top = k.insetPlan(CAB, -1.5);
  out.push(S(k.slabOf(top, CAB_TOP, 2.4, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(top, 3.5), CAB_TOP + 2.4, P, 4), { tone: "faint" }));
  // side handles on the right face
  for (const z of [CAB_TOP - 18]) {
    out.push(S(k.slabOf({ x: CAB.x + CAB.w, y: -14, w: 2, d: 3, r: 0.5 }, z, 5, P, 2), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: CAB.x + CAB.w, y: 11, w: 2, d: 3, r: 0.5 }, z, 5, P, 2), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: CAB.x + CAB.w + 2, y: -14, w: 2.4, d: 28, r: 1 }, z, 5, P, 3), { tone: "mid" }));
  }
  return out.join("");
}

/* ---------- on top: a galley with set lines, and the composing stick ---------- */
function galley() {
  const g = { x: 14, y: -26, w: 40, d: 30, r: 1 };
  const z = CAB_TOP + 2.4;
  const out = [S(k.slabOf(g, z, 1, P, 3), { tone: "mid" })];
  out.push(S(k.slabOf({ x: g.x, y: g.y, w: g.w, d: 2, r: 0.5 }, z + 1, 3, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: g.x, y: g.y, w: 2, d: g.d, r: 0.5 }, z + 1, 3, P, 2), { tone: "mid" }));
  [26, 32, 20, 29, 14].forEach((len, i) => out.push(S(k.slabOf({ x: g.x + 3, y: g.y + 4 + i * 4.6, w: len, d: 3.6, r: 0.3 }, z + 1, 2.4, P, 2), { tone: "hi", crease: "lo" })));
  return out.join("");
}
function stick() {
  const z = CAB_TOP + 2.4;
  const out = [];
  out.push(S(k.slabOf(STICK, z, 1.4, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: STICK.x, y: STICK.y - 1.6, w: STICK.w, d: 1.6, r: 0.4 }, z, 6, P, 2, 0.3), { tone: "mid" }));   // back wall
  out.push(S(k.slabOf({ x: STICK.x - 2, y: STICK.y - 1.6, w: 2, d: STICK.d + 1.6, r: 0.4 }, z, 6, P, 2), { tone: "mid" })); // fixed end
  // the knee: the adjustable clamp, set to the measure
  out.push(S(k.slabOf({ x: STICK.x + STICK.w - 4, y: STICK.y - 1.6, w: 3, d: STICK.d + 1.6, r: 0.4 }, z, 6.4, P, 2), { tone: "mid" }));
  out.push(S(k.cylinder(STICK.x + STICK.w - 2.5, STICK.y - 4.2, 1.8, z + 2, 3, P, 14), { tone: "mid" }));
  return out.join("");
}

/* ---------- drawers: the front is static geometry moved by translate; the tray is rebuilt live ---------- */
function drawerFront(i) {
  const z = drawerZ(i);
  const plate = { x: CAB.x + 4.4, y: FRONT, w: CAB.w - 8.8, d: 2.4, r: 0.6 };
  const out = [S(k.slabOf(plate, z, DR_H, P, 2, 0.4), { tone: "hi", crease: "lo" })];
  // pull: two posts and a bar
  for (const x of [-9, 9]) out.push(S(k.slabOf({ x: x - 1, y: FRONT + 2.4, w: 2, d: 2.4, r: 0.4 }, z + DR_H / 2 - 1, 2, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: -11, y: FRONT + 4.8, w: 22, d: 1.6, r: 0.6 }, z + DR_H / 2 - 1.2, 2.4, P, 2), { tone: "mid" }));
  // label holder with its card (the card is the lit part on the open case)
  const lx = CAB.x + 12;
  out.push(S(k.slabOf({ x: lx, y: FRONT + 2.4, w: 18, d: 0.8, r: 0.3 }, z + 3.4, 7.2, P, 2), { tone: "mid", crease: "none" }));
  out.push(`<g data-card="${i}">${S(k.slabOf({ x: lx + 1.2, y: FRONT + 3.2, w: 15.6, d: 0.4, r: 0.2 }, z + 4.2, 5.6, P, 2), { tone: "hi" })}</g>`);
  out.push(D([at([lx + 0.8, FRONT + 3.2, z + 9.4]), at([lx + 17.2, FRONT + 3.2, z + 9.4])], { size: 0.4 }));
  return out.join("");
}
const drawers = Array.from({ length: DRAWERS }, (_, i) => `<g data-drawer="${i}"><g data-tray></g><g data-front>${drawerFront(i)}</g></g>`).join("");

const svg = k.figureSvg({
  width: W, height: H,
  label: "A printer's type cabinet with four shallow drawers, one for each project. The current case slides out to show compartments of type, and the composing stick on top fills with sorts as the page is set.",
  body: [carcass(), galley(), stick(), `<g data-part="sorts"></g>`, `<g data-part="drawers">${drawers}</g>`],
});

const tokens = `
.fig.iso[data-theme="light"]{--anatomy-card:var(--canvas);--anatomy-paper:var(--canvas);--anatomy-face:#E4361B;--anatomy-lit-top:#F05A3E;--anatomy-lit-shade:#C42A12;--anatomy-lit:#5A1206}
.fig .t-slot{fill:#2A2826;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight)}
`;

const live = `
const P = ${JSON.stringify(P)};
const CAB = ${JSON.stringify(CAB)}, FRONT = ${FRONT}, TRAY_D = ${TRAY_D}, OPEN = ${OPEN}, DR_H = ${DR_H}, DRAWERS = ${DRAWERS};
const STICK = ${JSON.stringify(STICK)}, STICK_Z = ${CAB_TOP + 2.4}, SORTS = ${SORTS};
const Z = ${JSON.stringify(Array.from({ length: DRAWERS }, (_, i) => drawerZ(i)))};
const fig = document.querySelector("[data-anatomy]");
const holder = fig.querySelector('[data-part="drawers"]');
const groups = [...fig.querySelectorAll("[data-drawer]")];
const sortsEl = fig.querySelector('[data-part="sorts"]');
const readout = fig.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const S = (paths, style) => solidSvg(paths, style);
const open = groups.map(() => 0), drawnAt = groups.map(() => -1);
let last = 0, shown = "", sortsShown = -1, order = "";
// a fixed pattern of compartments and sorts per case, so each case looks like itself
const seed = (i, n) => { const x = Math.sin(i * 91.7 + n * 12.9) * 43758.5; return x - Math.floor(x); };
function tray(i, o) {
  // the part of the tray that has come out past the front, cut at the front plane
  if (o < 0.3) return "";
  const z = Z[i], y0 = FRONT - TRAY_D + o, y1 = FRONT + o, cut = FRONT;
  const out = [];
  const plan = { x: CAB.x + 6, y: cut, w: CAB.w - 12, d: y1 - cut, r: 0.2 };
  out.push(S(slabOf(plan, z, 1.2, P, 2), { tone: "mid" }));
  // side walls
  out.push(S(slabOf({ x: CAB.x + 6, y: cut, w: 1.6, d: y1 - cut, r: 0.2 }, z + 1.2, DR_H - 4, P, 2), { tone: "mid" }));
  // compartments: rows across, each with a different number of sorts lying in it
  const cols = [8, 6, 9, 7][i];
  const cw = (CAB.w - 15.2) / cols;
  for (let r = 0; r < 4; r++) {
    const yr = y0 + 6 + r * 11.5;
    if (yr + 11.5 < cut) continue;
    const ya = Math.max(cut, yr), yb = Math.min(y1 - 1.6, yr + 10);
    if (yb <= ya) continue;
    for (let c = 0; c < cols; c++) {
      const x = CAB.x + 7.6 + c * cw;
      const fill = Math.floor(seed(i, r * 13 + c) * 5);
      for (let s = 0; s < fill; s++) {
        const sx = x + 1.2 + s * (cw - 2.4) / 5;
        out.push(S(slabOf({ x: sx, y: ya + 0.6, w: (cw - 2.4) / 6, d: yb - ya - 1.2, r: 0.1 }, z + 1.2, 1.6, P, 1), { tone: "hi", crease: "lo" }));
      }
    }
    // the rail in front of each row
    if (yr + 10.5 > cut && yr + 10.5 < y1) out.push(S(slabOf({ x: CAB.x + 7.6, y: yr + 10.4, w: CAB.w - 15.2, d: 1.1, r: 0.2 }, z + 1.2, 3.4, P, 2), { tone: "mid" }));
  }
  // the near side wall, drawn last because it is in front of everything in the tray
  out.push(S(slabOf({ x: CAB.x + CAB.w - 7.6, y: cut, w: 1.6, d: y1 - cut, r: 0.2 }, z + 1.2, DR_H - 4, P, 2), { tone: "mid" }));
  return out.join("");
}
function sorts(n) {
  const out = [];
  let x = STICK.x + 0.2;
  for (let s = 0; s < n; s++) {
    const w = 1.6 + seed(9, s) * 1.6;
    out.push(S(slabOf({ x, y: STICK.y + 0.4, w, d: STICK.d - 0.8, r: 0.1 }, STICK_Z + 1.4, 5.4, P, 1), { tone: "hi", crease: "lo" }));
    x += w + 0.15;
  }
  return out.join("");
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  const s = window.__vkStation || 0;
  const active = s >= 0.5 && s < 4.5 ? Math.round(s) - 1 : -1;
  groups.forEach((g, i) => {
    const want = i === active ? OPEN : 0;
    open[i] = still.matches ? want : open[i] + (want - open[i]) * (1 - Math.exp(-dt / 0.14));
    if (Math.abs(open[i] - want) < 0.05) open[i] = want;
    if (Math.abs(open[i] - drawnAt[i]) > 0.15) {
      g.querySelector("[data-front]").setAttribute("transform", translateAlong(P, [0, open[i], 0]));
      g.querySelector("[data-tray]").innerHTML = tray(i, open[i]);
      drawnAt[i] = open[i];
    }
    const card = g.querySelector("[data-card] .iso-solid");
    if (card) card.toggleAttribute("data-lit", i === active);
  });
  // paint the further-out drawer last, so it sits in front
  const next = groups.map((_, i) => i).sort((a, b) => open[a] - open[b] || a - b).join();
  if (next !== order) { next.split(",").forEach((i) => holder.appendChild(groups[+i])); order = next; }
  const n = Math.min(SORTS, Math.round((s / 5) * SORTS));
  if (n !== sortsShown) { sortsEl.innerHTML = sorts(n); sortsShown = n; }
  const text = active >= 0 ? "Case 0" + (active + 1) + " open  ·  " + n + " of " + SORTS + " sorts set" : s < 0.5 ? "Cases closed  ·  nothing set yet" : "All cases set  ·  " + n + " sorts";
  if (text !== shown) { readout.textContent = text; shown = text; }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
`;

const figure = `<figure class="fig iso" data-theme="light" data-anatomy tabindex="0" aria-label="Type cabinet: the current case opens and the page is set as you scroll">
  ${svg}
  <figcaption><span data-readout>Cases closed</span><span>Fig 1 · Type cabinet</span></figcaption>
</figure>`;

writeSite({
  dir: HERE,
  title: "Vinayak CM · Type",
  fonts: `<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Archivo+Narrow:wght@500&display=swap" rel="stylesheet">`,
  tokens,
  css: `
  :root { --canvas:#F4F4F1; --paper:#FFFFFF; --ink:#111111; --gray:#8B8B86; --rule:#D8D8D3; --accent:#E4361B;
          --font: Archivo, system-ui, sans-serif; --display: Archivo, sans-serif; --mono: "Archivo Narrow", Archivo, sans-serif; --fig-w: 420px; }
  ::selection { background: var(--accent); color: #fff; }
  /* intro: a proof, with the name pulled in wood type and one correction in the margin */
  .proof { position: relative; background: var(--paper); padding: 26px 26px 24px; }
  .proof h1 { font: 900 64px/0.86 var(--display); font-stretch: 62%; letter-spacing: -0.01em; text-transform: uppercase; }
  .proof .role { font: 600 13px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--accent); margin: 14px 0 18px; }
  .proof p + p { margin-top: 12px; }
  .proof .mark { position: absolute; right: -54px; top: 34px; font: 500 12px/1.2 var(--mono); color: var(--accent); width: 44px; }
  .proof .mark::before { content: ""; position: absolute; left: -16px; top: 6px; width: 12px; border-top: 1px solid var(--accent); }
  .proof .go { display: flex; gap: 22px; margin-top: 20px; font: 600 13px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; }
  .proof .go a { border-bottom: 2px solid var(--ink); padding-bottom: 2px; }
  .proof .go a:hover { border-color: var(--accent); }
  .label, .hint, .frame .tag, .frame .kind, .case .tl, .case .close, footer .row, .case-kicker { font-family: var(--mono); letter-spacing: .08em; text-transform: uppercase; font-size: 12px; }
  .frame .tag b { color: var(--accent); font-weight: 600; }
  /* registration marks on the frame in focus */
  .frame::before, .frame::after { content: ""; position: absolute; width: 16px; height: 16px; opacity: 0; transition: opacity .4s; pointer-events: none;
    background: linear-gradient(var(--accent), var(--accent)) 50% 0/1px 100% no-repeat, linear-gradient(var(--accent), var(--accent)) 0 50%/100% 1px no-repeat; }
  .frame::before { left: 8px; bottom: 8px; } .frame::after { right: 8px; bottom: 8px; }
  .frame.cur::before, .frame.cur::after { opacity: 1; }
  .frame.end a { border-bottom: 2px solid var(--accent); }
  .case-kicker { color: var(--accent); margin-bottom: 8px; }
  .case h2 { font: 900 48px/0.9 var(--display); font-stretch: 62%; text-transform: uppercase; }
  .case dl { border-top: 2px solid var(--ink); }
  @media (max-width: 760px) { .proof .mark { display: none; } .proof h1 { font-size: 48px; } }
  `,
  figure,
  figureScript: kitScript() + live,
  intro: `
    <div class="proof">
      <h1>Vinayak CM</h1>
      <p class="role">Design &amp; AI Engineer · Bangalore</p>
      <p>I build AI stuff for problems that are just annoying enough for everyone to complain about, but not annoying enough for anyone else to fix.</p>
      <p class="gray">I also care way too much about design, because ugly interfaces deserve consequences.</p>
      <span class="mark">stet</span>
      <div class="go"><a href="mailto:${EMAIL}">Write to me</a><a href="#">Résumé</a><a href="#">GitHub</a><a href="#">LinkedIn</a></div>
    </div>`,
  cue: "Scroll to open the first case ↓",
  tag: (i, p) => `<b>Case 0${i + 1}</b>  ${p.name}`,
  endFrame: `<p>Case 05 is empty, for now.<br><a href="mailto:${EMAIL}">Fill it with me</a></p>`,
  footer: `<span>© 2026 Vinayak CM</span><span>Set by hand in Bangalore</span>`,
  site: { caseTag: (i) => "Case 0" + (i + 1), caseKicker: (i) => "Case 0" + (i + 1), nextLabel: "Next case", dockWidth: 290 },
});
writePreview({ dir: HERE, svg, tokens, title: "Type cabinet" });
