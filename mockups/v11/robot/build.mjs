// VCM-03: the robot in the site's own palette (white, graphite, black screen), seen from the front.
// Live: head follows the cursor; both arms are solved every frame (two-bone IK in the frontal plane);
// hands have fingers and a thumb that curl to grab; the chest gears and neck collar turn with his motion.
//
//   node mockups/v11/robot/build.mjs
//     -> robot.html            (the figure alone)
//     -> ../site/index.html    (the v6 homepage with VCM-03 hosting the intro)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "../../../.claude/skills/anatomy");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const G = await import(join(SKILL, "kit/lathe.mjs"));
const T = await import(join(SKILL, "kit/tube.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));
const latheSrc = readFileSync(join(SKILL, "kit/lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const LATHE_IN_PAGE = `const G = (() => {\n${latheSrc}\nreturn { frameAlong, frameOf, pointOf, disc, solidOf, sphereOf };\n})();`;

/* ---------- proportions ---------- */
const W = 380, H = 440;
const PLINTH_R = 30, PLINTH_H = 5;
const HIP_Z = 34, WAIST_Z = 38, CHEST_Z0 = 41, CHEST_Z1 = 62;
const SHOULDER_Z = 58, SHOULDER_X = 17.5, ARM_LY = 3;
const NECK_Z = 62, HEAD_Z = 68, HEAD_H = 27, CROWN_H = 4;
const HEAD = { w: 44, d: 36, r: 15 }, CROWN = { w: 39, d: 31, r: 12.5 };
const SCREEN = { w: 32, h: 19, r: 6.5, cz: HEAD_Z + 13.5 };
const COLS = 30, ROWS = 16;
const UPPER = 12, FORE = 11;
const ELEVATION = 12;

const P = k.fitProjection(
  [[-PLINTH_R, -PLINTH_R, -PLINTH_H], [PLINTH_R, PLINTH_R, -PLINTH_H], [-PLINTH_R, PLINTH_R, 0], [PLINTH_R, -PLINTH_R, 0],
   [-24, -20, HEAD_Z + HEAD_H + CROWN_H + 9], [24, 20, HEAD_Z + HEAD_H + CROWN_H + 9],
   [48, 0, 70], [-48, 0, 70], [48, 0, 98], [-48, 0, 98]],
  W, H, { pad: 14, azimuth: 45, elevation: ELEVATION },
);
const TV = k.towardViewer(P);
const YAW0 = Math.atan2(TV[1], TV[0]);

/* ---------- shared helpers (also shipped to the page) ---------- */
function axes(K, P, yaw) {
  const f = [Math.cos(yaw), Math.sin(yaw), 0];
  let r = [Math.sin(yaw), -Math.cos(yaw), 0];
  const tv = K.towardViewer(P), rv = [tv[1], -tv[0]];
  if (K.iso([rv[0], rv[1], 0], P)[0] < K.iso([0, 0, 0], P)[0]) r = [-r[0], -r[1], 0];
  return { f, r };
}
function turnedRing(K, plan, c, ax, steps) {
  return K.ringOf({ x: -plan.w / 2, y: -plan.d / 2, w: plan.w, d: plan.d, r: plan.r }, steps).map(([lx, ly]) => [c[0] + ax.r[0] * lx + ax.f[0] * ly, c[1] + ax.r[1] * lx + ax.f[1] * ly]);
}
function roundRectPts(cx, cy, w, h, r, n) {
  r = Math.min(r, w / 2, h / 2); n = n || 5;
  const out = [];
  const corner = (x, y, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } };
  corner(cx + w / 2 - r, cy + h / 2 - r, 0); corner(cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2);
  corner(cx - w / 2 + r, cy - h / 2 + r, Math.PI); corner(cx + w / 2 - r, cy - h / 2 + r, Math.PI * 1.5);
  return out;
}
const facePoint = (o, along, u, v) => [o[0] + along[0] * u, o[1] + along[1] * u, o[2] + v];
function facePath(K, P, o, along, pts, close) {
  return "M" + pts.map(([u, v]) => K.iso(facePoint(o, along, u, v), P).map((n) => n.toFixed(2)).join(" ")).join("L") + (close ? "Z" : "");
}
// gear teeth or collar ribs that turn: the visible half of a ring of vertical lines on a cylinder side
function ribs(K, P, cx, cy, r, z0, z1, count, phase) {
  const tv = K.towardViewer(P);
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2;
    const nx = Math.cos(a), ny = Math.sin(a);
    if (nx * tv[0] + ny * tv[1] < 0.18) continue;
    const p0 = K.iso([cx + nx * r, cy + ny * r, z0], P), p1 = K.iso([cx + nx * r, cy + ny * r, z1], P);
    d += "M" + p0[0].toFixed(2) + " " + p0[1].toFixed(2) + "L" + p1[0].toFixed(2) + " " + p1[1].toFixed(2);
  }
  return d;
}
const HELPERS = [axes, turnedRing, roundRectPts, facePath, ribs].map((f) => f.toString()).join("\n") + `\nconst facePoint = ${facePoint.toString()};`;

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const at = (p) => k.iso(p, P);
const AX = axes(k, P, YAW0);
const Wp = (lx, ly, z) => [AX.r[0] * lx + AX.f[0] * ly, AX.r[1] * lx + AX.f[1] * ly, z];
const DK = (svg) => `<g class="rb-dk">${svg}</g>`;
const CV = (svg) => `<g class="rb-cavity">${svg}</g>`;
const up = [0, 0, 1];
const turned = (plan, lx, ly, steps = 5) => turnedRing(k, plan, Wp(lx, ly, 0), AX, steps);

/* ---------- static body ---------- */
function plinth() {
  return `<path class="iso-halo" d="${k.haloOf({ x: -PLINTH_R, y: -PLINTH_R, w: PLINTH_R * 2, d: PLINTH_R * 2, r: PLINTH_R }, -PLINTH_H, PLINTH_H, P)}"/>`
    + S(k.cylinder(0, 0, PLINTH_R, -PLINTH_H, PLINTH_H, P, 96, 1), { tone: "mid" })
    + L(k.ring(0, 0, PLINTH_R - 3.5, 0, P, 80), { tone: "lo" });
}
function leg(side) {
  const lx = side * 8.5, out = [];
  out.push(DK(S(k.extrude(turned({ w: 11, d: 19, r: 4.5 }, lx, 2.5), 0, 1.6, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" })));
  out.push(S(k.extrude(turned({ w: 10.4, d: 17, r: 4.2 }, lx, 2.6), 1.6, 5.4, P, { bevel: 0.6 }), { tone: "hi", crease: "lo", inner: L(k.lineOnTop([Wp(lx - 5.2, 7, 0)[0], Wp(lx - 5.2, 7, 0)[1]], [Wp(lx + 5.2, 7, 0)[0], Wp(lx + 5.2, 7, 0)[1]], 7, P), { tone: "faint" }) }));
  out.push(DK(S(G.sphereOf(Wp(lx, 0, 8.6), 3, P, { steps: 32 }), { tone: "hi" })));
  const Fs = G.frameAlong(Wp(lx, 0, 10), up);
  out.push(S(G.solidOf([[0, 0], [0, 3.6], [1, 4.4, 1], [9.5, 4.9, 1], [10.5, 4.4]], Fs, P, { steps: 40, smooth: { rows: 3 } }), { tone: "hi", crease: "lo", inner: L(G.arcOf(Fs, 5, 4.75, P), { tone: "lo" }) }));
  out.push(DK(S(G.disc(-3.4, 3.4, 3.4, G.frameAlong(Wp(lx, 0, 21.4), AX.r), P, { steps: 28 }), { tone: "hi", crease: "lo" })));
  const Ft = G.frameAlong(Wp(lx, 0, 22.6), up);
  out.push(S(G.solidOf([[0, 0], [0, 4.2], [1, 4.8, 1], [9, 5.3, 1], [10, 4.6]], Ft, P, { steps: 40, smooth: { rows: 3 } }), { tone: "hi", crease: "lo" }));
  const px = lx + side * 5.6;
  out.push(DK(S(k.cylinder(...Wp(px, -1, 0).slice(0, 2), 1.15, 13, 9, P, 14), { tone: "hi", crease: "none" })));
  out.push(DK(S(k.cylinder(...Wp(px, -1, 0).slice(0, 2), 1.7, 22, 8, P, 16), { tone: "hi", crease: "lo" })));
  out.push(DK(S(G.sphereOf(Wp(lx, 0, HIP_Z - 1.4), 3.6, P, { steps: 32 }), { tone: "hi" })));
  return out.join("");
}
function pelvis() {
  return DK(S(k.extrude(turned({ w: 24, d: 14, r: 4 }, 0, -0.5), HIP_Z - 1, 4.4, P, { bevel: 0.5 }), { tone: "hi", crease: "lo" }))
    + DK(S(k.cylinder(...Wp(0, -1, 0).slice(0, 2), 7, WAIST_Z - 0.6, 3.6, P, 48), { tone: "hi", crease: "lo" }));
}
const GEAR_A = { lx: -3, ly: 1.5, r: 6.4, z0: 45, h: 3.6, teeth: 28 };
const GEAR_B = { lx: 6.4, ly: 1.5, r: 3.4, z0: 45.4, h: 2.8, teeth: 15 };
function torso() {
  const out = [];
  out.push(CV(S(k.extrude(turned({ w: 27, d: 3, r: 1.2 }, 0, -8.6), CHEST_Z0 + 1, CHEST_Z1 - CHEST_Z0 - 4, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" })));
  out.push(CV(S(k.extrude(turned({ w: 29, d: 18, r: 4 }, 0, -1), CHEST_Z0, 2, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" })));
  out.push(S(k.extrude(turned({ w: 2.4, d: 17, r: 1 }, -13.6, -1.2), CHEST_Z0 + 2, 13, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" }));
  // spine
  out.push(DK(S(k.cylinder(...Wp(0, -5.2, 0).slice(0, 2), 2.2, CHEST_Z0 + 2, CHEST_Z1 - CHEST_Z0 - 2, P, 18), { tone: "hi", crease: "none" })));
  // gears: bodies here, their teeth are drawn live just after
  for (const g of [GEAR_A, GEAR_B]) {
    const c = Wp(g.lx, g.ly, 0);
    out.push(DK(S(k.cylinder(c[0], c[1], g.r, g.z0, g.h, P, 56), { tone: "hi", crease: "lo" })));
    out.push(DK(S(k.cylinder(c[0], c[1], g.r * 0.42, g.z0 + g.h, 1.4, P, 28), { tone: "hi", crease: "lo" })));
  }
  out.push(`<g class="rb-dk" data-part="teeth"></g>`);
  const cA = Wp(GEAR_A.lx, GEAR_A.ly, 0);
  out.push(`<circle class="rb-core" cx="${at([cA[0], cA[1], GEAR_A.z0 + GEAR_A.h + 1.4])[0].toFixed(2)}" cy="${at([cA[0], cA[1], GEAR_A.z0 + GEAR_A.h + 1.4])[1].toFixed(2)}" r="${(1.2 * k.screenRise(1, P) * 1.6).toFixed(2)}"/>`);
  for (const side of [-1, 1]) {
    const route = G.fillet([Wp(side * 4, 0.5, 50.4), Wp(side * 9, 0.5, 52), Wp(side * 11, 0, 56), Wp(side * 14.6, ARM_LY * 0.5, SHOULDER_Z - 0.6)], 3, 7);
    T.tubePieces(route, 0.9, P, { maxLength: 40 }).forEach((piece) => out.push(DK(T.tubeSvg(piece, { tone: "hi" }))));
  }
  out.push(S(k.extrude(turned({ w: 2.4, d: 17, r: 1 }, 13.6, -1.2), CHEST_Z0 + 2, 13, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" }));
  out.push(S(k.extrude(turned({ w: 31, d: 19, r: 5.5 }, 0, -0.6, 6), 55.5, CHEST_Z1 - 55.5, P, { bevel: 0.9 }), { tone: "hi", crease: "lo" }));
  for (let i = 0; i < 3; i++) out.push(L(facePath(k, P, Wp(0, 8.92, 0), AX.r, roundRectPts(-7 + i * 3.4, 59, 1.6, 3.4, 0.8, 2), true), { tone: "lo" }));
  // neck: base, a collar whose ribs turn with the head, and the stem
  const c = Wp(0, -1, 0);
  out.push(DK(S(k.cylinder(c[0], c[1], 6, NECK_Z, 1.8, P, 36, 0.3), { tone: "hi", crease: "lo" })));
  out.push(DK(S(k.cylinder(c[0], c[1], 3.4, NECK_Z + 1.8, 1.6, P, 24), { tone: "hi", crease: "none" })));
  out.push(DK(S(k.cylinder(c[0], c[1], 4.8, NECK_Z + 3.4, 2, P, 36), { tone: "hi", crease: "lo" })));
  out.push(`<g class="rb-dk" data-part="collar"></g>`);
  out.push(DK(S(k.cylinder(c[0], c[1], 3.2, NECK_Z + 5.4, HEAD_Z - NECK_Z - 5.4, P, 24), { tone: "hi", crease: "none" })));
  return out.join("");
}
const legsSvg = leg(-1) + leg(1);

const defs = `<defs>
  <filter id="rb-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4"/></filter>
  <linearGradient id="rb-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18181A"/><stop offset="1" stop-color="#070708"/></linearGradient>
</defs>`;
const svg = k.figureSvg({
  width: W, height: H,
  label: "VCM-03, a small white robot with a helmet head whose black LED screen shows faces and short words. Its open chest shows a spine and two meshing gears that turn as it moves; its hands can grab.",
  body: [defs, plinth(), `<g data-part="root">`, legsSvg, pelvis(), torso(), `<g data-part="arms"></g>`, `<g data-part="head"></g>`, `<g data-part="held"></g>`, `</g>`],
});

/* ---------- palette: the site's own (white, graphite, black, no accent) ---------- */
const tokens = `
.iso[data-theme="light"].rb{--anatomy-card:var(--canvas,#EDEDED);--anatomy-paper:var(--canvas,#EDEDED);--anatomy-top:#FFFFFF;--anatomy-shade-0:#D9D9D9;--anatomy-shade-1:#E3E3E3;--anatomy-shade-2:#ECECEC;--anatomy-shade-3:#F5F5F5;
  --anatomy-hi:#161616;--anatomy-mid:#8F8F8F;--anatomy-lo:#B9B9B9;--anatomy-faint:#D6D6D6;--anatomy-dot:#3A3A3A;--anatomy-halo:#000;--anatomy-halo-opacity:.22}
.rb .rb-dk{--anatomy-paper:#2B2B2C;--anatomy-top:#454547;--anatomy-shade-0:#1C1C1D;--anatomy-shade-1:#232324;--anatomy-shade-2:#2A2A2B;--anatomy-shade-3:#323233;--anatomy-hi:#0B0B0B;--anatomy-mid:#6A6A6C;--anatomy-lo:#5A5A5C;--anatomy-faint:#48484A;--anatomy-dot:#9A9A9C}
.rb .rb-cavity{--anatomy-paper:#161617;--anatomy-top:#222223;--anatomy-shade-0:#0F0F10;--anatomy-shade-1:#131314;--anatomy-shade-2:#18181A;--anatomy-shade-3:#1D1D1E;--anatomy-hi:#070707;--anatomy-lo:#353536;--anatomy-faint:#2E2E2F}
.rb .tb-body{fill:#262627}.rb .tb-shine{fill:#4A4A4C}.rb .tb-shade{fill:#141415}
.rb .rb-brim{fill:#DADADA;stroke:#161616;stroke-width:var(--anatomy-weight)}
.rb .rb-screen{fill:url(#rb-screen);stroke:#0A0A0A;stroke-width:var(--anatomy-weight)}
.rb .rb-off{fill:#1F1F22}
.rb .rb-on{fill:#FFFFFF}
.rb .rb-on-glow{fill:#FFFFFF;opacity:.5;filter:url(#rb-glow)}
.rb .rb-glare{fill:#FFFFFF;opacity:.12}
.rb .rb-stripe{fill:#161616}
.rb .rb-core{fill:#FFFFFF;filter:drop-shadow(0 0 2px rgba(255,255,255,.9))}
.rb .rb-teeth{fill:none;stroke:#77777A;stroke-width:.55}
.rb .rb-held{fill:#FFFFFF;stroke:#161616;stroke-width:1.1;stroke-linejoin:round}
.rb.grabbing, .rb.grabbing svg { cursor: none; }
`;

/* ---------- the screen font (5x7) ---------- */
const FONT = {
  A: ["01110","10001","10001","11111","10001","10001","10001"], B: ["11110","10001","10001","11110","10001","10001","11110"], C: ["01110","10001","10000","10000","10000","10001","01110"],
  D: ["11110","10001","10001","10001","10001","10001","11110"], E: ["11111","10000","10000","11110","10000","10000","11111"], F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01110","10001","10000","10111","10001","10001","01111"], H: ["10001","10001","10001","11111","10001","10001","10001"], I: ["111","010","010","010","010","010","111"],
  K: ["10001","10010","10100","11000","10100","10010","10001"], L: ["10000","10000","10000","10000","10000","10000","11111"], M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"], O: ["01110","10001","10001","10001","10001","10001","01110"], P: ["11110","10001","10001","11110","10000","10000","10000"],
  R: ["11110","10001","10001","11110","10100","10010","10001"], S: ["01111","10000","10000","01110","00001","00001","11110"], T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"], V: ["10001","10001","10001","10001","10001","01010","00100"], W: ["10001","10001","10001","10101","10101","10101","01010"],
  X: ["10001","10001","01010","00100","01010","10001","10001"], Y: ["10001","10001","01010","00100","00100","00100","00100"], Z: ["11111","00001","00010","00100","01000","10000","11111"],
  0: ["01110","10001","10011","10101","11001","10001","01110"], 1: ["00100","01100","00100","00100","00100","00100","01110"], 2: ["01110","10001","00001","00010","00100","01000","11111"],
  3: ["11110","00001","00001","01110","00001","00001","11110"], 4: ["00010","00110","01010","10010","11111","00010","00010"], 5: ["11111","10000","11110","00001","00001","10001","01110"],
  6: ["00110","01000","10000","11110","10001","10001","01110"], 7: ["11111","00001","00010","00100","01000","01000","01000"], 8: ["01110","10001","10001","01110","10001","10001","01110"],
  9: ["01110","10001","10001","01111","00001","00010","01100"], ":": ["0","0","1","0","1","0","0"], "@": ["01110","10001","10111","10101","10111","10000","01110"],
  "<": ["00010","00100","01000","10000","01000","00100","00010"], ">": ["01000","00100","00010","00001","00010","00100","01000"], "/": ["00001","00010","00010","00100","01000","01000","10000"],
  "!": ["1","1","1","1","1","0","1"], "?": ["01110","10001","00001","00110","00100","00000","00100"], ".": ["0","0","0","0","0","0","1"], " ": ["00","00","00","00","00","00","00"],
};

/* ---------- live ---------- */
const live = `
const P = ${JSON.stringify(P)};
const K = { iso, ringOf, towardViewer };
${LATHE_IN_PAGE}
${HELPERS}
const YAW0 = ${YAW0}, HEAD = ${JSON.stringify(HEAD)}, CROWN = ${JSON.stringify(CROWN)}, HEAD_Z = ${HEAD_Z}, HEAD_H = ${HEAD_H}, CROWN_H = ${CROWN_H};
const SCREEN = ${JSON.stringify(SCREEN)}, COLS = ${COLS}, ROWS = ${ROWS};
const SHOULDER_X = ${SHOULDER_X}, SHOULDER_Z = ${SHOULDER_Z}, ARM_LY = ${ARM_LY}, UPPER = ${UPPER}, FORE = ${FORE}, VBW = ${W};
const GEAR_A = ${JSON.stringify(GEAR_A)}, GEAR_B = ${JSON.stringify(GEAR_B)}, NECK_Z = ${NECK_Z};
const FONT = ${JSON.stringify(FONT)};
const fig = document.querySelector("[data-robot]");
const svg = fig.querySelector("svg");
const root = svg.querySelector('[data-part="root"]'), headEl = svg.querySelector('[data-part="head"]'), armsEl = svg.querySelector('[data-part="arms"]');
const teethEl = svg.querySelector('[data-part="teeth"]'), collarEl = svg.querySelector('[data-part="collar"]'), heldEl = svg.querySelector('[data-part="held"]');
const readout = fig.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const AX0 = axes(K, P, YAW0);
const Wp = (lx, ly, z) => [AX0.r[0] * lx + AX0.f[0] * ly, AX0.r[1] * lx + AX0.f[1] * ly, z];
const SCALE = (() => { const a = iso([0,0,0], P), b = iso([1,0,0], P); return Math.hypot(b[0]-a[0], b[1]-a[1]); })();
const TURN = (() => { const o = iso([0,0,0], P)[0]; const a = axes(K, P, YAW0), b = axes(K, P, YAW0 + 0.05); return iso(b.f, P)[0] - o > iso(a.f, P)[0] - o ? 1 : -1; })();
const add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, s) => a.map((v) => v * s), norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };

/* ---- screen <-> the frontal plane through the shoulders ---- */
const base0 = iso(Wp(0, ARM_LY, 0), P), ex = (() => { const p = iso(Wp(1, ARM_LY, 0), P); return [p[0] - base0[0], p[1] - base0[1]]; })(), ez = (() => { const p = iso(Wp(0, ARM_LY, 1), P); return [p[0] - base0[0], p[1] - base0[1]]; })();
const det = ex[0] * ez[1] - ex[1] * ez[0];
function toPlane(clientX, clientY) {
  const b = svg.getBoundingClientRect(), s = b.width / VBW;
  const sx = (clientX - b.left) / s - base0[0] - jumpPx(), sy = (clientY - b.top) / s - base0[1];
  return [(sx * ez[1] - sy * ez[0]) / det, (ex[0] * sy - ex[1] * sx) / det + jump];
}
function toClient(p3) { const b = svg.getBoundingClientRect(), s = b.width / VBW; const q = iso(p3, P); return [b.left + q[0] * s, b.top + (q[1] - jump * SCALE) * s]; }
const jumpPx = () => 0;

/* ---- bitmaps ---- */
const blank = () => Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
const put = (b, x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < COLS && y >= 0 && y < ROWS) b[y][x] = 1; };
const dot = (b, cx, cy, r) => { for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) if (x * x + y * y <= r * r + r * 0.6) put(b, cx + x, cy + y); };
const ringB = (b, cx, cy, r) => { for (let a = 0; a < 64; a++) put(b, cx + Math.cos(a / 64 * Math.PI * 2) * r, cy + Math.sin(a / 64 * Math.PI * 2) * r); };
const seg = (b, x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1; for (let i = 0; i <= n; i++) put(b, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); };
const box = (b, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(b, x, y); };
function text(str) {
  const b = blank(), glyphs = [...str].map((c) => FONT[c] || FONT[" "]);
  const w = glyphs.reduce((t, g) => t + g[0].length + 1, -1);
  let x = Math.floor((COLS - w) / 2); const y = Math.floor((ROWS - 7) / 2);
  glyphs.forEach((g) => { g.forEach((row, j) => [...row].forEach((c, i) => { if (c === "1") put(b, x + i, y + j); })); x += g[0].length + 1; });
  return b;
}
function face(kind, lx, ly, t) {
  const b = blank(), ex2 = [9 + lx, 20 + lx], ey = 6 + ly;
  if (kind === "open" || kind === "surprised") { const r = kind === "surprised" ? 3 : 2; ex2.forEach((x) => dot(b, x, ey, r)); }
  if (kind === "open") { seg(b, 13 + lx, 11 + ly, 14.5 + lx, 12.5 + ly); seg(b, 14.5 + lx, 12.5 + ly, 16 + lx, 11 + ly); }
  if (kind === "surprised") ringB(b, 14.5 + lx * 0.5, 12 + ly * 0.4, 1.6);
  if (kind === "blink") ex2.forEach((x) => seg(b, x - 2, ey, x + 2, ey));
  if (kind === "happy") { ex2.forEach((x) => { seg(b, x - 3, ey + 1, x, ey - 2); seg(b, x, ey - 2, x + 3, ey + 1); }); box(b, 9, 10, 20, 12); put(b, 8, 10); put(b, 21, 10); }
  if (kind === "boop") { [[9, 1], [20, -1]].forEach(([x, s]) => { seg(b, x - 2 * s, ey - 2, x + s, ey); seg(b, x + s, ey, x - 2 * s, ey + 2); }); seg(b, 12, 12, 17, 12); }
  if (kind === "angry") { ex2.forEach((x, i) => { dot(b, x, ey + 1, 2); seg(b, x - 3, i ? ey - 3 : ey - 1, x + 3, i ? ey - 1 : ey - 3); }); box(b, 11, 12, 18, 12); }
  if (kind === "focus") { ex2.forEach((x) => { dot(b, x, ey, 2); seg(b, x - 3, ey - 3, x + 3, ey - 3); }); seg(b, 12, 12, 17, 12); }
  if (kind === "sleep") ex2.forEach((x) => { seg(b, x - 3, ey + 1, x - 1, ey + 2); seg(b, x - 1, ey + 2, x + 1, ey + 2); seg(b, x + 1, ey + 2, x + 3, ey + 1); });
  if (kind === "dizzy") { ex2.forEach((x, i) => { for (let a = 0; a < 40; a++) { const ang = a * 0.45 + t * 8 * (i ? 1 : -1), r = 0.3 + a * 0.08; put(b, x + Math.cos(ang) * r, ey + Math.sin(ang) * r); } }); seg(b, 11, 12, 13, 11); seg(b, 13, 11, 15, 12); seg(b, 15, 12, 17, 11); }
  return b;
}

/* ---- state ---- */
let px = -1e4, py = -1e4, hasPointer = false, lastMove = performance.now(), last = 0;
let yaw = YAW0, yawV = 0, lookU = 0, lookV = 0;
let mood = "boot", moodUntil = performance.now() + 1300, blinkAt = performance.now() + 2600, blinkT = 0;
let near = false, nearSince = 0, greeted = false, waveT = -1;
let jump = 0, jumpV = 0, squash = 0, boops = 0, spin = 0, lastAng = null, woke = 0, away = false;
let screenText = "HI!", textUntil = performance.now() + 1300, timeShown = false;
let gearA = 0, gearB = 0, collar = 0, motor = 0;
let attend = null, attendGlyph = "";
let grabbed = null;                                   // { side, x, y } where the cursor was taken
const arm = { [-1]: { tip: null, curl: 0.1, point: 0 }, [1]: { tip: null, curl: 0.1, point: 0 } };
let armsKey = "";
const BOOPS = [["face", "boop", "Boop."], ["text", "BOOP", "BOOP."], ["text", "HEHE", "Hehe."], ["text", "LOL", "Lol."], ["face", "angry", "Hey."], ["text", "STOP", "Please stop."], ["text", "WTF", "Seriously?"], ["text", "OK.", "I'm telling Vinayak."]];

function setMood(m, ms) { mood = m; moodUntil = performance.now() + ms; }
function show(t, ms) { screenText = t; textUntil = performance.now() + ms; }
let sayUntil = 0;
function say(t, ms = 1600) { if (readout) readout.textContent = t; sayUntil = performance.now() + ms; }
function headScreenCentre() { const b = svg.getBoundingClientRect(), s = b.width / VBW; const c = iso([0, 0, HEAD_Z + HEAD_H / 2], P); return [b.left + c[0] * s, b.top + c[1] * s, s]; }
const shoulderOf = (side) => [side * SHOULDER_X, SHOULDER_Z];
const REACH = UPPER + FORE + 4.5;

addEventListener("pointermove", (e) => {
  if (mood === "sleep") woke = performance.now();
  if (away) { away = false; show("OH HI", 1100); say("Oh, hi again.", 1600); }
  px = e.clientX; py = e.clientY; hasPointer = true; lastMove = performance.now(); timeShown = false;
  const [hx, hy] = headScreenCentre();
  const ang = Math.atan2(py - hy, px - hx), dist = Math.hypot(px - hx, py - hy);
  if (lastAng !== null && dist > 30 && dist < 600) { let d = ang - lastAng; d = Math.atan2(Math.sin(d), Math.cos(d)); spin += Math.abs(d); }
  lastAng = ang;
  if (grabbed && Math.hypot(px - grabbed.x, py - grabbed.y) > 170) release(true);
});
document.documentElement.addEventListener("pointerleave", () => { if (mood !== "sleep" && !grabbed) { away = true; show("BYE?", 1e9); say("Bye?", 1e9); } });
addEventListener("pointerdown", (e) => {
  // a click near an open, reaching hand is a grab; a click on him is a boop
  if (grabbed) { release(false); return; }
  for (const side of [-1, 1]) {
    const a = arm[side];
    if (!a.tip || a.reaching !== true) continue;
    const c = toClient(Wp(a.tip[0], ARM_LY + 1, a.tip[1]));
    if (Math.hypot(e.clientX - c[0], e.clientY - c[1]) < 34) { grab(side, e); return; }
  }
  if (e.target.closest && e.target.closest("[data-robot] svg")) { e.preventDefault(); boop(); }
});
fig.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); boop(); } });
function boop() {
  lastMove = performance.now();
  const [kind, what, line] = BOOPS[Math.min(boops++, BOOPS.length - 1)];
  if (!still.matches) { if (jump <= 0.5) { jumpV = 110; squash = 0.09; } else jumpV = Math.max(jumpV, 20); }
  motor += 6;
  if (kind === "text") { show(what, 900); setMood("boop", 900); } else { textUntil = 0; setMood(what, 900); }
  say(line, 1800);
}
function grab(side, e) {
  grabbed = { side, x: e.clientX, y: e.clientY };
  document.documentElement.classList.add("vcm-grabbing"); fig.classList.add("grabbing");
  show("MINE", 1400); setMood("happy", 1400); say("Got your cursor.", 2400); motor += 4;
}
function release(yanked) {
  grabbed = null; heldEl.innerHTML = "";
  document.documentElement.classList.remove("vcm-grabbing"); fig.classList.remove("grabbing");
  if (yanked) { show("FINE", 900); setMood("angry", 900); say("Fine. Take it.", 1800); } else { show(":)".replace(":)", "OK"), 700); say("Here you go.", 1500); }
}

/* ---- arms: two-bone IK in the frontal plane, then the hand ---- */
function solveArm(side, target) {
  const [sx, sz] = shoulderOf(side);
  let dx = target[0] - sx, dz = target[1] - sz;
  // an arm reaches out on its own side, not across the body
  if (dx * side < 2) dx = side * 2;
  let d = Math.hypot(dx, dz);
  const L1 = UPPER + 1.6, L2 = FORE + 1.2;
  const dd = Math.min(Math.max(d, Math.abs(L1 - L2) + 0.5), L1 + L2 - 0.05);
  const phi = Math.atan2(dz, dx);
  const c = Math.max(-1, Math.min(1, (L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd)));
  // pick the elbow that bends outward and down
  const cand = [phi + Math.acos(c), phi - Math.acos(c)].map((a1) => ({ a1, ex: sx + Math.cos(a1) * L1, ez: sz + Math.sin(a1) * L1 }));
  const best = cand.sort((p, q) => (q.ex * side - q.ez * 0.4) - (p.ex * side - p.ez * 0.4))[0];
  const E = [best.ex, best.ez];
  const reach = [sx + Math.cos(phi) * dd, sz + Math.sin(phi) * dd];
  return { S: [sx, sz], E, W: reach };
}
const dir3 = (a, b, tilt) => norm(add(add(mul(AX0.r, b[0] - a[0]), mul([0, 0, 1], b[1] - a[1])), mul(AX0.f, tilt || 0)));
function armSvg(side, ik, curl, pointOne) {
  const S3 = Wp(ik.S[0], ARM_LY, ik.S[1]), E3 = Wp(ik.E[0], ARM_LY + 0.6, ik.E[1]), W3 = Wp(ik.W[0], ARM_LY + 1.2, ik.W[1]);
  const u = norm([E3[0] - S3[0], E3[1] - S3[1], E3[2] - S3[2]]), f = norm([W3[0] - E3[0], W3[1] - E3[1], W3[2] - E3[2]]);
  const dk = (s) => '<g class="rb-dk">' + s + "</g>";
  let o = dk(solidSvg(G.sphereOf(S3, 4, P, { steps: 24 }), { tone: "hi" }));
  const Lu = Math.hypot(E3[0] - S3[0], E3[1] - S3[1], E3[2] - S3[2]), Lf = Math.hypot(W3[0] - E3[0], W3[1] - E3[1], W3[2] - E3[2]);
  o += solidSvg(G.solidOf([[0, 0], [0, 2.6], [0.8, 3.3], [Lu - 4, 3.1], [Lu - 3, 2.4], [Lu - 3, 0]], G.frameAlong(add(S3, mul(u, 2.6)), u), P, { steps: 20, smooth: false }), { tone: "hi", crease: "lo" });
  o += dk(solidSvg(G.sphereOf(E3, 2.9, P, { steps: 20 }), { tone: "hi" }));
  o += solidSvg(G.solidOf([[0, 0], [0, 2.4], [0.8, 3.1], [Lf - 3.4, 3.2], [Lf - 2.6, 2.5], [Lf - 2.6, 0]], G.frameAlong(add(E3, mul(f, 2.2)), f), P, { steps: 20, smooth: false }), { tone: "hi", crease: "lo" });
  o += dk(solidSvg(G.sphereOf(W3, 1.9, P, { steps: 16 }), { tone: "hi" }));
  // hand: a palm block along the forearm, three two-jointed fingers that curl toward the viewer, and an opposed thumb
  const palm0 = add(W3, mul(f, 1.4));
  o += dk(solidSvg(G.solidOf([[0, 0], [0, 2.1], [0.6, 2.6], [3.2, 2.5], [3.8, 2.0], [3.8, 0]], G.frameAlong(palm0, f), P, { steps: 16, smooth: false }), { tone: "hi", crease: "lo" }));
  const across = norm([u[1] * 0 + AX0.r[0], AX0.r[1], 0]);
  const knuckles = add(palm0, mul(f, 3.8));
  const fingers = [-1.5, 0, 1.5].map((off, i) => {
    const c = pointOne && i === 1 ? 0.05 : curl;
    const a1 = c * 1.25, a2 = c * 1.45;
    const d1 = norm(add(mul(f, Math.cos(a1)), mul(AX0.f, Math.sin(a1))));
    const d2 = norm(add(mul(f, Math.cos(a1 + a2)), mul(AX0.f, Math.sin(a1 + a2))));
    const b1 = add(knuckles, add(mul(AX0.f, off * 0.55), mul([f[2] * 0 + 0, 0, 0], 0)));
    const base = add(b1, mul(norm([-f[1] * 0 + AX0.r[0] * 0, 0, 0]), 0));
    const fan = add(base, mul(perp(f), off));
    const m = add(fan, mul(d1, 2.4));
    const seg1 = solidSvg(G.solidOf([[0, 0], [0, 0.85], [2.0, 0.8], [2.4, 0]], G.frameAlong(fan, d1), P, { steps: 10, smooth: false }), { tone: "hi" });
    const seg2 = solidSvg(G.solidOf([[0, 0], [0, 0.78], [1.8, 0.65], [2.2, 0]], G.frameAlong(m, d2), P, { steps: 10, smooth: false }), { tone: "hi" });
    return { depth: depthOf(m, P), svg: seg1 + seg2, tip: add(m, mul(d2, 2.2)) };
  });
  const tc = curl * 1.1;
  const tb = add(add(palm0, mul(f, 1.6)), mul(AX0.f, 2.4));
  const td = norm(add(mul(f, Math.cos(0.5 - tc * 0.4)), add(mul(AX0.f, -Math.sin(tc) * 0.9), mul(perp(f), -0.5))));
  const thumb = { depth: depthOf(tb, P), svg: solidSvg(G.solidOf([[0, 0], [0, 0.9], [2.4, 0.8], [2.9, 0]], G.frameAlong(tb, td), P, { steps: 10, smooth: false }), { tone: "hi" }) };
  [...fingers, thumb].sort((p, q) => p.depth - q.depth).forEach((p) => { o += dk(p.svg); });
  return { svg: o, tip: fingers[1].tip, grip: add(knuckles, mul(AX0.f, 1.2)) };
}
function perp(f) { const p = [-f[2] * AX0.r[0], -f[2] * AX0.r[1], f[0] * AX0.r[0] + f[1] * AX0.r[1]]; return norm(p); }

/* ---- the head ---- */
function drawHead(t, bitmap) {
  const ax = axes(K, P, yaw), tv = towardViewer(P);
  const nearEar = (ax.r[0] * tv[0] + ax.r[1] * tv[1]) > 0 ? 1 : -1;
  const ear = (s) => {
    const c = [ax.r[0] * s * (HEAD.w / 2 - 1.2), ax.r[1] * s * (HEAD.w / 2 - 1.2), HEAD_Z + 13];
    const F = G.frameAlong(c, [ax.r[0] * s, ax.r[1] * s, 0]);
    let o = '<g class="rb-dk">' + solidSvg(G.disc(0, 4.2, 7.4, F, P, { steps: 40 }), { tone: "hi", crease: "lo" }) + solidSvg(G.disc(4.2, 5.6, 4.8, F, P, { steps: 32 }), { tone: "hi", crease: "lo" }) + "</g>";
    o += solidSvg(extrude(turnedRing(K, { w: 1.6, d: 7, r: 0.7 }, [c[0] + ax.r[0] * s * 3 - ax.f[0] * 1.5, c[1] + ax.r[1] * s * 3 - ax.f[1] * 1.5], ax, 2), HEAD_Z + 19, 8, P), { tone: "hi", crease: "lo" });
    return o;
  };
  let out = ear(-nearEar);
  out += solidSvg(extrude(turnedRing(K, HEAD, [0, 0], ax, 8), HEAD_Z, HEAD_H, P, { bevel: 1.4 }), { tone: "hi", crease: "lo" });
  out += solidSvg(extrude(turnedRing(K, CROWN, [-ax.f[0] * 1.2, -ax.f[1] * 1.2], ax, 8), HEAD_Z + HEAD_H, CROWN_H, P, { bevel: 1 }), { tone: "hi", crease: "lo" });
  const zt = HEAD_Z + HEAD_H + CROWN_H + 0.02;
  const stripe = [[-1.6, -14], [1.6, -14], [1.6, 13.4], [-1.6, 13.4]].map(([u, v]) => iso([ax.r[0] * u + ax.f[0] * (v - 1.2), ax.r[1] * u + ax.f[1] * (v - 1.2), zt], P));
  out += '<path class="rb-stripe" d="M' + stripe.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L") + 'Z"/>';
  const o = [ax.f[0] * (HEAD.d / 2 + 0.06), ax.f[1] * (HEAD.d / 2 + 0.06), 0];
  out += '<path class="rb-brim" d="' + facePath(K, P, o, ax.r, roundRectPts(0, SCREEN.cz, SCREEN.w + 5, SCREEN.h + 5, SCREEN.r + 2.5, 6), true) + '"/>';
  out += '<path class="rb-screen" d="' + facePath(K, P, o, ax.r, roundRectPts(0, SCREEN.cz, SCREEN.w, SCREEN.h, SCREEN.r, 6), true) + '"/>';
  const pu = (SCREEN.w - 4) / COLS, pv = (SCREEN.h - 3) / ROWS;
  let off = "", on = "";
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const u = -SCREEN.w / 2 + 2 + (x + 0.5) * pu, v = SCREEN.cz + SCREEN.h / 2 - 1.5 - (y + 0.5) * pv;
    const lit = bitmap[y][x], hw = lit ? pu * 0.46 : pu * 0.18, hh = lit ? pv * 0.46 : pv * 0.18;
    const d = facePath(K, P, o, ax.r, [[u - hw, v - hh], [u + hw, v - hh], [u + hw, v + hh], [u - hw, v + hh]], true);
    if (lit) on += d; else off += d;
  }
  out += '<path class="rb-off" d="' + off + '"/><path class="rb-on-glow" d="' + on + '"/><path class="rb-on" d="' + on + '"/>';
  out += '<path class="rb-glare" d="' + facePath(K, P, o, ax.r, [[-14.2, SCREEN.cz + 7], [-13.4, SCREEN.cz + 7.6], [-13.4, SCREEN.cz - 4], [-14.2, SCREEN.cz - 3]], true) + '"/>';
  out += ear(nearEar);
  headEl.innerHTML = out;
}

/* ---- the frame loop ---- */
let visible = true;
new IntersectionObserver((es) => { const v = es[es.length - 1].isIntersecting; if (v && !visible) { show("WB!", 1000); say("Welcome back.", 1600); } visible = v; }).observe(svg);
function bangalore() { return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date()); }

function tick(now) {
  requestAnimationFrame(tick);
  if (!visible) { last = 0; return; }
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  const t = now / 1000;
  const [hx, hy, s] = headScreenCentre();
  const dx = hasPointer ? px - hx : 0, dy = hasPointer ? py - hy : 120;
  const dist = Math.hypot(dx, dy);

  if (mood !== "watch" && mood !== "sleep" && now > moodUntil) mood = "watch";
  const idle = now - lastMove;
  if (mood === "watch" && idle > 4500 && !timeShown && !attend && !grabbed) { timeShown = true; show(bangalore(), 2600); say("It's " + bangalore() + " here in Bangalore.", 2800); }
  if (mood === "watch" && idle > 10000 && !still.matches && !away && !grabbed) { mood = "sleep"; say("Zzz", 1e9); }
  if (mood === "sleep" && woke) { woke = 0; setMood("surprised", 900); show("!!", 450); say("Oh! Hi.", 1400); blinkAt = now + 1200; }

  spin *= Math.exp(-dt / 1.3);
  if (spin > 7.5 && mood !== "dizzy" && !still.matches) { setMood("dizzy", 2600); show("?!", 500); say("Whoa. The room is spinning.", 2400); spin = 0; motor += 8; }

  const isNear = hasPointer && dist < 150 * s * 1.6 && mood !== "sleep" && !away;
  if (isNear && !near) nearSince = now;
  near = isNear;
  if (near && now - nearSince > 260 && mood === "watch" && !attend) { setMood("happy", 1800); if (!greeted) { greeted = true; show("HI!", 700); waveT = now; } if (now > sayUntil) say("Hi! I'm VCM-03.", 1800); }

  // head
  let want = YAW0 + TURN * Math.max(-1, Math.min(1, dx / (260 * s * 1.6))) * 0.85;
  if (mood === "dizzy") want = YAW0 + Math.sin(t * 7) * 0.4;
  if (mood === "sleep") want = YAW0 + Math.sin(t * 0.8) * 0.05;
  const before = yaw;
  if (still.matches) { yaw = want; yawV = 0; } else { yawV += ((want - yaw) * 90 - yawV * 13) * dt; yaw += yawV * dt; }
  const wu = Math.max(-4, Math.min(4, dx / (90 * s * 1.6))), wv = mood === "sleep" ? 1 : Math.max(-2, Math.min(2, dy / (110 * s * 1.6)));
  lookU += (wu - lookU) * (1 - Math.exp(-dt / 0.08)); lookV += (wv - lookV) * (1 - Math.exp(-dt / 0.08));

  // arms: each one rests, reaches for the cursor when it's close on its side, points at what's attended, or holds the cursor
  const target = hasPointer ? toPlane(px, py) : null;
  let attendPt = null;
  if (attend) { const r = attend.getBoundingClientRect(); attendPt = toPlane(r.left + r.width / 2, r.top + r.height / 2); }
  let moved = 0;
  for (const side of [-1, 1]) {
    const a = arm[side], [sx, sz] = shoulderOf(side);
    let goal = [sx + side * 3, sz - (UPPER + FORE + 2) * 0.96 + Math.sin(t * 1.6 + side) * 0.4], curl = 0.25, point = false, reaching = false;
    if (grabbed && grabbed.side === side) { goal = [side * 13, 49]; curl = 0.95; }
    else if (attendPt && Math.sign(attendPt[0] || side) === side) { goal = attendPt; curl = 0.85; point = true; }
    else if (target && !grabbed && mood !== "sleep" && Math.sign(target[0]) === side && Math.hypot(target[0] - sx, target[1] - sz) < REACH * 1.5) { goal = target; curl = 0.05; reaching = true; }
    else if (waveT > 0 && now - waveT < 1900 && side === 1) { const w = (now - waveT) / 1000; goal = [sx + side * (9 + Math.sin(w * 13) * 4), sz + 13]; curl = 0.1; }
    a.goal = a.goal || goal.slice();
    const e = still.matches ? 1 : 1 - Math.exp(-dt / 0.09);
    const nx = a.goal[0] + (goal[0] - a.goal[0]) * e, nz = a.goal[1] + (goal[1] - a.goal[1]) * e;
    moved += Math.hypot(nx - a.goal[0], nz - a.goal[1]);
    a.goal = [nx, nz];
    a.curl += (curl - a.curl) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.07));
    a.point = point; a.reaching = reaching;
  }
  const key = [-1, 1].map((sd) => arm[sd].goal.map((v) => v.toFixed(1)).join(",") + ":" + arm[sd].curl.toFixed(2) + (arm[sd].point ? "p" : "")).join("|");
  if (key !== armsKey) {
    armsKey = key;
    let html = "";
    for (const side of [-1, 1]) {
      const ik = solveArm(side, arm[side].goal);
      const r = armSvg(side, ik, arm[side].curl, arm[side].point);
      arm[side].tip = [ik.W[0], ik.W[1]];
      html += r.svg;
      if (grabbed && grabbed.side === side) {
        // the cursor he's holding: a little arrow pinched in his fingers
        const g = iso(r.grip, P), q = 1.25;
        heldEl.innerHTML = '<path class="rb-held" d="M' + g[0].toFixed(2) + ' ' + g[1].toFixed(2) + 'l0 ' + (14 * q).toFixed(1) + 'l' + (3.6 * q).toFixed(1) + ' ' + (-3.4 * q).toFixed(1) + 'l' + (2.8 * q).toFixed(1) + ' ' + (5.8 * q).toFixed(1) + 'l' + (2.4 * q).toFixed(1) + ' ' + (-1.1 * q).toFixed(1) + 'l' + (-2.8 * q).toFixed(1) + ' ' + (-5.6 * q).toFixed(1) + 'l' + (4.8 * q).toFixed(1) + ' 0z"/>';
      }
    }
    armsEl.innerHTML = html;
  }

  // linger at his fingertips and he catches your cursor
  if (!grabbed && hasPointer && mood !== "sleep") {
    for (const side of [-1, 1]) {
      const a = arm[side];
      if (!a.reaching || !a.tip) { a.dwell = 0; continue; }
      const c = toClient(Wp(a.tip[0], ARM_LY + 1, a.tip[1]));
      a.dwell = Math.hypot(px - c[0], py - c[1]) < 30 ? (a.dwell || 0) + dt : 0;
      if (a.dwell > 0.55) { a.dwell = 0; grab(side, { clientX: px, clientY: py }); break; }
    }
  }

  // the gears and the neck collar are driven by everything he does
  const headSpeed = Math.abs(yaw - before) / Math.max(dt, 1e-3);
  motor += (headSpeed * 0.9 + moved * 0.35) ;
  motor *= Math.exp(-dt / 0.35);
  const omega = 0.35 + Math.min(motor, 22);
  if (!still.matches) { gearA += omega * dt; gearB -= omega * dt * (GEAR_A.teeth / GEAR_B.teeth); }
  const cA = Wp(GEAR_A.lx, GEAR_A.ly, 0), cB = Wp(GEAR_B.lx, GEAR_B.ly, 0), cN = Wp(0, -1, 0);
  teethEl.innerHTML = '<path class="rb-teeth" d="' + ribs(K, P, cA[0], cA[1], GEAR_A.r, GEAR_A.z0 + 0.3, GEAR_A.z0 + GEAR_A.h - 0.3, GEAR_A.teeth, gearA) + ribs(K, P, cB[0], cB[1], GEAR_B.r, GEAR_B.z0 + 0.3, GEAR_B.z0 + GEAR_B.h - 0.3, GEAR_B.teeth, gearB) + '"/>';
  collarEl.innerHTML = '<path class="rb-teeth" d="' + ribs(K, P, cN[0], cN[1], 4.8, NECK_Z + 3.6, NECK_Z + 5.2, 22, yaw * 2.2) + '"/>';

  // blinking, hopping
  if (mood === "watch" && now > blinkAt) { blinkT = 0.16; blinkAt = now + 2400 + Math.random() * 3200; }
  blinkT = Math.max(0, blinkT - dt);
  if (!still.matches && (jump > 0 || jumpV > 0)) { jumpV -= 520 * dt; jump += jumpV * dt; if (jump <= 0) { jump = 0; jumpV = 0; squash = 0.07; } }
  squash *= Math.exp(-dt / 0.09);
  const foot = iso([0, 0, 0], P);
  root.setAttribute("transform", "translate(" + foot[0].toFixed(2) + " " + (foot[1] - jump * SCALE).toFixed(2) + ") scale(" + (1 + squash * 0.6).toFixed(4) + " " + (1 - squash).toFixed(4) + ") translate(" + (-foot[0]).toFixed(2) + " " + (-foot[1]).toFixed(2) + ")");

  // the screen
  let bitmap;
  if (now < textUntil) bitmap = text(screenText);
  else if (attend && attendGlyph) bitmap = text(attendGlyph);
  else if (mood === "sleep") bitmap = Math.floor(t / 1.4) % 2 ? text("ZZZ") : face("sleep", 0, 0, t);
  else if (mood === "boot") bitmap = text("HI!");
  else bitmap = face(mood === "watch" ? (blinkT > 0 ? "blink" : (arm[-1].reaching || arm[1].reaching ? "focus" : "open")) : mood, Math.round(lookU), Math.round(lookV), t);
  drawHead(t, bitmap);
  if (now > sayUntil && readout && mood === "watch" && !attend) { const txt = "Watching you"; if (readout.textContent !== txt) readout.textContent = txt; }
}
requestAnimationFrame(tick);

/* ---- what the page can ask of him ---- */
window.VCM = {
  attend(el, glyph, line) { attend = el; attendGlyph = glyph || ""; lastMove = performance.now(); if (mood === "sleep") { mood = "watch"; } if (line) say(line, 1e9); motor += 3; },
  release() { attend = null; attendGlyph = ""; sayUntil = 0; },
  handAt(side) { const a = arm[side]; return a.tip ? toClient(Wp(a.tip[0], ARM_LY + 1, a.tip[1])) : null; },
  show(textOnScreen, ms, line) { show(textOnScreen, ms || 1200); if (line) say(line, (ms || 1200) + 600); motor += 3; },
};
`;

/* ---------- figure markup ---------- */
const figure = (caption) => `<figure class="rb iso" data-theme="light" data-robot tabindex="0" aria-label="VCM-03, an interactive robot. Press Enter to boop.">
  ${svg}
  ${caption ? `<figcaption><span data-readout aria-live="polite">Booting</span><span>VCM-03</span></figcaption>` : `<p class="vcm-say" data-readout aria-live="polite">Booting</p>`}
</figure>`;
const script = (kitScript() + live).replace(/<\/(script)/gi, "<\\/$1");

/* ---------- 1. the figure alone ---------- */
writeFileSync(join(HERE, "robot.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>VCM-03</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono&display=swap" rel="stylesheet">
<style>
${k.ISO_CSS}
${tokens}
:root { --canvas: #EDEDED; }
* { box-sizing: border-box; margin: 0; }
html, body { height: 100%; }
html.vcm-grabbing, html.vcm-grabbing * { cursor: none !important; }
body { background: var(--canvas); color: #161616; font: 15px/1.5 Geist, system-ui, sans-serif; -webkit-font-smoothing: antialiased; display: grid; place-items: center; overflow: hidden; }
.rb { width: min(440px, 92vw); user-select: none; -webkit-user-select: none; outline: none; }
.rb svg { width: 100%; height: auto; display: block; overflow: visible; cursor: pointer; touch-action: manipulation; }
.rb figcaption { display: flex; justify-content: space-between; font: 12px/1.3 "Geist Mono", ui-monospace, monospace; color: #8F8F8F; margin-top: 2px; padding: 0 12px; }
.rb [data-readout] { color: #161616; }
.hint { position: fixed; left: 0; right: 0; bottom: 22px; text-align: center; font: 12px "Geist Mono", ui-monospace, monospace; color: #A3A3A3; }
</style></head>
<body>
${figure(true)}
<p class="hint">Move near his hands and click to get grabbed · hover him · click to boop · spin your cursor round him · wait a bit</p>
<script type="module">${script}</script>
</body></html>`);
console.log("wrote robot.html");

/* ---------- 2. the v6 homepage, hosted by VCM-03 ---------- */
let site = readFileSync(join(HERE, "../../v6/index.html"), "utf8");
const swap = (a, b) => { if (!site.includes(a)) throw new Error("missing in v6: " + a.slice(0, 60)); site = site.replace(a, b); };
swap(/<img class="avatar"[^>]*>/.exec(site)[0], `<div class="vcm-host">${figure(false)}</div>`);
swap("</style>\n</head>", `
  /* VCM-03 hosts the intro */
  ${k.ISO_CSS}
  ${tokens}
  html.vcm-grabbing, html.vcm-grabbing * { cursor: none !important; }
  .intro { padding-top: 32px; }
  .vcm-host { width: min(330px, 78vw); margin: 0 auto 6px; }
  .vcm-host .rb { width: 100%; user-select: none; -webkit-user-select: none; outline: none; }
  .vcm-host svg { width: 100%; height: auto; display: block; overflow: visible; cursor: pointer; touch-action: manipulation; }
  .vcm-say { text-align: center; font: 12px/1.3 Geist, system-ui, sans-serif; color: var(--gray); min-height: 16px; margin-top: 2px; }
  .links a { position: relative; }
</style>
</head>`);
swap("</body>", `<script type="module">${script}
/* the page points him at things */
const glyphs = { "Email": ["@", "That one's my inbox."], "Résumé": ["CV", "The boring version of me."], "LinkedIn": ["IN", "Very professional."], "GitHub": ["</>", "Where the code lives."], "X": ["X", "Mostly design takes."] };
document.querySelectorAll(".links a").forEach((a) => {
  const g = glyphs[a.textContent.trim()]; if (!g) return;
  a.addEventListener("pointerenter", () => window.VCM.attend(a, g[0], g[1]));
  a.addEventListener("pointerleave", () => window.VCM.release());
  a.addEventListener("focus", () => window.VCM.attend(a, g[0], g[1]));
  a.addEventListener("blur", () => window.VCM.release());
});
document.querySelectorAll(".frame[data-i]").forEach((f) => f.addEventListener("click", () => window.VCM.show("OOH", 1200)));
</script>
</body>`);
mkdirSync(join(HERE, "../site"), { recursive: true });
writeFileSync(join(HERE, "../site/index.html"), site);
console.log("wrote ../site/index.html", (site.length / 1024).toFixed(0) + " KB");
