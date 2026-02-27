"use client";

import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

// ─── Types ───
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
  life: number;
  maxLife: number;
}

interface ParticleConfig {
  /** Number of particles */
  count: number;
  /** Base speed */
  speed: number;
  /** Max connection distance */
  connectionDistance: number;
  /** Glow intensity (0-1) */
  glowIntensity: number;
  /** Whether to draw connecting lines */
  drawConnections: boolean;
  /** Hue range [min, max] in degrees */
  hueRange: [number, number];
  /** Background opacity (0-1) — how much the particles stand out */
  particleOpacity: number;
}

const DEFAULT_CONFIG: ParticleConfig = {
  count: 80,
  speed: 0.3,
  connectionDistance: 150,
  glowIntensity: 0.6,
  drawConnections: true,
  hueRange: [200, 260], // Cyan → Blue range matching Atlas brand
  particleOpacity: 0.7,
};

// ─── Performance: throttled resize ───
function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}

/**
 * ParticleBackground — A GPU‑friendly Canvas 2D particle system.
 *
 * Renders an always‑alive, ambient particle field behind all UI.
 * Particles drift, glow, pulse, and form transient connections,
 * creating a living, breathing backdrop à la VEXEL / Neural-net aesthetics.
 *
 * • Fixed position, z-index 0 — never occludes content
 * • 60 FPS on modern GPUs, auto-downgrades on slow frames
 * • Respects prefers-reduced-motion (renders static glow instead)
 * • Pointer-interactive: particles gently flee the cursor
 */
