import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

// --- Game constants ---
const TRACK_WINDOW = 14; // Number of tiles to show at once
const PLAYER_EMOJI = "🤓";
const EVIL_EMOJI = "😈";
const STEP_TIME = 1000; // ms

function getRandomEquation() {
  // Randomly choose a, b, op, and which is missing (a, b, or result)
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const op = Math.random() < 0.5 ? "+" : "-";
  let result = op === "+" ? a + b : a - b;
  let missing = ["a", "b", "result"][Math.floor(Math.random() * 3)];
  let text, answer;
  if (missing === "a") {
    text = `? ${op} ${b} = ${result}`;
    answer = a;
  } else if (missing === "b") {
    text = `${a} ${op} ? = ${result}`;
    answer = b;
  } else {
    text = `${a} ${op} ${b} = ?`;
    answer = result;
  }
  // Clamp answer to 1-10 for game logic
  if (answer < 1 || answer > 10) return getRandomEquation();
  return { text, answer };
}

export default function Numbers() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const landmarkerRef = useRef(null);

  // --- Game state ---
  const [equation, setEquation] = useState(getRandomEquation());
  const [playerPos, setPlayerPos] = useState(0);
  const [evilPos, setEvilPos] = useState(-1);
  const [gameOver, setGameOver] = useState(false);
  const [inputNum, setInputNum] = useState(0);
  const [lastInput, setLastInput] = useState(0);
  const [score, setScore] = useState(0);
  const [evilActive, setEvilActive] = useState(false);
  const [evilSpeed, setEvilSpeed] = useState(1); // tiles per second
  const [inputPaused, setInputPaused] = useState(false); // pause input and evil after correct answer

  // Animation state
  const [playerDisplayPos, setPlayerDisplayPos] = useState(0);
  const [evilDisplayPos, setEvilDisplayPos] = useState(-1);

  // Animate display positions toward actual positions
  useEffect(() => {
    let anim;
    function animate() {
      setPlayerDisplayPos(d => {
        if (Math.abs(d - playerPos) < 0.01) return playerPos;
        return d + (playerPos - d) * 0.25;
      });
      setEvilDisplayPos(d => {
        if (Math.abs(d - evilPos) < 0.01) return evilPos;
        return d + (evilPos - d) * 0.25;
      });
      anim = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(anim);
  }, [playerPos, evilPos]);

  // --- Evil emoji movement ---
  useEffect(() => {
    if (gameOver || !evilActive || inputPaused) return;
    let lastTime = Date.now();
    let acc = 0.01; // acceleration in tiles/sec^2
    let speed = evilSpeed;
    let pos = evilPos;
    let anim;
    function move() {
      if (gameOver || !evilActive || inputPaused) return;
      const now = Date.now();
      const dt = (now - lastTime) / 1000; // seconds
      lastTime = now;
      speed += acc * dt;
      pos += speed * dt;
      if (pos >= playerPos) {
        setEvilPos(playerPos);
        setGameOver(true);
        setEvilSpeed(speed);
        return;
      }
      setEvilPos(pos);
      setEvilSpeed(speed);
      anim = requestAnimationFrame(move);
    }
    anim = requestAnimationFrame(move);
    return () => cancelAnimationFrame(anim);
    // eslint-disable-next-line
  }, [playerPos, gameOver, evilActive, inputPaused]);

  // --- Hand detection for number input ---
  useEffect(() => {
    let stream;
    let mounted = true;

    (async () => {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }});
      if (!mounted) return;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );
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

      // --- helpers ---
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
          const counts = win.reduce((m,x)=> (m[x]=(m[x]||0)+1,m),{});
          return parseInt(Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0],10);
        };
      })();

      const drawHand = (l) => {
        // const pairs = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20]];
        // ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.fillStyle = "rgba(255,255,255,.95)";
        // for (const [a,b] of pairs) {
        //   const A=l[a], B=l[b];
        //   ctx.beginPath(); ctx.moveTo(A.x*canvas.width, A.y*canvas.height);
        //   ctx.lineTo(B.x*canvas.width, B.y*canvas.height); ctx.stroke();
        // }
        // for (const p of l) { ctx.beginPath(); ctx.arc(p.x*canvas.width, p.y*canvas.height, 3.5, 0, Math.PI*2); ctx.fill(); }
      };

      const loop = async () => {
        const res = await landmarkerRef.current.detectForVideo(video, performance.now());

        // draw mirrored preview
        ctx.save(); ctx.scale(-1,1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        let per = [];
        if (res.landmarks?.length) {
          for (const l of res.landmarks) {
            const cnt = countHand(l);
            per.push(cnt);
            drawHand(l);
            // Remove: label near wrist
            // const w = l[0];
            // ctx.fillStyle="rgba(0,0,0,.65)";
            // ctx.fillRect(w.x*canvas.width - 28, w.y*canvas.height - 36, 56, 26);
            // ctx.fillStyle="#fff"; ctx.font="bold 16px system-ui"; ctx.textAlign="center";
            // ctx.fillText(String(cnt), w.x*canvas.width, w.y*canvas.height - 18);
          }
        } else {
          per=[0,0];
        }

        // Only allow answers 0-10 for student input (but equation answer is 1-10)
        const totalFingers = Math.max(0, Math.min(10, smoothTotal(per.reduce((a,b)=>a+b,0))));
        if (!inputPaused) setInputNum(totalFingers);

        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    })();

    return () => {
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      stream?.getTracks()?.forEach(t => t.stop());
      mounted = false;
    };
  }, []);

  // --- Answer checking ---
  useEffect(() => {
    if (gameOver || inputPaused) return;
    // Only check if inputNum changed and is stable (not 0)
    if (inputNum !== lastInput && inputNum === equation.answer) {
      setLastInput(inputNum);
      setScore(s => s + 1);
      setPlayerPos(pos => pos + inputNum); // No clamp, infinite track
      setEquation(getRandomEquation());
      if (!evilActive) setEvilActive(true); // Start evil movement after first answer
      setInputPaused(true); // Pause input and evil
      setTimeout(() => setInputPaused(false), 500); // 0.5s pause
      // Prevent repeated triggers for same input
      setTimeout(() => setLastInput(0), 1200);
    }
    // eslint-disable-next-line
  }, [inputNum, equation, gameOver, inputPaused]);

  function restart() {
    setEquation(getRandomEquation());
    setPlayerPos(0);
    setEvilPos(-1);
    setPlayerDisplayPos(0);
    setEvilDisplayPos(-1);
    setGameOver(false);
    setScore(0);
    setLastInput(0);
    setEvilActive(false);
    setEvilSpeed(1); // reset speed
    setInputPaused(false);
  }

  // --- Equation rendering helper ---
  function renderEquation() {
    // Replace "?" with an empty box
    const parts = equation.text.split(" ");
    const eqn = parts.map((part, idx) =>
      part === "?" ? (
        <span key={idx} className="eqn-box"></span>
      ) : (
        <span key={idx} style={{margin: "0 0.15em"}}>{part}</span>
      )
    );
    return <div className="eqn-big">{eqn}</div>;
  }

  // --- Track rendering ---
  function renderTrack() {
    const window = TRACK_WINDOW;
    const tiles = [];
    // Use animated display positions for rendering
    const pPos = playerDisplayPos;
    const ePos = evilDisplayPos;
    const min = Math.min(pPos, ePos);
    const max = Math.max(pPos, ePos);
    const dist = max - min;

    if (dist < window - 2) {
      const center = Math.floor((min + max + 1) / 2);
      const start = center - Math.floor(window / 2);
      // Round to nearest integer for display
      const playerTile = Math.round(pPos);
      const evilTile = Math.round(ePos);
      for (let i = start; i < start + window; ++i) {
        let content = "";
        let style = {};
        if (i === playerTile && i === evilTile) {
          // Both in same tile
          content = (
            <>
              <span style={{ marginRight: 2 }}>{PLAYER_EMOJI}</span>
              <span style={{ marginLeft: 2 }}>{EVIL_EMOJI}</span>
            </>
          );
        } else if (i === playerTile) {
          content = PLAYER_EMOJI;
        } else if (i === evilTile) {
          content = EVIL_EMOJI;
        }
        tiles.push(
          <div
            key={i}
            className={
              "tile" +
              (i === playerTile ? " player" : "") +
              (i === evilTile ? " evil" : "")
            }
            style={style}
          >
            {content}
          </div>
        );
      }
    } else {
      // Emojis at edges, ellipsis in the middle, total tiles = window
      const leftIsPlayer = pPos < ePos;
      const leftIdx = leftIsPlayer ? pPos : ePos;
      const rightIdx = leftIsPlayer ? ePos : pPos;
      const leftEmoji = leftIsPlayer ? PLAYER_EMOJI : EVIL_EMOJI;
      const rightEmoji = leftIsPlayer ? EVIL_EMOJI : PLAYER_EMOJI;

      const emptyTiles = window - 3;
      const leftEmpty = Math.floor(emptyTiles / 2);
      const rightEmpty = emptyTiles - leftEmpty;
      const omitted = (rightIdx - leftIdx) - (leftEmpty + rightEmpty);

      // Leftmost: left emoji
      tiles.push(
        <div key="left-emoji" className={"tile" + (leftIsPlayer ? " player" : " evil")}>
          {leftEmoji}
        </div>
      );
      // Left empty tiles
      for (let i = 0; i < leftEmpty; ++i) {
        tiles.push(<div key={`l${i}`} className="tile" />);
      }
      // Ellipsis
      tiles.push(
        <div key="ellipsis" className="tile ellipsis" style={{background:"none", border:"none", color:"#aaa", fontSize:"1em", pointerEvents:"none"}}>
          ... {Math.max(Math.round(omitted), 0)} ...
        </div>
      );
      // Right empty tiles
      for (let i = 0; i < rightEmpty; ++i) {
        tiles.push(<div key={`r${i}`} className="tile" />);
      }
      // Rightmost: right emoji
      tiles.push(
        <div key="right-emoji" className={"tile" + (leftIsPlayer ? " evil" : " player")}>
          {rightEmoji}
        </div>
      );
    }
    return <div className="track">{tiles}</div>;
  }

  return (
    <PageShell title="Math Steps Game" onBackHref="/">
      <div className="stage">
        <video ref={videoRef} muted playsInline style={{display:"none"}} />
        <canvas ref={canvasRef} width={640} height={480} className="view" />
        <div className="game-ui">
          <div className="score score-corner">Score: {score}</div>
          <div className="eqn-center">{renderEquation()}</div>
          {renderTrack()}
          <div className="input">
            <span>Show the missing number (1–10) with your fingers!</span>
            <div className="input-num">{inputNum}</div>
          </div>
          {gameOver && (
            <div className="gameover">
              <div style={{fontSize:"2em"}}>Game Over!</div>
              <div>Score: {score}</div>
              <button onClick={restart} style={{marginTop:8}}>Restart</button>
            </div>
          )}
        </div>
      </div>
      <Style/>
    </PageShell>
  );
}

