import { useEffect, useRef } from 'react';

type Particle = {
  u: number; // 0..1 progress along horizontal stream
  lane: number; // -1..1 radial/vertical offset
  speed: number;
  phase: number;
  size: number;
};

type WireframeFunnelCanvasProps = {
  subtle?: boolean;
};

/**
 * Lightweight local HTML5 Canvas visualization representing raw silver data streams
 * converging through a central privacy boundary and emerging as ordered mint streams.
 * Respects prefers-reduced-motion, caps DPR, and lowers density on mobile viewports.
 */
export function WireframeFunnelCanvas({ subtle = false }: WireframeFunnelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let reducedMotion = mediaQuery?.matches ?? false;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };
    mediaQuery?.addEventListener('change', onMotionChange);

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];

    const initSizeAndParticles = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(300, rect.width);
      height = Math.max(240, rect.height);
      const isMobile = width < 768;
      dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = subtle ? (isMobile ? 45 : 90) : isMobile ? 75 : 170;
      particles = Array.from({ length: count }, (_, i) => ({
        u: (i / count + (i % 7) * 0.03) % 1,
        lane: (((i * 37) % 100) / 50 - 1) * 0.92,
        speed: 0.00055 + ((i % 11) * 0.000045),
        phase: (i * 0.618) % (Math.PI * 2),
        size: i % 5 === 0 ? 1.6 : 1.1,
      }));
    };

    initSizeAndParticles();

    const envelopeAt = (u: number, maxHalfH: number) => {
      // Wide left -> pinched center privacy gate (u ~ 0.5) -> calm structured corridor right
      const pinch = Math.exp(-Math.pow((u - 0.5) / 0.17, 2));
      if (u < 0.5) {
        return maxHalfH * (0.85 - 0.67 * pinch);
      }
      return maxHalfH * (0.18 + 0.34 * (1 - pinch));
    };

    const drawFrame = (timeMs: number) => {
      const t = timeMs * 0.001;
      ctx.clearRect(0, 0, width, height);

      const centerY = height * 0.52;
      const maxHalfH = height * (subtle ? 0.34 : 0.41);
      const gateX = width * 0.5;

      // 1. Subtle wireframe surface curves (longitudinal ribs)
      const ribCount = width < 768 ? 10 : 18;
      const steps = 44;

      for (let r = 0; r <= ribCount; r++) {
        const lane = (r / ribCount) * 2 - 1;
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const x = u * width;
          const env = envelopeAt(u, maxHalfH);
          const wave =
            u < 0.5
              ? Math.sin(u * 9 - t * 0.55 + lane * 2.2) * (1 - u * 1.4) * 10
              : Math.sin(u * 6 - t * 0.4 + lane) * 2.5;
          const y = centerY + lane * env + wave;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const grad = ctx.createLinearGradient(0, 0, width, 0);
        const baseAlpha = subtle ? 0.09 : 0.18;
        grad.addColorStop(0, `rgba(245, 245, 245, ${baseAlpha * 0.3})`);
        grad.addColorStop(0.45, `rgba(210, 210, 210, ${baseAlpha})`);
        grad.addColorStop(0.52, `rgba(168, 230, 207, ${baseAlpha * 1.6})`);
        grad.addColorStop(1, `rgba(168, 230, 207, ${baseAlpha * 0.35})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = r === ribCount / 2 ? 1 : 0.7;
        ctx.stroke();
      }

      // 2. Vertical wireframe cross-rings near transformation boundary
      const crossSlices = width < 768 ? 10 : 16;
      for (let c = 1; c < crossSlices; c++) {
        const u = c / crossSlices;
        const x = u * width;
        const env = envelopeAt(u, maxHalfH);
        const distFromGate = Math.abs(u - 0.5);
        const alpha = Math.max(0.02, (0.14 - distFromGate * 0.22) * (subtle ? 0.6 : 1));
        ctx.beginPath();
        ctx.moveTo(x, centerY - env);
        ctx.lineTo(x, centerY + env);
        ctx.strokeStyle =
          u >= 0.5
            ? `rgba(168, 230, 207, ${alpha})`
            : `rgba(245, 245, 245, ${alpha * 0.75})`;
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }

      // 3. Central privacy boundary hairline
      const gateEnv = envelopeAt(0.5, maxHalfH);
      const gateGrad = ctx.createLinearGradient(0, centerY - gateEnv * 1.4, 0, centerY + gateEnv * 1.4);
      gateGrad.addColorStop(0, 'rgba(168, 230, 207, 0)');
      gateGrad.addColorStop(0.5, subtle ? 'rgba(168, 230, 207, 0.3)' : 'rgba(168, 230, 207, 0.55)');
      gateGrad.addColorStop(1, 'rgba(168, 230, 207, 0)');
      ctx.beginPath();
      ctx.moveTo(gateX, centerY - gateEnv * 1.45);
      ctx.lineTo(gateX, centerY + gateEnv * 1.45);
      ctx.strokeStyle = gateGrad;
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // 4. Flowing data particles (silver chaotic input -> mint ordered output)
      for (const p of particles) {
        if (!reducedMotion) {
          p.u = (p.u + p.speed) % 1;
        }
        const u = p.u;
        const x = u * width;
        const env = envelopeAt(u, maxHalfH);
        const jitter =
          u < 0.48
            ? Math.sin(t * 1.3 + p.phase + u * 12) * 8 * (1 - u * 1.8)
            : 0;
        const snappedLane =
          u >= 0.5 ? Math.round(p.lane * 4) / 4 : p.lane;
        const mix = u < 0.45 ? 0 : u > 0.55 ? 1 : (u - 0.45) / 0.1;
        const effectiveLane = p.lane * (1 - mix) + snappedLane * mix;
        const y = centerY + effectiveLane * env + jitter;

        const edgeFade = Math.min(u * 5, (1 - u) * 5, 1);
        const alpha = (subtle ? 0.35 : 0.68) * edgeFade;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        if (u >= 0.5) {
          ctx.fillStyle = `rgba(168, 230, 207, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(235, 235, 235, ${alpha * 0.72})`;
        }
        ctx.fill();
      }
    };

    const tick = (now: number) => {
      drawFrame(now);
      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    if (reducedMotion) {
      drawFrame(1200);
    } else {
      rafId = window.requestAnimationFrame(tick);
    }

    const handleResize = () => {
      initSizeAndParticles();
      if (reducedMotion) drawFrame(1200);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      mediaQuery?.removeEventListener('change', onMotionChange);
    };
  }, [subtle]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="w-full h-full block pointer-events-none select-none"
    />
  );
}