export function ParticleBackground({
  config: userConfig,
  className = "",
}: {
  config?: Partial<ParticleConfig>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const reducedMotion = useReducedMotion();
  const configRef = useRef<ParticleConfig>({ ...DEFAULT_CONFIG, ...userConfig });
  const dprRef = useRef(1);

  // Update config when props change
  useEffect(() => {
    configRef.current = { ...DEFAULT_CONFIG, ...userConfig };
  }, [userConfig]);

  // ─── Create a particle ───
  const createParticle = useCallback(
    (w: number, h: number, existing?: Partial<Particle>): Particle => {
      const cfg = configRef.current;
      const hue =
        cfg.hueRange[0] +
        Math.random() * (cfg.hueRange[1] - cfg.hueRange[0]);
      const baseRadius = 1 + Math.random() * 2.5;
      const maxLife = 600 + Math.random() * 1200; // frames
      return {
        x: existing?.x ?? Math.random() * w,
        y: existing?.y ?? Math.random() * h,
        vx: (Math.random() - 0.5) * cfg.speed * 2,
        vy: (Math.random() - 0.5) * cfg.speed * 2,
        radius: baseRadius,
        baseRadius,
        opacity: 0,
        hue,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        life: 0,
        maxLife,
      };
    },
    []
  );

  // ─── Main animation loop ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Handle DPR
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;

    function resize() {
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dprRef.current;
      canvas.height = h * dprRef.current;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx!.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    }

    resize();
    const throttledResize = throttle(resize, 200);
    window.addEventListener("resize", throttledResize);

    // Mouse tracking
    function onMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    }
    function onMouseLeave() {
      mouseRef.current = { x: -9999, y: -9999 };
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave);

    // Initialize particles
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cfg = configRef.current;

    // Scale count for screen area
    const areaFactor = (w * h) / (1920 * 1080);
    const count = Math.round(cfg.count * Math.max(0.4, Math.min(areaFactor, 1.5)));

    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(w, h)
    );

    // ─── Reduced motion: static glow ───
    if (reducedMotion) {
      ctx.clearRect(0, 0, w, h);
      // Draw a gentle static glow
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
      grad.addColorStop(0, "hsla(220, 80%, 60%, 0.06)");
      grad.addColorStop(0.5, "hsla(200, 90%, 50%, 0.03)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // ─── Adaptive performance ───
    let frameCount = 0;
    let lastTime = performance.now();
    let fpsScale = 1; // 1 = full quality, <1 = degraded

    function animate() {
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      // FPS monitoring — every 60 frames
      frameCount++;
      if (frameCount % 60 === 0) {
        const fps = 1000 / dt;
        if (fps < 30) {
          fpsScale = Math.max(0.5, fpsScale - 0.1);
        } else if (fps > 50 && fpsScale < 1) {
          fpsScale = Math.min(1, fpsScale + 0.05);
        }
      }

      const currentW = window.innerWidth;
      const currentH = window.innerHeight;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const currentCfg = configRef.current;

      // Clear with subtle trail (creates motion blur effect)
      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx!.fillRect(0, 0, currentW, currentH);

      // Then clear fully transparent — we paint on the actual background
      ctx!.clearRect(0, 0, currentW, currentH);

      const connectionDist = currentCfg.connectionDistance * fpsScale;
      const connectionDistSq = connectionDist * connectionDist;

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Life cycle
        p.life++;
        if (p.life > p.maxLife) {
          particles[i] = createParticle(currentW, currentH);
          continue;
        }

        // Fade in/out
        const lifeFraction = p.life / p.maxLife;
        const fadeIn = Math.min(1, p.life / 60);
        const fadeOut = lifeFraction > 0.8 ? (1 - lifeFraction) / 0.2 : 1;
        p.opacity = fadeIn * fadeOut * currentCfg.particleOpacity;

        // Pulse
        p.pulse += p.pulseSpeed;
        p.radius = p.baseRadius * (1 + 0.3 * Math.sin(p.pulse));

        // Mouse repulsion
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mDistSq = mdx * mdx + mdy * mdy;
        const mouseRadius = 120;
        if (mDistSq < mouseRadius * mouseRadius && mDistSq > 0) {
          const mDist = Math.sqrt(mDistSq);
          const force = (mouseRadius - mDist) / mouseRadius * 0.8;
          p.vx += (mdx / mDist) * force;
          p.vy += (mdy / mDist) * force;
        }

        // Velocity damping + boundary
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -20) p.x = currentW + 20;
        if (p.x > currentW + 20) p.x = -20;
        if (p.y < -20) p.y = currentH + 20;
        if (p.y > currentH + 20) p.y = -20;

        // Draw glow
        if (p.opacity > 0.02) {
          const glowRadius = p.radius * (3 + currentCfg.glowIntensity * 4);

          ctx!.globalCompositeOperation = "lighter";

          // Outer glow
          const glow = ctx!.createRadialGradient(
            p.x, p.y, 0, p.x, p.y, glowRadius
          );
          glow.addColorStop(
            0,
            `hsla(${p.hue}, 85%, 65%, ${p.opacity * 0.4 * currentCfg.glowIntensity})`
          );
          glow.addColorStop(
            0.4,
            `hsla(${p.hue}, 80%, 55%, ${p.opacity * 0.15 * currentCfg.glowIntensity})`
          );
          glow.addColorStop(1, "transparent");
          ctx!.fillStyle = glow;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
          ctx!.fill();

          // Core
          ctx!.globalCompositeOperation = "lighter";
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx!.fillStyle = `hsla(${p.hue}, 90%, 75%, ${p.opacity * 0.9})`;
          ctx!.fill();
        }

        // Connections (only check forward to avoid double-drawing)
        if (currentCfg.drawConnections && fpsScale > 0.5) {
          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < connectionDistSq) {
              const dist = Math.sqrt(distSq);
              const alpha =
                (1 - dist / connectionDist) *
                p.opacity *
                q.opacity *
                0.3;

              if (alpha > 0.01) {
                ctx!.globalCompositeOperation = "lighter";
                ctx!.beginPath();
                ctx!.moveTo(p.x, p.y);
                ctx!.lineTo(q.x, q.y);
                ctx!.strokeStyle = `hsla(${(p.hue + q.hue) / 2}, 75%, 60%, ${alpha})`;
                ctx!.lineWidth = 0.5 + alpha * 1.5;
                ctx!.stroke();
              }
            }
          }
        }
      }

      ctx!.globalCompositeOperation = "source-over";
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", throttledResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [reducedMotion, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 z-0 ${className}`}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}

export default ParticleBackground;
