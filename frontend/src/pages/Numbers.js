import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

// ======= ASSET IMPORTS (yours) =======
import idleSheet  from "../assets/Characters/Owlet_Monster_Idle_4.png"; // player (4x1)
import idleSheetE from "../assets/Characters/evil_4x1.png";              // evil   (4x1)
import bubbleLeft from "../assets/bg/bubble2_left.png";                  // left-facing bubble
import forestLoop from "../assets/bg/Sound.mp3";                         // forest ambience

// ======= PARALLAX LAYERS =======
import L_BASE from "../assets/bg/1.png"; // ground + backdrop (opaque)
import L_FAR  from "../assets/bg/2.png"; // far trunks (transparent)
import L_MID  from "../assets/bg/3.png"; // mid trees  (transparent)
import L_NEAR from "../assets/bg/4.png"; // near trees (transparent)

// ---------- Game constants ----------
const SHOW_PREVIEW = false; // keep camera hidden; tracking still works

// Scene scale
const PX_PER_TILE = 32;
const VIEW_W = 640;
const VIEW_H = 480;

// Parallax multipliers
const PAR_FAR = 0.25, PAR_MID = 0.50, PAR_NEAR = 0.90;

// Sprites
const SPRITE_W = 64;
const SPRITE_H = 80;

// Ground and on-screen anchor
const GROUND_FROM_BOTTOM = 54;
const PLAYER_SCREEN_X = 380;

// Player sheet (4x1)
const PLAYER_IDLE_FRAMES  = 4, PLAYER_IDLE_COLUMNS  = 4, PLAYER_IDLE_FPS  = 6;
const PLAYER_WALK_FRAMES  = 4, PLAYER_WALK_COLUMNS  = 4, PLAYER_WALK_FPS  = 10;

// Evil sheet (4x1)
const EVIL_FRAMES  = 4;
const EVIL_COLUMNS = 4;
const EVIL_IDLE_FPS = 6;
const EVIL_WALK_FPS = 10;

// --- spacing & chase tuning ---
const START_GAP_TILES   = 8;     // evil starts this many tiles behind
const EVIL_START_SPEED  = 0.9;   // tiles/sec
const EVIL_ACCEL        = 0.03;  // tiles/sec^2

// --- bubble / far-away behavior ---
const FAR_HIDE_GAP_TILES   = 12; // when gap >= this, hide evil sprite
const BUBBLE_LEFT_MARGIN   = 16; // px from left edge when evil is far
const BUBBLE_W             = 150;
const BUBBLE_H             = 100;

