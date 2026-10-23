import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { drawImageOnto, type LoadedImage } from '../lib/image';
import { computeDrawRect, dragToOffset, type FitMode, type Placement } from '../lib/layout';

export interface Overlay {
  /** Draw a circle guide (profile pictures). */
  circle?: boolean;
}

/**
 * Live, draggable preview of how the image will sit on the output canvas.
 * The preview uses the exact same geometry as the exported file.
 */
export function PlacementEditor({
  image,
  outW,
  outH,
  fit,
  placement,
  onPlacement,
  background,
  overlay = {},
  maxPreview = 560,
  extraDraw,
  label,
}: {
  image: LoadedImage;
  outW: number;
  outH: number;
  fit: FitMode;
  placement: Placement;
  onPlacement: (p: Placement) => void;
  background: string | null;
  overlay?: Overlay;
  maxPreview?: number;
  extraDraw?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(maxPreview);
  const drag = useRef<{ x: number; y: number; start: Placement } | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setBoxW(Math.min(maxPreview, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxPreview]);

  // Fit preview within boxW wide and ~70vh / 520px tall.
  const maxH = 520;
  const scale = Math.min(boxW / outW, maxH / outH);
  const pw = Math.max(1, Math.round(outW * scale));
  const ph = Math.max(1, Math.round(outH * scale));

  const rect = useMemo(
    () => computeDrawRect(image.width, image.height, outW, outH, fit, placement),
    [image, outW, outH, fit, placement],
  );

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(pw * dpr);
    c.height = Math.round(ph * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const s = (pw * dpr) / outW;
    drawImageOnto(ctx, image.source, {
      width: c.width,
      height: c.height,
      rect: { dx: rect.dx * s, dy: rect.dy * s, dw: rect.dw * s, dh: rect.dh * s },
      background,
    });
    extraDraw?.(ctx, c.width, c.height);
    if (overlay.circle) {
      ctx.save();
      ctx.fillStyle = 'rgba(23,26,43,0.55)';
      ctx.beginPath();
      ctx.rect(0, 0, c.width, c.height);
      ctx.arc(c.width / 2, c.height / 2, Math.min(c.width, c.height) / 2, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(c.width / 2, c.height / 2, Math.min(c.width, c.height) / 2 - dpr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [image, rect, pw, ph, outW, background, overlay.circle, extraDraw]);

  const canPan = rect.dw - outW > 0.5 || rect.dh - outH > 0.5 || rect.dw < outW - 0.5 || rect.dh < outH - 0.5;

  function onDown(e: PointerEvent<HTMLCanvasElement>) {
    if (!canPan) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: placement };
  }
  function onMove(e: PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d) return;
    onPlacement(dragToOffset(d.start, { x: e.clientX - d.x, y: e.clientY - d.y }, rect, outW, outH, scale));
  }
  function onUp() {
    drag.current = null;
  }
  function onKey(e: KeyboardEvent<HTMLCanvasElement>) {
    const step = e.shiftKey ? 40 : 10;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = map[e.key];
    if (m) {
      e.preventDefault();
      onPlacement(dragToOffset(placement, { x: m[0], y: m[1] }, rect, outW, outH, scale));
    } else if (e.key === '+' || e.key === '=') {
      onPlacement({ ...placement, zoom: Math.min(4, placement.zoom + 0.1) });
    } else if (e.key === '-') {
      onPlacement({ ...placement, zoom: Math.max(0.2, placement.zoom - 0.1) });
    }
  }

  return (
    <div ref={boxRef} className="w-full">
      <div className="checker cropmarks mx-auto rounded-sm" style={{ width: pw, height: ph }}>
        <canvas
          ref={canvasRef}
          data-testid="preview-canvas"
          role="img"
          aria-label={`${label}. ${canPan ? 'Drag, or focus and use arrow keys, to reposition. Plus and minus keys zoom.' : ''}`}
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
          className={`block touch-none ${canPan ? 'cursor-grab active:cursor-grabbing' : ''}`}
          style={{ width: pw, height: ph }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        Preview {pw} × {ph}px of a {outW} × {outH}px output
        {canPan ? '. Drag to reposition.' : ''}
      </p>
    </div>
  );
}
