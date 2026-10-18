import React, { useEffect, useRef } from 'react';

export interface TechBackgroundProps {
  background?: string;
  color?: string;
  accent?: string;
  density?: number;
  maxParticles?: number;
  maxDistance?: number;
  speed?: number;
  mouseRadius?: number;
  showGrid?: boolean;
  showScan?: boolean;
  className?: string;
}

type RGB = [number, number, number];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
}

interface Packet {
  from: number;
  to: number;
  progress: number;
  speed: number;
}

interface EngineOptions {
  backgroundTop: string;
  backgroundBottom: string;
  color: RGB;
  accent: RGB;
  density: number;
  maxParticles: number;
  maxDistance: number;
  speed: number;
  mouseRadius: number;
  showGrid: boolean;
  showScan: boolean;
}

const DEFAULTS: EngineOptions = {
  backgroundTop: '#050b1a',
  backgroundBottom: '#0a1633',
  color: [56, 189, 248],
  accent: [168, 85, 247],
  density: 0.9,
  maxParticles: 140,
  maxDistance: 150,
  speed: 1,
  mouseRadius: 180,
  showGrid: true,
  showScan: true,
};

function parseRgb(value: string | undefined, fallback: RGB): RGB {
  if (!value) return fallback;
  const parts = value.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return fallback;
  return [parts[0], parts[1], parts[2]];
}