// ---------------- SpriteSheet ----------------
function SpriteSheet({
  src,
  frames = 4,
  columns = 4,
  fps = 8,
  targetW = SPRITE_W,
  targetH = SPRITE_H,
  pixel = true,
  className = "",
  scaleMode = "fit",   // "fit" | "fitWidth"
  anchorY = "bottom",
  baselineFixPx = 0,   // per-sprite vertical nudge inside frame
}) {
  const [i, setI] = useState(0);
  const [fw, setFw] = useState(0);
  const [fh, setFh] = useState(0);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setFw(Math.floor(img.naturalWidth / Math.max(1, columns)));
      setFh(img.naturalHeight);
    };
    img.src = src;
  }, [src, columns]);

  useEffect(() => {
    let raf, last = performance.now();
    const step = 1000 / Math.max(1, fps);
    const loop = (now) => {
      if (now - last >= step) { setI(n => (n + 1) % Math.max(1, frames)); last = now; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fps, frames]);

  const x = -((i % Math.max(1, columns)) * fw);
  const scale =
    !fw || !fh ? 1 :
    scaleMode === "fitWidth" ? (targetW / fw) : Math.min(targetW / fw, targetH / fh);

  // Apply vertical baseline fix inside the frame
  let bgPosY;
  if (anchorY === "bottom") bgPosY = `calc(100% + ${baselineFixPx}px)`;
  else if (anchorY === "top") bgPosY = `${baselineFixPx}px`;
  else bgPosY = `calc(50% + ${baselineFixPx}px)`;

  return (
    <div className={className}
      style={{ width: targetW, height: targetH, display:"grid", placeItems:"end center", overflow:"hidden" }}>
      <div
        style={{
          width: fw || 1,
          height: fh || 1,
          backgroundImage: `url(${src})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: `${x}px ${bgPosY}`,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          imageRendering: pixel ? "pixelated" : "auto",
        }}
      />
    </div>
  );
}

// ---------------- Numbers Game ----------------
export default function Numbers() {
  // camera/vision refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const landmarkerRef = useRef(null);
  const setupOnceRef = useRef(false);

  // ===== AUDIO =====
  const bgmRef = useRef(null); // <audio> element ref

  // game state
  const [equation, setEquation] = useState(getRandomEquation());
  const [playerPos, setPlayerPos] = useState(0);                     // in tiles
  const [evilPos, setEvilPos] = useState(-START_GAP_TILES);          // start far behind
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);                     // start gate
  const [inputNum, setInputNum] = useState(0);
  const [lastInput, setLastInput] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);                           // streak
  const [evilActive, setEvilActive] = useState(false);
  const [evilSpeed, setEvilSpeed] = useState(EVIL_START_SPEED);
  const [inputPaused, setInputPaused] = useState(false);

  // eased display state (for smooth walking)
  const [playerDisplayPos, setPlayerDisplayPos] = useState(0);
  const [evilDisplayPos, setEvilDisplayPos] = useState(-START_GAP_TILES);

  // camera scroll in pixels
  const sceneX = playerDisplayPos * PX_PER_TILE;

  // walking flags (switch to faster FPS while moving)
  const playerIsWalking = Math.abs(playerDisplayPos - playerPos) > 0.02;
  const evilIsWalking   = Math.abs(evilDisplayPos - evilPos)   > 0.02;

  // animate display positions
  useEffect(() => {
    let anim;
    const animate = () => {
      setPlayerDisplayPos(d => Math.abs(d - playerPos) < 0.01 ? playerPos : d + (playerPos - d) * 0.25);
      setEvilDisplayPos(d => Math.abs(d - evilPos)   < 0.01 ? evilPos   : d + (evilPos   - d) * 0.25);
      anim = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(anim);
  }, [playerPos, evilPos]);

  // evil auto-moves toward player
  useEffect(() => {
    if (gameOver || !started || !evilActive || inputPaused) return;
    let lastTime = Date.now();
    let acc = EVIL_ACCEL;
    let speed = evilSpeed;
    let pos = evilPos;
    let anim;
    const move = () => {
      if (gameOver || !started || !evilActive || inputPaused) return;
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      speed += acc * dt;
      pos += speed * dt;
      if (pos >= playerPos - 0.01) {
        setEvilPos(playerPos);
        setGameOver(true);
        setEvilSpeed(speed);
        return;
      }
      setEvilPos(pos);
      setEvilSpeed(speed);
      anim = requestAnimationFrame(move);
    };
    anim = requestAnimationFrame(move);
    return () => cancelAnimationFrame(anim);
    // eslint-disable-next-line
  }, [playerPos, gameOver, evilActive, inputPaused, started]);

  // hand-tracking init (StrictMode-safe)
  useEffect(() => {
    if (setupOnceRef.current) return;
    setupOnceRef.current = true;

    let stream;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: VIEW_W, height: VIEW_H } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = videoRef.current;
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;

        await new Promise(res => { if (video.readyState >= 1) res(); else video.onloadedmetadata = () => res(); });
        await video.play().catch(() => {});

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );
        if (cancelled) return;

        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // helpers to count fingers
        const angleAt = (v, a, c) => {
          const abx=a.x-v.x, aby=a.y-v.y, abz=(a.z??0)-(v.z??0);
          const cbx=c.x-v.x, cby=c.y-v.y, cbz=(c.z??0)-(v.z??0);
          const dot = abx*cbx + aby*cby + abz*cbz;
          const m1 = Math.hypot(abx,aby,abz), m2 = Math.hypot(cbx,cby,cbz);
          if (!m1 || !m2) return 180;
          const cos = Math.max(-1, Math.min(1, dot/(m1*m2)));
          return Math.acos(cos) * 180/Math.PI;
        };
        const dist = (a,b)=> Math.hypot(a.x-b.x, a.y-b.y, (a.z??0)-(b.z??0));
        const isFingerStraight = (l, mcp, pip, dip, tip) => {
          const angPIP = angleAt(l[pip], l[mcp], l[dip]);
          const angDIP = angleAt(l[dip], l[pip], l[tip]);
          const straight = angPIP > 160 && angDIP > 160;
          const farther  = dist(l[tip], l[0]) > dist(l[pip], l[0]) * 1.05;
          return straight && farther;
        };
        const isThumbStraight = (l) => {
          const angMCP = angleAt(l[2], l[1], l[3]);
          const angIP  = angleAt(l[3], l[2], l[4]);
          const straight = angMCP > 150 && angIP > 150;
          const farther  = dist(l[4], l[0]) > dist(l[2], l[0]) * 1.05;
          return straight && farther;
        };
        const countHand = (l) => {
          const F = { index:{mcp:5,pip:6,dip:7,tip:8}, middle:{mcp:9,pip:10,dip:11,tip:12}, ring:{mcp:13,pip:14,dip:15,tip:16}, pinky:{mcp:17,pip:18,dip:19,tip:20} };
          let c = 0;
          if (isThumbStraight(l)) c++;
          for (const f of Object.values(F)) if (isFingerStraight(l,f.mcp,f.pip,f.dip,f.tip)) c++;
          return c;
        };
        const smoothTotal = (() => {
          const win = [];
          return (v) => {
            win.push(v); if (win.length > 7) win.shift();
            const counts = win.reduce((m, x) => {
              m[x] = (m[x] || 0) + 1;
              return m;
            }, {});
            return parseInt(Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0],10);
          };
        })();

        const loop = async () => {
          if (cancelled) return;
          const res = await landmarkerRef.current.detectForVideo(video, performance.now());

          if (SHOW_PREVIEW) {
            ctx.save(); ctx.scale(-1,1);
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            ctx.restore();
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }

          let per = [];
          if (res.landmarks?.length) for (const l of res.landmarks) per.push(countHand(l));
          else per=[0,0];

          const totalFingers = Math.max(0, Math.min(10, smoothTotal(per.reduce((a,b)=>a+b,0))));
          // Block inputs before start or when paused
          if (!started || inputPaused || gameOver) {
            setInputNum(totalFingers);
          } else {
            setInputNum(totalFingers);
          }

          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      let cancelled = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks?.() || [];
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setupOnceRef.current = false;
    };
  }, []); // guarded by setupOnceRef

  // answer checking
  useEffect(() => {
    if (gameOver || inputPaused || !started) return;
    if (inputNum !== lastInput && inputNum === equation.answer) {
      setLastInput(inputNum);
      setScore(s => s + 1);
      setStreak(st => st + 1);                // advance streak on each correct
      setPlayerPos(pos => pos + inputNum);
      setEquation(getRandomEquation());
      setInputPaused(true);
      setTimeout(() => setInputPaused(false), 500);
      setTimeout(() => setLastInput(0), 1200);
    }
    // eslint-disable-next-line
  }, [inputNum, equation, gameOver, inputPaused, started]);

  function startGame() {
    setStarted(true);
    setEvilActive(true);

    // Play ambient after the click (autoplay-safe)
    const a = bgmRef.current;
    if (a) {
      a.volume = 0.35;      // tweak 0.0–1.0
      a.currentTime = 0;    // restart each run
      a.play().catch(() => {});
    }
  }

  function restart() {
    setEquation(getRandomEquation());
    setPlayerPos(0);
    setEvilPos(-START_GAP_TILES);
    setPlayerDisplayPos(0);
    setEvilDisplayPos(-START_GAP_TILES);
    setGameOver(false);
    setScore(0);
    setStreak(0);
    setLastInput(0);
    setEvilActive(false);
    setEvilSpeed(EVIL_START_SPEED);
    setInputPaused(false);
    setStarted(false);
  }

  // UI helper
  function renderEquation() {
    const parts = equation.text.split(" ");
    const eqn = parts.map((part, idx) =>
      part === "?" ? <span key={idx} className="eqn-box"></span>
                   : <span key={idx} style={{margin:"0 0.15em"}}>{part}</span>
    );
    return <div className="eqn-big">{eqn}</div>;
  }

  // ---- Screen positions & gap ----
  const playerX   = PLAYER_SCREEN_X;
  const evilXRaw  = PLAYER_SCREEN_X + (evilDisplayPos - playerDisplayPos) * PX_PER_TILE;

  const gapTiles  = Math.max(0, Math.round(playerDisplayPos - evilDisplayPos));
  const isEvilFar = gapTiles >= FAR_HIDE_GAP_TILES;

  // position evil on screen (only clamp when not far)
  const evilXClamped = Math.max(40, Math.min(VIEW_W - 40, evilXRaw));

  // ---- Bubble position ----
  const bubbleLeftX = isEvilFar
    ? BUBBLE_LEFT_MARGIN
    : Math.max(BUBBLE_LEFT_MARGIN, Math.min(VIEW_W - BUBBLE_W - BUBBLE_LEFT_MARGIN, evilXClamped + 28));
  const bubbleBottomY = GROUND_FROM_BOTTOM + SPRITE_H + 12;

  // Pause audio on tab hide, cleanup on unmount
  useEffect(() => {
    const handleVis = () => {
      const a = bgmRef.current;
      if (!a) return;
      if (document.hidden) a.pause();
      else if (started) a.play().catch(()=>{});
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      bgmRef.current?.pause();
    };
  }, [started]);

  // Gentle fade out on game over
  useEffect(() => {
    const a = bgmRef.current;
    if (!gameOver || !a) return;
    const startVol = a.volume;
    const t0 = performance.now();
    const dur = 600; // ms
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      a.volume = startVol * (1 - k);
      if (k < 1) raf = requestAnimationFrame(step);
      else a.pause();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gameOver]);

  return (
    <PageShell>
      <div className="stage">
        {/* Parallax background */}
        <div className="bg base" style={{ backgroundImage: `url(${L_BASE})` }} />
        <div className="bg far"  style={{ backgroundImage: `url(${L_FAR})`,  backgroundPosition: `${-(sceneX * PAR_FAR)}px 0`  }} />
        <div className="bg mid"  style={{ backgroundImage: `url(${L_MID})`,  backgroundPosition: `${-(sceneX * PAR_MID)}px 0`  }} />
        <div className="bg near" style={{ backgroundImage: `url(${L_NEAR})`, backgroundPosition: `${-(sceneX * PAR_NEAR)}px 0` }} />

        {/* ACTORS on the ground */}
        <div className="actors">
          {/* Player */}
          <div className="actor" style={{ left: playerX, bottom: GROUND_FROM_BOTTOM }}>
              <SpriteSheet
                src={idleSheet}
                frames={playerIsWalking ? PLAYER_WALK_FRAMES : PLAYER_IDLE_FRAMES}
                columns={playerIsWalking ? PLAYER_WALK_COLUMNS : PLAYER_IDLE_COLUMNS}
                fps={playerIsWalking ? PLAYER_WALK_FPS : PLAYER_IDLE_FPS}
                targetW={SPRITE_W}
                targetH={SPRITE_H}
                anchorY="bottom"
                scaleMode="fit"
                baselineFixPx={-8}
              />
          </div>

          {/* Evil (hidden when very far) — unchanged */}
          {!isEvilFar && (
            <div className="actor" style={{ left: evilXClamped, bottom: GROUND_FROM_BOTTOM }}>
              <SpriteSheet
                src={idleSheetE}
                frames={EVIL_FRAMES}
                columns={EVIL_COLUMNS}
                fps={evilIsWalking || !gameOver ? EVIL_WALK_FPS : EVIL_IDLE_FPS}
                targetW={SPRITE_W}
                targetH={SPRITE_H}
                anchorY="bottom"
                scaleMode="fit"
              />
            </div>
          )}

          {/* Evil "talking" bubble */}
          {gapTiles > 0 && !gameOver && (
            <div
              className="speech"
              style={{
                left: bubbleLeftX,
                bottom: bubbleBottomY,
                width: BUBBLE_W,
                height: BUBBLE_H
              }}
              aria-label={`Evil is ${gapTiles} steps behind`}
            >
              <img src={bubbleLeft} alt="" draggable={false} />
              <span>{gapTiles}</span>
            </div>
          )}
        </div>

        {/* Hidden camera canvas (for hand tracking only) */}
        <video ref={videoRef} muted playsInline style={{display:"none"}} />
        <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} className="view" />

        {/* Ambient audio element (hidden) */}
        <audio ref={bgmRef} loop preload="auto" style={{ display: "none" }}>
          <source src={forestLoop} type="audio/mpeg" />
        </audio>

        {/* UI */}
        <div className="game-ui">
          {/* Score + Streak */}
          <div className="score score-corner">
            <div><strong>Score:</strong> {score}</div>
          </div>

          {/* Center equation: hidden until started */}
          {started && (
            <div className="eqn-center">{renderEquation()}</div>
          )}

          {/* Live input readout */}
          <div className="input">
            <div className="input-num">{inputNum}</div>
          </div>

          {/* Overlays */}
          {!started && !gameOver && (
            <div className="overlay start">
              <div className="overlay-card">
                <div className="title">Count & Run</div>
                <div className="sub">Show the correct number with your fingers</div>
                <button onClick={startGame} className="btn">Start</button>
                <div className="tip">Question appears after you press Start</div>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="overlay gameover">
              <div className="overlay-card">
                <div className="title">Game Over!</div>
                <div className="sub">Score: {score} &nbsp;</div>
                <button onClick={restart} className="btn">Restart</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Style/>
    </PageShell>
  );
}

// ---------------- helpers ----------------
function getRandomEquation() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const op = Math.random() < 0.5 ? "+" : "-";
  const result = op === "+" ? a + b : a - b;
  const missing = ["a", "b", "result"][Math.floor(Math.random() * 3)];
  let text, answer;
  if (missing === "a") { text = `? ${op} ${b} = ${result}`; answer = a; }
  else if (missing === "b") { text = `${a} ${op} ? = ${result}`; answer = b; }
  else { text = `${a} ${op} ${b} = ?`; answer = result; }
  if (answer < 1 || answer > 10) return getRandomEquation();
  return { text, answer };
}

/** Fullscreen wrapper (no title / no Home link) */
function PageShell({ children }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const compute = () => {
      const s = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
      setScale(s || 1);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0b0b0b",
      display: "grid", placeItems: "center", overflow: "hidden",
      // pass scale to CSS via custom property
      ["--s"]: scale
    }}>
      {children}
    </div>
  );
}

function Style() {
  return (
    <style>{`
      /* Stage is still authored at 640x480 but scaled to fill the viewport */
      .stage { 
        position:relative; 
        width:${VIEW_W}px; 
        height:${VIEW_H}px; 
        border-radius:12px; 
        overflow:hidden; 
        transform: scale(var(--s, 1));
        transform-origin: center center;
      }

      /* Background layers */
      .bg{
        position:absolute; inset:0; pointer-events:none;
        background-repeat: repeat-x;
        background-size: auto 100%;
        image-rendering: pixelated;
      }
      .bg.base{ background-repeat:no-repeat; background-size:cover; background-position:center; z-index: 0; }
      .bg.far  { z-index: 1; opacity:.95; }
      .bg.mid  { z-index: 2; }
      .bg.near { z-index: 3; }

      /* Actors float above near layer */
      .actors { position:absolute; inset:0; z-index: 4; pointer-events:none; }
      .actor  { position:absolute; transform: translateX(-50%); }

      /* Camera canvas (kept underneath actors) */
      .view  { position:absolute; inset:0; z-index: 2; opacity:0; }

      /* UI on top */
      .game-ui { position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; z-index:6; pointer-events:none; }

      .score-corner {
        position: absolute; top: 18px; left: 18px; font-size: 1.1em;
        background: rgba(0,0,0,0.7); padding: 8px 14px; border-radius: 10px; z-index: 7;
        line-height: 1.1;
      }
      .score-corner strong { color: #9ad; }

      .eqn-center {
        position: absolute; top: 80px; left: 0; width: 100%;
        display: flex; justify-content: center; z-index: 7;
      }
      .eqn-big {
        font-size: 2.8em; font-weight: bold; letter-spacing: 2px; color: #fff;
        background: rgba(0,0,0,0.75); padding: 18px 32px 14px; border-radius: 18px;
        display: flex; align-items: center; gap: 0.2em;
      }
      .eqn-box {
        display: inline-block; width: 1.2em; height: 1.2em; background: #222;
        border: 3px solid #fff; border-radius: 7px; vertical-align: middle; margin: 0 0.18em;
      }

      .input { margin-bottom:10px; text-align:center; }
      .input-num { font-size:2em; margin-top:2px; }

      /* Overlays */
      .overlay {
        position:absolute; inset:0; z-index:10; display:grid; place-items:center; background: rgba(0,0,0,0.35);
        pointer-events:auto;
      }
      .overlay-card {
        background: rgba(0,0,0,0.85);
        padding: 22px 26px; border-radius: 16px; min-width: 320px; text-align:center;
        box-shadow: 0 8px 24px rgba(0,0,0,.4);
      }
      .overlay .title { font-size: 2rem; font-weight: 800; margin-bottom: 6px; }
      .overlay .sub { opacity: .9; margin-bottom: 14px; }
      .overlay .tip { opacity: .7; margin-top: 10px; font-size: .9rem; }
      .overlay .btn {
        margin-top: 6px; padding: 10px 18px; border-radius: 12px; border: 0;
        background: #9ad; color: #0b0b0b; font-weight: 800; cursor: pointer;
      }
      .overlay .btn:hover { filter: brightness(1.05); }

      /* ===== Speech bubble (evil talks) ===== */
      .speech{
        position:absolute;
        z-index:5;
        pointer-events:none;
      }
      .speech img{
        width:100%;
        height:100%;
        display:block;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,.35));
      }
      .speech span{
        position:absolute;
        top: 44%;
        left: 46%;
        transform: translate(-50%,-50%);
        font-weight: 900;
        font-size: 34px;
        line-height: 1;
        color: #222;
        text-shadow: 0 1px 0 rgba(255,255,255,.35),
                     0 2px 4px rgba(0,0,0,.25);
      }
    `}</style>
  );
}
