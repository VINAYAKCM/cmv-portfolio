// VCM-01: a small desk robot that watches your cursor.
// Head yaw follows the pointer (rebuilt live with the kit), eyes look up and down on the visor,
// the antenna rides a spring. Hover: happy + wave. Click: boop. Spin the cursor round him: dizzy.
// Leave him alone: he dozes off.
//
//   node mockups/v9/robot/build.mjs   -> writes robot.html and preview.html next to this file
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "../../../.claude/skills/anatomy");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const G = await import(join(SKILL, "kit/lathe.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));

/* ---------- body plan (world units, z up) ---------- */
const W = 420, H = 470;
const PLINTH_R = 36, PLINTH_H = 7;
const FOOT = { w: 13, d: 20, r: 5 }, FOOT_H = 5, FOOT_OFF = 8.5;
const LEG_Z0 = 8, LEG_Z1 = 17;
const PELVIS = { w: 24, d: 16, r: 5 }, PELVIS_Z = 17, PELVIS_H = 5;
const TORSO = { w: 32, d: 22, r: 7 }, TORSO_Z = 22, TORSO_H = 28;
const SHOULDER_Z = 44, SHOULDER_X = 16;
const ARM_LEN = 19, ARM_R = 3.3, HAND_R = 4.6;
const NECK_Z = 50;
const HEAD = { w: 48, d: 36, r: 11 }, HEAD_Z = 56, HEAD_H = 30;
const ANT_LEN = 17;
const WAVE_POSES = 14;

const P = k.fitProjection(
  [[-PLINTH_R, -PLINTH_R, -PLINTH_H], [PLINTH_R, PLINTH_R, -PLINTH_H], [-PLINTH_R, PLINTH_R, 0], [PLINTH_R, -PLINTH_R, 0],
   [-30, -30, HEAD_Z + HEAD_H + ANT_LEN + 8], [30, 30, HEAD_Z + HEAD_H + ANT_LEN + 8], [30, -30, HEAD_Z + HEAD_H], [-30, 30, HEAD_Z + HEAD_H],
   [42, 0, 72], [-42, 0, 72], [0, 42, 72], [0, -42, 72]],
  W, H, { pad: 20, azimuth: 36 },
);
const TV = k.towardViewer(P);
const YAW0 = Math.atan2(TV[1], TV[0]);           // facing the viewer

/* ---------- shared helpers (also shipped to the page) ---------- */
// forward and right on the floor for a yaw; right is chosen so it reads as screen-right when facing the viewer
function axes(K, P, yaw) {
  const f = [Math.cos(yaw), Math.sin(yaw), 0];
  let r = [Math.sin(yaw), -Math.cos(yaw), 0];
  const o = K.iso([0, 0, 0], P), fv = [Math.cos(Math.atan2(K.towardViewer(P)[1], K.towardViewer(P)[0])), Math.sin(Math.atan2(K.towardViewer(P)[1], K.towardViewer(P)[0]))];
  const rv = [fv[1], -fv[0]];
  if (K.iso([rv[0], rv[1], 0], P)[0] < o[0]) r = [-r[0], -r[1], 0];
  return { f, r };
}
// a rounded rectangle (width along right, depth along forward) turned to a yaw and centred on c
function turnedRing(K, plan, c, ax, steps) {
  return K.ringOf({ x: -plan.w / 2, y: -plan.d / 2, w: plan.w, d: plan.d, r: plan.r }, steps).map(([lx, ly]) => [c[0] + ax.r[0] * lx + ax.f[0] * ly, c[1] + ax.r[1] * lx + ax.f[1] * ly]);
}
// a point on a vertical face: origin o, u along `along`, v up
const facePoint = (o, along, u, v) => [o[0] + along[0] * u, o[1] + along[1] * u, o[2] + v];
function facePath(K, P, o, along, pts, close) {
  return "M" + pts.map(([u, v]) => K.iso(facePoint(o, along, u, v), P).map((n) => n.toFixed(2)).join(" ")).join("L") + (close ? "Z" : "");
}
function roundRectPts(cx, cy, w, h, r, n = 5) {
  r = Math.min(r, w / 2, h / 2);
  const out = [];
  const corner = (x, y, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } };
  corner(cx + w / 2 - r, cy + h / 2 - r, 0); corner(cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2);
  corner(cx - w / 2 + r, cy - h / 2 + r, Math.PI); corner(cx + w / 2 - r, cy - h / 2 + r, Math.PI * 1.5);
  return out;
}
const HELPERS = [axes, turnedRing, roundRectPts, facePath].map((f) => f.toString()).join("\n") + `\nconst facePoint = ${facePoint.toString()};`;

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const at = (p) => k.iso(p, P);
const AX0 = axes(k, P, YAW0);
const depth = (p) => k.depthOf(p, P);

/* ---------- static body ---------- */
function plinth() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -PLINTH_R, y: -PLINTH_R, w: PLINTH_R * 2, d: PLINTH_R * 2, r: PLINTH_R }, -PLINTH_H, PLINTH_H, P)}"/>`];
  out.push(S(k.cylinder(0, 0, PLINTH_R, -PLINTH_H, PLINTH_H, P, 96, 1.2), { tone: "mid" }));
  out.push(L(k.ring(0, 0, PLINTH_R - 4, 0, P, 80), { tone: "lo" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + 0.2; return at([Math.cos(a) * (PLINTH_R - 2), Math.sin(a) * (PLINTH_R - 2), 0]); }), { size: 0.45 }));
  // a small name plate on the front of the plinth top
  const c = [AX0.f[0] * 27, AX0.f[1] * 27];
  const ring = turnedRing(k, { w: 20, d: 5, r: 1 }, c, AX0, 3);
  out.push(S(k.extrude(ring, 0, 0.6, P), { tone: "lo", crease: "none" }));
  out.push(L([[-7, 5], [-7, 9], [-7, 3]].map(([u, len], i) => k.segment([c[0] + AX0.r[0] * u + AX0.f[0] * (-1.2 + i * 1.2), c[1] + AX0.r[1] * u + AX0.f[1] * (-1.2 + i * 1.2), 0.6], [c[0] + AX0.r[0] * (u + len) + AX0.f[0] * (-1.2 + i * 1.2), c[1] + AX0.r[1] * (u + len) + AX0.f[1] * (-1.2 + i * 1.2), 0.6], P)).join(""), { tone: "lo", free: true }));
  return out.join("");
}
function legs() {
  const sides = [-1, 1].map((s) => ({ s, c: [AX0.r[0] * s * FOOT_OFF + AX0.f[0] * 2, AX0.r[1] * s * FOOT_OFF + AX0.f[1] * 2] }))
    .sort((a, b) => depth([...a.c, 0]) - depth([...b.c, 0]));
  const out = [];
  for (const { c } of sides) {
    out.push(`<g class="rb-dark">${S(k.extrude(turnedRing(k, FOOT, [c[0] + AX0.f[0] * 3, c[1] + AX0.f[1] * 3], AX0, 5), 0, FOOT_H, P, { bevel: 0.6 }), { tone: "hi", crease: "lo" })}</g>`);
    out.push(`<g class="rb-dark">${S(k.cylinder(c[0], c[1], 3, FOOT_H, LEG_Z0 - FOOT_H, P, 20), { tone: "hi", crease: "none" })}</g>`);
    out.push(S(k.cylinder(c[0], c[1], 4.2, LEG_Z0, LEG_Z1 - LEG_Z0, P, 24, 0.4), { tone: "hi", crease: "lo", inner: L(k.sideArc(c[0], c[1], 4.2, LEG_Z0 + 3, P, 18), { tone: "lo" }) }));
  }
  out.push(`<g class="rb-dark">${S(k.extrude(turnedRing(k, PELVIS, [0, 0], AX0, 5), PELVIS_Z, PELVIS_H, P, { bevel: 0.5 }), { tone: "hi", crease: "lo" })}</g>`);
  return out.join("");
}
function torso() {
  const out = [S(k.extrude(turnedRing(k, TORSO, [0, 0], AX0, 7), TORSO_Z, TORSO_H, P, { bevel: 1 }), { tone: "hi", crease: "lo" })];
  // front face: a chest panel, a speaker grille, a status light and the engraved name
  const o = [AX0.f[0] * (TORSO.d / 2 + 0.05), AX0.f[1] * (TORSO.d / 2 + 0.05), 0];
  out.push(L(facePath(k, P, o, AX0.r, roundRectPts(0, 37, 20, 15, 3), true), { tone: "lo" }));
  const grille = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) grille.push(at(facePoint(o, AX0.r, -6.5 + i * 2.2, 35 + j * 2.2)));
  out.push(D(grille, { size: 0.5, tone: "mid" }));
  out.push(`<circle class="rb-led" cx="${at(facePoint(o, AX0.r, 5.5, 39.5))[0].toFixed(2)}" cy="${at(facePoint(o, AX0.r, 5.5, 39.5))[1].toFixed(2)}" r="${(1.1 * k.screenRise(1, P) * 1.15).toFixed(2)}"/>`);
  const tm = (() => { const a = at(facePoint(o, AX0.r, 0, 25.6)), b = at(facePoint(o, AX0.r, 1, 25.6)), c = at(facePoint(o, AX0.r, 0, 24.6)); return `matrix(${(b[0] - a[0]).toFixed(3)} ${(b[1] - a[1]).toFixed(3)} ${(c[0] - a[0]).toFixed(3)} ${(c[1] - a[1]).toFixed(3)} ${a[0].toFixed(2)} ${a[1].toFixed(2)})`; })();
  out.push(`<text class="rb-engrave" transform="${tm}" text-anchor="middle" font-size="2.6">VCM-01</text>`);
  // the neck collar and neck
  out.push(`<g class="rb-dark">${S(k.cylinder(0, 0, 6.4, NECK_Z, 2, P, 32, 0.4), { tone: "hi", crease: "lo" })}${S(k.cylinder(0, 0, 3.8, NECK_Z + 2, HEAD_Z - NECK_Z - 2, P, 24), { tone: "hi", crease: "none" })}</g>`);
  return out.join("");
}
// arms: a shoulder disc, a capsule and a mitten; the screen-right arm can wave
function shoulderPoint(side) { return [AX0.r[0] * side * SHOULDER_X, AX0.r[1] * side * SHOULDER_X, SHOULDER_Z]; }
function arm(side, raise) {
  const sp = shoulderPoint(side);
  const out = side;
  const outward = [AX0.r[0] * side, AX0.r[1] * side, 0];
  const Fs = G.frameAlong(sp, outward);
  const shoulder = `<g class="rb-dark">${S(G.disc(0, 4, 5.6, Fs, P, { steps: 32 }), { tone: "hi", crease: "lo" })}</g>`;
  const a = (raise * Math.PI) / 180;
  const dir = [outward[0] * Math.sin(a) + AX0.f[0] * 0.12, outward[1] * Math.sin(a) + AX0.f[1] * 0.12, -Math.cos(a)];
  const n = Math.hypot(...dir), d = dir.map((v) => v / n);
  const root = [sp[0] + outward[0] * 3.4, sp[1] + outward[1] * 3.4, sp[2]];
  const Fa = G.frameAlong(root, d);
  const capsule = S(G.solidOf([[0, 0, 0], [0.6, 2.6, 1], [2, ARM_R, 1], [ARM_LEN - 2, ARM_R, 1], [ARM_LEN, 2.2, 1]], Fa, P, { steps: 28, smooth: { rows: 3 } }), { tone: "hi", crease: "lo" });
  const hand = S(G.sphereOf(G.pointOf(Fa, ARM_LEN + HAND_R - 1.4, 0, 0), HAND_R, P, { steps: 36 }), { tone: "hi" });
  void out;
  return { shoulder, capsule, hand };
}
// which shoulder sits screen-right, and which is nearer the viewer
const sideRight = at(shoulderPoint(1))[0] > at(shoulderPoint(-1))[0] ? 1 : -1;
const nearSide = depth(shoulderPoint(1)) > depth(shoulderPoint(-1)) ? 1 : -1;
function staticArm(side) { const a = arm(side, 12); return a.shoulder + a.capsule + a.hand; }
const waveArm = Array.from({ length: WAVE_POSES }, (_, i) => { const raise = 12 + (i / (WAVE_POSES - 1)) * 148; const a = arm(sideRight, raise); return `<g data-wave="${i}"${i ? ' style="display:none"' : ""}>${a.shoulder}${a.capsule}${a.hand}</g>`; }).join("");
const leftArm = staticArm(-sideRight);
const armBack = nearSide === sideRight ? leftArm : `<g data-part="wave">${waveArm}</g>`;
const armFront = nearSide === sideRight ? `<g data-part="wave">${waveArm}</g>` : leftArm;

