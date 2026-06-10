/* ═══════════════════════════════════════════════
   flappy.js — Mini juego Flappy Durin
   ═══════════════════════════════════════════════ */

const Flappy = (() => {

  // ── Constantes ────────────────────────────────
  const GRAVITY         = 0.38;
  const JUMP_FORCE      = -7.2;
  const PIPE_WIDTH      = 52;
  const PIPE_GAP_BASE   = 155;
  const SPEED_BASE      = 2.4;
  const SPEED_INCREMENT = 0.28;
  const PIPE_INTERVAL   = 1750;

  // ── Estado ────────────────────────────────────
  let canvas, ctx;
  let bird, pipes;
  let score, highScore, pipeSpeed;
  let gameState    = 'idle'; // idle | playing | gameover
  let lastTime     = null;
  let lastPipeTime = 0;
  let rafId        = null;
  let durInImg;
  let stars = [];

  const PAL = {
    skyTop:    '#0d0d2b',
    skyBot:    '#1a237e',
    pipeBody:  '#2d8a3e',
    pipeDark:  '#1a5c29',
    pipeLight: '#3dab52',
    groundTop: '#4a7c2f',
    groundDark:'#1a2e0d',
    groundLine:'#2d5a1b',
  };

  // ── Init ──────────────────────────────────────

  function init() {
    canvas = document.getElementById('flappyCanvas');
    ctx    = canvas.getContext('2d');

    durInImg = new Image();
    durInImg.src = 'assets/durin.webp';

    highScore = parseInt(localStorage.getItem('flappyHighScore') || '0');

    sizeCanvas();
    generateStars();
    setupInput();
    updateHUD();
    resetState();
    setOverlay('start');

    window.removeEventListener('resize',            handleResize);
    window.addEventListener   ('resize',            handleResize);
    window.removeEventListener('orientationchange', handleResize);
    window.addEventListener   ('orientationchange', handleResize);

    if (rafId) cancelAnimationFrame(rafId);
    gameState = 'idle';
    rafId = requestAnimationFrame(idleLoop);
  }

  // ── Canvas sizing ─────────────────────────────

  function sizeCanvas() {
    const wrap = document.getElementById('canvasWrap');
    const hud  = document.querySelector('.flappy-hud');

    // Usar dimensiones reales del wrap, con fallback a window
    const wrapW = wrap.clientWidth  || window.innerWidth;
    const wrapH = wrap.clientHeight || (window.innerHeight - (hud ? hud.offsetHeight : 44));

    const isLandscape = window.innerWidth > window.innerHeight;
    const maxW = Math.min(wrapW - 2, isLandscape ? 540 : 420);
    const maxH = Math.min(wrapH - 4, isLandscape ? 400 : 640);

    canvas.width  = Math.max(maxW, 200);
    canvas.height = Math.max(
      Math.min(maxH, Math.round(maxW * (isLandscape ? 0.72 : 1.5))),
      200
    );
  }

  function generateStars() {
    stars = [];
    for (let i = 0; i < 35; i++) {
      stars.push({
        x:       Math.random() * canvas.width,
        y:       Math.random() * canvas.height * 0.65,
        size:    Math.random() < 0.25 ? 2 : 1,
        twinkle: Math.random() < 0.4
      });
    }
  }

  function handleResize() {
    const screen = document.getElementById('screen-flappy');
    if (!screen || !screen.classList.contains('active')) return;

    sizeCanvas();
    generateStars();

    if (bird) {
      bird.x = canvas.width  * 0.25;
      if (gameState === 'idle') bird.y = canvas.height * 0.45;
    }
    if (gameState !== 'playing') drawFrame();
  }

  // ── Input ─────────────────────────────────────
  // PROBLEMA CLAVE EN MÓVIL: el overlay tapa el canvas, así que los
  // eventos se registran en el canvas-wrap (padre común) en lugar del canvas.
  // Se usa addEventListener con {passive: false} para poder llamar preventDefault.

  function setupInput() {
    const wrap = document.getElementById('canvasWrap');

    // Reset handlers previos para evitar duplicados al reingresar
    wrap.onclick = null;
    wrap.removeEventListener('touchstart', onWrapTouch);

    // Desktop: clic en cualquier parte del área de juego
    wrap.onclick = (e) => {
      if (isButtonTarget(e.target)) return;
      handleInput();
    };

    // Móvil: touch en cualquier parte del área de juego
    // {passive: false} es necesario para que preventDefault funcione
    wrap.addEventListener('touchstart', onWrapTouch, { passive: false });

    // Teclado
    document.removeEventListener('keydown', onKey);
    document.addEventListener   ('keydown', onKey);
  }

  // Referencia estable de la función touch (necesaria para removeEventListener)
  function onWrapTouch(e) {
    if (isButtonTarget(e.target)) return; // dejar que los botones del overlay funcionen
    e.preventDefault();   // evita scroll, zoom y click sintético duplicado
    handleInput();
  }

  // Verifica si el target es un botón (o está dentro de uno)
  function isButtonTarget(target) {
    return target && target.closest && !!target.closest('button, a, [role="button"]');
  }

  function onKey(e) {
    if (e.code !== 'Space') return;
    const screen = document.getElementById('screen-flappy');
    if (screen && screen.classList.contains('active')) {
      e.preventDefault();
      handleInput();
    }
  }

  function handleInput() {
    if (gameState === 'idle') {
      startGame();
    } else if (gameState === 'playing') {
      flap();
    }
    // gameover: nada, el usuario usa los botones del overlay
  }

  function flap() {
    bird.vy       = JUMP_FORCE;
    bird.rotation = -25;
    playSound('sfxFlap');
  }

  // ── Ciclo de juego ────────────────────────────

  function startGame() {
    setOverlay('none');
    resetState();
    gameState    = 'playing';
    lastTime     = null;
    lastPipeTime = 0;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(gameLoop);
  }

  function resetState() {
    score     = 0;
    pipeSpeed = SPEED_BASE;
    pipes     = [];

    bird = {
      x:        canvas.width  * 0.25,
      y:        canvas.height * 0.45,
      vy:       0,
      width:    42,
      height:   42,
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
    const dt = Math.min((ts - lastTime) / 16.667, 3);
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

    // Mover tuberías y detectar puntuación
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= pipeSpeed * dt;

      if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
        pipes[i].scored = true;
        score++;
        if (score % 5 === 0) pipeSpeed += SPEED_INCREMENT;
        updateHUD();
        playSound('sfxWin');
      }

      if (pipes[i].x + PIPE_WIDTH < 0) pipes.splice(i, 1);
    }

    if (isColliding()) triggerGameOver();
  }

  function spawnPipe() {
    const groundH = 62;
    const minH    = 55;
    const gap     = PIPE_GAP_BASE - Math.min(score * 0.5, 30);
    const maxTop  = canvas.height - groundH - gap - minH;
    const topH    = minH + Math.random() * (maxTop - minH);
    pipes.push({ x: canvas.width + 6, topH, gap, scored: false });
  }

  function isColliding() {
    const m  = 6;
    const bL = bird.x - bird.width  / 2 + m;
    const bR = bird.x + bird.width  / 2 - m;
    const bT = bird.y - bird.height / 2 + m;
    const bB = bird.y + bird.height / 2 - m;

    // Suelo y techo
    if (bT <= 0 || bB >= canvas.height - 62) return true;

    // Tuberías
    for (const p of pipes) {
      if (bR > p.x && bL < p.x + PIPE_WIDTH) {
        if (bT < p.topH)         return true;
        if (bB > p.topH + p.gap) return true;
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
    drawFrame();

    setTimeout(() => setOverlay('gameover'), 700);
  }

  // ── Dibujo ────────────────────────────────────

  function drawFrame() {
    if (!canvas || !ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    // Fondo
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   PAL.skyTop);
    grad.addColorStop(0.8, PAL.skyBot);
    grad.addColorStop(1,   '#283593');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Estrellas
    const now = Date.now();
    for (const s of stars) {
      ctx.globalAlpha = s.twinkle
        ? 0.4 + 0.6 * Math.abs(Math.sin(now / 1000 + s.x))
        : 0.85;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // Tuberías, suelo, pájaro
    for (const p of pipes) drawPipe(p, H);
    drawGround(W, H);
    drawBird();
  }

  function drawPipe(p, H) {
    const groundH  = 62;
    const botY     = p.topH + p.gap;
    const botH     = H - groundH - botY;
    const capH     = 18;
    const capExtra = 8;
    const capX     = p.x - capExtra / 2;
    const capW     = PIPE_WIDTH + capExtra;

    // Tubería superior
    ctx.fillStyle = PAL.pipeBody;  ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topH);
    ctx.fillStyle = PAL.pipeDark;  ctx.fillRect(p.x + PIPE_WIDTH - 10, 0, 10, p.topH);
    ctx.fillStyle = PAL.pipeLight; ctx.fillRect(p.x, 0, 7, p.topH);
    ctx.fillStyle = PAL.pipeBody;  ctx.fillRect(capX, p.topH - capH, capW, capH);
    ctx.fillStyle = PAL.pipeLight; ctx.fillRect(capX, p.topH - capH, 7, capH);
    ctx.fillStyle = PAL.pipeDark;  ctx.fillRect(capX + capW - 10, p.topH - capH, 10, capH);

    // Tubería inferior
    if (botH > 0) {
      ctx.fillStyle = PAL.pipeBody;  ctx.fillRect(p.x, botY, PIPE_WIDTH, botH);
      ctx.fillStyle = PAL.pipeDark;  ctx.fillRect(p.x + PIPE_WIDTH - 10, botY, 10, botH);
      ctx.fillStyle = PAL.pipeLight; ctx.fillRect(p.x, botY, 7, botH);
      ctx.fillStyle = PAL.pipeBody;  ctx.fillRect(capX, botY, capW, capH);
      ctx.fillStyle = PAL.pipeLight; ctx.fillRect(capX, botY, 7, capH);
      ctx.fillStyle = PAL.pipeDark;  ctx.fillRect(capX + capW - 10, botY, 10, capH);
    }
  }

  function drawGround(W, H) {
    const groundY = H - 62;
    ctx.fillStyle = PAL.groundDark; ctx.fillRect(0, groundY, W, 62);
    ctx.fillStyle = PAL.groundTop;  ctx.fillRect(0, groundY, W, 14);
    ctx.fillStyle = PAL.groundLine;
    for (let x = 0; x < W; x += 22) ctx.fillRect(x, groundY, 2, 14);
  }

  function drawBird() {
    if (!bird) return;
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation * Math.PI / 180);

    if (durInImg && durInImg.complete && durInImg.naturalWidth > 0) {
      ctx.drawImage(durInImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    } else {
      // Pájaro de respaldo
      ctx.fillStyle = '#ffd700'; ctx.fillRect(-20, -20, 40, 40);
      ctx.fillStyle = '#ff8800'; ctx.fillRect(-20,   0, 40, 20);
      ctx.fillStyle = '#ffffff'; ctx.fillRect( 10, -16,  8,  8);
      ctx.fillStyle = '#000000'; ctx.fillRect( 12, -14,  4,  4);
    }

    ctx.restore();
  }

  // ── HUD y overlays ────────────────────────────

  function updateHUD() {
    const s = document.getElementById('flappyScore');
    const r = document.getElementById('flappyRecord');
    if (s) s.textContent = 'PUNTOS: ' + (score || 0);
    if (r) r.textContent = 'RÉCORD: ' + (highScore || 0);
  }

  function setOverlay(which) {
    document.getElementById('flappyStart')
      .classList.toggle('hidden', which !== 'start');
    document.getElementById('flappyGameOver')
      .classList.toggle('hidden', which !== 'gameover');
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

    document.removeEventListener('keydown',            onKey);
    window.removeEventListener  ('resize',             handleResize);
    window.removeEventListener  ('orientationchange',  handleResize);

    const wrap = document.getElementById('canvasWrap');
    if (wrap) {
      wrap.onclick = null;
      wrap.removeEventListener('touchstart', onWrapTouch);
    }
  }

  return { init, restart, stop };
})();

// ── Funciones globales llamadas desde el HTML ─────
function initFlappy()    { Flappy.init();    }
function restartFlappy() { Flappy.restart(); }
function stopFlappy()    { Flappy.stop();    }
