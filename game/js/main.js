/* ═══════════════════════════════════════════════
   main.js — Controlador principal de la app
   Maneja: navegación, partículas, música, menú
   ═══════════════════════════════════════════════ */

// ── Estado global ────────────────────────────────
const App = {
  currentScreen: 'menu',
  musicEnabled: false,
  transitioning: false
};

// ── Navegación entre pantallas ───────────────────

function goToScreen(screenId) {
  if (App.transitioning) return;
  if (App.currentScreen === screenId) return;

  App.transitioning = true;
  const overlay = document.getElementById('transition-overlay');

  // Fade a negro
  overlay.classList.add('active');

  setTimeout(() => {
    // Ocultar pantalla actual
    const current = document.getElementById('screen-' + App.currentScreen);
    if (current) current.classList.remove('active');

    // Mostrar nueva pantalla
    const next = document.getElementById('screen-' + screenId);
    if (next) next.classList.add('active');

    App.currentScreen = screenId;

    // Fade desde negro
    setTimeout(() => {
      overlay.classList.remove('active');
      App.transitioning = false;

      // Acciones al entrar a una pantalla
      onScreenEnter(screenId);
    }, 80);
  }, 350);
}

// Callback al entrar en cada pantalla
function onScreenEnter(screenId) {
  if (screenId === 'menu') {
    createFloatingHearts();
  }
}

// ── Router de regalos ─────────────────────────────

function openGift(n) {
  playClick();
  switch (n) {
    case 1:
      goToScreen('carta');
      setTimeout(initCarta, 400);
      break;
    case 2:
      goToScreen('flappy');
      setTimeout(initFlappy, 400);
      break;
    case 3:
      goToScreen('regalo3');
      setTimeout(initRegalo3, 400);
      break;
  }
}

// ── Música ───────────────────────────────────────

function toggleMusic() {
  const music = document.getElementById('bgMusic');
  const btn = document.getElementById('musicToggle');
  App.musicEnabled = !App.musicEnabled;

  if (App.musicEnabled) {
    music.play().catch(() => { App.musicEnabled = false; });
    btn.textContent = '🎵';
    btn.classList.remove('muted');
  } else {
    music.pause();
    btn.textContent = '🔇';
    btn.classList.add('muted');
  }
}

function playClick() {
  playSound('sfxClick');
}

function playSound(id) {
  try {
    const el = document.getElementById(id);
    if (el) { el.currentTime = 0; el.play().catch(() => {}); }
  } catch (_) {}
}

// ── Partículas de fondo ───────────────────────────

function initParticles() {
  const container = document.getElementById('particles-container');
  const colors = ['#ff6b9d', '#c084fc', '#fbbf24', '#60a5fa', '#34d399'];
  const count = window.innerWidth < 600 ? 18 : 30;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';

    const size = Math.random() * 5 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 8;
    const duration = 8 + Math.random() * 10;

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${left}%;
      top: -10px;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      opacity: 0.7;
      box-shadow: 0 0 ${size * 2}px ${color};
    `;

    container.appendChild(p);
  }
}

// ── Estrellas del menú ─────────────────────────────

function initMenuStars() {
  const container = document.getElementById('menuStars');
  const count = window.innerWidth < 600 ? 40 : 70;

  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star-px';

    const size = Math.random() < 0.3 ? 3 : 2;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const delay = Math.random() * 4;
    const duration = 2 + Math.random() * 3;

    star.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x}%;
      top: ${y}%;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;

    container.appendChild(star);
  }
}

// ── Corazones flotantes del menú ───────────────────

function createFloatingHearts() {
  const container = document.getElementById('floatingHearts');
  container.innerHTML = '';
  const hearts = ['❤️', '💕', '💖', '💗', '💝'];
  const count = window.innerWidth < 600 ? 8 : 14;

  for (let i = 0; i < count; i++) {
    const h = document.createElement('div');
    h.className = 'heart-float';
    h.textContent = hearts[Math.floor(Math.random() * hearts.length)];

    const left = 5 + Math.random() * 90;
    const delay = Math.random() * 6;
    const duration = 6 + Math.random() * 8;
    const size = 14 + Math.floor(Math.random() * 14);

    h.style.cssText = `
      left: ${left}%;
      bottom: -30px;
      font-size: ${size}px;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;

    container.appendChild(h);
  }
}

// ── Inicialización ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initMenuStars();
  createFloatingHearts();

  document.getElementById('btnStart').addEventListener('click', () => {
    playClick();
    playSound('sfxStart');
    goToScreen('gifts');
  });

  document.getElementById('musicToggle').addEventListener('click', toggleMusic);

  // Teclado accesibilidad en gift cards
  document.querySelectorAll('.gift-card').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Teclado accesibilidad en envelope
  const envelope = document.getElementById('envelope');
  if (envelope) {
    envelope.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEnvelope();
      }
    });
  }
});
