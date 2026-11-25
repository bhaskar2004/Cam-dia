export const COLORS = { white: '#ffffff', black: '#000000', red: '#ff453a', green: '#32d74b', yellow: '#ffd60a' } as const;
/** Number of grid steps across the preview's shorter side. */
export const DIVISIONS = { small: 12, medium: 8, large: 5 } as const;

export interface GridSettings {
  visible: boolean; diagonal: boolean; orthogonal: boolean;
  color: keyof typeof COLORS; opacity: number; thickness: number;
  spacing: keyof typeof DIVISIONS;
}

/** Shared by the live overlay and photo export. All units are preview CSS pixels. */
export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, g: GridSettings) {
  const step = Math.min(w, h) / DIVISIONS[g.spacing];
  if (step <= 0) return;
  const cx = w / 2, cy = h / 2;
  const count = Math.ceil((w + h) / step);
  const line = (x1: number, y1: number, x2: number, y2: number) => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); };
  ctx.save();
  ctx.beginPath();
  // Anchored at the centre, so the pattern stays symmetrical at every size.
  for (let i = -count; i <= count; i++) {
    const x = cx + i * step;
    if (g.diagonal) {
      line(x - cy, 0, x - cy + h, h); // \
      line(x + cy, 0, x + cy - h, h); // /
    }
    if (g.orthogonal) { // passes through the diamond intersections
      line(x, 0, x, h);
      line(0, cy + i * step, w, cy + i * step);
    }
  }
  ctx.strokeStyle = COLORS[g.color];
  ctx.lineWidth = g.thickness;
  ctx.globalAlpha = g.opacity / 100;
  ctx.stroke(); // one stroke: intersections don't build up extra opacity
  ctx.restore();
}

/** Captures exactly the region visible in the object-fit: cover preview. */
export function capturePhoto(video: HTMLVideoElement, mirrored: boolean, grid: GridSettings | null) {
  const { width: cw, height: ch } = video.getBoundingClientRect();
  const { videoWidth: vw, videoHeight: vh } = video;
  const scale = Math.max(cw / vw, ch / vh);
  const sw = cw / scale, sh = ch / scale;
  const out = document.createElement('canvas');
  out.width = Math.round(sw);
  out.height = Math.round(sh);
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.save();
  if (mirrored) { ctx.translate(out.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, out.width, out.height);
  ctx.restore();
  if (grid) {
    ctx.setTransform(out.width / cw, 0, 0, out.height / ch, 0, 0);
    drawGrid(ctx, cw, ch, grid);
  }
  return out;
}
