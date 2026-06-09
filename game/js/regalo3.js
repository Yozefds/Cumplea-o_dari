/* ═══════════════════════════════════════════════
   regalo3.js — Juego: Encuentra el regalo
   ═══════════════════════════════════════════════ */

const Regalo3 = (() => {

  let config     = null;   // datos de regalo3.json
  let tried      = new Set(); // índices (1-based) ya intentados
  let solved     = false;
  let confettiRaf = null;

  // Config de respaldo si falla el fetch
  const FALLBACK_CONFIG = {
    imagenGanadora: 4,
    imagenes: [
      'img1.webp','img2.png','img3.png','img4.png',
      'img5.png','img6.png','img7.png'
    ],
    incorrectos: {
      '1': {
        titulo: '¡No era Lyney!',
        descripcion: 'Aunque Lyney es muy guapo, el regalo no estaba aquí. ¡Sigue buscando! 🃏'
      },
      '2': {
        titulo: '¡No era el Vagabundo!',
        descripcion: 'Wanderer tiene mucho estilo, pero el regalo no estaba escondido aquí. ¡Inténtalo de nuevo! 💨'
      },
      '3': {
        titulo: '¡Casi! Pero no...',
        descripcion: 'Estás muy cerca, el regalo se esconde entre los personajes favoritos. ¡No te rindas! ✨'
      },
      '5': {
        titulo: '¡Esta no era!',
        descripcion: '¡Qué cerca estabas! El regalo se esconde junto a tu personaje favorito. ¡Sigue intentando! 🌸'
      },
      '6': {
        titulo: '¡Nope! Sigue buscando',
        descripcion: 'El corazón guía hacia el personaje favorito. ¿Cuál será? Tú ya lo sabes... 💫'
      },
      '7': {
        titulo: '¡No era esta!',
        descripcion: 'El regalo verdadero lleva el nombre del viento. ¡Ya sabes cuál es! 🍃'
      }
    },
    ganador: {
      titulo: '¡GANASTE! 🎉',
      subtitulo: 'Ya que Venti es tu personaje favorito ❤️',
      descripcion: '¡Lo encontraste! Detrás de Venti se esconde tu regalo especial. Igual que el viento libre, el cual es tu personaje favorito. ¡Feliz cumpleaños, mi vida! ❤️🍃'
    }
  };

  // ── Init ──────────────────────────────────────

  async function init() {
    if (!config) {
      config = await loadConfig();
    }
    renderGrid();
  }

  async function loadConfig() {
    try {
      const res = await fetch('config/regalo3.json');
      if (!res.ok) throw new Error('fetch failed');
      return await res.json();
    } catch (_) {
      return FALLBACK_CONFIG;
    }
  }

  // ── Renderizar cuadrícula ─────────────────────

  function renderGrid() {
    const grid = document.getElementById('optionsGrid');
    grid.innerHTML = '';
    tried.clear();
    solved = false;

    const imgs = config.imagenes || [];

    imgs.forEach((filename, i) => {
      const idx = i + 1; // 1-based

      const item = document.createElement('div');
      item.className = 'option-item';
      item.id = 'opt-' + idx;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', 'Opción ' + idx);

      const img = document.createElement('img');
      img.src    = 'assets/opciones/' + filename;
      img.alt    = 'Opción ' + idx;
      img.loading = 'lazy';

      item.appendChild(img);

      item.addEventListener('click',   () => handleSelect(idx));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect(idx);
        }
      });

      grid.appendChild(item);
    });
  }

  // ── Manejar selección ─────────────────────────

  function handleSelect(idx) {
    if (tried.has(idx)) return;  // ya intentada
    if (solved) return;

    tried.add(idx);

    if (idx === config.imagenGanadora) {
      handleWin(idx);
    } else {
      markTried(idx);
      showWrongModal(idx);
    }
  }

  function markTried(idx) {
    const item = document.getElementById('opt-' + idx);
    if (item) item.classList.add('tried');
  }

  function markWinner(idx) {
    const item = document.getElementById('opt-' + idx);
    if (item) {
      item.classList.add('winner-flash');
      item.style.borderColor = '#fbbf24';
    }
  }

  // ── Victoria ──────────────────────────────────

  function handleWin(idx) {
    solved = true;
    markWinner(idx);

    const g = config.ganador;

    document.getElementById('winTitle').textContent    = g.titulo    || '¡GANASTE!';
    document.getElementById('winSubtitle').textContent = g.subtitulo || '';
    document.getElementById('winDesc').textContent     = g.descripcion || '';

    playSound('sfxWin');    // ding inmediato al acertar
    playSound('sfxFairy'); // magia del confeti

    setTimeout(() => {
      openModal('win');
      startConfetti();
    }, 600);
  }

  // ── Modal incorrecto ──────────────────────────

  function showWrongModal(idx) {
    const data = (config.incorrectos || {})[String(idx)] || {
      titulo: 'No era el correcto pero...',
      descripcion: '¡Sigue intentando!'
    };

    document.getElementById('wrongTitle').textContent = data.titulo;
    document.getElementById('wrongDesc').textContent  = data.descripcion;

    openModal('wrong');
  }

  // ── Control de modales ────────────────────────

  function openModal(which) {
    document.getElementById('modal-' + which).classList.remove('hidden');
  }

  // ── Confeti ───────────────────────────────────

  function startConfetti() {
    const canvas  = document.getElementById('confettiCanvas');
    const ctx     = canvas.getContext('2d');

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ['#ff6b9d','#c084fc','#fbbf24','#34d399','#60a5fa','#f87171'];
    const pieces = [];

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x:    Math.random() * canvas.width,
        y:    -10 - Math.random() * 200,
        w:    4 + Math.random() * 6,
        h:    8 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vy:   1.5 + Math.random() * 2.5,
        vx:   (Math.random() - 0.5) * 1.5,
        rot:  Math.random() * 360,
        rspd: (Math.random() - 0.5) * 8
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of pieces) {
        p.y   += p.vy;
        p.x   += p.vx;
        p.rot += p.rspd;

        if (p.y < canvas.height + 20) alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (alive) {
        confettiRaf = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    animate();
  }

  function stopConfetti() {
    if (confettiRaf) {
      cancelAnimationFrame(confettiRaf);
      confettiRaf = null;
    }
    const canvas = document.getElementById('confettiCanvas');
    const ctx    = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Audio ─────────────────────────────────────

  function playSound(id) {
    try {
      const el = document.getElementById(id);
      if (el) { el.currentTime = 0; el.play().catch(() => {}); }
    } catch (_) {}
  }

  // ── Reset ─────────────────────────────────────

  function reset() {
    tried.clear();
    solved = false;
    stopConfetti();

    // Re-renderizar si config ya está cargado
    if (config) renderGrid();
  }

  return { init, reset };
})();

// ── Funciones globales ────────────────────────────

function initRegalo3()  { Regalo3.init(); }
function resetRegalo3() { Regalo3.reset(); }

function closeModal(which) {
  document.getElementById('modal-' + which).classList.add('hidden');

  // Detener confeti al cerrar el modal de victoria
  if (which === 'win') {
    const canvas = document.getElementById('confettiCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}
