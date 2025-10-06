import React, { useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from "react";

/**
 * GameUIShell — Visual-only React component for your Numbers Game
 * ---------------------------------------------------------------
 * ✔ Keeps your existing logic. Do not change it.
 * ✔ Exposes a simple imperative API via ref (or onReady callback):
 *    api = {
 *      setTimer(seconds:number),
 *      setSpeed(player:number, robber:number),
 *      setGap(meters:number),
 *      onCorrect(solveTimeMs:number),
 *      onWrong(),
 *      setQuestion(text:string),
 *      setStreak(n:number),
 *      setTheme(partialTheme:Partial<Theme>)
 *    }
 *
 * Drop it into your tree and call those methods from your existing game logic.
 */

const defaultTheme = {
  groundColor: "#243156",
  skyStars: 90,
  bgLayers: [
    { color: "#0e1735", h: 220, speed: 0.15 },
    { color: "#14224b", h: 180, speed: 0.25 },
    { color: "#1a2d61", h: 140, speed: 0.4 },
  ],
  playerTint: "#9efcff",
  robberTint: "#ff6b6b",
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const GameUIShell = forwardRef(function GameUIShell(
  { onReady },
  ref
) {
  const canvasRef = useRef(null);
  const timeValRef = useRef(null);
  const streakValRef = useRef(null);
  const playerSpeedRef = useRef(null);
  const robberSpeedRef = useRef(null);
  const gapFillRef = useRef(null);
  const gapLabelRef = useRef(null);
  const questionRef = useRef(null);
  const flashRef = useRef(null);

  // Mutable render state that doesn't cause React re-renders
  const state = useRef({
    theme: { ...defaultTheme },
    stars: [],
    layers: [],
    particles: [],
    player: { x: 0, y: 0, speed: 3 },
    robber: { x: -60, y: 0, speed: 2.6 },
    cameraX: 0,
    gapMeters: 10,
    shakeAmt: 0,
    shakeTime: 0,
    running: true,
    tPrev: performance.now(),
  });

  // ------- API exposed to your game logic -------
  const api = useMemo(() => ({
    setTimer: (s) => {
      if (!timeValRef.current) return;
      const m = Math.floor(s / 60).toString().padStart(2, "0");
      const sec = Math.floor(s % 60).toString().padStart(2, "0");
      timeValRef.current.textContent = `${m}:${sec}`;
    },
    setSpeed: (playerSpeed, robberSpeed) => {
      state.current.player.speed = playerSpeed;
      state.current.robber.speed = robberSpeed;
      if (playerSpeedRef.current) playerSpeedRef.current.textContent = playerSpeed.toFixed(1);
      if (robberSpeedRef.current) robberSpeedRef.current.textContent = robberSpeed.toFixed(1);
    },
    setGap: (meters) => {
      state.current.gapMeters = meters;
      if (gapFillRef.current) {
        const pct = clamp((meters + 20) / 40, 0, 1);
        gapFillRef.current.style.width = (pct * 100).toFixed(1) + "%";
      }
      if (gapLabelRef.current) {
        gapLabelRef.current.textContent = `${meters >= 0 ? "Lead" : "Behind"}: ${Math.abs(meters).toFixed(1)}m`;
      }
    },
    onCorrect: (solveTimeMs) => {
      const c = canvasRef.current; if (!c) return;
      const cx = c.width / 2; const cy = c.height * 0.68;
      spawnBurst(state.current, cx, cy, 30, 120, 0.7, "#9efcff");
      screenFlash("good");
      cameraShake(state.current, 6, 180);
      // auto-increment streak (optional)
      const cur = parseInt((streakValRef.current?.textContent || "0").replace("x", "")) || 0;
      api.setStreak(cur + 1);
    },
    onWrong: () => {
      const c = canvasRef.current; if (!c) return;
      spawnBurst(state.current, c.width / 2, c.height * 0.68, 18, 90, 0.5, "#ff6b6b");
      screenFlash("bad");
      cameraShake(state.current, 10, 260);
      api.setStreak(0);
    },
    setQuestion: (text) => { if (questionRef.current) questionRef.current.textContent = text; },
    setStreak: (n) => { if (streakValRef.current) streakValRef.current.textContent = "x" + Math.max(0, n); },
    setTheme: (partial) => {
      state.current.theme = { ...state.current.theme, ...partial };
      initStars(state.current, canvasRef.current);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useImperativeHandle(ref, () => api, [api]);
  useEffect(() => { if (onReady) onReady(api); }, [api, onReady]);

  // ------- Canvas setup & main loop -------
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.floor(window.innerWidth);
      const h = Math.floor(window.innerHeight);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars(state.current, canvas);
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });

    // init layers
    state.current.layers = state.current.theme.bgLayers.map((l) => ({ ...l, x: 0 }));

    let raf = 0;
    const loop = (tNow) => {
      const s = state.current;
      const dt = Math.min(0.033, (tNow - s.tPrev) / 1000); s.tPrev = tNow;
      update(s, dt);
      draw(s, ctx, canvas, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resizeCanvas); };
  }, []);

  // ------- Helpers (particles, flashes, shaking) -------
  function spawnBurst(s, x, y, count, baseVel, life, color) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = baseVel * (0.5 + Math.random());
      s.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, ttl: life, color });
    }
  }
  function drawParticles(s, ctx, dt) {
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.ttl -= dt;
      if (p.ttl <= 0) { s.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 50 * dt;
      const alpha = Math.max(0, p.ttl / p.life);
      ctx.fillStyle = p.color + Math.floor(alpha * 200).toString(16).padStart(2, "0");
      ctx.beginPath(); ctx.arc(p.x, p.y, 2 + 2 * (1 - alpha), 0, Math.PI * 2); ctx.fill();
    }
  }
  function cameraShake(s, amp, ms) { s.shakeAmt = amp; s.shakeTime = ms; }
  function screenFlash(kind) {
    const el = flashRef.current; if (!el) return;
    el.className = "flash " + kind;
    el.style.opacity = "1";
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-out" }).onfinish = () => {
      el.style.opacity = "0"; el.className = "flash";
    };
  }
  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function limb(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function initStars(s, canvas) {
    if (!canvas) return;
    s.stars = [];
    for (let i = 0; i < s.theme.skyStars; i++) {
      s.stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.6,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random() * 0.5 + 0.3,
      });
    }
  }

  function update(s, dt) {
    // Parallax scroll by player speed
    for (const l of s.layers) l.x -= (s.player.speed * l.speed) * dt * 60;

    // Advance visual positions
    s.player.x += s.player.speed * dt * 60;
    s.robber.x += s.robber.speed * dt * 60;

    // Camera follows player
    s.cameraX = s.player.x - (window.innerWidth || 1280) * 0.4;

    // Decay camera shake
    if (s.shakeTime > 0) s.shakeTime -= dt * 1000;
  }

  function draw(s, ctx, canvas, dt) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply camera + shake
    const sh = s.shakeTime > 0 ? (Math.random() * 2 - 1) * s.shakeAmt : 0;
    ctx.save();
    ctx.translate(-s.cameraX + sh, sh * 0.6);

    // Sky
    ctx.fillStyle = "#0a0f1f";
    ctx.fillRect(s.cameraX, 0, canvas.width, canvas.height);

    // Stars
    for (const st of s.stars) {
      ctx.globalAlpha = st.a * (0.6 + 0.4 * Math.sin((performance.now() / 1000 + st.x) * 0.5));
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Parallax layers
    const baseY = canvas.height * 0.75;
    s.layers.forEach((l, i) => {
      ctx.fillStyle = l.color;
      const w = 600; // tile width
      const y = baseY - i * 28;
      const start = Math.floor((s.cameraX + l.x) / w) - 2;
      for (let k = start; k < start + 20; k++) {
        const x = k * w - l.x;
        const r = Math.sin(k * 12.9898) * 43758.5453;
        const h = l.h * (0.4 + 0.6 * frac(r));
        ctx.fillRect(x, y - h, w * 0.8, h);
      }
    });

    // Ground
    ctx.fillStyle = s.theme.groundColor; ctx.fillRect(s.cameraX - 1000, baseY, canvas.width + 2000, 6);

    // Characters
    const px = s.cameraX + canvas.width * 0.4;
    const py = baseY - 10;

    // Player
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1.1, 1.1);
    const bob1 = Math.sin(performance.now() / 1000 * 10) * 4;
    ctx.translate(0, bob1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = s.theme.playerTint; ctx.fillStyle = s.theme.playerTint + "22";
    roundedRect(ctx, -16, -24, 32, 36, 8); ctx.stroke(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -36, 10, 0, Math.PI * 2); ctx.stroke();
    const swing1 = Math.sin(performance.now() / 1000 * 14) * 10;
    limb(ctx, -10, 0, -16, 16 + swing1);
    limb(ctx, 10, 0, 16, -16 - swing1);
    limb(ctx, -12, -14, -22, -6 - swing1);
    limb(ctx, 12, -14, 22, -6 + swing1);
    ctx.restore();

    // Robber
    ctx.save();
    ctx.translate(px - s.gapMeters * 10 - 60, py);
    ctx.scale(1.15, 1.15);
    const bob2 = Math.cos(performance.now() / 1000 * 9) * 3;
    ctx.translate(0, bob2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = s.theme.robberTint; ctx.fillStyle = s.theme.robberTint + "22";
    roundedRect(ctx, -18, -24, 36, 40, 10); ctx.stroke(); ctx.fill();
    roundedRect(ctx, -12, -40, 24, 10, 4); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-5, -36, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -36, 2.2, 0, Math.PI * 2); ctx.fill();
    const swing2 = Math.sin(performance.now() / 1000 * 12) * 8;
    limb(ctx, -14, -12, -26, -2 - swing2);
    limb(ctx, 14, -12, 26, -2 + swing2);
    ctx.restore();

    // Particles
    drawParticles(s, ctx, dt);

    ctx.restore();
  }

  function frac(x) { return x - Math.floor(x); }

  return (
    <div className="numbers-run-ui" style={{ position: "relative", height: "100vh", width: "100vw", overflow: "hidden" }}>
      {/* Styles */}
      <style>{`
        :root {
          --bg: #0a0f1f; --bg2: #0e1630; --accent: #9efcff; --accent-2: #ffe580; --good:#7ef58a; --bad:#ff6b6b; --card:#10182fdd; --text:#e8f0ff; --muted:#9fb2d7; --track:#1b2748;
        }
        .hud { position:absolute; inset:0; pointer-events:none; }
        .row { display:flex; gap:16px; padding:16px; }
        .row.top { justify-content: space-between; align-items:flex-start; }
        .row.bottom { position:absolute; bottom:0; width:100%; justify-content:center; }
        .card { pointer-events:auto; background: var(--card); backdrop-filter: blur(8px); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:12px 16px; box-shadow:0 10px 30px rgba(0,0,0,.35); }
        .card h3 { margin:0 0 4px; font-weight:600; font-size:14px; color:var(--muted); letter-spacing:.04em; text-transform:uppercase; }
        .card .value { font-size:24px; font-weight:700; letter-spacing:.02em; color:var(--text); }
        .chase { position:absolute; left:50%; transform:translateX(-50%); top:64px; width:min(900px,86vw); height:14px; background:var(--track); border-radius:999px; overflow:hidden; border:1px solid rgba(255,255,255,.08); }
        .chase .fill { height:100%; width:50%; background:linear-gradient(90deg, var(--accent), var(--accent-2)); transition: width .25s ease; }
        .chase .labels { position:absolute; inset:0; display:flex; justify-content:space-between; align-items:center; padding:0 10px; font-size:12px; color:var(--muted); text-shadow:0 1px 0 rgba(0,0,0,.3)}
        .question { position:absolute; bottom:24px; left:50%; transform:translateX(-50%); background: var(--card); border:1px solid rgba(255,255,255,.08); border-radius:999px; padding:10px 16px; font-size:18px; font-weight:600; letter-spacing:.02em; box-shadow: 0 10px 30px rgba(0,0,0,.35); color:var(--text); }
        .flash { position:absolute; inset:0; pointer-events:none; background: transparent; mix-blend-mode: lighten; opacity: 0; }
        .flash.good { background: radial-gradient(ellipse at center, rgba(126,245,138,.33), transparent 70%); }
        .flash.bad { background: radial-gradient(ellipse at center, rgba(255,107,107,.33), transparent 70%); }
        .badge { display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08); font-size:13px; font-weight:600; letter-spacing:.03em; color:var(--text); }
        .dot { width:8px; height:8px; border-radius:999px; background: var(--muted); box-shadow:0 0 8px currentColor; }
        .dot.player { color: var(--accent); background: currentColor; }
        .dot.robber { color: var(--bad); background: currentColor; }
      `}</style>

      {/* Canvas */}
      <canvas ref={canvasRef} width={1280} height={720} style={{ display: "block", width: "100vw", height: "100vh" }} aria-label="Game canvas" />

      {/* HUD */}
      <div className="hud">
        <div className="row top">
          <div className="card" id="timeCard">
            <h3>Time</h3>
            <div className="value" ref={timeValRef}>00:00</div>
          </div>
          <div className="card" id="streakCard">
            <h3>Streak</h3>
            <div className="value" ref={streakValRef}>x0</div>
          </div>
          <div className="card" id="speedCard">
            <h3>Speed</h3>
            <div className="value"><span ref={playerSpeedRef}>0</span> vs <span ref={robberSpeedRef}>0</span></div>
          </div>
        </div>

        <div className="chase" aria-label="Distance bar">
          <div className="fill" ref={gapFillRef} />
          <div className="labels">
            <span className="badge"><span className="dot player" /> You</span>
            <span ref={gapLabelRef}>Lead: 0m</span>
            <span className="badge"><span className="dot robber" /> Robber</span>
          </div>
        </div>

        <div className="row bottom">
          <div className="question" ref={questionRef}>Solve fast to sprint! ✨</div>
        </div>

        <div className="flash" ref={flashRef} />
      </div>
    </div>
  );
});

export default GameUIShell;