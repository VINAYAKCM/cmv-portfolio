// VCM-02: a helmeted robot with a dot-matrix face and a see-through mechanical body.
// The head turns to follow your cursor (rebuilt live); the LED screen shows faces and short words.
// Hover: grin and wave. Click: boop (escalating). Spin the cursor round him: dizzy. Idle: sleeps.
// Leave the window: "BYE?". Come back: "OH HI".
//
//   node mockups/v10/robot/build.mjs   -> writes robot.html next to this file
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "../../../.claude/skills/anatomy");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const G = await import(join(SKILL, "kit/lathe.mjs"));
const T = await import(join(SKILL, "kit/tube.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));
// the round-parts library, wrapped so it can run in the page beside the kit
const latheSrc = readFileSync(join(SKILL, "kit/lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const LATHE_IN_PAGE = `const G = (() => {\n${latheSrc}\nreturn { frameAlong, frameOf, pointOf, disc, solidOf, sphereOf, arcOf, prismOf };\n})();`;

/* ---------- proportions ---------- */
const W = 440, H = 560;
const PLINTH_R = 34, PLINTH_H = 7;
const HIP_Z = 34, WAIST_Z = 38, CHEST_Z0 = 41, CHEST_Z1 = 62;
const SHOULDER_Z = 58, SHOULDER_X = 17.5;
const NECK_Z = 62, HEAD_Z = 68, HEAD_H = 27, CROWN_H = 4;
const HEAD = { w: 44, d: 40, r: 16 }, CROWN = { w: 39, d: 35, r: 13.5 };
const SCREEN = { w: 32, h: 19, r: 6.5, cz: HEAD_Z + 13.5 };
const COLS = 30, ROWS = 16;
const UPPER = 11, FORE = 10;

const P = k.fitProjection(
  [[-PLINTH_R, -PLINTH_R, -PLINTH_H], [PLINTH_R, PLINTH_R, -PLINTH_H], [-PLINTH_R, PLINTH_R, 0], [PLINTH_R, -PLINTH_R, 0],
   [-26, -26, HEAD_Z + HEAD_H + CROWN_H + 8], [26, 26, HEAD_Z + HEAD_H + CROWN_H + 8], [26, -26, HEAD_Z + HEAD_H + 6], [-26, 26, HEAD_Z + HEAD_H + 6],
   [44, 0, 84], [-44, 0, 84], [0, 44, 84], [0, -44, 84]],
  W, H, { pad: 18, azimuth: 36 },
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
const HELPERS = [axes, turnedRing, roundRectPts, facePath].map((f) => f.toString()).join("\n") + `\nconst facePoint = ${facePoint.toString()};`;

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const at = (p) => k.iso(p, P);
const depth = (p) => k.depthOf(p, P);
const AX = axes(k, P, YAW0);
const Wp = (lx, ly, z) => [AX.r[0] * lx + AX.f[0] * ly, AX.r[1] * lx + AX.f[1] * ly, z];   // body-local point
const OR = (svg) => `<g class="rb-or">${svg}</g>`;
const DK = (svg) => `<g class="rb-dk">${svg}</g>`;
const up = [0, 0, 1];
const turned = (plan, lx, ly, steps = 5) => turnedRing(k, plan, Wp(lx, ly, 0), AX, steps);

/* ---------- plinth ---------- */
function plinth() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -PLINTH_R, y: -PLINTH_R, w: PLINTH_R * 2, d: PLINTH_R * 2, r: PLINTH_R }, -PLINTH_H, PLINTH_H, P)}"/>`];
  out.push(S(k.cylinder(0, 0, PLINTH_R, -PLINTH_H, PLINTH_H, P, 96, 1.2), { tone: "mid" }));
  out.push(L(k.ring(0, 0, PLINTH_R - 4, 0, P, 80), { tone: "lo" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + 0.2; return at([Math.cos(a) * (PLINTH_R - 2), Math.sin(a) * (PLINTH_R - 2), 0]); }), { size: 0.45 }));
  return out.join("");
}

