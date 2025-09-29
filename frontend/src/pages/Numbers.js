import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export default function Numbers() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const landmarkerRef = useRef(null);

  const [hand1, setHand1] = useState(0);
  const [hand2, setHand2] = useState(0);
  const [total, setTotal] = useState(0);

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
        const pairs = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20]];
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.fillStyle = "rgba(255,255,255,.95)";
        for (const [a,b] of pairs) {
          const A=l[a], B=l[b];
          ctx.beginPath(); ctx.moveTo(A.x*canvas.width, A.y*canvas.height);
          ctx.lineTo(B.x*canvas.width, B.y*canvas.height); ctx.stroke();
        }
        for (const p of l) { ctx.beginPath(); ctx.arc(p.x*canvas.width, p.y*canvas.height, 3.5, 0, Math.PI*2); ctx.fill(); }
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

            // label near wrist
            const w = l[0];
            ctx.fillStyle="rgba(0,0,0,.65)";
            ctx.fillRect(w.x*canvas.width - 28, w.y*canvas.height - 36, 56, 26);
            ctx.fillStyle="#fff"; ctx.font="bold 16px system-ui"; ctx.textAlign="center";
            ctx.fillText(String(cnt), w.x*canvas.width, w.y*canvas.height - 18);
          }
        } else {
          per=[0,0];
        }

        setHand1(per[0] ?? 0);
        setHand2(per[1] ?? 0);
        setTotal(smoothTotal(per.reduce((a,b)=>a+b,0)));

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

  return (
    <PageShell title="Numbers (0–10)" onBackHref="/">
      <div className="stage">
        <video ref={videoRef} muted playsInline style={{display:"none"}} />
        <canvas ref={canvasRef} width={640} height={480} className="view" />
        <div className="hud">
          <div className="chip">Hand 1: {hand1}</div>
          <div className="chip">Hand 2: {hand2}</div>
          <div className="chip strong">TOTAL: {total}</div>
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
      .hud   { position:absolute; top:12px; left:12px; display:flex; gap:8px; flexDirection:column; flex-wrap:wrap; max-width:95%; }
      .chip  { background:rgba(0,0,0,.6); color:#fff; padding:8px 12px; border-radius:8px; font-weight:600; }
      .strong{ background:rgba(0,0,0,.75); }
    `}</style>
  );
}
