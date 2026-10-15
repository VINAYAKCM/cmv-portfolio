// Fig 1, the lead-screw slide that travels with the page.
// Scrolling turns the handwheel; the lead screw drives the carriage along the bed,
// and the carriage's pointer stops at one ruler station per section of the site.
//
//   node mockups/v7/build.mjs            -> writes mockups/v7/index.html (from template.html)
//   node mockups/v7/build.mjs --preview  -> also writes figure-preview.html (figure alone, light card)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "../../.claude/skills/anatomy");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const G = await import(join(SKILL, "kit/lathe.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));

/* ---------- truth: the model everything reads ---------- */
const STATIONS = ["Intro", "Lumen", "Postcard", "Smart GIF", "Atlas", "End"];
const PITCH = 4;          // mm the carriage moves per turn of the wheel
const SPACING = 32;       // mm between stations, so 8 turns per section
const X0 = -86;           // carriage centre at station 0
const POSES = 24;         // crank drawn every 15°

/* ---------- world ---------- */
const WIDTH = 330, HEIGHT = 200;
const PLATE = { x: -130, y: -34, w: 262, d: 76, r: 6 };
const PLATE_T = 10, FOOT_H = 4;
const BED = { x: -112, y: -14, w: 212, d: 28, r: 1.5 };
const BED_H = 6;
const LEFT = { x: -124, y: -16, w: 12, d: 32, r: 2 };
const RIGHT = { x: 100, y: -16, w: 12, d: 32, r: 2 };
const BLOCK_H = 30;
const AXIS_Z = 22, SCREW_R = 2.6;
const RULER = { x: -100, y: 26, w: 196, d: 8, r: 1 };
const SADDLE = { x: -22, y: -17, w: 44, d: 34, r: 2 };
const TABLE = { x: -25, y: -20, w: 50, d: 40, r: 3 };
const TABLE_Z = 13, TABLE_TOP = 28;
const WHEEL_X = 115, WHEEL_R = 15, WHEEL_T = 4;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_T - FOOT_H, 0), [0, 0, TABLE_TOP + 4], [LEFT.x, 0, BLOCK_H], [WHEEL_X + 14, 0, AXIS_Z + WHEEL_R + 3], [WHEEL_X + 14, 0, AXIS_Z - WHEEL_R - 3]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 38 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/* ---------- base ---------- */
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_T - FOOT_H, PLATE_T, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_T - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_T - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_T, PLATE_T, P, 8, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

/* ---------- bed, blocks and ruler ---------- */
function bed() {
  const out = [];
  out.push(S(k.slabOf(BED, 0, BED_H, P, 3, 0.5), { tone: "mid" }));
  for (const y of [-9, 9]) out.push(L(k.lineOnTop([BED.x, y], [BED.x + BED.w, y], BED_H, P), { tone: "faint" }));
  // cap screws that hold the bed down, every 16 mm along both edges, with their counterbores
  const xs = Array.from({ length: 13 }, (_, i) => BED.x + 10 + i * 16);
  for (const y of [-11.6, 11.6]) {
    out.push(L(xs.map((x) => k.ring(x, y, 1.3, BED_H, P, 12)).join(""), { tone: "faint" }));
    out.push(D(xs.map((x) => at([x, y, BED_H])), { size: 0.4, tone: "lo" }));
  }
  return out.join("");
}

function block(plan, near) {
  const out = [];
  out.push(S(k.slabOf(plan, 0, BLOCK_H, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.4), BLOCK_H, P, 3), { tone: "faint" }));
  const cx = plan.x + plan.w / 2;
  out.push(D([at([cx, plan.y + 5, BLOCK_H]), at([cx, plan.y + plan.d - 5, BLOCK_H])], { size: 0.45 }));
  if (near) {
    // oil cup on the head block
    out.push(S(k.cylinder(cx, 6, 2.6, BLOCK_H, 2.4, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(cx, 6, 1.6, BLOCK_H + 2.4, 1.2, P, 16), { tone: "mid" }));
    out.push(D([at([cx, 6, BLOCK_H + 3.6])], { size: 0.45, tone: "hi" }));
  } else {
    // bearing seat where the screw enters the tail block
    out.push(L(k.sideRing([plan.x + plan.w, 0, AXIS_Z], SCREW_R + 1.6, "x", P), { tone: "lo" }));
  }
  return out.join("");
}

