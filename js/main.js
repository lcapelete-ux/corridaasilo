/* ===================================
   CORRIDA DO ASILO — main.js
   =================================== */

'use strict';

/* ---- Configurações do evento ---- */
const DATA_EVENTO = new Date('2026-08-23T07:00:00'); // Altere para a data real

/* ---- Utilitários ---- */
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

/* ---- Ano no footer ---- */
const anoEl = qs('#anoFooter');
if (anoEl) anoEl.textContent = new Date().getFullYear();

/* ---- Data do evento formatada ---- */
const dataEventoEl = qs('#dataEvento');
if (dataEventoEl) {
  dataEventoEl.textContent = DATA_EVENTO.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

/* ---- Scroll: header shadow + back-to-top ---- */
const header  = qs('.header');
const backTop = qs('#backTop');

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  header?.classList.toggle('scrolled', y > 60);
  backTop?.classList.toggle('visible', y > 400);
}, { passive: true });

/* ---- Menu mobile ---- */
const navToggle = qs('#navToggle');
const navList   = qs('#navList');

navToggle?.addEventListener('click', () => {
  navList?.classList.toggle('open');
  navToggle.setAttribute('aria-expanded',
    navList?.classList.contains('open') ? 'true' : 'false');
});

// Fechar ao clicar num link
qsa('.nav__list a').forEach(link => {
  link.addEventListener('click', () => navList?.classList.remove('open'));
});

/* ---- Countdown ---- */
function updateCountdown() {
  const diff = DATA_EVENTO - Date.now();

  if (diff <= 0) {
    qs('#cdDias').textContent = '00';
    qs('#cdHoras').textContent = '00';
    qs('#cdMin').textContent  = '00';
    qs('#cdSeg').textContent  = '00';
    return;
  }

  const dias  = Math.floor(diff / 86400000);
  const horas = Math.floor((diff % 86400000) / 3600000);
  const min   = Math.floor((diff % 3600000)  / 60000);
  const seg   = Math.floor((diff % 60000)    / 1000);

  const fmt = n => String(n).padStart(2, '0');

  qs('#cdDias').textContent  = fmt(dias);
  qs('#cdHoras').textContent = fmt(horas);
  qs('#cdMin').textContent   = fmt(min);
  qs('#cdSeg').textContent   = fmt(seg);
}
updateCountdown();
setInterval(updateCountdown, 1000);

/* ---- Contadores animados ---- */
function animateCounter(el, target, suffix = '', duration = 1800) {
  if (!el) return;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    counterObserver.unobserve(entry.target);
    animateCounter(qs('#countParticipantes'), 450, '+');
    animateCounter(qs('#countKm'), 21);
    animateCounter(qs('#countIdosos'), 60, '+');
    animateCounter(qs('#countIdosos2'), 60, '+');
  });
}, { threshold: 0.3 });

const heroStats = qs('.hero__stats');
if (heroStats) counterObserver.observe(heroStats);

/* ---- Barras de progresso (causa) ---- */
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    barObserver.unobserve(entry.target);
    qsa('.meta__fill').forEach(fill => {
      const pct = fill.dataset.pct || 0;
      // Pequeno delay para não animar antes da transição CSS
      setTimeout(() => { fill.style.width = pct + '%'; }, 100);
    });
  });
}, { threshold: 0.4 });

const causaMetas = qs('.causa__metas');
if (causaMetas) barObserver.observe(causaMetas);

/* ---- Formulário de inscrição ---- */
const form       = qs('#formInscricao');
const formSuccess = qs('#formSuccess');
const btnSubmit  = qs('#btnSubmit');

form?.addEventListener('submit', (e) => {
  e.preventDefault();

  // Validação simples
  let valid = true;
  qsa('[required]', form).forEach(field => {
    if (!field.value.trim() || (field.type === 'checkbox' && !field.checked)) {
      field.style.borderColor = '#e8340a';
      valid = false;
    } else {
      field.style.borderColor = '';
    }
  });

  if (!valid) {
    qsa('[required]', form).find(f => !f.value.trim() || (f.type === 'checkbox' && !f.checked))
      ?.focus();
    return;
  }

  // Simula envio
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Enviando...';

  setTimeout(() => {
    form.reset();
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Enviar inscrição';
    formSuccess.hidden = false;
    formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setTimeout(() => { formSuccess.hidden = true; }, 6000);
  }, 1500);
});

/* ---- Limpa erro ao digitar ---- */
qsa('[required]', form || document).forEach(field => {
  field.addEventListener('input', () => field.style.borderColor = '');
});

/* ---- Animação de seções ao scroll (fade-in) ---- */
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

qsa('.card, .info-card, .percurso, .stat').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  fadeObserver.observe(el);
});

document.addEventListener('animationend', () => {}, false);

// Adiciona classe visible via IntersectionObserver
const style = document.createElement('style');
style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
document.head.appendChild(style);