/* ---------- assemble ---------- */
const defs = `<defs>
  <filter id="rb-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <radialGradient id="rb-bulb" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#FFF4DE"/><stop offset=".45" stop-color="#FFB766"/><stop offset="1" stop-color="#E26A1C"/></radialGradient>
  <linearGradient id="rb-visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C2926"/><stop offset="1" stop-color="#151413"/></linearGradient>
</defs>`;
const svg = k.figureSvg({
  width: W, height: H,
  label: "VCM-01, a small cream-and-graphite desk robot on a round plinth. Its head turns to follow your cursor, its amber eyes change with its mood, and it waves, hops and dozes off.",
  body: [defs, plinth(), `<g data-part="root">`, legs(), armBack, torso(), `<g data-part="head"></g>`, armFront, `</g>`],
});

const tokens = `
.iso[data-theme="light"].rb{--anatomy-card:#F4EFE7;--anatomy-paper:#F4EFE7;--anatomy-top:#FFFDF9;--anatomy-shade-0:#E3DCD1;--anatomy-shade-1:#EAE4DA;--anatomy-shade-2:#F0EBE3;--anatomy-shade-3:#F6F2EC;
  --anatomy-hi:#2A2521;--anatomy-mid:#8E857B;--anatomy-lo:#BEB5AA;--anatomy-faint:#DAD2C7;--anatomy-dot:#4A433C;--anatomy-halo:#6B5843;--anatomy-halo-opacity:.28}
.rb .rb-dark{--anatomy-paper:#3A3734;--anatomy-top:#4A4643;--anatomy-shade-0:#2A2826;--anatomy-shade-1:#312E2C;--anatomy-shade-2:#383533;--anatomy-shade-3:#3F3C39;--anatomy-hi:#161412;--anatomy-lo:#5E5954;--anatomy-faint:#55504B;--anatomy-dot:#8C857D}
.rb .rb-visor{fill:url(#rb-visor);stroke:#161412;stroke-width:var(--anatomy-weight)}
.rb .rb-glare{fill:none;stroke:#fff;stroke-opacity:.16;stroke-linecap:round}
.rb .rb-eye{fill:#FFB04A}
.rb .rb-eye-line{fill:none;stroke:#FFB04A;stroke-linecap:round;stroke-linejoin:round}
.rb .rb-glow{opacity:.75;filter:url(#rb-glow)}
.rb .rb-cheek{fill:#FF7A93;opacity:0;transition:opacity .35s}
.rb[data-mood="happy"] .rb-cheek,.rb[data-mood="boop"] .rb-cheek{opacity:.7}
.rb .rb-led{fill:#FF9A3D}
.rb .rb-engrave{font:600 1px ui-monospace,monospace;font-size:2.6px;fill:#A89E92;letter-spacing:.08em}
.rb .rb-rod{fill:none;stroke:#2A2521;stroke-linecap:round}
.rb .rb-bulb{fill:url(#rb-bulb);stroke:#7A3A0E;stroke-width:var(--anatomy-weight)}
.rb .rb-bulb-glow{fill:#FFB04A}
`;