function ruler() {
  const out = [];
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(X0, RULER.x + RULER.w - 6, PITCH, SPACING / PITCH, RULER.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D(STATIONS.map((_, i) => at([X0 + i * SPACING, RULER.y + 6, 0.6])), { size: 0.62, tone: "hi" }));
  out.push(D([at([RULER.x + 2.5, RULER.y + 4, 0.6]), at([RULER.x + RULER.w - 2.5, RULER.y + 4, 0.6])], { size: 0.42 }));
  return out.join("");
}

/* ---------- lead screw ---------- */
const SCREW_FROM = BED.x, SCREW_TO = RIGHT.x;
const F_SCREW = G.frameAlong([0, 0, AXIS_Z], [1, 0, 0]);
const screwRod = () => S(G.disc(SCREW_FROM, SCREW_TO, SCREW_R, F_SCREW, P), { tone: "mid", crease: "none" });
const thread = (shift) => {
  const from = SCREW_FROM + 1 + shift, to = SCREW_TO - 1 - PITCH + shift;
  return k.coil(from, to, [0, AXIS_Z], SCREW_R + 0.35, (to - from) / PITCH, "x", P, 14);
};

/* ---------- carriage (built at x = 0, moved with translateAlong) ---------- */
function carriage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(TABLE, 3), BED_H, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(SADDLE, BED_H, TABLE_Z - BED_H, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(TABLE, TABLE_Z, TABLE_TOP - TABLE_Z, P, 5, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideSeam(TABLE, TABLE_Z + 4, P, 5), { tone: "faint" }) }));
  for (const y of [-9, 5.6]) out.push(L(k.planOutline({ x: -21, y, w: 42, d: 3.4, r: 1.7 }, TABLE_TOP, P, 4), { tone: "lo" }));
  out.push(D([-19, -9, 9, 19].map((x) => at([x, TABLE.y + TABLE.d - 2.4, TABLE_TOP])), { size: 0.4, tone: "lo" }));
  // lock knob
  out.push(S(k.cylinder(17, -15, 3.4, TABLE_TOP, 3.2, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(17, -15, 3.4, TABLE_TOP, TABLE_TOP + 3.2, 22, P), { tone: "lo" }));
  out.push(D([at([17, -15, TABLE_TOP + 3.2])], { size: 0.45, tone: "hi" }));
  // the pointer: a fin down the front face and a tongue that reads the ruler (the lit part)
  const FIN = { x: -1.6, y: TABLE.y + TABLE.d, w: 3.2, d: 2.2, r: 0.6 };
  out.push(S(k.slabOf(FIN, 1.4, TABLE_TOP - 4 - 1.4, P, 2), { tone: "hi", lit: true, crease: "none" }));
  const TONGUE = { x: -1.6, y: TABLE.y + TABLE.d, w: 3.2, d: 13.6, r: 0.8 };
  out.push(S(k.slabOf(TONGUE, 1.4, 1.2, P, 2), { tone: "hi", lit: true }));
  out.push(L(k.lineOnTop([0, TONGUE.y + 2.2], [0, TONGUE.y + TONGUE.d], 2.6, P), { tone: "lit" }));
  return out.join("");
}

