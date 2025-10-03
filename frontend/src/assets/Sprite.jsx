import { useEffect, useRef, useState } from "react";

export default function Sprite({ frames, fps = 8, className, style }) {
  const [i, setI] = useState(0);
  const raf = useRef();

  useEffect(() => {
    if (!frames?.length) return;
    let last = performance.now();
    const step = 1000 / fps;
    const loop = (now) => {
      if (now - last >= step) {
        setI((n) => (n + 1) % frames.length);
        last = now;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [fps, frames]);

  return (
    <img
      src={frames?.[i]}
      alt=""
      draggable="false"
      className={className}
      style={{ width: "100%", height: "100%", objectFit: "contain", ...style }}
    />
  );
}