/* ---------- live ---------- */
const live = `
const P = ${JSON.stringify(P)};
const K = { iso, ringOf, towardViewer };
${HELPERS}
const YAW0 = ${YAW0}, HEAD = ${JSON.stringify(HEAD)}, HEAD_Z = ${HEAD_Z}, HEAD_H = ${HEAD_H}, ANT_LEN = ${ANT_LEN}, WAVE_POSES = ${WAVE_POSES};
const fig = document.querySelector("[data-robot]");
const svg = fig.querySelector("svg");
const root = svg.querySelector('[data-part="root"]'), headEl = svg.querySelector('[data-part="head"]');
const waves = [...svg.querySelectorAll("[data-wave]")];
const readout = fig.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const SCALE = Math.hypot(...(() => { const a = iso([0,0,0], P), b = iso([1,0,0], P); return [b[0]-a[0], b[1]-a[1]]; })());
// which way of turning moves the face to the right of the screen
const TURN = (() => { const a = axes(K, P, YAW0), b = axes(K, P, YAW0 + 0.05); return iso(b.f, P)[0] - iso([0,0,0], P)[0] > iso(a.f, P)[0] - iso([0,0,0], P)[0] ? 1 : -1; })();

let px = innerWidth / 2, py = innerHeight / 3, lastMove = performance.now(), last = 0;
let yaw = YAW0, yawV = 0, lookU = 0, lookV = 0;
let ant = [0, 0], antV = [0, 0];
let mood = "watch", moodUntil = 0, blinkAt = performance.now() + 1800, blinkT = 0;
let wave = 0, waveOn = false, near = false, nearSince = 0;
let jump = 0, jumpV = 0, squash = 0, boops = 0, spin = 0, lastAng = null, dizzyUntil = 0, woke = 0;
const BOOP_LINES = ["Boop.", "Boop!", "Hehe.", "Again?", "Okay, okay.", "Please stop.", "I have feelings, you know.", "I'm telling Vinayak."];

addEventListener("pointermove", (e) => {
  if (mood === "sleep") { woke = performance.now(); }
  px = e.clientX; py = e.clientY; lastMove = performance.now();
  const [hx, hy] = headScreenCentre();
  const ang = Math.atan2(py - hy, px - hx), dist = Math.hypot(px - hx, py - hy);
  if (lastAng !== null && dist > 30 && dist < 600) { let d = ang - lastAng; d = Math.atan2(Math.sin(d), Math.cos(d)); spin += Math.abs(d); }
  lastAng = ang;
});
svg.addEventListener("pointerdown", (e) => { e.preventDefault(); boop(); });
fig.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); boop(); } });
function boop() {
  lastMove = performance.now();
  if (still.matches) { setMood("boop", 700); say(BOOP_LINES[Math.min(boops++, BOOP_LINES.length - 1)]); return; }
  jumpV = 120; squash = 0.1; antV[1] += 60;
  setMood("boop", 750);
  say(BOOP_LINES[Math.min(boops++, BOOP_LINES.length - 1)]);
}
function setMood(m, ms) { mood = m; moodUntil = performance.now() + ms; fig.dataset.mood = m; }
let sayUntil = 0;
function say(t, ms = 1600) { readout.textContent = t; sayUntil = performance.now() + ms; }

function headScreenCentre() {
  const b = svg.getBoundingClientRect(), s = b.width / ${W};
  const c = iso([0, 0, HEAD_Z + HEAD_H / 2], P);
  return [b.left + c[0] * s, b.top + c[1] * s, s];
}

/* eyes on the visor, in face coordinates (u across, v up) */
function eyes(o, along, kind, blink, t, lu, lv) {
  const out = [], glow = [];
  const sw = (n) => (n * SCALE).toFixed(2);
  for (const side of [-1, 1]) {
    const cx = side * 8.6 + lu, cy = 71.5 + lv;
    if (kind === "happy") {
      const pts = Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (i / 10); return [cx - Math.cos(a) * 3.8, cy - 1 + Math.sin(a) * 3.6]; });
      const d = facePath(K, P, o, along, pts, false);
      out.push('<path class="rb-eye-line" stroke-width="' + sw(2.3) + '" d="' + d + '"/>'); glow.push('<path class="rb-eye-line" stroke-width="' + sw(3.4) + '" d="' + d + '"/>');
    } else if (kind === "boop") {
      const s = -side;                                   // squeezed shut: > on the left, < on the right
      const pts = [[cx - 3 * s, cy + 3.4], [cx + 2.6 * s, cy], [cx - 3 * s, cy - 3.4]];
      const d = facePath(K, P, o, along, pts, false);
      out.push('<path class="rb-eye-line" stroke-width="' + sw(2.2) + '" d="' + d + '"/>'); glow.push('<path class="rb-eye-line" stroke-width="' + sw(3.2) + '" d="' + d + '"/>');
    } else if (kind === "dizzy") {
      const pts = Array.from({ length: 40 }, (_, i) => { const a = i * 0.42 + t * 9 * side; const r = 0.4 + i * 0.105; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
      const d = facePath(K, P, o, along, pts, false);
      out.push('<path class="rb-eye-line" stroke-width="' + sw(1.3) + '" d="' + d + '"/>'); glow.push('<path class="rb-eye-line" stroke-width="' + sw(2.2) + '" d="' + d + '"/>');
    } else if (kind === "sleep") {
      const pts = Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (i / 8); return [cx - Math.cos(a) * 3.6, cy - 2 - Math.sin(a) * 1.6]; });
      const d = facePath(K, P, o, along, pts, false);
      out.push('<path class="rb-eye-line" stroke-width="' + sw(1.8) + '" d="' + d + '"/>');
    } else {
      // open eyes: rounded pills that squash to a line when blinking
      const big = kind === "surprised" ? 1.25 : 1;
      const h = Math.max(1.1, 10.4 * big * (1 - blink)), w = 7 * big;
      const d = facePath(K, P, o, along, roundRectPts(cx, cy, w, h, Math.min(3.5 * big, h / 2), 4), true);
      out.push('<path class="rb-eye" d="' + d + '"/>'); glow.push('<path class="rb-eye" d="' + d + '"/>');
      // a catch-light: makes them read as alive
      if (h > 4) { const hl = facePath(K, P, o, along, roundRectPts(cx - w * 0.18, cy + h * 0.22, 1.6, 2.2, 0.8, 2), true); out.push('<path fill="#FFF3DD" opacity=".9" d="' + hl + '"/>'); }
    }
  }
  // cheeks, and a mouth for some moods
  const cheeks = [-1, 1].map((s) => '<path class="rb-cheek" d="' + facePath(K, P, o, along, Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return [s * 13.2 + lu * 0.4 + Math.cos(a) * 3, 64.6 + lv * 0.4 + Math.sin(a) * 1.5]; }), true) + '"/>').join("");
  let mouth = "";
  if (kind === "happy") mouth = '<path class="rb-eye-line" stroke-width="' + sw(1.4) + '" d="' + facePath(K, P, o, along, Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (i / 8); return [lu * 0.5 - Math.cos(a) * 2.6, 64.2 + lv * 0.5 - Math.sin(a) * 1.6]; }), false) + '"/>';
  if (kind === "surprised" || kind === "boop") mouth = '<path class="rb-eye" d="' + facePath(K, P, o, along, Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [lu * 0.5 + Math.cos(a) * 1.4, 63.6 + lv * 0.5 + Math.sin(a) * 1.7]; }), true) + '"/>';
  return '<g class="rb-glow">' + glow.join("") + '</g>' + cheeks + out.join("") + mouth;
}

function drawHead(t) {
  const ax = axes(K, P, yaw);
  const tv = towardViewer(P);
  const half = HEAD.d / 2;
  const sideOf = (s) => [ax.r[0] * s * (HEAD.w / 2 + 2.6), ax.r[1] * s * (HEAD.w / 2 + 2.6)];
  const nearEar = (ax.r[0] * tv[0] + ax.r[1] * tv[1]) > 0 ? 1 : -1;
  const ear = (s, detail) => {
    const c = sideOf(s);
    let svgs = '<g class="rb-dark">' + solidSvg(extrude(turnedRing(K, { w: 5.2, d: 19, r: 2.6 }, c, ax, 4), HEAD_Z + 7, 16, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" }) + "</g>";
    if (detail) {
      // speaker rings on the outer face of the near ear
      const o = [c[0] + ax.r[0] * s * 2.62, c[1] + ax.r[1] * s * 2.62, 0];
      const ring = (r) => facePath(K, P, o, ax.f, Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [Math.cos(a) * r, HEAD_Z + 15 + Math.sin(a) * r]; }), true);
      svgs += '<g class="rb-dark">' + lineSvg(ring(5.4) + ring(3.2), { tone: "lo" }) + dotsSvg([iso(facePoint(o, ax.f, 0, HEAD_Z + 15), P)], { size: 0.6, tone: "mid" }) + "</g>";
    }
    return svgs;
  };
  let out = ear(-nearEar, false);
  out += solidSvg(extrude(turnedRing(K, HEAD, [0, 0], ax, 8), HEAD_Z, HEAD_H, P, { bevel: 1.2 }), { tone: "hi", crease: "lo" });
  // the visor, its glare and the face
  const o = [ax.f[0] * (half + 0.06), ax.f[1] * (half + 0.06), 0];
  out += '<path class="rb-visor" d="' + facePath(K, P, o, ax.r, roundRectPts(0, 71, 38, 21, 8.5, 6), true) + '"/>';
  out += '<path class="rb-glare" stroke-width="' + (1.1 * SCALE).toFixed(2) + '" d="' + facePath(K, P, o, ax.r, Array.from({ length: 8 }, (_, i) => { const a = Math.PI * (0.62 + i * 0.05); return [-10 + Math.cos(a) * 6, 74 + Math.sin(a) * 6]; }), false) + '"/>';
  const kind = mood === "watch" ? (blinkT > 0 ? "blink" : "open") : mood;
  out += eyes(o, ax.r, kind === "blink" ? "open" : kind, kind === "blink" ? blinkT : 0, t, lookU, lookV);
  out += ear(nearEar, true);
  // antenna: a base, a springy rod and the bulb
  const bp = [ax.f[0] * -5, ax.f[1] * -5];
  out += '<g class="rb-dark">' + solidSvg(cylinder(bp[0], bp[1], 3, HEAD_Z + HEAD_H, 2.4, P, 20), { tone: "hi", crease: "lo" }) + "</g>";
  const base = iso([bp[0], bp[1], HEAD_Z + HEAD_H + 2.4], P);
  const tipW = [bp[0] + ax.r[0] * ant[0] + ax.f[0] * ant[0] * 0.2, bp[1] + ax.r[1] * ant[0] + ax.f[1] * ant[0] * 0.2, HEAD_Z + HEAD_H + 2.4 + ANT_LEN];
  const tip = iso(tipW, P); tip[1] -= ant[1] * SCALE;
  const mid = [(base[0] + tip[0]) / 2 + (tip[0] - base[0]) * 0.1, (base[1] + tip[1]) / 2];
  // a coiled spring for the lower third, then a straight rod
  let coil = "M" + base[0].toFixed(2) + " " + base[1].toFixed(2);
  for (let i = 1; i <= 12; i++) { const f = i / 12 * 0.34; const x = base[0] + (tip[0] - base[0]) * f + Math.sin(i * Math.PI) * 0, y = base[1] + (tip[1] - base[1]) * f; coil += "L" + (x + (i % 2 ? 1 : -1) * 1.5 * SCALE * 0.6).toFixed(2) + " " + y.toFixed(2); }
  out += '<path class="rb-rod" stroke-width="' + (0.75 * SCALE).toFixed(2) + '" d="' + coil + '"/>';
  out += '<path class="rb-rod" stroke-width="' + (1.1 * SCALE).toFixed(2) + '" d="M' + (base[0] + (tip[0] - base[0]) * 0.34).toFixed(2) + " " + (base[1] + (tip[1] - base[1]) * 0.34).toFixed(2) + "Q" + mid[0].toFixed(2) + " " + mid[1].toFixed(2) + " " + tip[0].toFixed(2) + " " + tip[1].toFixed(2) + '"/>';
  const glowA = mood === "sleep" ? 0.15 : mood === "boop" ? 0.95 : 0.55;
  out += '<circle class="rb-bulb-glow" filter="url(#rb-glow)" opacity="' + glowA + '" cx="' + tip[0].toFixed(2) + '" cy="' + (tip[1] - 2.6 * SCALE).toFixed(2) + '" r="' + (4.6 * SCALE).toFixed(2) + '"/>';
  out += '<circle class="rb-bulb" cx="' + tip[0].toFixed(2) + '" cy="' + (tip[1] - 2.6 * SCALE).toFixed(2) + '" r="' + (2.9 * SCALE).toFixed(2) + '" opacity="' + (mood === "sleep" ? 0.6 : 1) + '"/>';
  headEl.innerHTML = out;
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  const t = now / 1000;
  const [hx, hy, s] = headScreenCentre();
  const dx = px - hx, dy = py - hy;
  const dist = Math.hypot(dx, dy);

  // moods that time out, sleep, waking up
  if (mood !== "watch" && mood !== "sleep" && now > moodUntil) setMood("watch", 0);
  if (mood === "watch" && now - lastMove > 7000 && !still.matches) { setMood("sleep", 1e9); say("Zzz", 1e9); }
  if (mood === "sleep" && woke) { woke = 0; setMood("surprised", 650); say("Oh! Hi.", 1400); blinkAt = now + 900; }

  // spinning the cursor round his head makes him dizzy
  spin *= Math.exp(-dt / 1.3);
  if (spin > 7.5 && mood !== "dizzy" && !still.matches) { setMood("dizzy", 2600); dizzyUntil = now + 2600; say("Whoa. The room is spinning.", 2400); spin = 0; }

  // hovering close: happy, and a wave
  const isNear = dist < 150 * s * 1.6 && mood !== "sleep";
  if (isNear && !near) { nearSince = now; }
  near = isNear;
  if (near && now - nearSince > 260 && (mood === "watch")) { setMood("happy", 1700); waveOn = true; if (now > sayUntil) say("Hi! I'm VCM-01.", 1800); }
  if (!near && mood === "happy" && now > moodUntil - 1200) setMood("watch", 0);

  // head: yaw follows the pointer on a spring; eyes take up the rest, and look up and down
  let want = YAW0 + TURN * Math.max(-1, Math.min(1, dx / (260 * s * 1.6))) * 0.95;
  if (mood === "dizzy") want = YAW0 + Math.sin(t * 7) * 0.45;
  if (mood === "sleep") want = YAW0 + Math.sin(t * 0.8) * 0.06;
  const k1 = 90, c1 = 13;
  const before = yaw;
  if (still.matches) { yaw = want; yawV = 0; } else { yawV += ((want - yaw) * k1 - yawV * c1) * dt; yaw += yawV * dt; }
  const wantU = Math.max(-3.2, Math.min(3.2, dx / (110 * s * 1.6))), wantV = mood === "sleep" ? -2 : Math.max(-3, Math.min(3, -dy / (120 * s * 1.6)));
  lookU += (wantU - lookU) * (1 - Math.exp(-dt / 0.08)); lookV += (wantV - lookV) * (1 - Math.exp(-dt / 0.08));

  // the antenna lags the head and rings like a spring
  const kick = (yaw - before) / Math.max(dt, 1e-3);
  if (!still.matches) {
    antV[0] += (-ant[0] * 160 - antV[0] * 7 - kick * 26) * dt; ant[0] += antV[0] * dt;
    antV[1] += (-ant[1] * 160 - antV[1] * 7) * dt; ant[1] += antV[1] * dt;
  }

  // blinking
  if (mood === "watch" && now > blinkAt) { blinkT = 1; blinkAt = now + 2200 + Math.random() * 3200; }
  blinkT = Math.max(0, blinkT - dt * 7);

  // the hop and the squash on landing
  if (!still.matches && (jump > 0 || jumpV > 0)) { jumpV -= 520 * dt; jump += jumpV * dt; if (jump <= 0) { jump = 0; jumpV = 0; squash = 0.07; antV[1] -= 40; } }
  squash *= Math.exp(-dt / 0.09);
  const foot = iso([0, 0, 0], P);
  root.setAttribute("transform", "translate(" + foot[0].toFixed(2) + " " + (foot[1] - jump * SCALE).toFixed(2) + ") scale(" + (1 + squash * 0.6).toFixed(4) + " " + (1 - squash).toFixed(4) + ") translate(" + (-foot[0]).toFixed(2) + " " + (-foot[1]).toFixed(2) + ")");

  // the wave: up, three waves, down
  if (waveOn) { wave += dt; if (wave > 1.7) { waveOn = false; wave = 0; } }
  const raise = waveOn ? Math.min(1, wave / 0.25) * Math.min(1, (1.7 - wave) / 0.25) : 0;
  const wag = waveOn ? 0.82 + Math.sin(wave * 15) * 0.16 : 0;
  const pose = Math.max(0, Math.min(WAVE_POSES - 1, Math.round(raise * wag * (WAVE_POSES - 1))));
  waves.forEach((g, i) => { const show = i === pose; if ((g.style.display !== "none") !== show) g.style.display = show ? "" : "none"; });

  drawHead(t);
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
<title>VCM-01</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono&display=swap" rel="stylesheet">
<style>
${k.ISO_CSS}
${tokens}
* { box-sizing: border-box; margin: 0; }
html, body { height: 100%; }
body { background: #F4EFE7; color: #2A2521; font: 15px/1.5 Geist, system-ui, sans-serif; -webkit-font-smoothing: antialiased; display: grid; place-items: center; overflow: hidden; }
.rb { width: min(520px, 92vw); text-align: center; user-select: none; -webkit-user-select: none; outline: none; }
.rb svg { width: 100%; height: auto; display: block; overflow: visible; cursor: pointer; touch-action: manipulation; }
.rb figcaption { display: flex; justify-content: space-between; font: 12px/1.3 "Geist Mono", ui-monospace, monospace; color: #8E857B; margin-top: 4px; padding: 0 12px; }
.rb [data-readout] { color: #2A2521; }
.hint { position: fixed; left: 0; right: 0; bottom: 22px; text-align: center; font: 12px "Geist Mono", ui-monospace, monospace; color: #A89E92; }
</style>
</head>
<body>
<figure class="rb iso" data-theme="light" data-robot data-mood="watch" tabindex="0" aria-label="VCM-01, an interactive robot. Press Enter to boop.">
  ${svg}
  <figcaption><span data-readout aria-live="polite">Watching you</span><span>Fig 1 · VCM-01</span></figcaption>
</figure>
<p class="hint">Move your cursor · hover him · click to boop · spin your cursor round him · or leave him alone for a bit</p>
<script type="module">${(kitScript() + live).replace(/<\/(script)/gi, "<\\/$1")}</script>
</body>
</html>`;
writeFileSync(join(HERE, "robot.html"), page);
console.log("wrote robot.html", (page.length / 1024).toFixed(0) + " KB");
