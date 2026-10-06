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
