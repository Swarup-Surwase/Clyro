import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { ClyroLogo } from '../shared/ClyroLogo';

type IntroOverlayProps = {
  open: boolean;
  onComplete: () => void;
};

const INTRO_VS = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Centered radial bloom expanding outward through symmetric vertical fluted glass louvers,
// matching the opening sequence in Clyro_Intro_animation.mov in silver & muted mint (#A8E6CF).
const INTRO_FS = `
  precision highp float;
  varying vec2 v_uv;

  uniform vec2 u_resolution;
  uniform float u_progress; // 0..1 across intro duration

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 uv = v_uv;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);

    // Fluted vertical glass columns across viewport width
    float ribCount = u_resolution.x < 700.0 ? 28.0 : 52.0;
    float xCoord = uv.x * ribCount;
    float ribIndex = floor(xCoord);
    float ribLocal = fract(xCoord);

    // Refracted coordinate per vertical louver
    float prismOffset = (ribLocal - 0.5) * 0.095 * (0.35 + abs(uv.x - 0.5) * 1.5);
    float ribCenterX = ((ribIndex + 0.5) / ribCount - 0.5) * aspect;
    float centeredY = uv.y - 0.5;
    vec2 p = vec2(ribCenterX + prismOffset, centeredY);

    // Smooth cubic expansion from center -> outer edges
    float ease = 1.0 - pow(1.0 - clamp(u_progress, 0.0, 1.0), 2.6);
    float radius = mix(0.02, 1.25, ease);
    float dist = length(vec2(p.x * 0.88, p.y * 1.15));

    // Luminous primary ring & inner secondary ripple
    float bandWidth = mix(0.075, 0.25, ease);
    float ring = exp(-pow((dist - radius * 0.68) / bandWidth, 2.0));
    float innerHalo = exp(-pow((dist - radius * 0.45) / (bandWidth * 1.35), 2.0)) * 0.38;

    // Sharp beveled fluted louver edges
    float fluteBevel = pow(1.0 - abs(ribLocal * 2.0 - 1.0), 1.35);
    float fluteBorder = smoothstep(0.03, 0.14, ribLocal) * smoothstep(0.97, 0.86, ribLocal);
    float glow = (ring + innerHalo) * (0.45 + 0.72 * fluteBevel) * fluteBorder;

    // Fade center gently as ring passes outward, keeping centered Clyro title legible
    float centerFade = mix(0.45, smoothstep(0.05, 0.38, abs(uv.x - 0.5)), smoothstep(0.18, 0.75, ease));
    float fadeTopBot = smoothstep(0.03, 0.16, uv.y) * smoothstep(0.97, 0.84, uv.y);

    // Chromatic dispersion inside glass flutes (silver core + muted mint + cool ice fringe)
    float shift = (ribLocal - 0.5) * 0.04;
    float distMint = length(vec2((p.x + shift) * 0.88, p.y * 1.15));
    float ringMint = exp(-pow((distMint - radius * 0.68) / bandWidth, 2.0)) * fluteBorder * fadeTopBot;

    float fadeOut = 1.0 - smoothstep(0.84, 1.0, u_progress);
    float master = glow * centerFade * fadeTopBot * fadeOut;

    vec3 bg = vec3(0.0196, 0.0196, 0.0196);
    vec3 silver = vec3(0.96, 0.97, 0.98);
    vec3 mint = vec3(0.659, 0.902, 0.812);
    vec3 coolMist = vec3(0.54, 0.78, 0.86);

    vec3 col = bg;
    col += silver * master * 0.95;
    col += mint * ringMint * centerFade * (0.55 + 0.45 * fluteBevel) * fadeOut * 0.82;
    col += coolMist * master * 0.25 * (1.0 - ribLocal);

    // Luminous top/bottom hairline borders matching reference recording frame
    float topLine = exp(-abs(uv.y - 0.955) * 290.0) * 0.35 * (0.35 + 0.65 * ease) * fadeOut;
    float botLine = exp(-abs(uv.y - 0.045) * 290.0) * 0.35 * (0.35 + 0.65 * ease) * fadeOut;
    col += mix(silver, mint, 0.45) * (topLine + botLine);

    float dither = (hash(uv * u_resolution) - 0.5) * 0.008;
    gl_FragColor = vec4(clamp(col + dither, 0.0, 1.0), 1.0);
  }
`;