/* ---------- handwheel and crank ---------- */
const F_WHEEL = G.frameOf([WHEEL_X, 0, AXIS_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
function wheel() {
  const out = [];
  out.push(S(G.disc(-3, 0, 4.8, F_WHEEL, P), { tone: "mid" }));                       // bearing collar on the head block
  out.push(S(G.disc(0, WHEEL_T, WHEEL_R, F_WHEEL, P, { bevel: 0.6 }), { tone: "mid" })); // wheel
  out.push(k.fadedSvg(G.ribsOf(F_WHEEL, 0.4, WHEEL_T - 0.4, WHEEL_R, 72, P, { fade: [0.05, 0.45] }), { tone: "lo" }));
  out.push(L(G.circleOf(F_WHEEL, WHEEL_T, WHEEL_R - 3.4, P), { tone: "faint" }));
  return out.join("");
}
const turned = (angle) => {
  const c = Math.cos(angle), s = Math.sin(angle);
  return G.frameOf(F_WHEEL.o, F_WHEEL.a, [0, c, s], [0, -s, c]);
};
const ARM_R = 11.5;
const armPose = (angle) => S(G.prismOf(turned(angle), G.stadium(4, 2.4, ARM_R, 24), WHEEL_T, WHEEL_T + 1.8, P), { tone: "mid" });
function gripPose(angle) {
  const F = turned(angle);
  const root = G.pointOf(F, WHEEL_T + 1.8, ARM_R, 0);
  const FG = G.frameAlong(root, [1, 0, 0]);
  return S(G.disc(0, 1.2, 1.5, FG, P), { tone: "mid" }) + S(G.disc(1.2, 7.4, 2, FG, P), { tone: "hi", crease: "none" }) + S(G.sphereOf(G.pointOf(FG, 7.6, 0, 0), 2.1, P), { tone: "hi" });
}
const hub = () => S(G.disc(WHEEL_T, WHEEL_T + 3.4, 3.4, F_WHEEL, P), { tone: "mid" }) + D([at(G.pointOf(F_WHEEL, WHEEL_T + 3.4, 0, 0))], { size: 0.5, tone: "hi" });

const poses = (fn) => Array.from({ length: POSES }, (_, i) => `<g data-pose="${i}"${i ? ' style="display:none"' : ""}>${fn((i / POSES) * Math.PI * 2)}</g>`).join("");

/* ---------- assemble ---------- */
const t0 = thread(0);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "A lead-screw slide on a bench plate. Turning the handwheel turns the screw, which drives a carriage along the bed; the carriage's pointer reads a ruler with one mark for each section of this site.",
  body: [
    base(),
    bed(),
    ruler(),
    block(LEFT, false),
    `<path data-part="thread-back" class="iso-line" data-tone="faint" d="${t0.back}"/>`,
    screwRod(),
    `<path data-part="thread-front" class="iso-line" data-tone="lo" d="${t0.front}"/>`,
    `<g data-part="carriage" transform="${k.translateAlong(P, [X0, 0, 0])}">${carriage()}</g>`,
    block(RIGHT, true),
    wheel(),
    `<g data-part="arm">${poses(armPose)}</g>`,
    hub(),
    `<g data-part="grip">${poses(gripPose)}</g>`,
  ],
});

