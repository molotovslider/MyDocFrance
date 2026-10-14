// Menu mobile
const burger = document.querySelector('.burger');
const menu = document.querySelector('.menu');
if (burger && menu) {
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  menu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => menu.classList.remove('open')));
}

// Année du pied de page
document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// En-tête flottant : plus opaque une fois le haut de page dépassé.
const onScroll = () => document.documentElement.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------- Animations ----------
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

// Apparition des blocs au défilement, en cascade dans chaque groupe.
if (!reduceMotion && 'IntersectionObserver' in window) {
  const targets = document.querySelectorAll(
    '.section h2, .section .intro, .card:not(.step), .audience, .cta, .stat, .legal > *');
  const groups = new Map();
  targets.forEach((el) => {
    el.classList.add('reveal');
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    groups.set(parent, i + 1);
    el.style.transitionDelay = `${Math.min(i, 6) * 90}ms`;
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  targets.forEach((el) => io.observe(el));
}

// Haut de page : un tracé de pouls balaie l'écran ; à chaque battement, des points lumineux
// s'en détachent et rejoignent le dossier (l'IA qui écoute et structure). Toile locale, aucun script tiers.
(() => {
  const canvas = document.querySelector('.hero-canvas');
  if (!canvas || !canvas.getContext) return;
  const hero = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, nodes = [], particles = [], running = true, last = performance.now(), head = 0, lastBeat = -1;
  const PERIOD = 360; // largeur d'un battement, en pixels
  const SPEED = 230; // vitesse du balayage, en pixels par seconde

  // Forme d'un battement (ondes P, QRS, T) ; valeur négative = vers le haut.
  const beat = (p) => {
    if (p < 0.10) return 0;
    if (p < 0.16) return -Math.sin(((p - 0.10) / 0.06) * Math.PI) * 0.10;
    if (p < 0.22) return 0;
    if (p < 0.24) return ((p - 0.22) / 0.02) * 0.15;
    if (p < 0.27) return 0.15 - ((p - 0.24) / 0.03) * 1.15;
    if (p < 0.30) return -1.0 + ((p - 0.27) / 0.03) * 1.35;
    if (p < 0.32) return 0.35 - ((p - 0.30) / 0.02) * 0.35;
    if (p < 0.44) return 0;
    if (p < 0.56) return -Math.sin(((p - 0.44) / 0.12) * Math.PI) * 0.22;
    return 0;
  };
  const base = () => h * (w < 1020 ? 0.9 : 0.8);
  const amp = () => Math.min(90, h * 0.1);
  const yAt = (x) => base() + beat(((x % PERIOD) + PERIOD) % PERIOD / PERIOD) * amp();
  const target = () => (w < 1020 ? { x: w * 0.5, y: h * 0.62 } : { x: w * 0.74, y: h * 0.5 });

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(60, Math.round((w * h) / 26000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.85,
      vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
    }));
  };

  const drawNetwork = () => {
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h * 0.85) n.vy *= -1;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 140) {
          ctx.strokeStyle = `rgba(103, 232, 249, ${(1 - d / 140) * 0.09})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(148, 197, 255, .35)';
      ctx.beginPath(); ctx.arc(nodes[i].x, nodes[i].y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  };

  const drawPulse = (full) => {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(45, 212, 191, .9)';
    const step = 4;
    for (let x = 0; x < w; x += step) {
      const age = full ? w * 0.3 : (((head - x) % w) + w) % w; // distance derrière la tête de lecture
      const alpha = full ? 0.55 : Math.max(0, 1 - age / (w * 0.85));
      if (alpha <= 0.01) continue;
      ctx.strokeStyle = `rgba(45, 212, 191, ${alpha})`;
      ctx.shadowBlur = 14 * alpha;
      ctx.beginPath(); ctx.moveTo(x, yAt(x)); ctx.lineTo(x + step, yAt(x + step)); ctx.stroke();
    }
    if (!full && Number.isFinite(head)) {
      const y = yAt(head);
      const g = ctx.createRadialGradient(head, y, 0, head, y, 26);
      g.addColorStop(0, 'rgba(204, 251, 241, 1)');
      g.addColorStop(1, 'rgba(45, 212, 191, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(head, y, 26, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  const emit = (x) => {
    const y = yAt(x) - amp() * 0.6;
    for (let i = 0; i < 16; i++) {
      particles.push({
        x, y, vx: (Math.random() - 0.3) * 1.2, vy: -1 - Math.random() * 1.6,
        life: 0, max: 150 + Math.random() * 120, r: 1 + Math.random() * 1.8,
      });
    }
  };

  const drawParticles = () => {
    const t = target();
    particles = particles.filter((p) => p.life < p.max);
    for (const p of particles) {
      p.life++;
      // attirées doucement vers le dossier
      p.vx += (t.x - p.x) * 0.00045;
      p.vy += (t.y - p.y) * 0.00045;
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;
      const a = Math.sin((p.life / p.max) * Math.PI) * 0.9;
      ctx.fillStyle = `rgba(165, 243, 252, ${a})`;
      ctx.shadowColor = 'rgba(103, 232, 249, .9)';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  };

  const frame = (now) => {
    if (!running) return;
    if (!w || !h) resize();
    if (!w || !h) { requestAnimationFrame(frame); return; } // toile pas encore dimensionnée
    if (!Number.isFinite(head)) head = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    head = (head + SPEED * dt) % w;
    // un battement franchi par la tête de lecture : émission de points
    const beatIndex = Math.floor((head - PERIOD * 0.27) / PERIOD);
    if (beatIndex !== lastBeat) {
      lastBeat = beatIndex;
      if (head > PERIOD * 0.27) emit(beatIndex * PERIOD + PERIOD * 0.27);
    }
    ctx.clearRect(0, 0, w, h);
    drawNetwork();
    drawPulse(false);
    drawParticles();
    requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', resize);
  if (reduceMotion) {
    drawNetwork();
    drawPulse(true);
    return;
  }
  const start = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } };
  const stop = () => { running = false; };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop())).observe(hero);
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  requestAnimationFrame(frame);

  // Léger effet de profondeur : le texte s'éloigne quand on descend.
  const copy = hero.querySelector('.hero-copy');
  if (copy) {
    window.addEventListener('scroll', () => {
      const y = Math.min(window.scrollY, h);
      copy.style.transform = `translateY(${y * 0.18}px)`;
      copy.style.opacity = String(Math.max(0, 1 - y / (h * 0.8)));
    }, { passive: true });
  }
})();

// Démonstration : la conversation s'affiche message par message et le compte-rendu se remplit.
const chat = document.getElementById('demo-chat');
if (chat) {
  const bubbles = [...chat.querySelectorAll('.bubble')];
  const typing = chat.querySelector('.typing');
  const foot = document.getElementById('demo-foot');
  const lines = [...document.querySelectorAll('#demo-dossier .dossier-line')];
  const showLine = (n) => lines.forEach((l) => { if (l.dataset.line === String(n)) l.classList.add('show'); });
  if (reduceMotion) {
    bubbles.forEach((b) => b.classList.add('show'));
    lines.forEach((l) => l.classList.add('show'));
    foot.classList.add('show');
  } else {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const play = async () => {
      for (;;) {
        bubbles.forEach((b) => { b.classList.remove('show'); b.style.display = 'none'; });
        lines.forEach((l) => l.classList.remove('show'));
        foot.classList.remove('show');
        await wait(700);
        for (const b of bubbles) {
          if (b.classList.contains('ai')) {
            typing.classList.add('show');
            chat.appendChild(typing);
            await wait(1100);
            typing.classList.remove('show');
          }
          b.style.display = '';
          chat.insertBefore(b, typing);
          await wait(30);
          b.classList.add('show');
          if (b.dataset.line) {
            await wait(450);
            showLine(b.dataset.line);
          }
          await wait(b.classList.contains('me') ? 900 : 700);
        }
        showLine(4);
        await wait(600);
        foot.classList.add('show');
        await wait(5000);
      }
    };
    play();
  }
}

// Comment ça marche : la scène suit l'étape lue au centre de l'écran.
(() => {
  const steps = [...document.querySelectorAll('.step[data-step]')];
  const scenes = [...document.querySelectorAll('.scene[data-scene]')];
  if (!steps.length || !scenes.length) return;
  const activate = (n) => {
    steps.forEach((s) => s.classList.toggle('is-active', s.dataset.step === n));
    scenes.forEach((s) => s.classList.toggle('is-active', s.dataset.scene === n));
  };
  activate('1');
  if (!('IntersectionObserver' in window)) return;
  const so = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) activate(e.target.dataset.step); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((s) => so.observe(s));
})();

// Chiffres clés : comptage animé à l'apparition.
const counters = document.querySelectorAll('[data-count]');
const format = (n) => n.toLocaleString('fr-FR');
const runCounter = (el) => {
  if (!el.dataset.count) return; // chiffre modifié depuis l'administration : pas d'animation
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  if (reduceMotion) { el.textContent = format(target) + suffix; return; }
  const start = performance.now();
  const step = (t) => {
    const p = Math.min((t - start) / 1400, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = format(Math.round(target * eased)) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
if ('IntersectionObserver' in window) {
  const co = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { runCounter(e.target); co.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  counters.forEach((el) => co.observe(el));
}

// ---------- Contenus modifiables depuis l'administration MyDoc ----------
// Les textes publiés sont lus en lecture seule ; le contenu de la page sert de secours.
// Sécurité : le texte est toujours inséré comme texte (jamais comme HTML) et seuls les liens
// https, mailto, tel et internes sont acceptés.
(() => {
  const BASE = 'https://firestore.googleapis.com/v1/projects/my-doc-4cf84/databases/(default)/documents/';
  const load = async (path) => {
    try {
      const r = await fetch(BASE + path, { cache: 'no-cache' });
      if (!r.ok) return null;
      const d = await r.json();
      return JSON.parse((d.fields && d.fields.json && d.fields.json.stringValue) || 'null');
    } catch (e) { return null; }
  };
  const safeHref = (h) => (typeof h === 'string' &&
    /^(https:\/\/|mailto:|tel:|#|\/(?!\/)|[a-z0-9_-]+\.html)/i.test(h.trim()) ? h.trim() : null);
  // **gras** et retours à la ligne ; adresses e-mail et liens https rendus cliquables.
  const rich = (el, text, links) => {
    el.textContent = '';
    String(text).split('\n').forEach((line, i) => {
      if (i) el.appendChild(document.createElement('br'));
      line.split(/\*\*(.+?)\*\*/).forEach((part, j) => {
        if (!part) return;
        const target = j % 2 ? el.appendChild(document.createElement('strong')) : el;
        if (!links) { target.appendChild(document.createTextNode(part)); return; }
        part.split(/(https:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+)/).forEach((bit, k) => {
          if (!bit) return;
          if (k % 2) {
            const a = document.createElement('a');
            a.textContent = bit;
            a.href = bit.startsWith('https://') ? bit : 'mailto:' + bit;
            if (bit.startsWith('https://')) { a.target = '_blank'; a.rel = 'noopener'; }
            target.appendChild(a);
          } else target.appendChild(document.createTextNode(bit));
        });
      });
    });
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) rich(e, text, true);
    return e;
  };
  const button = (text, href, cls) => {
    const url = safeHref(href);
    if (!text || !url) return null;
    const a = el('a', cls);
    a.textContent = text;
    a.href = url;
    if (url.startsWith('https://')) a.rel = 'noopener';
    return a;
  };

  // Page d'accueil. applyHome peut être rejouée (éditeur visuel de l'administration) :
  // chaque appel repart de zéro pour les sections masquées, le bandeau, les actualités et les ajouts.
  const editor = () => document.documentElement.classList.contains('cms-editor');
  const setField = (node, v) => {
    if (v === undefined || v === null) return;
    if (node.tagName === 'UL') {
      if (!Array.isArray(v)) return;
      node.textContent = '';
      v.filter(Boolean).forEach((item) => node.appendChild(el('li', '', item)));
    } else if (node.tagName === 'A') {
      if (typeof v.text === 'string') node.textContent = v.text;
      const url = safeHref(v.href);
      if (url) node.setAttribute('href', url);
    } else {
      node.removeAttribute('data-count');
      rich(node, v, false);
    }
  };
  window.mydocSetField = (key, v) => {
    const node = document.querySelector(`[data-cms="${key}"]`);
    if (node) setField(node, v);
  };
  const applyHome = (c, opts = {}) => {
    if (!c) return;
    const fields = c.fields || {};
    if (opts.fields !== false) {
      document.querySelectorAll('[data-cms]').forEach((node) => setField(node, fields[node.dataset.cms]));
    }
    // Sections masquées (dans l'éditeur : affichées en transparence).
    const hidden = new Set(c.hidden || []);
    document.querySelectorAll('[data-cms-section]').forEach((s) => {
      const off = hidden.has(s.dataset.cmsSection);
      if (editor()) s.classList.toggle('cms-hidden', off);
      else s.hidden = off;
    });
    // Bandeau d'annonce
    const a = c.announcement || {};
    const bar = document.querySelector('[data-cms-announce]');
    if (bar) {
      const link = bar.querySelector('.announce-link');
      link.hidden = true;
      bar.hidden = !(a.active && a.text);
      if (!bar.hidden) {
        rich(bar.querySelector('.announce-text'), a.text, false);
        const url = safeHref(a.href);
        if (url && a.linkText) { link.textContent = a.linkText; link.href = url; link.hidden = false; }
      }
    }
    // Actualités
    const news = (c.news || []).filter((n) => n && n.title);
    const box = document.querySelector('[data-cms-news]');
    if (box) {
      const grid = box.querySelector('.news');
      grid.textContent = '';
      box.querySelector('.news-title').textContent = c.newsTitle || 'Les nouvelles de MyDoc';
      news.forEach((n) => {
        const card = el('article', 'card news-item');
        if (n.date) {
          const d = new Date(n.date);
          card.appendChild(el('span', 'news-date')).textContent =
            isNaN(d) ? n.date : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        card.appendChild(el('h3')).textContent = n.title;
        if (n.text) card.appendChild(el('p', 'muted', n.text));
        const b = button(n.linkText, n.href, 'news-link');
        if (b) card.appendChild(b);
        grid.appendChild(card);
      });
      box.hidden = !news.length;
    }
    // Sections ajoutées
    const custom = document.querySelector('[data-cms-custom]');
    if (custom) {
      custom.textContent = '';
      (c.custom || []).filter((x) => x && x.title).forEach((x, i) => {
        const section = el('section', `section${i % 2 ? '' : ' alt'} custom-section`);
        const wrap = section.appendChild(el('div', 'wrap'));
        if (x.eyebrow) wrap.appendChild(el('span', 'eyebrow')).textContent = x.eyebrow;
        wrap.appendChild(el('h2')).textContent = x.title;
        if (x.text) x.text.split(/\n\s*\n/).forEach((para) => wrap.appendChild(el('p', 'intro', para)));
        const b = button(x.buttonText, x.href, 'btn btn-primary');
        if (b) wrap.appendChild(b);
        custom.appendChild(section);
      });
    }
  };
  window.mydocApplyHome = applyHome;
  if (document.querySelector('[data-cms]') && !window.MYDOC_EDITOR) {
    load('site/home').then((c) => applyHome(c));
  }

  // Pages juridiques
  const legal = document.querySelector('[data-legal]');
  if (legal) {
    const id = legal.dataset.legal;
    load('legal/' + id).then((doc) => {
      if (!doc || !Array.isArray(doc.blocks)) return;
      legal.textContent = '';
      let list = null;
      doc.blocks.forEach((b) => {
        if (b.t !== 'li') list = null;
        if (b.t === 'titre') {
          const h1 = document.querySelector(`[data-legal-title="${id}"]`);
          if (h1) h1.textContent = b.x;
        } else if (b.t === 'h') {
          legal.appendChild(el('h2')).textContent = b.x;
        } else if (b.t === 'li') {
          list = list || legal.appendChild(el('ul'));
          list.appendChild(el('li', '', b.x));
        } else {
          legal.appendChild(el('p', b.t === 'note' ? 'todo' : '', b.x));
        }
      });
      if (doc.updatedAt) {
        const d = new Date(doc.updatedAt);
        legal.appendChild(el('p', 'muted legal-version')).textContent =
          `Version ${doc.version || 1} du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      }
    });
  }
})();

// ---------- Mesure d'audience sans cookie (compteur MyDoc, aucune donnée personnelle) ----------
(() => {
  if (window.MYDOC_EDITOR) return; // aperçu de l'éditeur : pas une visite
  try {
    const today = new Date().toISOString().slice(0, 10);
    const first = localStorage.getItem('mydoc_visite') !== today; // seule la date est mémorisée
    localStorage.setItem('mydoc_visite', today);
    const body = JSON.stringify({ page: location.pathname, ref: document.referrer, first });
    navigator.sendBeacon('https://europe-west9-my-doc-4cf84.cloudfunctions.net/track',
      new Blob([body], { type: 'text/plain' }));
  } catch (e) { /* mesure facultative */ }
})();
