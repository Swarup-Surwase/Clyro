import { useEffect, useRef } from 'react';

type PrivacyPrismShaderCanvasProps = {
  scrollProgress?: number; // 0..1 as hero scrolls away
  replayNonce?: number;
  subtle?: boolean;
};

const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Fluted-glass radial privacy aperture shader inspired by slit-refraction louver bloom.
// Monochromatic silver + muted mint (#A8E6CF) dispersion with dark central legibility corridor.
const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 v_uv;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_intro;
  uniform float u_scroll;
  uniform vec2 u_mouse;
  uniform float u_subtle;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 uv = v_uv;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);

    // Subtle pointer tilt and scroll lift
    vec2 centered = (uv - 0.5);
    centered.x *= aspect;
    centered += u_mouse * 0.035;
    centered.y += u_scroll * 0.14;

    // Vertical fluted glass louvers across X
    float ribCount = u_resolution.x < 700.0 ? 28.0 : 54.0;
    float xCoord = uv.x * ribCount + u_mouse.x * 0.45;
    float ribIndex = floor(xCoord);
    float ribLocal = fract(xCoord); // 0..1 within each glass flute

    // Sawtooth prism refraction per flute, stronger toward edges
    float prismOffset = (ribLocal - 0.5) * 0.085 * (0.4 + abs(uv.x - 0.5) * 1.4);
    float ribCenterX = ((ribIndex + 0.5) / ribCount - 0.5) * aspect;
    vec2 p = vec2(ribCenterX + prismOffset, centered.y);

    // Expanding intro ring wave: 0 -> 1.38 radius sweep, shifted slightly right on wide screens
    // so left-aligned hero typography remains razor-sharp legible
    float introEase = 1.0 - pow(1.0 - clamp(u_intro, 0.0, 1.0), 3.0);
    float waveRadius = mix(0.04, 1.24, introEase) + sin(u_time * 0.45) * 0.016;
    float focusOffsetX = u_resolution.x < 700.0 ? 0.0 : 0.16;
    float dist = length(vec2((p.x - focusOffsetX) * 0.86, p.y * 1.12));

    // Crisp luminous ring band that sweeps outward into fluted vertical columns
    float bandWidth = mix(0.10, 0.31, introEase);
    float ring = exp(-pow((dist - waveRadius * 0.72) / bandWidth, 2.0));

    // Secondary soft inner halo
    float halo = exp(-pow((dist - waveRadius * 0.52) / (bandWidth * 1.4), 2.0)) * 0.42;

    // Flute bevel shading (bright crisp edge inside each vertical louver)
    float fluteEdge = pow(1.0 - abs(ribLocal * 2.0 - 1.0), 1.4);
    float fluteSharp = smoothstep(0.03, 0.15, ribLocal) * smoothstep(0.97, 0.85, ribLocal);
    float louverGlow = (ring + halo) * (0.42 + 0.68 * fluteEdge) * fluteSharp;

    // Keep text zone dark & calm after bloom while leaving vivid fluted louvers on right & perimeter
    float leftQuiet = u_resolution.x < 700.0 ? 0.36 : smoothstep(0.05, 0.62, uv.x) * 0.88 + 0.12;
    float edgeMask = smoothstep(0.05, 0.50, abs(uv.x - 0.54)) * 0.84 + 0.16;
    float settleCorridor = mix(u_resolution.x < 700.0 ? 0.45 : 1.0, edgeMask * leftQuiet, smoothstep(0.22, 0.92, introEase));
    float topBottomFade = smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.82, uv.y);

    float intensity = louverGlow * settleCorridor * topBottomFade * (1.0 - u_scroll * 0.55);
    intensity *= mix(0.82, 0.34, u_subtle);

    // Subtle chromatic edge split (mint #A8E6CF + silver-white + soft cool mist)
    float shift = (ribLocal - 0.5) * 0.035;
    float distMint = length(vec2((p.x - focusOffsetX + shift) * 0.86, p.y * 1.12));
    float ringMint = exp(-pow((distMint - waveRadius * 0.72) / bandWidth, 2.0)) * fluteSharp * settleCorridor * topBottomFade;

    vec3 baseBg = vec3(0.0196, 0.0196, 0.0196); // #050505
    vec3 silver = vec3(0.92, 0.94, 0.95);
    vec3 mint = vec3(0.659, 0.902, 0.812); // #A8E6CF
    vec3 coolSlate = vec3(0.54, 0.77, 0.84);

    vec3 color = baseBg;
    color += silver * intensity * 0.72;
    color += mint * (ringMint * (0.55 + 0.35 * fluteEdge)) * (1.0 - u_scroll * 0.5) * mix(0.75, 0.35, u_subtle);
    color += coolSlate * intensity * 0.22 * (1.0 - ribLocal);

    // Subtle hairline horizon border shimmer at top/bottom like screen recording
    float hairlineTop = exp(-abs(uv.y - 0.96) * 260.0) * 0.12 * (0.4 + 0.6 * introEase);
    float hairlineBot = exp(-abs(uv.y - 0.04) * 260.0) * 0.12 * (0.4 + 0.6 * introEase);
    color += mint * (hairlineTop + hairlineBot);

    // Fine static dithering to prevent banding on dark OLED panels
    float dither = (hash(uv * u_resolution) - 0.5) * 0.008;
    color = clamp(color + dither, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function PrivacyPrismShaderCanvas({
  scrollProgress = 0,
  replayNonce = 0,
  subtle = false,
}: PrivacyPrismShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollRef = useRef(scrollProgress);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const introStartRef = useRef<number>(performance.now());

  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    introStartRef.current = performance.now();
  }, [replayNonce]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let reducedMotion = mediaQuery?.matches ?? false;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };
    mediaQuery?.addEventListener('change', onMotionChange);

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseRef.current.targetX = Math.max(-1, Math.min(1, nx));
      mouseRef.current.targetY = Math.max(-1, Math.min(1, ny));
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Try WebGL first for crisp fluted-glass fragment shader; fallback cleanly to 2D canvas
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    } catch {
      gl = null;
    }

    let rafId = 0;
    const INTRO_DURATION_MS = 2200;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(300, rect.width);
      const h = Math.max(240, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    if (gl) {
      const compile = (type: number, source: string) => {
        const s = gl!.createShader(type);
        if (!s) return null;
        gl!.shaderSource(s, source);
        gl!.compileShader(s);
        if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
          gl!.deleteShader(s);
          return null;
        }
        return s;
      };

      const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
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
          const posLoc = gl.getAttribLocation(prog, 'a_position');
          gl.enableVertexAttribArray(posLoc);
          gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

          const uRes = gl.getUniformLocation(prog, 'u_resolution');
          const uTime = gl.getUniformLocation(prog, 'u_time');
          const uIntro = gl.getUniformLocation(prog, 'u_intro');
          const uScroll = gl.getUniformLocation(prog, 'u_scroll');
          const uMouse = gl.getUniformLocation(prog, 'u_mouse');
          const uSubtle = gl.getUniformLocation(prog, 'u_subtle');

          resizeCanvas();
          window.addEventListener('resize', resizeCanvas);

          const renderGl = (now: number) => {
            mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
            mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

            const elapsed = now - introStartRef.current;
            const introProgress = reducedMotion ? 1.0 : Math.min(1.0, Math.max(0.0, elapsed / INTRO_DURATION_MS));

            gl!.uniform2f(uRes, canvas.width, canvas.height);
            gl!.uniform1f(uTime, reducedMotion ? 1.5 : now * 0.001);
            gl!.uniform1f(uIntro, introProgress);
            gl!.uniform1f(uScroll, scrollRef.current);
            gl!.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
            gl!.uniform1f(uSubtle, subtle ? 1.0 : 0.0);
            gl!.drawArrays(gl!.TRIANGLES, 0, 6);

            if (!reducedMotion) {
              rafId = window.requestAnimationFrame(renderGl);
            }
          };

          if (reducedMotion) {
            renderGl(performance.now() + INTRO_DURATION_MS);
          } else {
            rafId = window.requestAnimationFrame(renderGl);
          }

          return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('pointermove', onPointerMove);
            mediaQuery?.removeEventListener('change', onMotionChange);
            gl?.deleteProgram(prog);
            gl?.deleteShader(vs);
            gl?.deleteShader(fs);
          };
        }
      }
    }

    // 2D Canvas fallback (if WebGL is disabled/unavailable)
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) {
      window.removeEventListener('pointermove', onPointerMove);
      mediaQuery?.removeEventListener('change', onMotionChange);
      return;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render2d = (now: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const elapsed = now - introStartRef.current;
      const intro = reducedMotion ? 1 : Math.min(1, Math.max(0, elapsed / INTRO_DURATION_MS));
      const ease = 1 - Math.pow(1 - intro, 3);

      ctx!.fillStyle = '#050505';
      ctx!.fillRect(0, 0, w, h);

      const cols = w < 900 ? 26 : 48;
      const colW = w / cols;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxR = Math.max(w, h) * 0.48 * ease;

      for (let i = 0; i < cols; i++) {
        const x = i * colW + colW * 0.5;
        const dx = Math.abs(x - cx) / (w * 0.5);
        const ringFactor = Math.exp(-Math.pow((dx - ease * 0.72) / 0.25, 2));
        const corridor = Math.min(1, dx * 1.45);
        const alpha = ringFactor * corridor * (subtle ? 0.16 : 0.34) * (1 - scrollRef.current * 0.5);
        if (alpha < 0.01) continue;

        const g = ctx!.createLinearGradient(x, cy - maxR, x, cy + maxR);
        g.addColorStop(0, 'rgba(168, 230, 207, 0)');
        g.addColorStop(0.5, `rgba(168, 230, 207, ${alpha})`);
        g.addColorStop(1, 'rgba(168, 230, 207, 0)');
        ctx!.fillStyle = g;
        ctx!.fillRect(i * colW + 1, 0, Math.max(1, colW - 2), h);
      }

      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(render2d);
      }
    };

    if (reducedMotion) {
      render2d(performance.now() + INTRO_DURATION_MS);
    } else {
      rafId = window.requestAnimationFrame(render2d);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', onPointerMove);
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