/* ---------- live: follows the page's scroll station ---------- */
const live = `
const P = ${JSON.stringify(P)};
const STATIONS = ${JSON.stringify(STATIONS)}, PITCH = ${PITCH}, SPACING = ${SPACING}, X0 = ${X0}, POSES = ${POSES};
const SCREW_FROM = ${SCREW_FROM}, SCREW_TO = ${SCREW_TO}, AXIS_Z = ${AXIS_Z}, SCREW_R = ${SCREW_R};
const fig = document.querySelector("[data-anatomy]");
const svg = fig.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const back = svg.querySelector('[data-part="thread-back"]');
const front = svg.querySelector('[data-part="thread-front"]');
const arms = [...svg.querySelectorAll('[data-part="arm"] > g')];
const grips = [...svg.querySelectorAll('[data-part="grip"] > g')];
const readout = fig.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let x = X0, pose = 0, last = 0;
function draw() {
  const travel = x - X0;
  carriage.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  const shift = ((travel % PITCH) + PITCH) % PITCH;
  const from = SCREW_FROM + 1 + shift, to = SCREW_TO - 1 - PITCH + shift;
  const c = coil(from, to, [0, AXIS_Z], SCREW_R + 0.35, (to - from) / PITCH, "x", P, 14);
  back.setAttribute("d", c.back); front.setAttribute("d", c.front);
  const next = (((Math.round((travel / PITCH) * POSES)) % POSES) + POSES) % POSES;
  if (next !== pose) { arms[pose].style.display = grips[pose].style.display = "none"; arms[next].style.display = grips[next].style.display = ""; pose = next; }
  const station = travel / SPACING, near = Math.round(station);
  const text = String(near).padStart(2, "0") + " " + STATIONS[near] + "  ·  " + travel.toFixed(0) + " mm";
  if (readout.textContent !== text) { readout.textContent = text; fig.setAttribute("aria-valuetext", STATIONS[near]); }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  const target = X0 + (window.__vkStation || 0) * SPACING;
  x = still.matches ? target : x + (target - x) * (1 - Math.exp(-dt / 0.16));
  if (Math.abs(target - x) < 0.02) x = target;
  draw();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* drag the slide, or use the arrow keys, to move through the site */
let drag = null;
const unit = Math.hypot(...axisVector(P, [1, 0, 0]));
fig.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, s: window.__vkStation || 0, scale: svg.getBoundingClientRect().width / ${WIDTH} }; fig.setPointerCapture(e.pointerId); fig.dataset.drag = ""; });
fig.addEventListener("pointermove", (e) => { if (!drag) return; const ds = (e.clientX - drag.x) / (unit * drag.scale * SPACING); window.__vkGo && window.__vkGo(Math.max(0, Math.min(STATIONS.length - 1, drag.s + ds)), true); });
const end = () => { if (!drag) return; drag = null; delete fig.dataset.drag; window.__vkGo && window.__vkGo(Math.round(window.__vkStation || 0)); };
fig.addEventListener("pointerup", end); fig.addEventListener("pointercancel", end);
fig.addEventListener("keydown", (e) => {
  const here = Math.round(window.__vkStation || 0);
  let to = null;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") to = Math.min(STATIONS.length - 1, here + 1);
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = Math.max(0, here - 1);
  if (e.key === "Home") to = 0; if (e.key === "End") to = STATIONS.length - 1;
  if (to === null) return; e.preventDefault(); window.__vkGo && window.__vkGo(to);
});
draw();
`;

const figureHtml = `<figure class="vk-fig iso" data-theme="light" data-anatomy tabindex="0" role="slider" aria-label="Lead-screw slide: drag it or use the arrow keys to move through the site" aria-valuemin="0" aria-valuemax="${STATIONS.length - 1}" aria-valuetext="Intro">
  ${svg}
  <figcaption><span data-readout>00 Intro  ·  0 mm</span><span class="vk-hint">Fig 1 · Drag or scroll</span></figcaption>
</figure>`;

// the one lit part (the pointer) is drawn dark, like a gauge needle
const LIT_CSS = `.vk-fig.iso[data-theme="light"]{--anatomy-face:#2b2b2d;--anatomy-lit-top:#3d3d40;--anatomy-lit-shade:#1c1c1e;--anatomy-lit:#000}`;
const template = readFileSync(join(HERE, "template.html"), "utf8");
const page = template
  .replace("/*%ISO_CSS%*/", k.ISO_CSS + LIT_CSS)
  .replace("<!--%FIGURE%-->", figureHtml)
  .replace("/*%FIGURE_SCRIPT%*/", (kitScript() + live).replace(/<\/(script)/gi, "<\\/$1"));
writeFileSync(join(HERE, "index.html"), page);
console.log("wrote index.html", (page.length / 1024).toFixed(0) + " KB");

if (process.argv.includes("--preview")) {
  const body = k.plateHtml({ fig: "Fig 1", title: "Lead-screw slide", hint: "Scroll the page", readout: "00 Intro", body: `<div class="iso-stage">${svg}</div>` });
  writeFileSync(join(HERE, "figure-preview.html"), k.pageHtml({ title: "Lead-screw slide", theme: "light", body: `<style>${LIT_CSS.replace(".vk-fig.iso[data-theme=\"light\"]", ".iso[data-theme=\"light\"]")}</style>` + body, width: 900 }));
  console.log("wrote figure-preview.html");
}