export function IntroOverlay({ open, onComplete }: IntroOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phaseText, setPhaseText] = useState<'bloom' | 'settle'>('bloom');

  useEffect(() => {
    if (!open) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      onComplete();
      return;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onComplete();
      }
    };
    const onWheel = () => onComplete();

    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true, once: true });

    const settleTimer = window.setTimeout(() => setPhaseText('settle'), 750);
    const doneTimer = window.setTimeout(() => onComplete(), 2550);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      window.clearTimeout(settleTimer);
      window.clearTimeout(doneTimer);
    };
  }, [open, onComplete]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const DURATION_MS = 2350;
    const startTime = performance.now();
    let rafId = 0;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    } catch {
      gl = null;
    }

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    if (gl) {
      const compile = (t: number, s: string) => {
        const sh = gl!.createShader(t);
        if (!sh) return null;
        gl!.shaderSource(sh, s);
        gl!.compileShader(sh);
        return gl!.getShaderParameter(sh, gl!.COMPILE_STATUS) ? sh : null;
      };
      const vs = compile(gl.VERTEX_SHADER, INTRO_VS);
      const fs = compile(gl.FRAGMENT_SHADER, INTRO_FS);
      const prog = vs && fs ? gl.createProgram() : null;
      if (prog && vs && fs) {
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          gl.useProgram(prog);
          const buf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW
          );
          const loc = gl.getAttribLocation(prog, 'a_position');
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

          const uRes = gl.getUniformLocation(prog, 'u_resolution');
          const uProg = gl.getUniformLocation(prog, 'u_progress');

          const draw = (now: number) => {
            const p = Math.min(1, (now - startTime) / DURATION_MS);
            gl!.uniform2f(uRes, canvas.width, canvas.height);
            gl!.uniform1f(uProg, p);
            gl!.drawArrays(gl!.TRIANGLES, 0, 6);
            if (p < 1) {
              rafId = window.requestAnimationFrame(draw);
            }
          };
          rafId = window.requestAnimationFrame(draw);

          return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
            gl?.deleteProgram(prog);
          };
        }
      }
    }

    // 2D fallback
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) {
      window.removeEventListener('resize', resize);
      return;
    }

    const draw2d = (now: number) => {
      const p = Math.min(1, (now - startTime) / DURATION_MS);
      const ease = 1 - Math.pow(1 - p, 2.6);
      const w = canvas.width;
      const h = canvas.height;
      ctx!.fillStyle = '#050505';
      ctx!.fillRect(0, 0, w, h);

      const cols = w < 900 ? 28 : 50;
      const colW = w / cols;
      for (let i = 0; i < cols; i++) {
        const dx = Math.abs((i + 0.5) / cols - 0.5) * 2;
        const ring = Math.exp(-Math.pow((dx - ease * 0.95) / 0.22, 2));
        const alpha = ring * (1 - p * 0.65) * 0.55;
        if (alpha < 0.01) continue;
        ctx!.fillStyle = `rgba(168, 230, 207, ${alpha})`;
        ctx!.fillRect(i * colW + 1, h * 0.06, Math.max(1, colW - 2), h * 0.88);
      }
      if (p < 1) rafId = window.requestAnimationFrame(draw2d);
    };
    rafId = window.requestAnimationFrame(draw2d);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="clyro-intro-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
          className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
          role="dialog"
          aria-label="Clyro introductory animation"
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full block pointer-events-none"
          />

          {/* Centered Brand Moment */}
          <motion.div
            initial={{ opacity: 0.25, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-center px-6 py-5 rounded-2xl bg-[#050505]/45 backdrop-blur-[2px] space-y-3"
          >
            <div className="flex justify-center scale-125">
              <ClyroLogo />
            </div>
            <div className="text-[28px] sm:text-[42px] font-semibold tracking-[-0.03em] text-[#F5F5F5]">
              Save Lives. Share Help. <span className="text-[#A8E6CF]">Protect Identities.</span>
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#A3A3A3]">
              {phaseText === 'bloom'
                ? 'Initializing Local Privacy Perimeter'
                : '100% Browser-Only Sanitization Ready'}
            </div>
          </motion.div>

          {/* Non-blocking Skip Intro control */}
          <button
            type="button"
            onClick={onComplete}
            className="fixed bottom-7 right-7 z-20 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-mono bg-[#0C0D0E]/90 border border-[#26282A] text-[#F5F5F5] hover:border-[#A8E6CF] hover:text-[#A8E6CF] transition-colors cursor-pointer"
          >
            <span>Skip Intro</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