/* ---------- legs: boot, ankle ball, shin shell, knee, thigh shell, hip ball, a piston on the outside ---------- */
function leg(side) {
  const lx = side * 8.5, out = [];
  out.push(DK(S(k.extrude(turned({ w: 11, d: 19, r: 4.5 }, lx, 2.5), 0, 1.6, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" })));
  out.push(OR(S(k.extrude(turned({ w: 10.4, d: 17, r: 4.2 }, lx, 2.6), 1.6, 5.4, P, { bevel: 0.6 }), { tone: "hi", crease: "lo" })));
  out.push(DK(S(G.sphereOf(Wp(lx, 0, 8.6), 3, P, { steps: 36 }), { tone: "hi" })));
  const Fs = G.frameAlong(Wp(lx, 0, 10), up);
  out.push(OR(S(G.solidOf([[0, 0], [0, 3.6], [1, 4.4, 1], [9.5, 4.9, 1], [10.5, 4.4]], Fs, P, { steps: 40, smooth: { rows: 3 } }), { tone: "hi", crease: "lo", inner: L(G.arcOf(Fs, 5, 4.75, P), { tone: "lo" }) })));
  const Fk = G.frameAlong(Wp(lx - 3.4, 0, 21.4), AX.r);
  out.push(DK(S(G.disc(0, 6.8, 3.4, Fk, P, { steps: 28 }), { tone: "hi", crease: "lo" })));
  const Ft = G.frameAlong(Wp(lx, 0, 22.6), up);
  out.push(OR(S(G.solidOf([[0, 0], [0, 4.2], [1, 4.8, 1], [9, 5.3, 1], [10, 4.6]], Ft, P, { steps: 40, smooth: { rows: 3 } }), { tone: "hi", crease: "lo" })));
  // piston down the outside of the leg: a cylinder body on the thigh and a rod into the shin
  const px = lx + side * 5.6;
  out.push(DK(S(k.cylinder(...Wp(px, -1, 0).slice(0, 2), 1.15, 13, 9, P, 14), { tone: "hi", crease: "none" })));
  out.push(DK(S(k.cylinder(...Wp(px, -1, 0).slice(0, 2), 1.7, 22, 8, P, 16), { tone: "hi", crease: "lo" })));
  out.push(D([at(Wp(px, -1, 13)), at(Wp(px, -1, 30))], { size: 0.5, tone: "mid" }));
  out.push(DK(S(G.sphereOf(Wp(lx, 0, HIP_Z - 1.4), 3.6, P, { steps: 36 }), { tone: "hi" })));
  return out.join("");
}

/* ---------- torso: an open frame you can see into ---------- */
function pelvis() {
  const out = [];
  out.push(DK(S(k.extrude(turned({ w: 24, d: 14, r: 4 }, 0, -0.5), HIP_Z - 1, 4.4, P, { bevel: 0.5 }), { tone: "hi", crease: "lo" })));
  // waist ring with knurled teeth
  const Fw = G.frameAlong(Wp(0, -1, WAIST_Z - 0.6), up);
  out.push(DK(S(G.disc(0, 3.6, 7, Fw, P, { steps: 48 }), { tone: "hi", crease: "lo" })));
  return out.join("");
}
function torsoBack() {
  const out = [];
  out.push(`<g class="rb-cavity">${S(k.extrude(turned({ w: 27, d: 3, r: 1.2 }, 0, -8.6), CHEST_Z0 + 1, CHEST_Z1 - CHEST_Z0 - 4, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" })}</g>`);
  out.push(`<g class="rb-cavity">${S(k.extrude(turned({ w: 29, d: 18, r: 4 }, 0, -1), CHEST_Z0, 2, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" })}</g>`);
  return out.join("");
}
function sidePlate(side) {
  return OR(S(k.extrude(turned({ w: 2.4, d: 17, r: 1 }, side * 13.6, -1.2), CHEST_Z0 + 2, 13, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" }));
}
function internals() {
  const out = [];
  // spine
  out.push(DK(S(k.cylinder(...Wp(0, -5.2, 0).slice(0, 2), 2.2, CHEST_Z0 + 2, CHEST_Z1 - CHEST_Z0 - 2, P, 18), { tone: "hi", crease: "none" })));
  out.push(DK(L([47, 51, 55].map((z) => k.sideArc(...Wp(0, -5.2, 0).slice(0, 2), 2.2, z, P, 14)).join(""), { tone: "lo" })));
  // the core: a geared drum on a hub, with a status light
  const c = Wp(0, 0.5, 0);
  out.push(DK(S(k.cylinder(c[0], c[1], 6.6, 45, 3.6, P, 56), { tone: "hi", crease: "lo" })));
  out.push(DK(L(k.knurl(c[0], c[1], 6.6, 45.2, 48.4, 40, P, 0.3), { tone: "lo" })));
  out.push(DK(S(k.cylinder(c[0], c[1], 4.2, 48.6, 3, P, 40), { tone: "hi", crease: "lo" })));
  out.push(`<circle class="rb-core" cx="${at([c[0], c[1], 51.6])[0].toFixed(2)}" cy="${at([c[0], c[1], 51.6])[1].toFixed(2)}" r="${(1.4 * k.screenRise(1, P) * 1.15).toFixed(2)}"/>`);
  // two cables from the core up to the shoulders
  for (const side of [-1, 1]) {
    const route = G.fillet([Wp(side * 4.5, 0.5, 47), Wp(side * 9, 0.5, 49), Wp(side * 10.5, 0, 55), Wp(side * 14.6, 0, SHOULDER_Z - 0.6)], 3, 7);
    T.tubePieces(route, 0.9, P, { maxLength: 40 }).forEach((piece) => out.push(DK(T.tubeSvg(piece, { tone: "hi" }))));
  }
  return out.join("");
}
function chestPlate() {
  const out = [];
  out.push(OR(S(k.extrude(turned({ w: 31, d: 19, r: 5.5 }, 0, -0.6, 6), 55.5, CHEST_Z1 - 55.5, P, { bevel: 0.9 }), { tone: "hi", crease: "lo" })));
  // a vent of slots on the chest, closed outlines
  for (let i = 0; i < 3; i++) out.push(L(facePath(k, P, Wp(0, 8.92, 0), AX.r, roundRectPts(-7 + i * 3.4, 59.2, 1.6, 3.6, 0.8, 2), true), { tone: "lo" }));
  return out.join("");
}
function neck() {
  const out = [];
  const c = Wp(0, -1, 0);
  out.push(DK(S(k.cylinder(c[0], c[1], 6, NECK_Z, 1.8, P, 36, 0.3), { tone: "hi", crease: "lo" })));
  out.push(DK(S(k.cylinder(c[0], c[1], 3.4, NECK_Z + 1.8, 2, P, 24), { tone: "hi", crease: "none" })));
  out.push(DK(S(k.cylinder(c[0], c[1], 4.6, NECK_Z + 3.8, 1.2, P, 30), { tone: "hi", crease: "lo" })));
  out.push(DK(S(k.cylinder(c[0], c[1], 3.4, NECK_Z + 5, HEAD_Z - NECK_Z - 5, P, 24), { tone: "hi", crease: "none" })));
  return out.join("");
}

/* ---------- arms: ball shoulder, upper shell, elbow, forearm shell, wrist, a three-fingered hand ---------- */
const norm = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const add = (a, b) => a.map((v, i) => v + b[i]);
const mul = (a, s) => a.map((v) => v * s);
function arm(side, raise, elbow) {
  const out3 = [AX.r[0] * side, AX.r[1] * side, 0];
  const sp = Wp(side * SHOULDER_X, -0.5, SHOULDER_Z);
  const dirAt = (deg) => { const a = (deg * Math.PI) / 180; return norm(add(add(mul(out3, Math.sin(a)), mul(up, -Math.cos(a))), mul(AX.f, 0.1))); };
  const u = dirAt(raise), E = add(sp, mul(u, UPPER + 1.6));
  const fdir = dirAt(raise + elbow), Wr = add(E, mul(fdir, FORE + 1));
  const out = [];
  out.push(DK(S(G.sphereOf(sp, 4, P, { steps: 24 }), { tone: "hi" })));
  const Fu = G.frameAlong(add(sp, mul(u, 2.6)), u);
  out.push(OR(S(G.solidOf([[0, 0], [0, 2.6], [0.8, 3.4, 1], [UPPER - 1.4, 3.2, 1], [UPPER - 0.6, 2.5]], Fu, P, { steps: 20, smooth: { rows: 2 } }), { tone: "hi", crease: "lo" })));
  out.push(DK(S(G.sphereOf(E, 2.9, P, { steps: 20 }), { tone: "hi" })));
  const Ff = G.frameAlong(add(E, mul(fdir, 2.2)), fdir);
  out.push(OR(S(G.solidOf([[0, 0], [0, 2.4], [0.8, 3.1, 1], [FORE - 1.6, 3.3, 1], [FORE - 0.8, 2.6]], Ff, P, { steps: 20, smooth: { rows: 2 } }), { tone: "hi", crease: "lo" })));
  out.push(DK(S(G.sphereOf(Wr, 2.1, P, { steps: 16 }), { tone: "hi" })));
  // hand: a palm and three fingers fanned in the arm's plane
  const palm = add(Wr, mul(fdir, 2.2));
  out.push(DK(S(G.sphereOf(palm, 2.5, P, { steps: 18 }), { tone: "hi" })));
  [-28, 0, 28].forEach((spread) => {
    const d = dirAt(raise + elbow + spread * 0.9);
    const Fn = G.frameAlong(add(palm, mul(d, 1.6)), d);
    out.push(DK(S(G.solidOf([[0, 0], [0, 0.8], [2.6, 0.75, 1], [3.4, 0]], Fn, P, { steps: 10 }), { tone: "hi" })));
  });
  return out.join("");
}
const sideRight = at(Wp(1, 0, 0))[0] > at(Wp(-1, 0, 0))[0] ? 1 : -1;
const nearSide = depth(Wp(1, 0, 0)) > depth(Wp(-1, 0, 0)) ? 1 : -1;
// the wave: six poses lifting the arm, then seven wagging the forearm
const WAVE = [
  ...Array.from({ length: 6 }, (_, i) => { const t = i / 5; return [12 + 88 * t, 8 + 62 * t]; }),
  ...Array.from({ length: 7 }, (_, j) => [100, 70 + 26 * Math.sin(((j / 6) * 2 - 1) * Math.PI / 2)]),
];
const waveArm = `<g data-part="wave">${WAVE.map(([r, e], i) => `<g data-wave="${i}"${i ? ' style="display:none"' : ""}>${arm(sideRight, r, e)}</g>`).join("")}</g>`;
const restArm = arm(-sideRight, 12, 8);
const farLeg = leg(-nearSide), nearLeg = leg(nearSide);
const farArm = nearSide === sideRight ? restArm : waveArm;
const nearArm = nearSide === sideRight ? waveArm : restArm;

/* ---------- assemble ---------- */
const defs = `<defs>
  <filter id="rb-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>
  <linearGradient id="rb-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151517"/><stop offset="1" stop-color="#050506"/></linearGradient>
</defs>`;
const svg = k.figureSvg({
  width: W, height: H,
  label: "VCM-02, a small orange robot with a helmet head whose black LED screen shows faces and short words, on a mechanical body with an open chest showing its spine, gear core and cables.",
  body: [defs, plinth(), `<g data-part="root">`, farLeg, nearLeg, pelvis(), farArm, torsoBack(), sidePlate(-nearSide), internals(), sidePlate(nearSide), chestPlate(), neck(), `<g data-part="head"></g>`, nearArm, `</g>`],
});

const tokens = `
.iso[data-theme="light"].rb{--anatomy-card:#F1ECE5;--anatomy-paper:#F1ECE5;--anatomy-top:#FFFDF9;--anatomy-shade-0:#E1D9CE;--anatomy-shade-1:#E8E1D7;--anatomy-shade-2:#EFE9E1;--anatomy-shade-3:#F6F2EC;
  --anatomy-hi:#2A2521;--anatomy-mid:#8E857B;--anatomy-lo:#BEB5AA;--anatomy-faint:#DAD2C7;--anatomy-dot:#4A433C;--anatomy-halo:#5E4B37;--anatomy-halo-opacity:.3}
.rb .rb-or{--anatomy-paper:#E4521C;--anatomy-top:#F2783F;--anatomy-shade-0:#B83C0E;--anatomy-shade-1:#C84411;--anatomy-shade-2:#D64B16;--anatomy-shade-3:#E1531B;--anatomy-hi:#3E1405;--anatomy-mid:#A9390E;--anatomy-lo:#B0400F;--anatomy-faint:#C24B18;--anatomy-dot:#5A1D07}
.rb .rb-dk{--anatomy-paper:#2E2C2B;--anatomy-top:#45423F;--anatomy-shade-0:#1E1D1C;--anatomy-shade-1:#252423;--anatomy-shade-2:#2C2A29;--anatomy-shade-3:#34322F;--anatomy-hi:#0E0D0C;--anatomy-mid:#6A645E;--anatomy-lo:#57524D;--anatomy-faint:#4A4642;--anatomy-dot:#9C958C}
.rb .rb-cavity{--anatomy-paper:#1A1918;--anatomy-top:#262422;--anatomy-shade-0:#121110;--anatomy-shade-1:#161514;--anatomy-shade-2:#1B1A19;--anatomy-shade-3:#201F1D;--anatomy-hi:#0A0909;--anatomy-lo:#3A3734;--anatomy-faint:#33302D}
.rb .tb-body{fill:#2A2827}.rb .tb-shine{fill:#55514C}.rb .tb-shade{fill:#161514}
.rb .rb-brim{fill:#A9380C;stroke:#3E1405;stroke-width:var(--anatomy-weight)}
.rb .rb-screen{fill:url(#rb-screen);stroke:#0A0A0A;stroke-width:var(--anatomy-weight)}
.rb .rb-off{fill:#1E1E21}
.rb .rb-on{fill:#FBF7EF}
.rb .rb-on-glow{fill:#FFFFFF;opacity:.55;filter:url(#rb-glow)}
.rb .rb-glare{fill:#FFFFFF;opacity:.13}
.rb .rb-stripe{fill:#F4EADB;stroke:#3E1405;stroke-width:calc(var(--anatomy-weight) * .6)}
.rb .rb-core{fill:#FF8A3D}
`;

/* ---------- the screen: a 5x7 font and a few faces, drawn on a 30x16 grid ---------- */
const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"], B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"], F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"], I: ["111", "010", "010", "010", "010", "010", "111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"], L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"], P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"], T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"], Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"], "!": ["1", "1", "1", "1", "1", "0", "1"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"], ".": ["0", "0", "0", "0", "0", "0", "1"], " ": ["00", "00", "00", "00", "00", "00", "00"],
};

const live = `
const P = ${JSON.stringify(P)};
const K = { iso, ringOf, towardViewer };
${LATHE_IN_PAGE}
${HELPERS}
const YAW0 = ${YAW0}, HEAD = ${JSON.stringify(HEAD)}, CROWN = ${JSON.stringify(CROWN)}, HEAD_Z = ${HEAD_Z}, HEAD_H = ${HEAD_H}, CROWN_H = ${CROWN_H};
const SCREEN = ${JSON.stringify(SCREEN)}, COLS = ${COLS}, ROWS = ${ROWS}, WAVE_N = ${WAVE.length};
const FONT = ${JSON.stringify(FONT)};
const fig = document.querySelector("[data-robot]");
const svg = fig.querySelector("svg");
const root = svg.querySelector('[data-part="root"]'), headEl = svg.querySelector('[data-part="head"]');
const waves = [...svg.querySelectorAll("[data-wave]")];
const readout = fig.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const SCALE = (() => { const a = iso([0,0,0], P), b = iso([1,0,0], P); return Math.hypot(b[0]-a[0], b[1]-a[1]); })();
const TURN = (() => { const o = iso([0,0,0], P)[0]; const a = axes(K, P, YAW0), b = axes(K, P, YAW0 + 0.05); return iso(b.f, P)[0] - o > iso(a.f, P)[0] - o ? 1 : -1; })();

/* ---- bitmaps ---- */
const blank = () => Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
const put = (b, x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < COLS && y >= 0 && y < ROWS) b[y][x] = 1; };
const disc = (b, cx, cy, r) => { for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) if (x * x + y * y <= r * r + r * 0.6) put(b, cx + x, cy + y); };
const ringB = (b, cx, cy, r) => { for (let a = 0; a < 64; a++) put(b, cx + Math.cos(a / 64 * Math.PI * 2) * r, cy + Math.sin(a / 64 * Math.PI * 2) * r); };
const line = (b, x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1; for (let i = 0; i <= n; i++) put(b, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); };
const rect = (b, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(b, x, y); };
function text(str) {
  const b = blank();
  const glyphs = [...str].map((c) => FONT[c] || FONT[" "]);
  const w = glyphs.reduce((t, g) => t + g[0].length + 1, -1);
  let x = Math.floor((COLS - w) / 2);
  const y = Math.floor((ROWS - 7) / 2);
  glyphs.forEach((g) => { g.forEach((row, j) => [...row].forEach((c, i) => { if (c === "1") put(b, x + i, y + j); })); x += g[0].length + 1; });
  return b;
}
function face(kind, lx, ly, t) {
  const b = blank();
  const ex = [9 + lx, 20 + lx], ey = 6 + ly;
  if (kind === "open" || kind === "surprised") { const r = kind === "surprised" ? 3 : 2; ex.forEach((x) => disc(b, x, ey, r)); }
  if (kind === "open") { line(b, 13 + lx, 11 + ly, 14.5 + lx, 12.5 + ly); line(b, 14.5 + lx, 12.5 + ly, 16 + lx, 11 + ly); }
  if (kind === "surprised") ringB(b, 14.5 + lx * 0.5, 12 + ly * 0.4, 1.6);
  if (kind === "blink") ex.forEach((x) => line(b, x - 2, ey, x + 2, ey));
  if (kind === "happy") { ex.forEach((x) => { line(b, x - 3, ey + 1, x, ey - 2); line(b, x, ey - 2, x + 3, ey + 1); }); rect(b, 9, 10, 20, 12); put(b, 8, 10); put(b, 21, 10); }
  if (kind === "boop") { [[9, 1], [20, -1]].forEach(([x, s]) => { line(b, x - 2 * s, ey - 2, x + 1 * s, ey); line(b, x + 1 * s, ey, x - 2 * s, ey + 2); }); line(b, 12, 12, 17, 12); }
  if (kind === "angry") { ex.forEach((x, i) => { disc(b, x, ey + 1, 2); line(b, x - 3, i ? ey - 3 : ey - 1, x + 3, i ? ey - 1 : ey - 3); }); rect(b, 11, 12, 18, 12); }
  if (kind === "skeptic") { ex.forEach((x) => { line(b, x - 3, ey, x + 3, ey); line(b, x - 2, ey + 1, x + 2, ey + 1); }); disc(b, 14.5, 11.5, 1); }
  if (kind === "sleep") { ex.forEach((x) => { line(b, x - 3, ey + 1, x - 1, ey + 2); line(b, x - 1, ey + 2, x + 1, ey + 2); line(b, x + 1, ey + 2, x + 3, ey + 1); }); }
  if (kind === "dizzy") { ex.forEach((x, i) => { for (let a = 0; a < 40; a++) { const ang = a * 0.45 + t * 8 * (i ? 1 : -1), r = 0.3 + a * 0.08; put(b, x + Math.cos(ang) * r, ey + Math.sin(ang) * r); } }); line(b, 11, 12, 13, 11); line(b, 13, 11, 15, 12); line(b, 15, 12, 17, 11); }
  return b;
}

/* ---- state ---- */
let px = innerWidth / 2, py = innerHeight / 3, lastMove = performance.now(), last = 0;
let yaw = YAW0, yawV = 0, lookU = 0, lookV = 0;
let mood = "boot", moodUntil = performance.now() + 1400, blinkAt = performance.now() + 2600, blinkT = 0;
let wave = 0, waveOn = false, near = false, nearSince = 0, greeted = false;
let jump = 0, jumpV = 0, squash = 0, boops = 0, spin = 0, lastAng = null, woke = 0, away = false;
let screenText = "HI!", textUntil = performance.now() + 1400;
const BOOPS = [["face", "boop", "Boop."], ["text", "BOOP", "BOOP."], ["text", "HEHE", "Hehe."], ["text", "LOL", "Lol."], ["face", "angry", "Hey."], ["text", "STOP", "Please stop."], ["text", "WTF", "Seriously?"], ["text", "OK.", "I'm telling Vinayak."]];

function headScreenCentre() { const b = svg.getBoundingClientRect(), s = b.width / ${W}; const c = iso([0, 0, HEAD_Z + HEAD_H / 2], P); return [b.left + c[0] * s, b.top + c[1] * s, s]; }
function setMood(m, ms) { mood = m; moodUntil = performance.now() + ms; }
function show(t, ms) { screenText = t; textUntil = performance.now() + ms; }
let sayUntil = 0;
function say(t, ms = 1600) { readout.textContent = t; sayUntil = performance.now() + ms; }

addEventListener("pointermove", (e) => {
  if (mood === "sleep") woke = performance.now();
  if (away) { away = false; show("OH HI", 1100); say("Oh, hi again.", 1600); }
  px = e.clientX; py = e.clientY; lastMove = performance.now();
  const [hx, hy] = headScreenCentre();
  const ang = Math.atan2(py - hy, px - hx), dist = Math.hypot(px - hx, py - hy);
  if (lastAng !== null && dist > 30 && dist < 600) { let d = ang - lastAng; d = Math.atan2(Math.sin(d), Math.cos(d)); spin += Math.abs(d); }
  lastAng = ang;
});
document.documentElement.addEventListener("pointerleave", () => { if (mood !== "sleep") { away = true; show("BYE?", 1e9); say("Bye?", 1e9); } });
svg.addEventListener("pointerdown", (e) => { e.preventDefault(); boop(); });
fig.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); boop(); } });
function boop() {
  lastMove = performance.now();
  const [kind, what, line] = BOOPS[Math.min(boops++, BOOPS.length - 1)];
  // only hop from the ground; a boop mid-air just jolts him
  if (!still.matches) { if (jump <= 0.5) { jumpV = 120; squash = 0.1; } else { jumpV = Math.max(jumpV, 20); } }
  if (kind === "text") { show(what, 900); setMood("boop", 900); } else { textUntil = 0; setMood(what, 900); }
  say(line, 1800);
}

/* ---- drawing the head ---- */
function drawHead(t, bitmap) {
  const ax = axes(K, P, yaw);
  const tv = towardViewer(P);
  const nearEar = (ax.r[0] * tv[0] + ax.r[1] * tv[1]) > 0 ? 1 : -1;
  const ear = (s) => {
    const c = [ax.r[0] * s * (HEAD.w / 2 - 1.2), ax.r[1] * s * (HEAD.w / 2 - 1.2), HEAD_Z + 13];
    const F = G.frameAlong(c, [ax.r[0] * s, ax.r[1] * s, 0]);
    let o = '<g class="rb-dk">' + solidSvg(G.disc(0, 4.2, 7.4, F, P, { steps: 40 }), { tone: "hi", crease: "lo" });
    o += solidSvg(G.disc(4.2, 5.6, 4.8, F, P, { steps: 32 }), { tone: "hi", crease: "lo" }) + "</g>";
    // a small fin on top of each ear
    o += '<g class="rb-or">' + solidSvg(extrude(turnedRing(K, { w: 1.6, d: 7, r: 0.7 }, [c[0] + ax.r[0] * s * 3 - ax.f[0] * 1.5, c[1] + ax.r[1] * s * 3 - ax.f[1] * 1.5], ax, 2), HEAD_Z + 19, 8, P), { tone: "hi", crease: "lo" }) + "</g>";
    return o;
  };
  let out = ear(-nearEar);
  // helmet shell and crown, with the racing stripe across the crown
  out += '<g class="rb-or">' + solidSvg(extrude(turnedRing(K, HEAD, [0, 0], ax, 8), HEAD_Z, HEAD_H, P, { bevel: 1.4 }), { tone: "hi", crease: "lo" });
  out += solidSvg(extrude(turnedRing(K, CROWN, [-ax.f[0] * 1.2, -ax.f[1] * 1.2], ax, 8), HEAD_Z + HEAD_H, CROWN_H, P, { bevel: 1 }), { tone: "hi", crease: "lo" }) + "</g>";
  const zt = HEAD_Z + HEAD_H + CROWN_H + 0.02;
  const stripe = [[-3.4, -16], [3.4, -16], [3.4, 15.2], [-3.4, 15.2]].map(([u, v]) => iso([ax.r[0] * u + ax.f[0] * (v - 1.2), ax.r[1] * u + ax.f[1] * (v - 1.2), zt], P));
  out += '<path class="rb-stripe" d="M' + stripe.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L") + 'Z"/>';
  // the brim around the screen, then the screen
  const o = [ax.f[0] * (HEAD.d / 2 + 0.06), ax.f[1] * (HEAD.d / 2 + 0.06), 0];
  out += '<path class="rb-brim" d="' + facePath(K, P, o, ax.r, roundRectPts(0, SCREEN.cz, SCREEN.w + 5, SCREEN.h + 5, SCREEN.r + 2.5, 6), true) + '"/>';
  out += '<path class="rb-screen" d="' + facePath(K, P, o, ax.r, roundRectPts(0, SCREEN.cz, SCREEN.w, SCREEN.h, SCREEN.r, 6), true) + '"/>';
  // LED matrix: every dot is a tiny square in the screen plane
  const pitchU = (SCREEN.w - 4) / COLS, pitchV = (SCREEN.h - 3) / ROWS, dot = 0.36;
  let off = "", on = "";
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const u = -SCREEN.w / 2 + 2 + (x + 0.5) * pitchU, v = SCREEN.cz + SCREEN.h / 2 - 1.5 - (y + 0.5) * pitchV;
    const lit = bitmap[y][x];
    const hw = lit ? pitchU * 0.46 : pitchU * dot * 0.5, hh = lit ? pitchV * 0.46 : pitchV * dot * 0.5;
    const d = facePath(K, P, o, ax.r, [[u - hw, v - hh], [u + hw, v - hh], [u + hw, v + hh], [u - hw, v + hh]], true);
    if (lit) on += d; else off += d;
  }
  out += '<path class="rb-off" d="' + off + '"/><path class="rb-on-glow" d="' + on + '"/><path class="rb-on" d="' + on + '"/>';
  // glare streaks on the glass
  out += '<path class="rb-glare" d="' + facePath(K, P, o, ax.r, [[-14.2, SCREEN.cz + 7], [-13.4, SCREEN.cz + 7.6], [-13.4, SCREEN.cz - 4], [-14.2, SCREEN.cz - 3]], true) + facePath(K, P, o, ax.r, [[-12.6, SCREEN.cz + 7.2], [-12.2, SCREEN.cz + 7.4], [-12.2, SCREEN.cz + 1], [-12.6, SCREEN.cz + 1.4]], true) + '"/>';
  out += ear(nearEar);
  headEl.innerHTML = out;
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  const t = now / 1000;
  const [hx, hy, s] = headScreenCentre();
  const dx = px - hx, dy = py - hy, dist = Math.hypot(dx, dy);

  if (mood !== "watch" && mood !== "sleep" && now > moodUntil) mood = "watch";
  if (mood === "watch" && now - lastMove > 7500 && !still.matches && !away) { mood = "sleep"; say("Zzz", 1e9); }
  if (mood === "sleep" && woke) { woke = 0; setMood("surprised", 900); show("!!", 450); say("Oh! Hi.", 1400); blinkAt = now + 1200; }

  spin *= Math.exp(-dt / 1.3);
  if (spin > 7.5 && mood !== "dizzy" && !still.matches) { setMood("dizzy", 2600); show("?!", 500); say("Whoa. The room is spinning.", 2400); spin = 0; }

  const isNear = dist < 160 * s * 1.6 && mood !== "sleep" && !away;
  if (isNear && !near) nearSince = now;
  near = isNear;
  if (near && now - nearSince > 260 && mood === "watch") { setMood("happy", 1800); waveOn = true; if (!greeted) { greeted = true; show("HI!", 700); } if (now > sayUntil) say("Hi! I'm VCM-02.", 1800); }

  let want = YAW0 + TURN * Math.max(-1, Math.min(1, dx / (260 * s * 1.6))) * 0.9;
  if (mood === "dizzy") want = YAW0 + Math.sin(t * 7) * 0.4;
  if (mood === "sleep") want = YAW0 + Math.sin(t * 0.8) * 0.05;
  if (still.matches) { yaw = want; yawV = 0; } else { yawV += ((want - yaw) * 90 - yawV * 13) * dt; yaw += yawV * dt; }
  const wu = Math.max(-4, Math.min(4, dx / (90 * s * 1.6))), wv = mood === "sleep" ? 1 : Math.max(-2, Math.min(2, dy / (110 * s * 1.6)));
  lookU += (wu - lookU) * (1 - Math.exp(-dt / 0.08)); lookV += (wv - lookV) * (1 - Math.exp(-dt / 0.08));

  if (mood === "watch" && now > blinkAt) { blinkT = 0.16; blinkAt = now + 2400 + Math.random() * 3200; }
  blinkT = Math.max(0, blinkT - dt);

  if (!still.matches && (jump > 0 || jumpV > 0)) { jumpV -= 520 * dt; jump += jumpV * dt; if (jump <= 0) { jump = 0; jumpV = 0; squash = 0.07; } }
  squash *= Math.exp(-dt / 0.09);
  const foot = iso([0, 0, 0], P);
  root.setAttribute("transform", "translate(" + foot[0].toFixed(2) + " " + (foot[1] - jump * SCALE).toFixed(2) + ") scale(" + (1 + squash * 0.6).toFixed(4) + " " + (1 - squash).toFixed(4) + ") translate(" + (-foot[0]).toFixed(2) + " " + (-foot[1]).toFixed(2) + ")");

  // wave: lift (poses 0-5), wag (6-12), lower
  if (waveOn) { wave += dt; if (wave > 2) { waveOn = false; wave = 0; } }
  let pose = 0;
  if (waveOn) { const lift = Math.min(1, wave / 0.3) * Math.min(1, (2 - wave) / 0.3); pose = lift < 1 ? Math.round(lift * 5) : 6 + Math.round((Math.sin(wave * 14) * 0.5 + 0.5) * 6); }
  waves.forEach((g, i) => { const on = i === pose; if ((g.style.display !== "none") !== on) g.style.display = on ? "" : "none"; });

  // what the screen shows
  let bitmap;
  if (now < textUntil) bitmap = text(screenText);
  else if (mood === "sleep") bitmap = Math.floor(t / 1.4) % 2 ? text("ZZZ") : face("sleep", 0, 0, t);
  else if (mood === "boot") bitmap = text("HI!");
  else {
    const kind = mood === "watch" ? (blinkT > 0 ? "blink" : "open") : mood;
    bitmap = face(kind, Math.round(lookU), Math.round(lookV), t);
  }
  drawHead(t, bitmap);
  if (now > sayUntil && mood === "watch") { const txt = "Watching you"; if (readout.textContent !== txt) readout.textContent = txt; }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
`;

/* ---------- page ---------- */
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VCM-02</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono&display=swap" rel="stylesheet">
<style>
${k.ISO_CSS}
${tokens}
* { box-sizing: border-box; margin: 0; }
html, body { height: 100%; }
body { background: #F1ECE5; color: #2A2521; font: 15px/1.5 Geist, system-ui, sans-serif; -webkit-font-smoothing: antialiased; display: grid; place-items: center; overflow: hidden; }
.rb { width: min(500px, 92vw); user-select: none; -webkit-user-select: none; outline: none; }
.rb svg { width: 100%; height: auto; display: block; overflow: visible; cursor: pointer; touch-action: manipulation; }
.rb figcaption { display: flex; justify-content: space-between; font: 12px/1.3 "Geist Mono", ui-monospace, monospace; color: #8E857B; margin-top: 2px; padding: 0 12px; }
.rb [data-readout] { color: #2A2521; }
.hint { position: fixed; left: 0; right: 0; bottom: 22px; text-align: center; font: 12px "Geist Mono", ui-monospace, monospace; color: #A89E92; }
</style>
</head>
<body>
<figure class="rb iso" data-theme="light" data-robot tabindex="0" aria-label="VCM-02, an interactive robot. Press Enter to boop.">
  ${svg}
  <figcaption><span data-readout aria-live="polite">Booting</span><span>Fig 2 · VCM-02</span></figcaption>
</figure>
<p class="hint">Move your cursor · hover him · click to boop (keep going) · spin your cursor round him · leave the window · or leave him alone</p>
<script type="module">${(kitScript() + live).replace(/<\/(script)/gi, "<\\/$1")}</script>
</body>
</html>`;
writeFileSync(join(HERE, "robot.html"), page);
console.log("wrote robot.html", (page.length / 1024).toFixed(0) + " KB");
