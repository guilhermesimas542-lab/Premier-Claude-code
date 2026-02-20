import { useEffect, useRef } from "react";

/**
 * Hook that renders a Matrix Rain effect on a canvas element.
 * Returns a ref to attach to a <canvas> element.
 */
export function useMatrixCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン01010110100111".split("");
    const fontSize = 11;
    let cols = Math.floor(canvas.width / fontSize);
    let drops: number[] = Array(cols).fill(1);

    const handleResize = () => {
      cols = Math.floor(canvas.width / fontSize);
      drops = Array(cols).fill(1);
    };
    resizeObserver.observe(parent);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const y = drops[i] * fontSize;
        ctx.fillStyle = "#00FF00";
        ctx.shadowColor = "#00FF00";
        ctx.shadowBlur = 6;
        ctx.fillText(char, i * fontSize, y);
        ctx.shadowBlur = 0;
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);

    return () => {
      clearInterval(interval);
      resizeObserver.disconnect();
    };
  }, []);

  return canvasRef;
}
