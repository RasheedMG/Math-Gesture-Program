import { useEffect, useRef, useState } from "react";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

const MAX_TIME = 15; // seconds
const TIME_INC = 3;  // seconds added per correct answer (capped at MAX_TIME)
const EVIL_EMOJI = "😈"; // Or use an <img src="..." /> if you prefer
const HEART = "❤️";
const MAX_LIVES = 3;

function getRandomEquation() {
  // Generate a random equation, sometimes true, sometimes false
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const op = Math.random() < 0.5 ? "+" : "-";
  let result;
  let isTrue = Math.random() < 0.5;
  if (op === "+") {
    result = isTrue ? a + b : a + b + (Math.random() < 0.5 ? 1 : -1);
  } else {
    result = isTrue ? a - b : a - b + (Math.random() < 0.5 ? 1 : -1);
  }
  return {
    text: `${a} ${op} ${b} = ${result}`,
    answer: isTrue
  };
}

export default function Thumbs() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const recognizerRef = useRef(null);

  const [equation, setEquation] = useState(getRandomEquation());
  const [timer, setTimer] = useState(MAX_TIME);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [label, setLabel] = useState("Initializing…");
  const [cooldownUntil, setCooldownUntil] = useState(0); // Add cooldown state
  const [lives, setLives] = useState(MAX_LIVES);

  // Timer effect
  useEffect(() => {
    if (gameOver) return;
    if (timer <= 0) {
      setGameOver(true);
      return;
    }
    const id = setInterval(() => setTimer(t => t - 0.1), 100);
    return () => clearInterval(id);
  }, [timer, gameOver]);

  // Gesture recognition effect
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
      recognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const smooth = (() => {
        const win = [];
        return (txt) => {
          win.push(txt); if (win.length > 7) win.shift();
          const counts = win.reduce((m,t)=> (m[t]=(m[t]||0)+1, m),{});
          return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
        };
      })();

      let lastGesture = null;
      let lastTime = 0;

      const loop = async () => {
        if (!mounted || gameOver) return;
        const res = await recognizerRef.current.recognizeForVideo(video, performance.now());
        let txt = "No gesture";
        if (res.gestures?.length && res.gestures[0]?.length) {
          const top = res.gestures[0][0];
          txt = `${top.categoryName} (${top.score.toFixed(2)})`;
        }
        const smoothed = smooth(txt);
        setLabel(smoothed);

        // draw mirrored preview
        ctx.save(); ctx.scale(-1,1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        // Detect thumbs up/down and process answer
        // Only accept a new gesture if it's different from the last and not "No gesture"
        const now = Date.now();
        if (
          !gameOver &&
          now > cooldownUntil && // Only allow answer if cooldown has passed
          (smoothed.startsWith("Thumb_Up") || smoothed.startsWith("Thumb_Down")) &&
          (smoothed !== lastGesture || now - lastTime > 1500)
        ) {
          lastGesture = smoothed;
          lastTime = now;
          setCooldownUntil(now + 1000); // 1 second cooldown after each answer
          const isUp = smoothed.startsWith("Thumb_Up");
          const correct = (isUp && equation.answer) || (!isUp && !equation.answer);
          if (correct) {
            setScore(s => s + 1);
            setTimer(t => Math.min(t + TIME_INC, MAX_TIME));
            setEquation(getRandomEquation());
          } else {
            setLives(l => {
              if (l > 1) {
                setEquation(getRandomEquation());
                return l - 1;
              } else {
                setGameOver(true);
                return 0;
              }
            });
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    })();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      recognizerRef.current?.close();
      stream?.getTracks()?.forEach(t => t.stop());
    };
    // eslint-disable-next-line
  }, [gameOver, equation, cooldownUntil]); // Add cooldownUntil to dependencies

  function restart() {
    setScore(0);
    setTimer(MAX_TIME);
    setEquation(getRandomEquation());
    setGameOver(false);
    setCooldownUntil(0); // Reset cooldown on restart
    setLives(MAX_LIVES); // Reset lives on restart
  }

  // Evil emoji size grows as timer runs out
  const emojiSize = 60 + (1 - timer / MAX_TIME) * 180; // 60px to 240px

  return (
    <PageShell title="Math Thumbs Game" onBackHref="/">
      <div className="stage">
        <video ref={videoRef} muted playsInline style={{display:"none"}} />
        <canvas ref={canvasRef} width={640} height={480} className="view" />
        <div className="badge">
          <div style={{marginBottom: 6, fontSize: "1.2em"}}>
            {Array.from({length: lives}).map((_,i) => (
              <span key={i} style={{marginRight:2}}>{HEART}</span>
            ))}
          </div>
          {gameOver ? (
            <>
              <div style={{fontSize: "2em"}}>Game Over!</div>
              <div>Score: {score}</div>
              <button onClick={restart} style={{marginTop:8}}>Restart</button>
            </>
          ) : (
            <>
              <div style={{fontSize:"1.5em", marginBottom: 4}}>{equation.text}</div>
              <div style={{fontSize:"1em"}}>👍 = True, 👎 = False</div>
              <div style={{marginTop:4}}>Score: {score}</div>
            </>
          )}
        </div>
        <div
          className="evil-emoji"
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            fontSize: emojiSize,
            transition: "font-size 0.2s"
          }}
        >
          {EVIL_EMOJI}
        </div>
        <div
          className="timer-bar"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 12,
            width: `${(timer / MAX_TIME) * 100}%`,
            background: "linear-gradient(90deg, #f44, #fa0)",
            borderRadius: 6,
            transition: "width 0.1s"
          }}
        />
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
    .view { width:640px; height:480px; border-radius:12px; }
    .badge {
      position:absolute; top:12px; left:12px;
      background:rgba(0,0,0,.7); color:#fff; padding:12px 16px; border-radius:10px;
      font-weight:600; letter-spacing:.3px; min-width: 220px;
      z-index:2;
    }
    .evil-emoji {
      user-select: none;
      pointer-events: none;
      filter: drop-shadow(0 2px 8px #000a);
      z-index:1;
    }
    .timer-bar {
      z-index:2;
    }
  `}</style>
  );
}
