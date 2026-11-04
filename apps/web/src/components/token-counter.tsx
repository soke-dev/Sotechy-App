"use client";
// The receipt's "You earn" figure: counts up when it comes into view, then again every few seconds
import { useEffect, useRef, useState } from "react";

export function TokenCounter({ to }: { to: number }) {
  const [n, setN] = useState(0);
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let loop: ReturnType<typeof setInterval> | undefined;
    const run = () => {
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1800);
        setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const seen = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || loop) return;
      run();
      loop = setInterval(run, 7000);
    });
    if (el.current) seen.observe(el.current);
    return () => {
      seen.disconnect();
      if (loop) clearInterval(loop);
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return <span ref={el}>{n.toLocaleString("en-NG")}</span>;
}
