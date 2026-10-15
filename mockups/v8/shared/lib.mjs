// Shared build helpers for the v8 mockups: the kit, the project data and the page writer.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SKILL = join(HERE, "../../../.claude/skills/anatomy");
export const k = await import(join(SKILL, "kit/iso-kit.mjs"));
export const G = await import(join(SKILL, "kit/lathe.mjs"));
export const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));

export const PROJECTS = [
  { name: "Lumen", kind: "macOS app", lede: "A smart cursor for your Mac.", stack: "Swift, SwiftUI, AppKit", role: "Design & engineering",
    img: "https://framerusercontent.com/images/aUVtv2Dtzy0nQ4kEboewGTTaNE.png?scale-down-to=1024", cls: "wide",
    text: ["Lumen is a macOS menu bar app that reads whatever text you've selected, in any app, and gives you context-aware actions through a radial dial.",
           "It taps into a private multitouch framework to detect a three-finger gesture, and uses Apple's Accessibility APIs to read your selection.",
           "Placeholder: the rest of the case study goes here."] },
  { name: "Postcard", kind: "Web app", lede: "Reinventing postcards for the digital age.", stack: "React, TypeScript, Tailwind", role: "Design & engineering",
    img: "https://framerusercontent.com/images/0uFMfa75FsAVfxLUSMJOv3NJbQ.png?scale-down-to=1024", cls: "phone",
    text: ["Personal messages, beautifully delivered.", "Placeholder: the case study text goes here."] },
  { name: "Smart GIF", kind: "Web app", lede: "Searching GIFs by meaning, not keywords.", stack: "React, GIPHY, OpenAI", role: "Design & engineering",
    img: "https://framerusercontent.com/images/MoSK8FqWgPk2WVCwTZZ5ging.png", cls: "phone",
    text: ["Placeholder: the case study text goes here."] },
  { name: "Atlas", kind: "Web app", lede: "AI-powered place exploration for Google Maps.", stack: "React, Ollama, Maps API", role: "Design & engineering",
    img: "https://framerusercontent.com/images/8ZBUSHIzo2gr9yutUU8ap3DkhFE.png", cls: "phone",
    text: ["Placeholder: the case study text goes here."] },
];
export const AVATAR = "https://framerusercontent.com/images/KRXUYzmUAll77gxez5x80aQ06bg.jpeg?scale-down-to=256";
export const EMAIL = "cmvinayak04@gmail.com";

export const byDepthOf = (P) => (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/** Writes <dir>/index.html with everything inlined, so it opens straight from disk. */
export function writeSite({ dir, title, fonts = "", css = "", tokens = "", figure, figureScript, intro, cue, tag, kind, endFrame, footer, site, bodyClass = "", extra = "" }) {
  const base = readFileSync(join(HERE, "base.css"), "utf8");
  const siteJs = readFileSync(join(HERE, "site.js"), "utf8");
  const frames = PROJECTS.map((p, i) => `<article class="frame" data-i="${i}"><span class="tag">${tag(i, p)}</span><span class="kind">${kind ? kind(i, p) : p.kind}</span><img class="${p.cls}" src="${p.img}" alt="${p.name}"></article>`).join("\n      ")
    + `\n      <div class="frame end">${endFrame}</div>`;
  const SITE = {
    labels: [...PROJECTS.map((p) => p.name), "More soon"],
    projects: PROJECTS,
    hint: "Scroll to move through the work. Click a frame to open it.",
    hintTouch: "Swipe to move through the work. Tap a frame to open it.",
    caseMeta: [["Type", "kind"], ["Built with", "stack"], ["Role", "role"]],
    nextLabel: "Next",
    ...site,
  };
  const fnJson = JSON.stringify(SITE, (key, v) => (typeof v === "function" ? `__FN__${v.toString()}__FN__` : v)).replace(/"__FN__(.*?)__FN__"/g, (_, src) => JSON.parse(`"${src}"`));
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
${base}
${k.ISO_CSS}
${tokens}
${css}
</style>
</head>
<body class="${bodyClass}">
${extra}
<section class="intro">
  <div class="col">
    <div class="fig-slot">${figure}</div>
    ${intro}
  </div>
  <p class="cue">${cue}</p>
</section>
<section class="work" id="work">
  <div class="stage">
    <div class="bar"><div class="ruler" id="ruler"></div><div class="label" id="label"><span>${SITE.labels[0]}</span></div></div>
    <div class="track" id="track">
      ${frames}
    </div>
    <p class="hint" id="hint"></p>
  </div>
</section>
<footer><div class="col"><div class="row">${footer}</div></div></footer>
<script>window.SITE = ${fnJson};</script>
<script>${siteJs}</script>
<script type="module">${figureScript.replace(/<\/(script)/gi, "<\\/$1")}</script>
</body>
</html>`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
  console.log("wrote", join(dir, "index.html").replace(process.cwd() + "/", ""), (html.length / 1024).toFixed(0) + " KB");
}

/** A standalone light-card preview of a figure, for the skill's capture and line checks. */
export function writePreview({ dir, svg, tokens = "", title }) {
  const body = k.plateHtml({ fig: "Fig", title, hint: "", readout: "", body: `<div class="iso-stage fig">${svg}</div>` });
  writeFileSync(join(dir, "preview.html"), k.pageHtml({ title, theme: "light", body: `<style>${tokens.replace(/\.fig\.iso\[data-theme="light"\]/g, '.iso[data-theme="light"]')}</style>` + body, width: 900 }));
}
