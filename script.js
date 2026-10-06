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

// ---------- Animations ----------
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

// Apparition des blocs au défilement, en cascade dans chaque groupe.
if (!reduceMotion && 'IntersectionObserver' in window) {
  const targets = document.querySelectorAll(
    '.section h2, .section .intro, .card, .audience, .cta, .stat, .legal > *');
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

// Conversation de démonstration : les messages s'affichent un par un, en boucle.
const chat = document.getElementById('demo-chat');
if (chat) {
  const bubbles = [...chat.querySelectorAll('.bubble')];
  const typing = chat.querySelector('.typing');
  const foot = document.getElementById('demo-foot');
  if (reduceMotion) {
    bubbles.forEach((b) => b.classList.add('show'));
    foot.classList.add('show');
  } else {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const play = async () => {
      for (;;) {
        bubbles.forEach((b) => { b.classList.remove('show'); b.style.display = 'none'; });
        foot.classList.remove('show');
        await wait(600);
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
          await wait(b.classList.contains('me') ? 900 : 700);
        }
        foot.classList.add('show');
        await wait(4500);
      }
    };
    play();
  }
}

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

  // Page d'accueil
  if (document.querySelector('[data-cms]')) {
    load('site/home').then((c) => {
      if (!c) return;
      const fields = c.fields || {};
      document.querySelectorAll('[data-cms]').forEach((node) => {
        const v = fields[node.dataset.cms];
        if (v === undefined || v === null) return;
        if (node.tagName === 'UL') {
          if (!Array.isArray(v)) return;
          node.textContent = '';
          v.filter(Boolean).forEach((item) => node.appendChild(el('li', '', item)));
        } else if (node.tagName === 'A') {
          if (v.text) node.textContent = v.text;
          const url = safeHref(v.href);
          if (url) node.href = url;
        } else {
          node.removeAttribute('data-count');
          rich(node, v, false);
        }
      });
      (c.hidden || []).forEach((id) => {
        const s = document.querySelector(`[data-cms-section="${id}"]`);
        if (s) s.hidden = true;
      });
      // Bandeau d'annonce
      const a = c.announcement || {};
      const bar = document.querySelector('[data-cms-announce]');
      if (bar && a.active && a.text) {
        rich(bar.querySelector('.announce-text'), a.text, false);
        const link = bar.querySelector('.announce-link');
        const url = safeHref(a.href);
        if (url && a.linkText) { link.textContent = a.linkText; link.href = url; link.hidden = false; }
        bar.hidden = false;
      }
      // Actualités
      const news = (c.news || []).filter((n) => n && n.title);
      const box = document.querySelector('[data-cms-news]');
      if (box && news.length) {
        if (c.newsTitle) box.querySelector('.news-title').textContent = c.newsTitle;
        const grid = box.querySelector('.news');
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
        box.hidden = false;
      }
      // Sections ajoutées
      const custom = document.querySelector('[data-cms-custom]');
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
    });
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
  try {
    const today = new Date().toISOString().slice(0, 10);
    const first = localStorage.getItem('mydoc_visite') !== today; // seule la date est mémorisée
    localStorage.setItem('mydoc_visite', today);
    const body = JSON.stringify({ page: location.pathname, ref: document.referrer, first });
    navigator.sendBeacon('https://europe-west9-my-doc-4cf84.cloudfunctions.net/track',
      new Blob([body], { type: 'text/plain' }));
  } catch (e) { /* mesure facultative */ }
})();
