/* ═══════════════════════════════════════════════
   carta.js — Lógica de la carta interactiva
   ═══════════════════════════════════════════════ */

const Carta = (() => {
  let opened = false;
  let typewriterTimer = null;
  let charIndex = 0;
  let fullText = '';

  const TYPING_SPEED = 38; // ms por carácter

  const FALLBACK_TEXT =
    `Mi amor más hermoso,
Hoy es tu día especial y quiero que sepas
que eres lo más bonito que tiene mi mundo.
Cada mañana que me despiero contigo
es un regalo que no merezco
pero que atesoro con todo mi corazón.

Tu risa ilumina mis días más oscuros.
Tu eres es mi lugar favorito del universo.
Y tus ojos... tus ojos son el hogar
donde siempre quiero perderme.

Gracias por existir.
Gracias por elegirme.
Gracias por ser exactamente tú.

Que este nuevo año de tu vida
esté lleno de todo lo que mereces,
que es nada menos que lo mejor
del mundo entero.

No tengo palabras suficientes
para decirte cuánto te amo.
Pero espero que estos tres regalos
te lo demuestren un poquito.
Feliz cumpleaños, mi vida. ❤️
Con todo mi amor.`;

  // ── Inicializar ──────────────────────────────

  function init() {
    reset();
  }

  // ── Abrir sobre ──────────────────────────────

  function openEnvelope() {
    if (opened) return;
    opened = true;

    const flap = document.getElementById('envFlap');
    const wrapper = document.getElementById('envelope-wrapper');

    // 1. Animar solapa
    flap.classList.add('open');

    // 2. Fade out del sobre
    setTimeout(() => {
      wrapper.classList.add('fade-out');
    }, 700);

    // 3. Mostrar carta
    setTimeout(() => {
      wrapper.style.display = 'none';
      const letterWrapper = document.getElementById('letter-wrapper');
      letterWrapper.classList.remove('hidden');
      loadAndType();
    }, 1200);
  }

  // ── Cargar texto y escribir ───────────────────

  async function loadAndType() {
    try {
      const res = await fetch('config/carta.txt');
      if (!res.ok) throw new Error('No se pudo cargar');
      fullText = await res.text();
    } catch (_) {
      fullText = FALLBACK_TEXT;
    }

    typeText();
  }

  function typeText() {
    const el = document.getElementById('letter-text');
    el.textContent = '';
    el.classList.remove('done');
    charIndex = 0;

    // Sonido de teclas en loop mientras se escribe
    startTypewriterSound();

    function step() {
      if (charIndex < fullText.length) {
        const ch = fullText[charIndex];
        if (ch === '\n') {
          el.innerHTML += '<br>';
        } else {
          el.appendChild(document.createTextNode(ch));
        }
        charIndex++;

        const wrapper = document.getElementById('letter-wrapper');
        wrapper.scrollTop = wrapper.scrollHeight;

        typewriterTimer = setTimeout(step, TYPING_SPEED);
      } else {
        el.classList.add('done');
        stopTypewriterSound();
      }
    }

    step();
  }

  function startTypewriterSound() {
    try {
      const sfx = document.getElementById('sfxTypewriter');
      if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }
    } catch (_) {}
  }

  function stopTypewriterSound() {
    try {
      const sfx = document.getElementById('sfxTypewriter');
      if (sfx) { sfx.pause(); sfx.currentTime = 0; }
    } catch (_) {}
  }

  // ── Clic en la carta: acelerar escritura ──────

  function skipTyping() {
    stopTypewriterSound();
    if (typewriterTimer) {
      clearTimeout(typewriterTimer);
      typewriterTimer = null;
    }
    if (charIndex < fullText.length) {
      const el = document.getElementById('letter-text');
      const remaining = fullText.substring(charIndex);
      const lines = remaining.split('\n');

      lines.forEach((line, i) => {
        if (i > 0) el.innerHTML += '<br>';
        el.appendChild(document.createTextNode(line));
      });

      charIndex = fullText.length;
      el.classList.add('done');

      const wrapper = document.getElementById('letter-wrapper');
      wrapper.scrollTop = wrapper.scrollHeight;
    }
  }

  // ── Resetear estado ───────────────────────────

  function reset() {
    opened = false;
    stopTypewriterSound();

    if (typewriterTimer) {
      clearTimeout(typewriterTimer);
      typewriterTimer = null;
    }

    fullText = '';
    charIndex = 0;

    // Restaurar sobre
    const wrapper = document.getElementById('envelope-wrapper');
    wrapper.style.display = '';
    wrapper.classList.remove('fade-out');
    document.getElementById('envFlap').classList.remove('open');

    // Ocultar carta
    const letterWrapper = document.getElementById('letter-wrapper');
    letterWrapper.classList.add('hidden');
    document.getElementById('letter-text').innerHTML = '';
  }

  return { init, openEnvelope, skipTyping, reset };
})();

// ── Funciones globales ────────────────────────────

function initCarta() {
  Carta.init();
}

function openEnvelope() {
  Carta.openEnvelope();
}

function resetCarta() {
  Carta.reset();
}
