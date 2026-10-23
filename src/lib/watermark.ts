/** Text watermark drawing. Pure canvas operations, no network. */
export type WmPosition = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br' | 'tile';

export interface WatermarkSettings {
  text: string;
  /** Font size as a percentage of the image's shorter side. */
  sizePct: number;
  opacity: number;
  rotation: number;
  color: string;
  position: WmPosition;
  shadow: boolean;
  bold: boolean;
}

export const WM_DEFAULTS: WatermarkSettings = {
  text: '© Your Name',
  sizePct: 5,
  opacity: 0.6,
  rotation: 0,
  color: '#ffffff',
  position: 'br',
  shadow: true,
  bold: true,
};

/** Anchor point (0–1) for a 3×3 grid position. */
export function anchorFor(pos: Exclude<WmPosition, 'tile'>): { ax: number; ay: number } {
  const col = pos[1] === 'l' ? 0 : pos[1] === 'c' ? 0.5 : 1;
  const row = pos[0] === 't' ? 0 : pos[0] === 'm' ? 0.5 : 1;
  return { ax: col, ay: row };
}

export function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, s: WatermarkSettings): void {
  const text = s.text.trim();
  if (!text) return;
  const fontPx = Math.max(6, Math.round((Math.min(w, h) * s.sizePct) / 100));
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, s.opacity));
  ctx.fillStyle = s.color;
  ctx.font = `${s.bold ? 700 : 500} ${fontPx}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  if (s.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = fontPx * 0.15;
    ctx.shadowOffsetX = fontPx * 0.04;
    ctx.shadowOffsetY = fontPx * 0.04;
  }
  const rad = (s.rotation * Math.PI) / 180;
  const tw = ctx.measureText(text).width;

  if (s.position === 'tile') {
    const stepX = tw + fontPx * 3;
    const stepY = fontPx * 4;
    const diag = Math.hypot(w, h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rad);
    for (let y = -diag; y <= diag; y += stepY) {
      const shift = (Math.round(y / stepY) % 2) * (stepX / 2);
      for (let x = -diag; x <= diag; x += stepX) ctx.fillText(text, x + shift, y);
    }
  } else {
    const { ax, ay } = anchorFor(s.position);
    const pad = Math.round(Math.min(w, h) * 0.04);
    // Bounding box of the rotated text so it stays inside the image.
    const bw = Math.abs(tw * Math.cos(rad)) + Math.abs(fontPx * Math.sin(rad));
    const bh = Math.abs(tw * Math.sin(rad)) + Math.abs(fontPx * Math.cos(rad));
    const cx = pad + bw / 2 + ax * (w - 2 * pad - bw);
    const cy = pad + bh / 2 + ay * (h - 2 * pad - bh);
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.fillText(text, 0, 0);
  }
  ctx.restore();
}