function parseBackground(value: string | undefined): { top: string; bottom: string } {
  if (!value) return { top: DEFAULTS.backgroundTop, bottom: DEFAULTS.backgroundBottom };
  const parts = value.split(/[,|]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { top: parts[0], bottom: parts[1] };
  return { top: parts[0] || DEFAULTS.backgroundTop, bottom: parts[0] || DEFAULTS.backgroundBottom };
}

function rgba(rgb: RGB, alpha: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

class TechBackgroundEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: EngineOptions;
  private particles: Particle[] = [];
  private packets: Packet[] = [];
  private rafId = 0;
  private running = false;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private lastTs = 0;
  private gridOffset = 0;
  private scanY = 0;
  private mouseX = -9999;
  private mouseY = -9999;
  private hasPointer = false;
  private reducedMotion = false;
  private resizeObserver: ResizeObserver | null = null;
  private parent: HTMLElement;

  private onVisibility = () => {
    if (document.hidden) this.stop();
    else if (!this.reducedMotion) this.start();
  };

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
    this.hasPointer = true;
  };

  private onPointerLeave = () => {
    this.hasPointer = false;
    this.mouseX = -9999;
    this.mouseY = -9999;
  };

  private onTouchMove = (event: TouchEvent) => {
    if (!event.touches.length) return;
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = touch.clientX - rect.left;
    this.mouseY = touch.clientY - rect.top;
    this.hasPointer = true;
  };

  private onTouchEnd = () => {
    this.hasPointer = false;
    this.mouseX = -9999;
    this.mouseY = -9999;
  };

  private enabled = true;

  constructor(canvas: HTMLCanvasElement, options: Partial<EngineOptions> = {}) {
    const ctx = canvas.getContext('2d');
    this.canvas = canvas;
    this.options = { ...DEFAULTS, ...options };
    this.parent = canvas.parentElement || document.body;
    this.reducedMotion = prefersReducedMotion();
    this.applyCanvasStyle();
    if (!ctx) {
      this.enabled = false;
      this.ctx = null as unknown as CanvasRenderingContext2D;
      return;
    }
    this.ctx = ctx;
    this.bind();
    this.resize();
    this.seedParticles();
    this.drawFrame(0);
    if (!this.reducedMotion) this.start();
  }

  updateOptions(options: Partial<EngineOptions>) {
    if (!this.enabled) return;
    this.options = { ...this.options, ...options };
    this.seedParticles();
  }

  start() {
    if (!this.enabled || this.running || this.reducedMotion) return;
    this.running = true;
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  destroy() {
    this.stop();
    if (this.enabled) this.unbind();
    this.particles = [];
    this.packets = [];
  }

  private applyCanvasStyle() {
    const style = this.canvas.style;
    style.position = 'fixed';
    style.inset = '0';
    style.width = '100%';
    style.height = '100%';
    style.zIndex = '0';
    style.pointerEvents = 'none';
    this.canvas.setAttribute('aria-hidden', 'true');
  }

  private bind() {
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this.onTouchEnd, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.parent);
    }
    window.addEventListener('resize', this.onWindowResize, { passive: true });
  }

  private onWindowResize = () => this.resize();

  private unbind() {
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('touchcancel', this.onTouchEnd);
    window.removeEventListener('resize', this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private resize() {
    const cssW = Math.max(1, window.innerWidth);
    const cssH = Math.max(1, window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = cssW;
    this.height = cssH;
    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.seedParticles();
  }

  private particleCount() {
    const area = this.width * this.height;
    const count = Math.round((area / 10000) * this.options.density);
    return Math.max(12, Math.min(this.options.maxParticles, count));
  }

  private seedParticles() {
    const count = this.particleCount();
    const next: Particle[] = [];
    for (let i = 0; i < count; i += 1) {
      const existing = this.particles[i];
      if (existing) {
        next.push(existing);
        continue;
      }
      next.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.35 * this.options.speed,
        vy: (Math.random() - 0.5) * 0.35 * this.options.speed,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.particles = next;
    this.packets = this.packets.filter(
      (packet) => packet.from < next.length && packet.to < next.length
    );
  }

  private tick = (ts: number) => {
    if (!this.running) return;
    const raw = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    const dt = Math.min(0.05, Math.max(0, raw));
    this.update(dt);
    this.drawFrame(ts / 1000);
    this.rafId = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    const { mouseRadius, speed, maxDistance } = this.options;
    const particles = this.particles;

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.phase += dt * 1.6;

      if (this.hasPointer) {
        const dx = p.x - this.mouseX;
        const dy = p.y - this.mouseY;
        const dist = Math.hypot(dx, dy) || 0.0001;
        if (dist < mouseRadius) {
          const force = (1 - dist / mouseRadius) * 48 * dt * speed;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;

      const base = 0.12 * speed;
      if (Math.abs(p.vx) < base) p.vx += (Math.random() - 0.5) * 0.02 * speed;
      if (Math.abs(p.vy) < base) p.vy += (Math.random() - 0.5) * 0.02 * speed;

      if (p.x < -20) p.x = this.width + 20;
      if (p.x > this.width + 20) p.x = -20;
      if (p.y < -20) p.y = this.height + 20;
      if (p.y > this.height + 20) p.y = -20;
    }

    this.gridOffset = (this.gridOffset + 8 * dt * speed) % 48;
    this.scanY += 90 * dt * speed;
    if (this.scanY > this.height + 40) this.scanY = -40;

    for (let i = this.packets.length - 1; i >= 0; i -= 1) {
      const packet = this.packets[i];
      packet.progress += packet.speed * dt;
      if (packet.progress >= 1) this.packets.splice(i, 1);
    }

    while (this.packets.length < 12) {
      const pair = this.pickNeighborPair(maxDistance);
      if (!pair) break;
      this.packets.push({
        from: pair[0],
        to: pair[1],
        progress: 0,
        speed: 0.35 + Math.random() * 0.45,
      });
    }
  }

  private pickNeighborPair(maxDistance: number): [number, number] | null {
    if (this.particles.length < 2) return null;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const from = Math.floor(Math.random() * this.particles.length);
      let best = -1;
      let bestDist = maxDistance;
      const a = this.particles[from];
      for (let i = 0; i < this.particles.length; i += 1) {
        if (i === from) continue;
        const b = this.particles[i];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < bestDist && dist > 20) {
          bestDist = dist;
          best = i;
        }
      }
      if (best >= 0) return [from, best];
    }
    return null;
  }

  private drawFrame(timeSec: number) {
    const { ctx, width, height } = this;
    const { color, accent, maxDistance, showGrid, showScan } = this.options;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, this.options.backgroundTop);
    gradient.addColorStop(1, this.options.backgroundBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      const offset = this.reducedMotion ? 0 : this.gridOffset;
      for (let x = -48 + offset; x < width + 48; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -48 + offset; y < height + 48; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    const particles = this.particles;
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > maxDistance) continue;
        const alpha = (1 - dist / maxDistance) * 0.45;
        ctx.strokeStyle = rgba(color, alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    if (this.hasPointer) {
      const glow = ctx.createRadialGradient(
        this.mouseX,
        this.mouseY,
        0,
        this.mouseX,
        this.mouseY,
        this.options.mouseRadius
      );
      glow.addColorStop(0, rgba(accent, 0.22));
      glow.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.mouseX, this.mouseY, this.options.mouseRadius, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const dist = Math.hypot(p.x - this.mouseX, p.y - this.mouseY);
        if (dist > this.options.mouseRadius) continue;
        const alpha = (1 - dist / this.options.mouseRadius) * 0.7;
        ctx.strokeStyle = rgba(accent, alpha);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(this.mouseX, this.mouseY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const pulse = 0.55 + Math.sin(p.phase + timeSec) * 0.35;
      const radius = 1.6 + pulse * 1.4;
      ctx.beginPath();
      ctx.fillStyle = rgba(color, 0.2 + pulse * 0.35);
      ctx.arc(p.x, p.y, radius * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = rgba(color, 0.75 + pulse * 0.25);
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < this.packets.length; i += 1) {
      const packet = this.packets[i];
      const from = particles[packet.from];
      const to = particles[packet.to];
      if (!from || !to) continue;
      const x = from.x + (to.x - from.x) * packet.progress;
      const y = from.y + (to.y - from.y) * packet.progress;
      ctx.beginPath();
      ctx.fillStyle = rgba(accent, 0.25);
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = rgba(accent, 0.95);
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (showScan && !this.reducedMotion) {
      const beam = ctx.createLinearGradient(0, this.scanY - 18, 0, this.scanY + 18);
      beam.addColorStop(0, rgba(color, 0));
      beam.addColorStop(0.5, rgba(color, 0.18));
      beam.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = beam;
      ctx.fillRect(0, this.scanY - 18, width, 36);
      ctx.fillStyle = rgba(color, 0.35);
      ctx.fillRect(0, this.scanY, width, 1.5);
    }

    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.2,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.75
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
}

/** Fundo animado tecnológico em canvas (login). */
export default function TechBackground({
  background,
  color,
  accent,
  density,
  maxParticles,
  maxDistance,
  speed,
  mouseRadius,
  showGrid = true,
  showScan = true,
  className = '',
}: TechBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<TechBackgroundEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const bg = parseBackground(background);
    const engine = new TechBackgroundEngine(canvas, {
      backgroundTop: bg.top,
      backgroundBottom: bg.bottom,
      color: parseRgb(color, DEFAULTS.color),
      accent: parseRgb(accent, DEFAULTS.accent),
      density: density ?? DEFAULTS.density,
      maxParticles: maxParticles ?? DEFAULTS.maxParticles,
      maxDistance: maxDistance ?? DEFAULTS.maxDistance,
      speed: speed ?? DEFAULTS.speed,
      mouseRadius: mouseRadius ?? DEFAULTS.mouseRadius,
      showGrid,
      showScan,
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // Montagem única: opções dinâmicas vão no efeito abaixo via updateOptions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const bg = parseBackground(background);
    engine.updateOptions({
      backgroundTop: bg.top,
      backgroundBottom: bg.bottom,
      color: parseRgb(color, DEFAULTS.color),
      accent: parseRgb(accent, DEFAULTS.accent),
      density: density ?? DEFAULTS.density,
      maxParticles: maxParticles ?? DEFAULTS.maxParticles,
      maxDistance: maxDistance ?? DEFAULTS.maxDistance,
      speed: speed ?? DEFAULTS.speed,
      mouseRadius: mouseRadius ?? DEFAULTS.mouseRadius,
      showGrid,
      showScan,
    });
  }, [
    background,
    color,
    accent,
    density,
    maxParticles,
    maxDistance,
    speed,
    mouseRadius,
    showGrid,
    showScan,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={['tech-background-canvas', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  );
}
