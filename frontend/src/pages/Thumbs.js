import { useEffect, useRef, useState } from "react";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

export default function Thumbs() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const recognizerRef = useRef(null);
  const [label, setLabel] = useState("Initializing…");

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

      const loop = async () => {
        const res = await recognizerRef.current.recognizeForVideo(video, performance.now());
        let txt = "No gesture";
        if (res.gestures?.length && res.gestures[0]?.length) {
          const top = res.gestures[0][0];
          txt = `${top.categoryName} (${top.score.toFixed(2)})`;
        }
        setLabel(smooth(txt));

        // draw mirrored preview
        ctx.save(); ctx.scale(-1,1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

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
  }, []);

  return (
    <PageShell title="Thumbs Up/Down" onBackHref="/">
      <div className="stage">
        <video ref={videoRef} muted playsInline style={{display:"none"}} />
        <canvas ref={canvasRef} width={640} height={480} className="view" />
        <div className="badge">{label}</div>
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
      background:rgba(0,0,0,.6); color:#fff; padding:8px 12px; border-radius:8px;
      font-weight:600; letter-spacing:.3px;
    }
  `}</style>
  );
}