function PageShell({title, children, onBackHref="/"}) {
  return (
    <div style={{display:"grid",placeItems:"center",minHeight:"100vh",background:"#0b0b0b",color:"#fff"}}>
      <div style={{position:"relative"}}>
        <a href={onBackHref} style={{position:"absolute",top:-40,left:0,color:"#9ad"}}>← Home</a>
        <h2 style={{textAlign:"center"}}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Style() {
  return (
    <style>{`
      .stage { position:relative; width:640px; height:480px; }
      .view  { width:640px; height:480px; border-radius:12px; }
      .game-ui { position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; z-index:2; pointer-events:none; }
      .score-corner {
        position: absolute;
        top: 18px;
        left: 18px;
        font-size: 1.2em;
        background: rgba(0,0,0,0.7);
        padding: 7px 18px;
        border-radius: 8px;
        z-index: 3;
        pointer-events: none;
      }
      .eqn-center {
        position: absolute;
        top: 80px;
        left: 0;
        width: 100%;
        display: flex;
        justify-content: center;
        z-index: 3;
        pointer-events: none;
      }
      .eqn-big {
        font-size: 2.8em;
        font-weight: bold;
        letter-spacing: 2px;
        color: #fff;
        background: rgba(0,0,0,0.75);
        padding: 18px 32px 14px 32px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        gap: 0.2em;
      }
      .eqn-box {
        display: inline-block;
        width: 1.2em;
        height: 1.2em;
        background: #222;
        border: 3px solid #fff;
        border-radius: 7px;
        vertical-align: middle;
        margin: 0 0.18em;
      }
      .track { display:flex; gap:2px; margin-bottom:18px; }
      .tile {
        width:28px; height:36px; background:#222; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:1.3em; color:#fff; border:2px solid #333;
        transition: background 0.2s, border 0.2s;
      }
      .tile.player { background:#3af; border-color:#7cf; color:#fff; }
      .tile.evil { background:#f44; border-color:#fa0; color:#fff; }
      .tile.ellipsis {
        background: rgba(0,0,0,0.7) !important;
        border: 2px solid #fff !important;
        color: #fff !important;
        font-size: 1em !important;
        min-width: 60px;
        border-radius: 8px;
        font-weight: bold;
      }
      .input { margin-bottom:8px; text-align:center; }
      .input-num { font-size:2em; margin-top:2px; }
      .gameover {
        position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
        background:rgba(0,0,0,.85); padding:24px 32px; border-radius:16px; z-index:10; text-align:center;
        pointer-events:auto;
      }
    `}</style>
  );
}
