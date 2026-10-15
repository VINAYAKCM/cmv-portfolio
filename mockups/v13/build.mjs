// v13: intro + 2x2 work + about, with VCM-03 revealed a little more in each section.
//   1. hero:  only his screen, a flat dot-matrix display set into the intro
//   2. work:  he climbs up behind the grid and grips its top edge; his body stays behind the tiles
//   3. about: his whole body, sitting on the "work with me" card, holding your email
//
//   node mockups/v13/build.mjs   -> writes mockups/v13/index.html
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "../../.claude/skills/anatomy");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const G = await import(join(SKILL, "kit/lathe.mjs"));
const T = await import(join(SKILL, "kit/tube.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));
const latheSrc = readFileSync(join(SKILL, "kit/lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const LATHE_IN_PAGE = `const G = (() => {\n${latheSrc}\nreturn { frameAlong, frameOf, pointOf, disc, solidOf, sphereOf };\n})();`;

/* ---------- proportions (world units, z up) ---------- */
const HIP_Z = 34, WAIST_Z = 38, CHEST_Z0 = 41, CHEST_Z1 = 62;
const SHOULDER_Z = 58, SHOULDER_X = 17.5, ARM_LY = 3;
const NECK_Z = 62, HEAD_Z = 68, HEAD_H = 27, CROWN_H = 4;
const HEAD = { w: 44, d: 36, r: 15 }, CROWN = { w: 39, d: 31, r: 12.5 };
const SCREEN = { w: 32, h: 19, r: 6.5, cz: HEAD_Z + 13.5 };
const COLS = 30, ROWS = 16;
const UPPER = 12, FORE = 11;
const EDGE_Z = 64;                 // peek: the tiles' top edge, at his chin, in his frontal plane

const P = k.fitProjection([[-60, -40, 0], [60, 40, 0], [-60, 40, 110], [60, -40, 110]], 1000, 1000, { pad: 0, azimuth: 45, elevation: 12 });
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
function ribs(K, P, cx, cy, r, z0, z1, count, phase) {
  const tv = K.towardViewer(P);
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2, nx = Math.cos(a), ny = Math.sin(a);
    if (nx * tv[0] + ny * tv[1] < 0.18) continue;
    const p0 = K.iso([cx + nx * r, cy + ny * r, z0], P), p1 = K.iso([cx + nx * r, cy + ny * r, z1], P);
    d += "M" + p0[0].toFixed(2) + " " + p0[1].toFixed(2) + "L" + p1[0].toFixed(2) + " " + p1[1].toFixed(2);
  }
  return d;
}
const HELPERS = [axes, turnedRing, roundRectPts, facePath, ribs].map((f) => f.toString()).join("\n") + `\nconst facePoint = ${facePoint.toString()};`;

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const at = (p) => k.iso(p, P);
const AX = axes(k, P, YAW0);
const Wp = (lx, ly, z) => [AX.r[0] * lx + AX.f[0] * ly, AX.r[1] * lx + AX.f[1] * ly, z];
const DK = (svg) => `<g class="rb-dk">${svg}</g>`;
const CV = (svg) => `<g class="rb-cavity">${svg}</g>`;
const up = [0, 0, 1];
const turned = (plan, lx, ly, steps = 5) => turnedRing(k, plan, Wp(lx, ly, 0), AX, steps);
const viewBox = (pts, pad) => { const s = pts.map(at); const xs = s.map((p) => p[0]), ys = s.map((p) => p[1]); const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad; return [x0, y0, Math.max(...xs) + pad - x0, Math.max(...ys) + pad - y0].map((n) => +n.toFixed(1)); };

/* ---------- static body parts ---------- */
const GEAR_A = { lx: -3, ly: 1.5, r: 6.4, z0: 45, h: 3.6, teeth: 28 };
const GEAR_B = { lx: 6.4, ly: 1.5, r: 3.4, z0: 45.4, h: 2.8, teeth: 15 };
function torso() {
  const out = [];
  out.push(DK(S(k.extrude(turned({ w: 24, d: 14, r: 4 }, 0, -0.5), HIP_Z - 1, 4.4, P, { bevel: 0.5 }), { tone: "hi", crease: "lo" })));
  out.push(DK(S(k.cylinder(...Wp(0, -1, 0).slice(0, 2), 7, WAIST_Z - 0.6, 3.6, P, 48), { tone: "hi", crease: "lo" })));
  out.push(CV(S(k.extrude(turned({ w: 27, d: 3, r: 1.2 }, 0, -8.6), CHEST_Z0 + 1, CHEST_Z1 - CHEST_Z0 - 4, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" })));
  out.push(CV(S(k.extrude(turned({ w: 29, d: 18, r: 4 }, 0, -1), CHEST_Z0, 2, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" })));
  out.push(S(k.extrude(turned({ w: 2.4, d: 17, r: 1 }, -13.6, -1.2), CHEST_Z0 + 2, 13, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" }));
  out.push(DK(S(k.cylinder(...Wp(0, -5.2, 0).slice(0, 2), 2.2, CHEST_Z0 + 2, CHEST_Z1 - CHEST_Z0 - 2, P, 18), { tone: "hi", crease: "none" })));
  for (const g of [GEAR_A, GEAR_B]) {
    const c = Wp(g.lx, g.ly, 0);
    out.push(DK(S(k.cylinder(c[0], c[1], g.r, g.z0, g.h, P, 56), { tone: "hi", crease: "lo" })));
    out.push(DK(S(k.cylinder(c[0], c[1], g.r * 0.42, g.z0 + g.h, 1.4, P, 28), { tone: "hi", crease: "lo" })));
  }
  out.push(`<g class="rb-dk" data-teeth></g>`);
  const cA = Wp(GEAR_A.lx, GEAR_A.ly, 0), core = at([cA[0], cA[1], GEAR_A.z0 + GEAR_A.h + 1.4]);
  out.push(`<circle class="rb-core" cx="${core[0].toFixed(2)}" cy="${core[1].toFixed(2)}" r="${(1.2 * k.screenRise(1, P) * 1.6).toFixed(2)}"/>`);
  for (const side of [-1, 1]) {
    const route = G.fillet([Wp(side * 4, 0.5, 50.4), Wp(side * 9, 0.5, 52), Wp(side * 11, 0, 56), Wp(side * 14.6, ARM_LY * 0.5, SHOULDER_Z - 0.6)], 3, 7);
    T.tubePieces(route, 0.9, P, { maxLength: 40 }).forEach((piece) => out.push(DK(T.tubeSvg(piece, { tone: "hi" }))));
  }
  out.push(S(k.extrude(turned({ w: 2.4, d: 17, r: 1 }, 13.6, -1.2), CHEST_Z0 + 2, 13, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" }));
  out.push(S(k.extrude(turned({ w: 31, d: 19, r: 5.5 }, 0, -0.6, 6), 55.5, CHEST_Z1 - 55.5, P, { bevel: 0.9 }), { tone: "hi", crease: "lo" }));
  for (let i = 0; i < 3; i++) out.push(L(facePath(k, P, Wp(0, 8.92, 0), AX.r, roundRectPts(-7 + i * 3.4, 59, 1.6, 3.4, 0.8, 2), true), { tone: "lo" }));
  const c = Wp(0, -1, 0);
  out.push(DK(S(k.cylinder(c[0], c[1], 6, NECK_Z, 1.8, P, 36, 0.3), { tone: "hi", crease: "lo" })));
  out.push(DK(S(k.cylinder(c[0], c[1], 3.4, NECK_Z + 1.8, 1.6, P, 24), { tone: "hi", crease: "none" })));
  out.push(DK(S(k.cylinder(c[0], c[1], 4.8, NECK_Z + 3.4, 2, P, 36), { tone: "hi", crease: "lo" })));
  out.push(`<g class="rb-dk" data-collar></g>`);
  out.push(DK(S(k.cylinder(c[0], c[1], 3.2, NECK_Z + 5.4, HEAD_Z - NECK_Z - 5.4, P, 24), { tone: "hi", crease: "none" })));
  return out.join("");
}
// sitting legs: thighs reach toward the viewer, shins hang down over the edge
function sittingLeg(side) {
  const lx = side * 8.5, out = [];
  const hip = Wp(lx, 0, HIP_Z - 1.4), knee = Wp(lx + side * 1.6, 16, HIP_Z - 2.2), ankle = Wp(lx + side * 2.2, 17.5, HIP_Z - 15);
  const dirT = [knee[0] - hip[0], knee[1] - hip[1], knee[2] - hip[2]], lenT = Math.hypot(...dirT), uT = dirT.map((v) => v / lenT);
  const dirS = [ankle[0] - knee[0], ankle[1] - knee[1], ankle[2] - knee[2]], lenS = Math.hypot(...dirS), uS = dirS.map((v) => v / lenS);
  out.push(DK(S(G.sphereOf(hip, 3.6, P, { steps: 32 }), { tone: "hi" })));
  out.push(S(G.solidOf([[0, 0], [0, 4.2], [1, 4.8, 1], [lenT - 3, 5.0, 1], [lenT - 2, 4.4], [lenT - 2, 0]], G.frameAlong(hip, uT), P, { steps: 36, smooth: { rows: 3 } }), { tone: "hi", crease: "lo" }));
  out.push(DK(S(G.disc(-3.4, 3.4, 3.4, G.frameAlong(knee, AX.r), P, { steps: 28 }), { tone: "hi", crease: "lo" })));
  out.push(S(G.solidOf([[0, 0], [0, 4.3], [1, 4.8, 1], [lenS - 3, 4.4, 1], [lenS - 2, 3.8], [lenS - 2, 0]], G.frameAlong(add3(knee, mul3(uS, 2)), uS), P, { steps: 36, smooth: { rows: 3 } }), { tone: "hi", crease: "lo", inner: L(G.arcOf(G.frameAlong(add3(knee, mul3(uS, 2)), uS), lenS * 0.45, 4.6, P), { tone: "lo" }) }));
  // piston down the outside of the shin
  const px = lx + side * 7.6;
  out.push(DK(S(k.cylinder(...Wp(px, 16.8, 0).slice(0, 2), 1.15, ankle[2] + 2, 7, P, 14), { tone: "hi", crease: "none" })));
  out.push(DK(S(k.cylinder(...Wp(px, 16.8, 0).slice(0, 2), 1.7, ankle[2] + 8, 5, P, 16), { tone: "hi", crease: "lo" })));
  out.push(DK(S(G.sphereOf(ankle, 2.8, P, { steps: 28 }), { tone: "hi" })));
  const bootZ = ankle[2] - 7.4;
  out.push(DK(S(k.extrude(turnedRing(k, { w: 11, d: 18, r: 4.5 }, Wp(lx + side * 2.2, 19.5, 0), AX, 5), bootZ, 1.6, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" })));
  out.push(S(k.extrude(turnedRing(k, { w: 10.4, d: 16, r: 4.2 }, Wp(lx + side * 2.2, 19.5, 0), AX, 5), bootZ + 1.6, 5.2, P, { bevel: 0.6 }), { tone: "hi", crease: "lo" }));
  return out.join("");
}
function add3(a, b) { return a.map((v, i) => v + b[i]); }
function mul3(a, s) { return a.map((v) => v * s); }

const BODY_PEEK = torso();
const BODY_SIT = torso() ;
const LEGS_SIT = sittingLeg(-1) + sittingLeg(1);
// the sit pose: thighs and shins are in front of the torso, so they go after it
const VB_PEEK = viewBox([Wp(-36, 0, EDGE_Z - 22), Wp(36, 0, EDGE_Z - 22), Wp(-30, -18, HEAD_Z + HEAD_H + CROWN_H + 4), Wp(30, 18, HEAD_Z + HEAD_H + CROWN_H + 4), Wp(-40, 0, 80), Wp(40, 0, 80)], 4);
const VB_SIT = viewBox([Wp(-40, 0, 6), Wp(40, 24, 6), Wp(-30, -18, HEAD_Z + HEAD_H + CROWN_H + 4), Wp(30, 18, HEAD_Z + HEAD_H + CROWN_H + 4), Wp(-46, 0, 70), Wp(46, 0, 70)], 4);
const yOf = (p, vb) => +((at(p)[1] - vb[1]) / vb[3]).toFixed(4);
const PEEK_EDGE = yOf(Wp(0, ARM_LY + 1.5, EDGE_Z), VB_PEEK);       // where the grid's top edge falls in the peek figure
const SIT_SEAT = yOf(Wp(0, 14, HIP_Z - 6.4), VB_SIT);                  // where the card's top edge falls under him
const HEAD_WIDTH_UNITS = HEAD.w;

const defs = `<defs>
  <filter id="rb-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4"/></filter>
  <linearGradient id="rb-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18181A"/><stop offset="1" stop-color="#070708"/></linearGradient>
</defs>`;
const svgOf = (vb, body, cls) => `<svg class="iso-svg ${cls}" viewBox="${vb.join(" ")}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}${body}</svg>`;
const PEEK_BACK = svgOf(VB_PEEK, `<g data-root><g data-body>${BODY_PEEK}</g><g data-arms></g><g data-head></g></g>`, "peek-back");
const PEEK_FRONT = svgOf(VB_PEEK, `<g data-root2><g data-hands></g></g>`, "peek-front");
const SIT_SVG = svgOf(VB_SIT, `<g data-root><g data-body>${BODY_SIT}</g><g data-legs>${LEGS_SIT}</g><g data-arms></g><g data-head></g><g data-hands></g><g data-card></g></g>`, "sit-svg");

/* ---------- palette ---------- */
const tokens = `
.iso[data-theme="light"].rb{--anatomy-card:var(--canvas);--anatomy-paper:var(--canvas);--anatomy-top:#FFFFFF;--anatomy-shade-0:#D9D9D9;--anatomy-shade-1:#E3E3E3;--anatomy-shade-2:#ECECEC;--anatomy-shade-3:#F5F5F5;
  --anatomy-hi:#161616;--anatomy-mid:#8F8F8F;--anatomy-lo:#B9B9B9;--anatomy-faint:#D6D6D6;--anatomy-dot:#3A3A3A;--anatomy-halo:#000;--anatomy-halo-opacity:.22}
.rb .rb-dk{--anatomy-paper:#2B2B2C;--anatomy-top:#454547;--anatomy-shade-0:#1C1C1D;--anatomy-shade-1:#232324;--anatomy-shade-2:#2A2A2B;--anatomy-shade-3:#323233;--anatomy-hi:#0B0B0B;--anatomy-mid:#6A6A6C;--anatomy-lo:#5A5A5C;--anatomy-faint:#48484A;--anatomy-dot:#9A9A9C}
.rb .rb-cavity{--anatomy-paper:#161617;--anatomy-top:#222223;--anatomy-shade-0:#0F0F10;--anatomy-shade-1:#131314;--anatomy-shade-2:#18181A;--anatomy-shade-3:#1D1D1E;--anatomy-hi:#070707;--anatomy-lo:#353536;--anatomy-faint:#2E2E2F}
.rb .tb-body{fill:#262627}.rb .tb-shine{fill:#4A4A4C}.rb .tb-shade{fill:#141415}
.rb .rb-brim{fill:#DADADA;stroke:#161616;stroke-width:var(--anatomy-weight)}
.rb .rb-screen{fill:url(#rb-screen);stroke:#0A0A0A;stroke-width:var(--anatomy-weight)}
.rb .rb-off{fill:#1F1F22}.rb .rb-on{fill:#FFFFFF}.rb .rb-on-glow{fill:#FFFFFF;opacity:.5;filter:url(#rb-glow)}
.rb .rb-glare{fill:#FFFFFF;opacity:.12}.rb .rb-stripe{fill:#161616}
.rb .rb-core{fill:#FFFFFF;filter:drop-shadow(0 0 2px rgba(255,255,255,.9))}
.rb .rb-teeth{fill:none;stroke:#77777A;stroke-width:.55}
.rb .rb-card{fill:#FFFFFF;stroke:#161616;stroke-width:.8}
.rb .rb-card-text{font-family:Geist,system-ui,sans-serif;font-weight:500;fill:#161616}
.rb .rb-card-sub{font-family:Geist,system-ui,sans-serif;fill:#8F8F8F}
`;

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

/* ---------- the page's robot engine ---------- */
const live = `
const P = ${JSON.stringify(P)};
const K = { iso, ringOf, towardViewer };
${LATHE_IN_PAGE}
${HELPERS}
const YAW0 = ${YAW0}, HEAD = ${JSON.stringify(HEAD)}, CROWN = ${JSON.stringify(CROWN)}, HEAD_Z = ${HEAD_Z}, HEAD_H = ${HEAD_H}, CROWN_H = ${CROWN_H};
const SCREEN = ${JSON.stringify(SCREEN)}, COLS = ${COLS}, ROWS = ${ROWS};
const SHOULDER_X = ${SHOULDER_X}, SHOULDER_Z = ${SHOULDER_Z}, ARM_LY = ${ARM_LY}, UPPER = ${UPPER}, FORE = ${FORE}, EDGE_Z = ${EDGE_Z}, HIP_Z = ${HIP_Z};
const GEAR_A = ${JSON.stringify(GEAR_A)}, GEAR_B = ${JSON.stringify(GEAR_B)}, NECK_Z = ${NECK_Z};
const FONT = ${JSON.stringify(FONT)};
const still = matchMedia("(prefers-reduced-motion: reduce)");
const AX0 = axes(K, P, YAW0);
const Wp = (lx, ly, z) => [AX0.r[0] * lx + AX0.f[0] * ly, AX0.r[1] * lx + AX0.f[1] * ly, z];
const add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, s) => a.map((v) => v * s), norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const SCALE = (() => { const a = iso([0,0,0], P), b = iso([1,0,0], P); return Math.hypot(b[0]-a[0], b[1]-a[1]); })();
const TURN = (() => { const o = iso([0,0,0], P)[0]; const a = axes(K, P, YAW0), b = axes(K, P, YAW0 + 0.05); return iso(b.f, P)[0] - o > iso(a.f, P)[0] - o ? 1 : -1; })();
const bangalore = () => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date());

/* ---- bitmaps: faces, words and a few icons on a 30x16 grid ---- */
const blank = () => Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
const put = (b, x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < COLS && y >= 0 && y < ROWS) b[y][x] = 1; };
const dotB = (b, cx, cy, r) => { for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) if (x * x + y * y <= r * r + r * 0.6) put(b, cx + x, cy + y); };
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
function icon(name) {
  const b = blank();
  if (name === "cursor") { const pts = [[12, 2], [12, 13], [14.6, 10.6], [16.4, 14.2], [18, 13.4], [16.2, 9.8], [19.6, 9.8]]; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; seg(b, p[0], p[1], q[0], q[1]); }); }
  if (name === "mail") { seg(b, 7, 3, 22, 3); seg(b, 22, 3, 22, 12); seg(b, 22, 12, 7, 12); seg(b, 7, 12, 7, 3); seg(b, 7, 3, 14.5, 8.5); seg(b, 14.5, 8.5, 22, 3); }
  if (name === "pin") { ringB(b, 14.5, 6, 4.4); seg(b, 10.6, 8, 14.5, 14); seg(b, 18.4, 8, 14.5, 14); dotB(b, 14.5, 6, 1); }
  if (name === "down") { seg(b, 14.5, 2, 14.5, 13); seg(b, 10, 9, 14.5, 13.5); seg(b, 19, 9, 14.5, 13.5); }
  return b;
}
function face(kind, lx, ly, t) {
  // eyes sit on row 5 and the mouth on rows 9-11, leaving about 3 empty rows above and 4 below
  const b = blank(), ex = [9 + lx, 20 + lx], ey = 5 + ly, mx = 14.5 + lx * 0.6, my = 9 + ly * 0.6;
  // a smooth, symmetric smile: eight columns, a soft U that dips two rows
  const smile = () => [[-3.5, 0], [-2.5, 1], [-1.5, 2], [-0.5, 2], [0.5, 2], [1.5, 2], [2.5, 1], [3.5, 0]].forEach(([dx, dy]) => put(b, mx + dx, my + dy));
  if (kind === "open" || kind === "surprised") { const r = kind === "surprised" ? 3 : 2; ex.forEach((x) => dotB(b, x, ey, r)); }
  if (kind === "open") smile();
  if (kind === "surprised") ringB(b, mx, my + 1.4, 1.6);
  if (kind === "blink") { ex.forEach((x) => seg(b, x - 2, ey, x + 2, ey)); smile(); }
  if (kind === "happy") {
    ex.forEach((x) => { seg(b, x - 3, ey + 1, x, ey - 2); seg(b, x, ey - 2, x + 3, ey + 1); });
    // a rounded grin: wide at the top, narrowing into a bowl
    for (let x = -5.5; x <= 5.5; x++) put(b, mx + x, my);
    for (let x = -4.5; x <= 4.5; x++) put(b, mx + x, my + 1);
    for (let x = -2.5; x <= 2.5; x++) put(b, mx + x, my + 2);
  }
  if (kind === "boop") { [[9, 1], [20, -1]].forEach(([x, s]) => { seg(b, x - 2 * s, ey - 2, x + s, ey); seg(b, x + s, ey, x - 2 * s, ey + 2); }); for (let x = -2.5; x <= 2.5; x++) put(b, mx + x, my + 1); }
  if (kind === "focus") { ex.forEach((x) => { dotB(b, x, ey, 2); seg(b, x - 3, ey - 3, x + 3, ey - 3); }); for (let x = -2.5; x <= 2.5; x++) put(b, mx + x, my + 1); }
  if (kind === "sleep") ex.forEach((x) => { seg(b, x - 3, ey + 1, x - 1, ey + 2); seg(b, x - 1, ey + 2, x + 1, ey + 2); seg(b, x + 1, ey + 2, x + 3, ey + 1); });
  return b;
}

/* ---- the pointer, shared by every view ---- */
const ptr = { x: -1e4, y: -1e4, has: false, moved: performance.now() };
addEventListener("pointermove", (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.has = true; ptr.moved = performance.now(); views.forEach((v) => v.onMove && v.onMove()); });

/* ---- 1. the hero screen: a flat dot-matrix display ---- */
function makeScreen(el) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 " + (COLS * 4 + 10) + " " + (ROWS * 4 + 10)); svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<defs><filter id="sc-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter></defs><rect x=".5" y=".5" width="' + (COLS * 4 + 9) + '" height="' + (ROWS * 4 + 9) + '" rx="12" class="sc-bezel"/><path class="sc-off"/><path class="sc-glow"/><path class="sc-on"/>';
  el.appendChild(svg);
  const off = svg.querySelector(".sc-off"), on = svg.querySelector(".sc-on"), glow = svg.querySelector(".sc-glow");
  const st = { text: "HI!", until: performance.now() + 1400, glyph: null, blinkAt: performance.now() + 2600, blink: 0, last: "", timeShown: false, lu: 0, lv: 0, visible: true };
  let lastT = 0;
  function draw(bm) {
    const key = bm.map((r) => r.join("")).join("");
    if (key === st.last) return; st.last = key;
    let a = "", b2 = "";
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const cx = 5 + x * 4 + 2, cy = 5 + y * 4 + 2; if (bm[y][x]) b2 += "M" + (cx - 1.7) + " " + (cy - 1.7) + "h3.4v3.4h-3.4z"; else a += "M" + (cx - 0.55) + " " + (cy - 0.55) + "h1.1v1.1h-1.1z"; }
    off.setAttribute("d", a); on.setAttribute("d", b2); glow.setAttribute("d", b2);
  }
  const view = {
    show(t, ms) { st.text = t; st.until = performance.now() + ms; },
    glyph(g) { st.glyph = g; },
    onMove() { st.timeShown = false; },
    tick(now) {
      const dt = lastT ? Math.min((now - lastT) / 1000, 1 / 30) : 1 / 60; lastT = now;
      const r = svg.getBoundingClientRect();
      const dx = ptr.has ? ptr.x - (r.left + r.width / 2) : 0, dy = ptr.has ? ptr.y - (r.top + r.height / 2) : 0;
      st.lu += (Math.max(-4, Math.min(4, dx / 90)) - st.lu) * (1 - Math.exp(-dt / 0.08));
      st.lv += (Math.max(-2, Math.min(1, dy / 120)) - st.lv) * (1 - Math.exp(-dt / 0.08));
      const idle = now - ptr.moved;
      if (idle > 4500 && !st.timeShown && !st.glyph) { st.timeShown = true; view.show(bangalore(), 2600); }
      if (now > st.blinkAt) { st.blink = 0.16; st.blinkAt = now + 2400 + Math.random() * 3000; }
      st.blink = Math.max(0, st.blink - dt);
      const scrolled = scrollY > innerHeight * 0.18;
      let bm;
      if (st.glyph) bm = st.glyph.startsWith("icon:") ? icon(st.glyph.slice(5)) : text(st.glyph);
      else if (now < st.until) bm = text(st.text);
      else if (scrolled) bm = Math.floor(now / 500) % 2 ? icon("down") : blank();
      else if (idle > 11000) bm = Math.floor(now / 1400) % 2 ? text("ZZZ") : face("sleep", 0, 0, 0);
      else bm = face(st.blink > 0 ? "blink" : "open", Math.round(st.lu), Math.round(st.lv), now / 1000);
      draw(bm);
    },
    el,
  };
  return view;
}

/* ---- 2 and 3. the robot, in the peek pose and the sit pose ---- */
function makeRobot(cfg) {
  const back = cfg.back, front = cfg.front || cfg.back;
  const root = back.querySelector("[data-root]"), root2 = front !== back ? front.querySelector("[data-root2]") : null;
  const headEl = back.querySelector("[data-head]"), armsEl = back.querySelector("[data-arms]"), handsEl = front.querySelector("[data-hands]");
  const teethEl = back.querySelector("[data-teeth]"), collarEl = back.querySelector("[data-collar]"), cardEl = back.querySelector("[data-card]");
  const vb = back.viewBox.baseVal;
  const st = { yaw: YAW0, yawV: 0, lu: 0, lv: 0, mood: "watch", moodUntil: 0, text: "", until: 0, glyph: null, blinkAt: performance.now() + 2000, blink: 0,
    rise: cfg.mode === "peek" ? 46 : 0, riseV: 0, riseWant: cfg.mode === "peek" ? 46 : 0, hop: 0, hopV: 0, entered: false, gearA: 0, gearB: 0, motor: 0,
    arms: { [-1]: { goal: null, curl: 0.3 }, [1]: { goal: null, curl: 0.3 } }, armsKey: "", attend: null, hand: 0, handT: 0, nextHide: 0, boops: 0 };
  let lastT = 0;
  const toScreen = (svgEl, p3, lift) => { const r = svgEl.getBoundingClientRect(), s = r.width / vb.width; const q = iso(p3, P); return [r.left + (q[0] - vb.x) * s, r.top + (q[1] - lift * SCALE - vb.y) * s]; };
  // screen point -> his frontal plane (lx, z), for reaching toward things on the page
  const base0 = iso(Wp(0, ARM_LY, 0), P), ex = (() => { const p = iso(Wp(1, ARM_LY, 0), P); return [p[0] - base0[0], p[1] - base0[1]]; })(), ez = (() => { const p = iso(Wp(0, ARM_LY, 1), P); return [p[0] - base0[0], p[1] - base0[1]]; })();
  const det = ex[0] * ez[1] - ex[1] * ez[0];
  function toPlane(cx, cy) { const r = back.getBoundingClientRect(), s = r.width / vb.width; const sx = (cx - r.left) / s + vb.x - base0[0], sy = (cy - r.top) / s + vb.y - base0[1]; return [(sx * ez[1] - sy * ez[0]) / det, (ex[0] * sy - ex[1] * sx) / det]; }

  function solveArm(side, target, lift) {
    const sx = side * SHOULDER_X, sz = SHOULDER_Z - lift;
    let dx = target[0] - sx, dz = target[1] - sz;
    if (dx * side < 2) dx = side * 2;
    const L1 = UPPER + 1.6, L2 = FORE + 1.2;
    const dd = Math.min(Math.max(Math.hypot(dx, dz), Math.abs(L1 - L2) + 0.5), L1 + L2 - 0.05), phi = Math.atan2(dz, dx);
    const c = Math.max(-1, Math.min(1, (L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd)));
    const cand = [phi + Math.acos(c), phi - Math.acos(c)].map((a1) => [sx + Math.cos(a1) * L1, sz + Math.sin(a1) * L1]);
    const E = cand.sort((p, q) => (q[0] * side - q[1] * 0.4) - (p[0] * side - p[1] * 0.4))[0];
    return { S: [sx, sz], E, W: [sx + Math.cos(phi) * dd, sz + Math.sin(phi) * dd] };
  }
  function perp(f) { return norm([-f[2] * AX0.r[0], -f[2] * AX0.r[1], f[0] * AX0.r[0] + f[1] * AX0.r[1]]); }
  function armParts(side, ik, curl) {
    const S3 = Wp(ik.S[0], ARM_LY, ik.S[1]), E3 = Wp(ik.E[0], ARM_LY + 0.6, ik.E[1]), W3 = Wp(ik.W[0], ARM_LY + 1.2, ik.W[1]);
    const u = norm([E3[0] - S3[0], E3[1] - S3[1], E3[2] - S3[2]]), f = norm([W3[0] - E3[0], W3[1] - E3[1], W3[2] - E3[2]]);
    const dk = (s) => '<g class="rb-dk">' + s + "</g>";
    const Lu = Math.hypot(E3[0] - S3[0], E3[1] - S3[1], E3[2] - S3[2]), Lf = Math.hypot(W3[0] - E3[0], W3[1] - E3[1], W3[2] - E3[2]);
    let arm = dk(solidSvg(G.sphereOf(S3, 4, P, { steps: 24 }), { tone: "hi" }));
    arm += solidSvg(G.solidOf([[0, 0], [0, 2.6], [0.8, 3.3], [Lu - 4, 3.1], [Lu - 3, 2.4], [Lu - 3, 0]], G.frameAlong(add(S3, mul(u, 2.6)), u), P, { steps: 20, smooth: false }), { tone: "hi", crease: "lo" });
    arm += dk(solidSvg(G.sphereOf(E3, 2.9, P, { steps: 20 }), { tone: "hi" }));
    arm += solidSvg(G.solidOf([[0, 0], [0, 2.4], [0.8, 3.1], [Lf - 3.4, 3.2], [Lf - 2.6, 2.5], [Lf - 2.6, 0]], G.frameAlong(add(E3, mul(f, 2.2)), f), P, { steps: 20, smooth: false }), { tone: "hi", crease: "lo" });
    let hand = dk(solidSvg(G.sphereOf(W3, 1.9, P, { steps: 16 }), { tone: "hi" }));
    const palm0 = add(W3, mul(f, 1.4));
    hand += dk(solidSvg(G.solidOf([[0, 0], [0, 2.1], [0.6, 2.6], [3.2, 2.5], [3.8, 2.0], [3.8, 0]], G.frameAlong(palm0, f), P, { steps: 16, smooth: false }), { tone: "hi", crease: "lo" }));
    const knuckles = add(palm0, mul(f, 3.8));
    const parts = [-1.5, 0, 1.5].map((off) => {
      const a1 = curl * 1.25, a2 = curl * 1.45;
      const d1 = norm(add(mul(f, Math.cos(a1)), mul(AX0.f, Math.sin(a1)))), d2 = norm(add(mul(f, Math.cos(a1 + a2)), mul(AX0.f, Math.sin(a1 + a2))));
      const fan = add(knuckles, mul(perp(f), off)), m = add(fan, mul(d1, 2.4));
      return { depth: depthOf(m, P), svg: solidSvg(G.solidOf([[0, 0], [0, 0.85], [2.0, 0.8], [2.4, 0]], G.frameAlong(fan, d1), P, { steps: 10, smooth: false }), { tone: "hi" }) + solidSvg(G.solidOf([[0, 0], [0, 0.78], [1.8, 0.65], [2.2, 0]], G.frameAlong(m, d2), P, { steps: 10, smooth: false }), { tone: "hi" }) };
    });
    const tb = add(add(palm0, mul(f, 1.6)), mul(AX0.f, 2.4)), tc = curl * 1.1;
    const td = norm(add(mul(f, Math.cos(0.5 - tc * 0.4)), add(mul(AX0.f, -Math.sin(tc) * 0.9), mul(perp(f), -0.5))));
    parts.push({ depth: depthOf(tb, P), svg: solidSvg(G.solidOf([[0, 0], [0, 0.9], [2.4, 0.8], [2.9, 0]], G.frameAlong(tb, td), P, { steps: 10, smooth: false }), { tone: "hi" }) });
    parts.sort((p, q) => p.depth - q.depth).forEach((p) => { hand += dk(p.svg); });
    return { arm, hand, grip: add(knuckles, mul(AX0.f, 1.2)) };
  }

  function drawHead(bitmap) {
    const ax = axes(K, P, st.yaw), tv = towardViewer(P);
    const nearEar = (ax.r[0] * tv[0] + ax.r[1] * tv[1]) > 0 ? 1 : -1;
    const ear = (s) => {
      const c = [ax.r[0] * s * (HEAD.w / 2 - 1.2), ax.r[1] * s * (HEAD.w / 2 - 1.2), HEAD_Z + 13];
      const F = G.frameAlong(c, [ax.r[0] * s, ax.r[1] * s, 0]);
      return '<g class="rb-dk">' + solidSvg(G.disc(0, 4.2, 7.4, F, P, { steps: 40 }), { tone: "hi", crease: "lo" }) + solidSvg(G.disc(4.2, 5.6, 4.8, F, P, { steps: 32 }), { tone: "hi", crease: "lo" }) + "</g>"
        + solidSvg(extrude(turnedRing(K, { w: 1.6, d: 7, r: 0.7 }, [c[0] + ax.r[0] * s * 3 - ax.f[0] * 1.5, c[1] + ax.r[1] * s * 3 - ax.f[1] * 1.5], ax, 2), HEAD_Z + 19, 8, P), { tone: "hi", crease: "lo" });
    };
    let out = ear(-nearEar);
    out += solidSvg(extrude(turnedRing(K, HEAD, [0, 0], ax, 8), HEAD_Z, HEAD_H, P, { bevel: 1.4 }), { tone: "hi", crease: "lo" });
    out += solidSvg(extrude(turnedRing(K, CROWN, [-ax.f[0] * 1.2, -ax.f[1] * 1.2], ax, 8), HEAD_Z + HEAD_H, CROWN_H, P, { bevel: 1 }), { tone: "hi", crease: "lo" });
    const zt = HEAD_Z + HEAD_H + CROWN_H + 0.02;
    out += '<path class="rb-stripe" d="M' + [[-1.6, -14], [1.6, -14], [1.6, 13.4], [-1.6, 13.4]].map(([u, v]) => iso([ax.r[0] * u + ax.f[0] * (v - 1.2), ax.r[1] * u + ax.f[1] * (v - 1.2), zt], P)).map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L") + 'Z"/>';
    const o = [ax.f[0] * (HEAD.d / 2 + 0.06), ax.f[1] * (HEAD.d / 2 + 0.06), 0];
    out += '<path class="rb-brim" d="' + facePath(K, P, o, ax.r, roundRectPts(0, SCREEN.cz, SCREEN.w + 5, SCREEN.h + 5, SCREEN.r + 2.5, 6), true) + '"/>';
    out += '<path class="rb-screen" d="' + facePath(K, P, o, ax.r, roundRectPts(0, SCREEN.cz, SCREEN.w, SCREEN.h, SCREEN.r, 6), true) + '"/>';
    const pu = (SCREEN.w - 4) / COLS, pv = (SCREEN.h - 3) / ROWS;
    let off = "", on = "";
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const u = -SCREEN.w / 2 + 2 + (x + 0.5) * pu, v = SCREEN.cz + SCREEN.h / 2 - 1.5 - (y + 0.5) * pv, lit = bitmap[y][x];
      const hw = lit ? pu * 0.46 : pu * 0.18, hh = lit ? pv * 0.46 : pv * 0.18;
      const d = facePath(K, P, o, ax.r, [[u - hw, v - hh], [u + hw, v - hh], [u + hw, v + hh], [u - hw, v + hh]], true);
      if (lit) on += d; else off += d;
    }
    out += '<path class="rb-off" d="' + off + '"/><path class="rb-on-glow" d="' + on + '"/><path class="rb-on" d="' + on + '"/>';
    out += '<path class="rb-glare" d="' + facePath(K, P, o, ax.r, [[-14.2, SCREEN.cz + 7], [-13.4, SCREEN.cz + 7.6], [-13.4, SCREEN.cz - 4], [-14.2, SCREEN.cz - 3]], true) + '"/>';
    out += ear(nearEar);
    headEl.innerHTML = out;
  }

  // the email card he holds in the sit pose
  function cardSvg(grip, out) {
    const w = 26, h = 14;
    const o = add(grip, mul(AX0.f, 0.6));
    const pts = [[-w * 0.15, 2], [w * 0.85, 2], [w * 0.85, 2 - h], [-w * 0.15, 2 - h]].map(([u, v]) => iso(add(o, add(mul(AX0.r, u + out), [0, 0, v])), P));
    const a = iso(add(o, add(mul(AX0.r, w * 0.04 + out), [0, 0, -3.4])), P), b = iso(add(o, add(mul(AX0.r, w * 0.04 + out), [0, 0, -9.2])), P);
    const sx = iso(add(o, mul(AX0.r, 1)), P)[0] - iso(o, P)[0];
    return '<path class="rb-card" d="M' + pts.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L") + 'Z"/>'
      + '<text class="rb-card-text" x="' + a[0].toFixed(2) + '" y="' + a[1].toFixed(2) + '" font-size="' + (3.4 * sx).toFixed(2) + '" dominant-baseline="hanging">Say hi</text>'
      + '<text class="rb-card-sub" x="' + b[0].toFixed(2) + '" y="' + b[1].toFixed(2) + '" font-size="' + (2.5 * sx).toFixed(2) + '" dominant-baseline="hanging">' + (st.handT > 0 ? "Copied!" : "Click for my email") + '</text>';
  }

  const headCentre = () => toScreen(back, [0, 0, HEAD_Z + HEAD_H / 2], cfg.mode === "peek" ? -st.rise : st.hop);
  const view = {
    visible: false,
    enter() {
      if (st.entered) return; st.entered = true;
      if (cfg.mode === "peek") { st.riseWant = 0; st.text = "HI!"; st.until = performance.now() + 1200; }
      if (cfg.mode === "sit") { st.hopV = 70; st.text = "HI!"; st.until = performance.now() + 1100; }
      st.motor += 8;
    },
    look(el, glyph) { st.attend = el; st.glyph = glyph; st.motor += 3; },
    unlook() { st.attend = null; st.glyph = null; },
    boop() {
      st.motor += 6; st.boops++;
      if (cfg.mode === "peek") { st.riseWant = 40; st.text = "BOO"; st.until = performance.now() + 1500; setTimeout(() => { st.riseWant = 0; }, 650); }
      else { if (st.hop <= 0.5) st.hopV = 80; st.mood = "boop"; st.moodUntil = performance.now() + 900; }
    },
    handOver() {
      st.handT = 1.4; st.text = "YAY"; st.until = performance.now() + 1300; st.motor += 6;
    },
    tick(now) {
      const dt = lastT ? Math.min((now - lastT) / 1000, 1 / 30) : 1 / 60; lastT = now;
      const t = now / 1000;
      // entrance and hiding: in the peek pose he rises from behind the tiles
      if (cfg.mode === "peek") {
        if (st.entered && now > st.nextHide && now - ptr.moved > 9000 && st.riseWant === 0) { st.riseWant = 38; setTimeout(() => { st.riseWant = 0; st.text = "BOO"; st.until = performance.now() + 1100; }, 1400); st.nextHide = now + 14000; }
        if (still.matches) st.rise = st.riseWant; else { st.riseV += ((st.riseWant - st.rise) * 70 - st.riseV * 12) * dt; st.rise += st.riseV * dt; }
        const ty = (st.rise * SCALE).toFixed(2);
        root.setAttribute("transform", "translate(0 " + ty + ")"); if (root2) root2.setAttribute("transform", "translate(0 0)");
      } else {
        if (!still.matches && (st.hop > 0 || st.hopV > 0)) { st.hopV -= 420 * dt; st.hop += st.hopV * dt; if (st.hop <= 0) { st.hop = 0; st.hopV = 0; } }
        root.setAttribute("transform", "translate(0 " + (-st.hop * SCALE).toFixed(2) + ")");
      }
      const lift = cfg.mode === "peek" ? -st.rise : st.hop;
      // head and eyes
      const [hx, hy] = headCentre();
      let tx = ptr.x, ty2 = ptr.y;
      if (st.attend) { const r = st.attend.getBoundingClientRect(); tx = r.left + r.width / 2; ty2 = r.top + r.height / 2; }
      const dx = ptr.has || st.attend ? tx - hx : 0, dy = ptr.has || st.attend ? ty2 - hy : 100;
      const s = back.getBoundingClientRect().width / vb.width;
      const want = YAW0 + TURN * Math.max(-1, Math.min(1, dx / (300 * s))) * 0.85;
      const before = st.yaw;
      if (still.matches) st.yaw = want; else { st.yawV += ((want - st.yaw) * 90 - st.yawV * 13) * dt; st.yaw += st.yawV * dt; }
      st.lu += (Math.max(-4, Math.min(4, dx / (110 * s))) - st.lu) * (1 - Math.exp(-dt / 0.08));
      st.lv += (Math.max(-2, Math.min(1, dy / (130 * s))) - st.lv) * (1 - Math.exp(-dt / 0.08));
      if (st.mood !== "watch" && now > st.moodUntil) st.mood = "watch";
      if (now > st.blinkAt) { st.blink = 0.16; st.blinkAt = now + 2400 + Math.random() * 3200; }
      st.blink = Math.max(0, st.blink - dt);
      st.handT = Math.max(0, st.handT - dt);

      // arms
      let moved = 0;
      for (const side of [-1, 1]) {
        const a = st.arms[side];
        let goal, curl;
        if (cfg.mode === "peek") { goal = [side * 24, EDGE_Z - 4.2]; curl = 0.8; }
        else {
          const holding = side === 1;
          goal = holding ? (st.handT > 0 ? [27, 50] : [21, 42 + Math.sin(t * 1.4) * 0.5]) : [side * 20, 37 + Math.sin(t * 1.6) * 0.4];
          curl = holding ? 0.62 : 0.35;
        }
        a.goal = a.goal || goal.slice();
        const e = still.matches ? 1 : 1 - Math.exp(-dt / 0.1);
        const nx = a.goal[0] + (goal[0] - a.goal[0]) * e, nz = a.goal[1] + (goal[1] - a.goal[1]) * e;
        moved += Math.hypot(nx - a.goal[0], nz - a.goal[1]);
        a.goal = [nx, nz];
        a.curl += (curl - a.curl) * (1 - Math.exp(-dt / 0.08));
      }
      const key = [-1, 1].map((sd) => st.arms[sd].goal.map((v) => v.toFixed(1)).join(",") + ":" + st.arms[sd].curl.toFixed(2)).join("|") + ":" + st.rise.toFixed(1) + ":" + st.handT.toFixed(1);
      if (key !== st.armsKey) {
        st.armsKey = key;
        let arms = "", hands = "", card = "";
        for (const side of [-1, 1]) {
          // in the peek pose the hands stay on the edge while the body rises and sinks behind the tiles
          const ik = solveArm(side, cfg.mode === "peek" ? [st.arms[side].goal[0], st.arms[side].goal[1] + st.rise] : st.arms[side].goal, 0);
          const r = armParts(side, ik, st.arms[side].curl);
          arms += r.arm; hands += r.hand;
          if (cfg.mode === "sit" && side === 1) card = cardSvg(r.grip, st.handT > 0 ? 2 : 0);
        }
        armsEl.innerHTML = arms;
        // while he's ducked behind the tiles his hands go with him; on the edge they sit in front
        if (cfg.mode === "peek") { if (st.rise > 10) { armsEl.innerHTML = arms + hands; handsEl.innerHTML = ""; } else { handsEl.innerHTML = hands; handsEl.setAttribute("transform", "translate(0 " + (st.rise * SCALE).toFixed(2) + ")"); } }
        else { handsEl.innerHTML = hands; if (cardEl) cardEl.innerHTML = card; }
      }

      // gears and collar turn with what he does
      st.motor += Math.abs(st.yaw - before) / Math.max(dt, 1e-3) * 0.9 + moved * 0.35 + Math.abs(st.riseV) * 0.02;
      st.motor *= Math.exp(-dt / 0.35);
      const omega = 0.35 + Math.min(st.motor, 22);
      if (!still.matches) { st.gearA += omega * dt; st.gearB -= omega * dt * (GEAR_A.teeth / GEAR_B.teeth); }
      const cA = Wp(GEAR_A.lx, GEAR_A.ly, 0), cB = Wp(GEAR_B.lx, GEAR_B.ly, 0), cN = Wp(0, -1, 0);
      if (teethEl) teethEl.innerHTML = '<path class="rb-teeth" d="' + ribs(K, P, cA[0], cA[1], GEAR_A.r, GEAR_A.z0 + 0.3, GEAR_A.z0 + GEAR_A.h - 0.3, GEAR_A.teeth, st.gearA) + ribs(K, P, cB[0], cB[1], GEAR_B.r, GEAR_B.z0 + 0.3, GEAR_B.z0 + GEAR_B.h - 0.3, GEAR_B.teeth, st.gearB) + '"/>';
      if (collarEl) collarEl.innerHTML = '<path class="rb-teeth" d="' + ribs(K, P, cN[0], cN[1], 4.8, NECK_Z + 3.6, NECK_Z + 5.2, 22, st.yaw * 2.2) + '"/>';

      let bm;
      if (now < st.until) bm = text(st.text);
      else if (st.glyph) bm = st.glyph.startsWith("icon:") ? icon(st.glyph.slice(5)) : text(st.glyph);
      else if (st.mood === "boop") bm = face("boop", 0, 0, t);
      else if (cfg.mode === "sit" && st.handT <= 0 && st.attend) bm = text("@");
      else bm = face(st.blink > 0 ? "blink" : (st.attend ? "focus" : "open"), Math.round(st.lu), Math.round(st.lv), t);
      drawHead(bm);
    },
  };
  return view;
}

/* ---- wire the page ---- */
function placePeek() {
  const fig = document.querySelector(".peek"), wrap = document.querySelector(".grid-wrap"), tile = document.querySelector(".tile");
  const tileTop = tile.getBoundingClientRect().top - wrap.getBoundingClientRect().top;
  fig.style.top = (tileTop - fig.getBoundingClientRect().height * ${PEEK_EDGE}) + "px";
}
placePeek(); addEventListener("resize", placePeek); document.fonts && document.fonts.ready.then(placePeek);
const views = [];
const heroScreen = makeScreen(document.querySelector("[data-screen]"));
const peek = makeRobot({ mode: "peek", back: document.querySelector(".peek-back"), front: document.querySelector(".peek-front") });
const sit = makeRobot({ mode: "sit", back: document.querySelector(".sit-svg") });
views.push(heroScreen, peek, sit);
// only what's on screen animates; the robots make their entrance the first time they're seen
const io = new IntersectionObserver((es) => es.forEach((e) => {
  const v = e.target === heroScreen.el ? heroScreen : e.target.closest(".peek") ? peek : sit;
  v.visible = e.isIntersecting;
  if (e.isIntersecting && e.intersectionRatio > 0.35 && v.enter) v.enter();
}), { threshold: [0, 0.35, 0.6] });
io.observe(heroScreen.el); io.observe(document.querySelector(".peek")); io.observe(document.querySelector(".sit"));
(function loop(now) { views.forEach((v) => { if (v.visible) v.tick(now); }); requestAnimationFrame(loop); })(performance.now());

// hero links -> a glyph on the screen
const glyphs = { "Email": "@", "Résumé": "CV", "LinkedIn": "IN", "GitHub": "</>", "X": "X" };
document.querySelectorAll(".links a").forEach((a) => {
  const g = glyphs[a.textContent.trim()]; if (!g) return;
  const on = () => heroScreen.glyph(g), off = () => heroScreen.glyph(null);
  a.addEventListener("pointerenter", on); a.addEventListener("pointerleave", off); a.addEventListener("focus", on); a.addEventListener("blur", off);
});
// tiles -> he looks at the one you hover, with its icon on his screen
const icons = ["icon:cursor", "icon:mail", "GIF", "icon:pin"];
document.querySelectorAll(".tile").forEach((t, i) => {
  t.addEventListener("pointerenter", () => peek.look(t, icons[i]));
  t.addEventListener("pointerleave", () => peek.unlook());
});
document.querySelector(".peek-hit").addEventListener("click", () => peek.boop());
// the sit pose: click him to boop, click the card for the email
document.querySelector(".sit-hit").addEventListener("click", () => sit.boop());
const card = document.querySelector(".card-hit");
card.addEventListener("pointerenter", () => sit.look(card, null));
card.addEventListener("pointerleave", () => sit.unlook());
card.addEventListener("click", async () => {
  sit.handOver();
  try { await navigator.clipboard.writeText("cmvinayak04@gmail.com"); } catch (e) {}
  const toast = document.querySelector(".toast"); toast.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove("on"), 1800);
});
`;

/* ---------- the page ---------- */
const PROJECTS = [
  { name: "Lumen", kind: "macOS app", img: "https://framerusercontent.com/images/aUVtv2Dtzy0nQ4kEboewGTTaNE.png?scale-down-to=1024", cls: "wide", aria: "Lumen, a smart cursor for your Mac" },
  { name: "Postcard", kind: "Web app", img: "https://framerusercontent.com/images/0uFMfa75FsAVfxLUSMJOv3NJbQ.png?scale-down-to=1024", cls: "phone", aria: "Postcard, postcards for the digital age" },
  { name: "Smart GIF", kind: "Web app", img: "https://framerusercontent.com/images/MoSK8FqWgPk2WVCwTZZ5ging.png", cls: "phone", aria: "Smart GIF, GIF search by meaning" },
  { name: "Atlas", kind: "Web app", img: "https://framerusercontent.com/images/8ZBUSHIzo2gr9yutUU8ap3DkhFE.png", cls: "phone", aria: "Atlas, AI place exploration for Google Maps" },
];
const v12 = readFileSync(join(HERE, "../v12/index.html"), "utf8");
const caseScript = /<script>\n\(\(\) => \{\n  const cases = [\s\S]*?<\/script>/.exec(v12)[0];
const v12css = /<style>([\s\S]*?)<\/style>/.exec(v12)[1];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vinayak CM</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono&display=swap" rel="stylesheet">
<style>
${v12css.replace('.grid:has(.tile:hover) .tile:not(:hover) { opacity: .55; }', '.grid:has(.tile:hover) .tile:not(:hover) img { opacity: .4; }')}
${k.ISO_CSS}
${tokens}
  /* ---------- 1. hero: the viewport is the intro, with his screen where the avatar was ---------- */
  .intro { min-height: 100svh; display: grid; align-content: center; padding: 64px 0; position: relative; }
  .screen { width: 112px; margin-bottom: 26px; }
  .screen svg { display: block; width: 100%; height: auto; }
  .screen .sc-bezel { fill: #121213; stroke: #000; }
  .screen .sc-off { fill: #262629; }
  .screen .sc-on { fill: #FFFFFF; }
  .screen .sc-glow { fill: #FFFFFF; opacity: .55; filter: url(#sc-glow); }
  .cue { position: absolute; left: 0; right: 0; bottom: 24px; text-align: center; font-size: 13px; color: var(--gray); }

  /* ---------- 2. work: he peeks over the grid; tiles sit between his body and his hands ---------- */
  .work { margin-top: 140px; }
  .grid-wrap { position: relative; }
  /* no transform here: the two layers must stack around the grid, not inside their own context */
  .peek { position: absolute; left: calc(50% - 100px); width: 200px; height: calc(200px * ${(VB_PEEK[3] / VB_PEEK[2]).toFixed(4)}); pointer-events: none; }
  .peek svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .peek-back { z-index: 0; } .peek-front { z-index: 2; }
  .peek-hit { position: absolute; left: 22%; right: 22%; top: 0; height: ${(PEEK_EDGE * 100).toFixed(1)}%; pointer-events: auto; cursor: pointer; z-index: 3; }
  .grid { position: relative; z-index: 1; background: var(--canvas); }   /* the gutters hide him too */
  .tile { z-index: 1; }

  /* ---------- 3. about ---------- */
  .about { margin-top: 160px; }
  .about .head { font-size: 13px; color: var(--gray); margin-bottom: 18px; }
  .bio { display: grid; grid-template-columns: 56px 1fr; gap: 18px; align-items: start; }
  .bio img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; }
  .bio p + p { margin-top: 12px; }
  .hire { position: relative; margin-top: 210px; background: var(--paper); padding: 22px 24px 24px; }
  .hire h3 { font-weight: 500; font-size: 16px; margin-bottom: 6px; }
  .hire p { color: #4a4a4a; max-width: 34ch; }
  .hire .go { display: flex; gap: 18px; margin-top: 18px; font-size: 14px; }
  .hire .go a { border-bottom: 1px solid var(--rule); padding-bottom: 1px; transition: border-color .2s; }
  .hire .go a:hover { border-color: var(--ink); }
  .sit { position: absolute; right: 14px; width: 210px; height: calc(210px * ${(VB_SIT[3] / VB_SIT[2]).toFixed(4)}); top: calc(-210px * ${(VB_SIT[3] / VB_SIT[2]).toFixed(4)} * ${SIT_SEAT}); pointer-events: none; }
  .sit svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .sit-hit { position: absolute; left: 25%; right: 25%; top: 0; height: 55%; pointer-events: auto; cursor: pointer; }
  .card-hit { position: absolute; left: 62%; top: 45%; width: 36%; height: 20%; pointer-events: auto; cursor: pointer; border-radius: 4px; }
  .tidbits { margin-top: 64px; }
  .tidbits h4 { font-weight: 400; font-size: 13px; color: var(--gray); margin-bottom: 10px; }
  .tidbits ul { list-style: none; border-top: 1px solid var(--rule); }
  .tidbits li { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--rule); font-size: 15px; }
  .tidbits li span:last-child { color: var(--gray); text-align: right; }
  .toast { position: fixed; left: 50%; bottom: 28px; translate: -50% 12px; opacity: 0; background: var(--ink); color: #fff; font-size: 13px; padding: 8px 14px; border-radius: 999px; transition: opacity .2s, translate .3s var(--out); pointer-events: none; z-index: 60; }
  .toast.on { opacity: 1; translate: -50% 0; }

  @media (max-width: 560px) {
    .peek { width: 170px; left: calc(50% - 85px); height: calc(170px * ${(VB_PEEK[3] / VB_PEEK[2]).toFixed(4)}); }
    .sit { width: 180px; right: 6px; height: calc(180px * ${(VB_SIT[3] / VB_SIT[2]).toFixed(4)}); top: calc(-180px * ${(VB_SIT[3] / VB_SIT[2]).toFixed(4)} * ${SIT_SEAT}); }
    .hire p { max-width: 22ch; }
  }
</style>
</head>
<body>

<section class="intro">
  <div class="col">
    <div class="screen" data-screen role="img" aria-label="A small dot-matrix screen. It waves, shows the time in Bangalore, and reacts to the links."></div>
    <p class="who">Vinayak CM<br><span class="gray">Design &amp; AI Engineer, Bangalore</span></p>
    <p>I build AI stuff for problems that are just annoying enough for everyone to complain about, but not annoying enough for anyone else to fix.</p>
    <p>I recently finished my degree in AI, and now spend most of my time turning "wouldn't it be cool if..." ideas into actual products. I also care way too much about design, because ugly interfaces deserve consequences.</p>
    <div class="links"><a href="mailto:cmvinayak04@gmail.com">Email</a><a href="#">Résumé</a><a href="#">LinkedIn</a><a href="#">GitHub</a><a href="#">X</a></div>
  </div>
  <p class="cue">Work ↓</p>
</section>

<section class="work col" id="work" aria-label="Selected work">
  <div class="grid-wrap">
    <figure class="peek rb iso" data-theme="light">${PEEK_BACK}${PEEK_FRONT}<span class="peek-hit" aria-label="Boop the robot" role="button"></span></figure>
    <div class="grid" id="grid">
      ${PROJECTS.map((p, i) => `<article class="item">
        <div class="label"><span class="name">${p.name}</span><span class="kind">${p.kind}</span></div>
        <a class="tile" href="#${p.name.toLowerCase().replace(/ /g, "-")}" data-i="${i}" aria-label="${p.aria}"><img class="${p.cls}" src="${p.img}" alt=""></a>
      </article>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="about col" id="about">
  <p class="head">About</p>
  <div class="bio">
    <img src="https://framerusercontent.com/images/KRXUYzmUAll77gxez5x80aQ06bg.jpeg?scale-down-to=256" alt="Vinayak">
    <div>
      <p>I grew up in Kerala, studied Artificial Intelligence at Jain University in Bangalore, and stayed for the products. I like the part of the job where an idea becomes something you can actually click.</p>
      <p class="gray">Placeholder: one more line about how you work, or what you're looking for next.</p>
    </div>
  </div>

  <div class="hire">
    <figure class="sit rb iso" data-theme="light">${SIT_SVG}<span class="sit-hit" aria-label="Boop the robot" role="button"></span><span class="card-hit" role="button" aria-label="Copy my email address"></span></figure>
    <h3>Work with me</h3>
    <p>Open to full-time roles and the occasional project. If something's annoying enough, I'd like to hear about it.</p>
    <div class="go"><a href="mailto:cmvinayak04@gmail.com">cmvinayak04@gmail.com</a><a href="#">Résumé</a></div>
  </div>

  <div class="tidbits">
    <h4>Tidbits</h4>
    <ul>
      <li><span>Studied</span><span>B.Sc. AI, Jain University, 2021–25</span></li>
      <li><span>Grew up in</span><span>Kerala</span></li>
      <li><span>Builds with</span><span>Xcode, Cursor, Figma, Framer</span></li>
      <li><span>Believes</span><span>Ugly interfaces deserve consequences</span></li>
      <li><span>Placeholder</span><span>Something you're oddly into</span></li>
    </ul>
  </div>
</section>

<footer>
  <div class="col">
    <div class="row"><span>© 2026 Vinayak CM</span><span>Made in Bangalore</span></div>
  </div>
</footer>
<div class="toast" role="status">Email copied</div>

${caseScript}
<script type="module">${(kitScript() + live).replace(/<\/(script)/gi, "<\\/$1")}</script>
</body>
</html>`;
writeFileSync(join(HERE, "index.html"), html);
console.log("wrote index.html", (html.length / 1024).toFixed(0) + " KB", { VB_PEEK, PEEK_EDGE, VB_SIT, SIT_SEAT });
