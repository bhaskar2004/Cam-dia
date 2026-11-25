import { useEffect, useRef } from 'react';
import { drawGrid, type GridSettings } from './grid';

export default function GridOverlay({ grid }: { grid: GridSettings }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const paint = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx || !width || !height || !grid.visible) return;
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      drawGrid(ctx, width, height, grid);
    };
    paint(); // repaints only on setting or size changes
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    window.addEventListener('resize', paint); // zoom / pixel-ratio changes
    return () => { observer.disconnect(); window.removeEventListener('resize', paint); };
  }, [grid]);
  return <canvas ref={ref} className="layer overlay" aria-hidden="true" />;
}
