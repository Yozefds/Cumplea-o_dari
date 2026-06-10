/* ═══════════════════════════════════════════════
   flappy.js — Mini juego Flappy Durin
   ═══════════════════════════════════════════════ */

const Flappy = (() => {

  // ── Constantes de física ──────────────────────
  const GRAVITY         = 0.38;
  const JUMP_FORCE      = -7.2;
  const PIPE_WIDTH      = 52;
  const PIPE_GAP_BASE   = 155;
  const SPEED_BASE      = 2.4;
  const SPEED_INCREMENT = 0.28;   // +velocidad cada 5 puntos
  const PIPE_INTERVAL   = 1750;   // ms entre pipes

  // ── Variables de estado ───────────────────────
  let canvas, ctx;
  let bird, pipes;
  let score, highScore, pipeSpeed;
  let gameState = 'idle'; // idle | playing | gameover
  let lastTime = null;
  let lastPipeTime = 0;
  let rafId = null;
  let durInImg;

  // ── Paleta pixel art ──────────────────────────
  const PAL = {
    skyTop:    '#0d0d2b',
    skyBot:    '#1a237e',
    pipeBody:  '#2d8a3e',
    pipeDark:  '#1a5c29',
    pipeLight: '#3dab52',
    groundTop: '#4a7c2f',
    groundDark:'#1a2e0d',
    groundLine:'#2d5a1b',
    starColor: 'rgba(255,255,255,0.85)',
    hudText:   '#ffd700',
  };

  // Posiciones de estrellas (generadas una vez)
  let stars = [];

  // ── Init ──────────────────────────────────────

  function init() {
    canvas = document.getElementById('flappyCanvas');
    ctx    = canvas.getContext('2d');

    // Imagen del pájaro
    durInImg = new Image();
    durInImg.src = 'assets/durin.webp';

    // High score desde localStorage
    highScore = parseInt(localStorage.getItem('flappyHighScore') || '0');

    sizeCanvas();
    generateStars();
    setupInput();
    updateHUD();

    resetState();

    // Mostrar pantalla de inicio
    setOverlay('start');

    // Reajustar canvas al girar/redimensionar
    window.removeEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    // Bucle de animación idle (pájaro flotando)
    if (rafId) cancelAnimationFrame(rafId);
    gameState = 'idle';
    rafId = requestAnimationFrame(idleLoop);
  }

  function handleResize() {
    const screen = document.getElementById('screen-flappy');
    if (!screen || !screen.classList.contains('active')) return;

    sizeCanvas();
    generateStars();

    // Reposicionar pájaro proporcionalmente
    if (bird) {
      bird.x = canvas.width  * 0.25;
      if (gameState === 'idle') bird.y = canvas.height * 0.45;
    }
  }

  function sizeCanvas() {
    const wrap   = document.getElementById('canvasWrap');
    const hudH   = document.querySelector('.flappy-hud')?.offsetHeight || 44;
    const availH = window.innerHeight - hudH;

    // En landscape el canvas es ancho; en portrait es alto
    const isLandscape = window.innerWidth > window.innerHeight;
    const maxW = Math.min(wrap.clientWidth - 2, isLandscape ? 540 : 400);
    const maxH = Math.min(availH - 4, isLandscape ? 380 : 620);

    canvas.width  = maxW;
    canvas.height = Math.min(maxH, Math.round(maxW * (isLandscape ? 0.7 : 1.45)));
  }

  function generateStars() {
    stars = [];
    // Distribución determinista con pseudo-aleatoriedad basada en índice
    for (let i = 0; i < 35; i++) {
      stars.push({
        x: ((i * 137.5 + 23) % 1) * canvas.width || ((i * 0.618 + 0.1) * canvas.width) % canvas.width,
        y: ((i * 97.3  + 17) % 1) * (canvas.height * 0.65) || ((i * 0.382 + 0.05) * canvas.height * 0.65) % (canvas.height * 0.65),
        size: i % 4 === 0 ? 2 : 1,
        twinkle: i % 3 === 0
      });
    }
    // Rellenar con Math.random ya que las estrellas se regeneran en cada init
    stars = [];
    for (let i = 0; i < 35; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.65,
        size: Math.random() < 0.25 ? 2 : 1,
        twinkle: Math.random() < 0.4
      });
    }
  }

  // ── Input (clic, teclado, touch) ──────────────

  function setupInput() {
    canvas.onclick      = handleInput;
    canvas.ontouchstart = (e) => { e.preventDefault(); handleInput(); };

    // Evitar acumulación de listeners al entrar múltiples veces
    document.removeEventListener('keydown', onKey);
    document.addEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.code === 'Space') {
      const screen = document.getElementById('screen-flappy');
      if (screen && screen.classList.contains('active')) {
        e.preventDefault();
        handleInput();
      }
    }
  }

  function handleInput() {
    if (gameState === 'idle') {
      startGame();
    } else if (gameState === 'playing') {
      flap();
    }
  }

  // ── Acciones del pájaro ───────────────────────

  function flap() {
    bird.vy = JUMP_FORCE;
    bird.rotation = -25;
    playSound('sfxFlap');
  }

  // ── Ciclo de juego ────────────────────────────

  function startGame() {
    setOverlay('none');
    resetState();
    gameState = 'playing';
    lastTime  = null;
    lastPipeTime = 0;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(gameLoop);
  }

  function resetState() {
    score     = 0;
    pipeSpeed = SPEED_BASE;
    pipes     = [];

    bird = {
      x:        canvas.width * 0.25,
      y:        canvas.height * 0.45,
      vy:       0,
      width:    44,
      height:   44,
      rotation: 0
    };
  }

  function idleLoop(ts) {
    if (gameState !== 'idle') return;
    bird.y = canvas.height * 0.45 + Math.sin(ts / 600) * 12;
    drawFrame();
    rafId = requestAnimationFrame(idleLoop);
  }

  function gameLoop(ts) {
    if (gameState !== 'playing') return;

    if (!lastTime) lastTime = ts;
    const rawDt = (ts - lastTime) / 16.667;
    const dt    = Math.min(rawDt, 3); // cap para no saltar demasiado
    lastTime = ts;

    updateGame(dt, ts);
    drawFrame();

    rafId = requestAnimationFrame(gameLoop);
  }

  function updateGame(dt, ts) {
    // Física del pájaro
    bird.vy       += GRAVITY * dt;
    bird.y        += bird.vy * dt;
    bird.rotation  = Math.max(-28, Math.min(85, bird.vy * 4.5));

    // Generar tuberías
    if (ts - lastPipeTime > PIPE_INTERVAL) {
      spawnPipe();
      lastPipeTime = ts;
    }

    // Mover y puntuar tuberías
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= pipeSpeed * dt;

      if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
        pipes[i].scored = true;
        score++;
        if (score % 5 === 0) pipeSpeed += SPEED_INCREMENT;
        updateHUD();
        playSound('sfxWin'); // pequeño sonido de punto
      }

      if (pipes[i].x + PIPE_WIDTH < 0) pipes.splice(i, 1);
    }

    // Colisión
    if (isColliding()) {
      triggerGameOver();
    }
  }

  function spawnPipe() {
    const groundH = 62;
    const min     = 55;
    const gap     = PIPE_GAP_BASE - Math.min(score * 0.5, 30); // se estrecha un poco
    const maxTop  = canvas.height - groundH - gap - min;
    const topH    = min + Math.random() * (maxTop - min);

    pipes.push({ x: canvas.width + 6, topH, gap, scored: false });
  }

  function isColliding() {
    const margin = 6;
    const bL = bird.x - bird.width  / 2 + margin;
    const bR = bird.x + bird.width  / 2 - margin;
    const bT = bird.y - bird.height / 2 + margin;
    const bB = bird.y + bird.height / 2 - margin;

    // Techo y suelo
    if (bT <= 0 || bB >= canvas.height - 62) return true;

    for (const p of pipes) {
      if (bR > p.x && bL < p.x + PIPE_WIDTH) {
        if (bT < p.topH)              return true; // tubería superior
        if (bB > p.topH + p.gap)      return true; // tubería inferior
      }
    }
    return false;
  }

  function triggerGameOver() {
    gameState = 'gameover';
    playSound('sfxHit');

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('flappyHighScore', String(highScore));
    }

    document.getElementById('finalScore').textContent  = score;
    document.getElementById('finalRecord').textContent = highScore;
    updateHUD();

    // Dibujar frame final
    drawFrame();

    setTimeout(() => setOverlay('gameover'), 700);
  }

  // ── Dibujo ────────────────────────────────────

  function drawFrame() {
    const W = canvas.width;
    const H = canvas.height;

    // Fondo cielo degradado
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   PAL.skyTop);
    grad.addColorStop(0.8, PAL.skyBot);
    grad.addColorStop(1,   '#283593');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Estrellas
    for (const s of stars) {
      const alpha = s.twinkle
        ? 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 1000 + s.x))
        : 0.85;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = PAL.starColor;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // Tuberías
    for (const p of pipes) drawPipe(p, H);

    // Suelo
    drawGround(W, H);

    // Pájaro
    drawBird();
  }

  function drawPipe(p, H) {
    const groundH = 62;
    const botY    = p.topH + p.gap;
    const botH    = H - groundH - botY;
    const capH    = 18;
    const capExtra = 8; // cap más ancho
    const capX    = p.x - capExtra / 2;
    const capW    = PIPE_WIDTH + capExtra;

    // ── Tubería superior ──
    // Cuerpo
    ctx.fillStyle = PAL.pipeBody;
    ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topH);
    // Sombra derecha
    ctx.fillStyle = PAL.pipeDark;
    ctx.fillRect(p.x + PIPE_WIDTH - 10, 0, 10, p.topH);
    // Brillo izquierdo
    ctx.fillStyle = PAL.pipeLight;
    ctx.fillRect(p.x, 0, 7, p.topH);
    // Cap inferior de la tubería superior
    ctx.fillStyle = PAL.pipeBody;
    ctx.fillRect(capX, p.topH - capH, capW, capH);
    ctx.fillStyle = PAL.pipeLight;
    ctx.fillRect(capX, p.topH - capH, 7, capH);
    ctx.fillStyle = PAL.pipeDark;
    ctx.fillRect(capX + capW - 10, p.topH - capH, 10, capH);

    // ── Tubería inferior ──
    // Cuerpo
    ctx.fillStyle = PAL.pipeBody;
    ctx.fillRect(p.x, botY, PIPE_WIDTH, botH);
    ctx.fillStyle = PAL.pipeDark;
    ctx.fillRect(p.x + PIPE_WIDTH - 10, botY, 10, botH);
    ctx.fillStyle = PAL.pipeLight;
    ctx.fillRect(p.x, botY, 7, botH);
    // Cap superior de la tubería inferior
    ctx.fillStyle = PAL.pipeBody;
    ctx.fillRect(capX, botY, capW, capH);
    ctx.fillStyle = PAL.pipeLight;
    ctx.fillRect(capX, botY, 7, capH);
    ctx.fillStyle = PAL.pipeDark;
    ctx.fillRect(capX + capW - 10, botY, 10, capH);
  }

  function drawGround(W, H) {
    const groundY = H - 62;

    // Tierra oscura
    ctx.fillStyle = PAL.groundDark;
    ctx.fillRect(0, groundY, W, 62);

    // Franja verde superior
    ctx.fillStyle = PAL.groundTop;
    ctx.fillRect(0, groundY, W, 14);

    // Líneas de cuadrícula
    ctx.fillStyle = PAL.groundLine;
    for (let x = 0; x < W; x += 22) {
      ctx.fillRect(x, groundY, 2, 14);
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation * Math.PI / 180);

    if (durInImg && durInImg.complete && durInImg.naturalWidth > 0) {
      ctx.drawImage(
        durInImg,
        -bird.width / 2, -bird.height / 2,
        bird.width, bird.height
      );
    } else {
      // Pájaro pixel art de respaldo
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-20, -20, 40, 40);
      ctx.fillStyle = '#ff8800';
      ctx.fillRect(-20, 0, 40, 20);
      ctx.fillStyle = '#fff';
      ctx.fillRect(10, -16, 8, 8);
      ctx.fillStyle = '#000';
      ctx.fillRect(12, -14, 4, 4);
    }

    ctx.restore();
  }

  // ── HUD ───────────────────────────────────────

  function updateHUD() {
    const scoreEl  = document.getElementById('flappyScore');
    const recordEl = document.getElementById('flappyRecord');
    if (scoreEl)  scoreEl.textContent  = 'PUNTOS: ' + score;
    if (recordEl) recordEl.textContent = 'RÉCORD: ' + highScore;
  }

  // ── Overlays ──────────────────────────────────

  function setOverlay(which) {
    document.getElementById('flappyStart').classList.toggle('hidden', which !== 'start');
    document.getElementById('flappyGameOver').classList.toggle('hidden', which !== 'gameover');
  }

  // ── Audio ─────────────────────────────────────

  function playSound(id) {
    try {
      const el = document.getElementById(id);
      if (el) { el.currentTime = 0; el.play().catch(() => {}); }
    } catch (_) {}
  }

  // ── API pública ───────────────────────────────

  function restart() {
    setOverlay('none');
    startGame();
  }

  function stop() {
    gameState = 'idle';
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', handleResize);
  }

  return { init, restart, stop };
})();

// ── Funciones globales ────────────────────────────

function initFlappy()    { Flappy.init(); }
function restartFlappy() { Flappy.restart(); }
function stopFlappy()    { Flappy.stop(); }
