// Shared page behaviour for every v8 mockup.
// Publishes two numbers every frame for the figure to read:
//   window.__vkStation  0 intro, 1-4 the projects, 5 the end (fractional in between)
//   window.__vkDock     0 when the figure sits large in the hero, 1 when it is docked in the margin
// and window.__vkGo(station, instant) to move the page to a station.
(() => {
  const SITE = window.SITE;
  const work = document.getElementById('work');
  const track = document.getElementById('track');
  const frames = [...track.children];
  const items = frames.filter(f => f.dataset.i);
  const N = frames.length;
  const ruler = document.getElementById('ruler');
  const label = document.getElementById('label');
  const hint = document.getElementById('hint');
  const desk = matchMedia('(min-width: 761px) and (hover: hover)');
  const wide = matchMedia('(min-width: 1180px) and (hover: hover)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = t => t * t * (3 - 2 * t);

  /* ---------- horizontal track ---------- */
  for (let i = 0; i < N * 4; i++) ruler.appendChild(document.createElement('i'));
  const win = document.createElement('span'); win.className = 'win'; ruler.appendChild(win);
  let span = 0, x0 = 0, target = 0, x = 0, cur = 0;
  function layout() {
    if (!desk.matches) { work.style.height = ''; hint.textContent = SITE.hintTouch; syncTouch(); return; }
    hint.textContent = SITE.hint;
    const fw = frames[0].offsetWidth, gap = parseFloat(getComputedStyle(track).gap);
    x0 = (innerWidth - fw) / 2;
    span = (N - 1) * (fw + gap);
    work.style.height = innerHeight + span * 1.15 + 'px';
    target = x = x0 - progress() * span;
    measureSlot();
  }
  function progress() {
    const r = work.getBoundingClientRect();
    return clamp(-r.top / (work.offsetHeight - innerHeight || 1));
  }
  function setLabel(i) {
    frames.forEach((f, k) => f.classList.toggle('cur', k === i));
    if (i === cur) return;
    const old = label.querySelector('span:not(.out)');
    const n = document.createElement('span'); n.className = 'in'; n.textContent = SITE.labels[i];
    label.appendChild(n); n.getBoundingClientRect(); n.className = '';
    if (old) { old.className = 'out'; setTimeout(() => old.remove(), 450); }
    cur = i;
  }
  function placeWin(p) { const rw = ruler.offsetWidth, ww = rw / N; win.style.width = ww + 'px'; win.style.left = p * (rw - ww) + 'px'; }
  function syncTouch() { const p = track.scrollLeft / (track.scrollWidth - track.clientWidth || 1); placeWin(p); setLabel(Math.round(p * (N - 1))); }
  track.addEventListener('scroll', () => { if (!desk.matches) syncTouch(); }, { passive: true });

  /* ---------- station + dock, fed every frame ---------- */
  function station() {
    const top = work.getBoundingClientRect().top + scrollY;
    if (scrollY <= top) return top ? scrollY / top : 1;
    if (!desk.matches) return 1 + clamp((scrollY - top) / Math.max(1, work.offsetHeight)) * (N - 1);
    return 1 + progress() * (N - 1);
  }
  window.__vkGo = (s, instant) => {
    const top = work.getBoundingClientRect().top + scrollY;
    const y = s <= 1 ? s * top : top + ((s - 1) / (N - 1)) * (work.offsetHeight - innerHeight);
    if (desk.matches || s <= 1) scrollTo({ top: y, behavior: instant ? 'instant' : 'smooth' });
    else frames[Math.round(s - 1)].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const fig = document.querySelector('[data-anatomy]');
  const slot = document.querySelector('.fig-slot');
  let slotW = 0, slotH = 0;
  function measureSlot() {
    fig.classList.remove('docked'); fig.style.transform = ''; fig.style.width = '';
    slot.style.height = '';
    slotW = fig.offsetWidth; slotH = fig.offsetHeight;
    slot.style.height = slotH + 'px';
  }
  function dock() {
    if (!wide.matches) { if (fig.classList.contains('docked')) measureSlot(); window.__vkDock = 0; return; }
    const s = slot.getBoundingClientRect();
    const t = smooth(clamp(scrollY / (innerHeight * 0.6)));
    const room = (innerWidth - Math.min(innerWidth - 32, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--col')))) / 2;
    const dockW = Math.min(SITE.dockWidth || 300, room - 56);
    const k = 1 + (dockW / slotW - 1) * t;
    const pad = 28;
    const dx = SITE.dock === 'right' ? innerWidth - pad - dockW : pad;
    const dy = SITE.dockY === 'top' ? pad + 40 : innerHeight - pad - slotH * (dockW / slotW);
    fig.classList.add('docked'); fig.style.width = slotW + 'px';
    const sx = s.left + (s.width - slotW) / 2;
    fig.style.transform = `translate(${(sx + (dx - sx) * t).toFixed(2)}px, ${(s.top + (dy - s.top) * t).toFixed(2)}px) scale(${k.toFixed(4)})`;
    window.__vkDock = t;
  }

  window.__vkStation = 0; window.__vkDock = 0;
  (function loop() {
    if (desk.matches) {
      x += (target - x) * 0.14;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      const p = span ? (x0 - x) / span : 0;
      placeWin(p); setLabel(Math.round(p * (N - 1)));
    }
    window.__vkStation = station();
    dock();
    requestAnimationFrame(loop);
  })();
  addEventListener('scroll', () => { if (desk.matches) target = x0 - progress() * span; }, { passive: true });
  addEventListener('resize', layout);

  /* figure: drag it or use the arrow keys to move through the site */
  let drag = null;
  fig.addEventListener('pointerdown', e => { if (!fig.classList.contains('docked') || window.__vkDock < 0.98) return; drag = { x: e.clientX, s: window.__vkStation }; fig.setPointerCapture(e.pointerId); fig.dataset.drag = ''; });
  fig.addEventListener('pointermove', e => { if (!drag) return; window.__vkGo(clamp(drag.s + (e.clientX - drag.x) / (SITE.dragPx || 60), 0, N), true); });
  const endDrag = () => { if (!drag) return; drag = null; delete fig.dataset.drag; window.__vkGo(Math.round(window.__vkStation)); };
  fig.addEventListener('pointerup', endDrag); fig.addEventListener('pointercancel', endDrag);
  addEventListener('keydown', e => {
    if (document.querySelector('.case')) return;
    const r = work.getBoundingClientRect();
    const inWork = r.top <= 1 && r.bottom >= innerHeight - 1;
    if (!inWork && document.activeElement !== fig) return;
    const here = Math.round(window.__vkStation);
    if (e.key === 'ArrowRight') { e.preventDefault(); window.__vkGo(Math.min(N, here + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); window.__vkGo(Math.max(0, here - 1)); }
  });
  ruler.addEventListener('click', e => { const r = ruler.getBoundingClientRect(); window.__vkGo(1 + Math.min(N - 1, Math.floor((e.clientX - r.left) / r.width * N))); });

  /* ---------- case view: a frame that grows to fill the screen ---------- */
  const cases = SITE.projects;
  let open = null;
  const rectOf = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
  const place = (el, r) => Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  function openCase(i) {
    const f = items[i], c = cases[i], img = f.querySelector('img');
    const el = document.createElement('div'); el.className = 'case';
    el.innerHTML = `
      <span class="tl">${SITE.caseTag(i)}</span><button class="close">Close</button>
      <div class="scroll">
        <div class="hero"><img class="${img.className}" src="${img.src}" alt=""></div>
        <div class="body"><div class="col">
          <p class="case-kicker">${SITE.caseKicker(i)}</p>
          <h2>${c.name}</h2><p class="lede gray">${c.lede}</p>
          <dl>${SITE.caseMeta.map(([k, f]) => `<div><dt>${k}</dt><dd>${c[f]}</dd></div>`).join('')}</dl>
          <div class="text">${c.text.map(t => `<p>${t}</p>`).join('')}</div>
          <div class="next"><span class="gray">${SITE.nextLabel}</span><button>${cases[(i + 1) % cases.length].name} →</button></div>
        </div></div>
      </div>`;
    place(el, rectOf(f));
    document.body.appendChild(el); document.body.classList.add('lock');
    f.style.opacity = 0; el.getBoundingClientRect();
    place(el, { left: 0, top: 0, width: innerWidth, height: innerHeight });
    setTimeout(() => el.classList.add('open'), 380);
    open = { el, f };
    el.querySelector('.close').onclick = () => closeCase();
    el.querySelector('.next button').onclick = () => { const n = (i + 1) % cases.length; closeCase(true); window.__vkGo(n + 1); setTimeout(() => openCase(n), 650); };
  }
  function closeCase(quick) {
    if (!open) return;
    const { el, f } = open; open = null;
    if (quick === true) { f.style.opacity = ''; el.remove(); document.body.classList.remove('lock'); return; }
    el.querySelector('.scroll').scrollTo({ top: 0 });
    el.classList.remove('open');
    setTimeout(() => { place(el, rectOf(f)); setTimeout(() => { f.style.opacity = ''; el.remove(); document.body.classList.remove('lock'); }, 660); }, 260);
  }
  items.forEach((f, i) => f.addEventListener('click', () => openCase(i)));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeCase(); });

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(layout);
  layout();
})();
