import { useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { getFieldScene } from '../lib/battleFieldScenes';

const FIELD_TYPES = new Set([
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'stadium'
]);

export function normalizeFieldType(type?: string) {
  const safe = (type ?? 'normal').toLowerCase();
  return FIELD_TYPES.has(safe) ? safe : 'normal';
}

type Cloud = { x: number; y: number; w: number; h: number; speed: number; opacity: number };
type Tree = { x: number; scale: number; hue: number };
type Tuft = { x: number; y: number; w: number; h: number };
type Ambient = { x: number; y: number; size: number; phase: number; speed: number };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildClouds(width: number, rand: () => number): Cloud[] {
  return Array.from({ length: 5 }, () => ({
    x: rand() * width,
    y: rand() * 0.28 + 0.06,
    w: rand() * 0.14 + 0.08,
    h: rand() * 0.04 + 0.025,
    speed: rand() * 0.012 + 0.004,
    opacity: rand() * 0.25 + 0.65
  }));
}

function buildTrees(width: number, rand: () => number): Tree[] {
  return Array.from({ length: 9 }, () => ({
    x: rand(),
    scale: rand() * 0.45 + 0.55,
    hue: rand() * 18 - 9
  }));
}

function buildTufts(width: number, height: number, rand: () => number): Tuft[] {
  return Array.from({ length: 24 }, () => ({
    x: rand() * width,
    y: height * (0.58 + rand() * 0.34),
    w: rand() * 18 + 10,
    h: rand() * 10 + 6
  }));
}

function buildAmbient(rand: () => number, count: number): Ambient[] {
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand() * 0.5 + 0.35,
    size: rand() * 2.5 + 1.5,
    phase: rand() * Math.PI * 2,
    speed: rand() * 0.8 + 0.4
  }));
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.42, h * 0.55, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.28, y - h * 0.15, w * 0.34, h * 0.48, 0, 0, Math.PI * 2);
  ctx.ellipse(x - w * 0.22, y + h * 0.05, w * 0.28, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHill(
  ctx: CanvasRenderingContext2D,
  width: number,
  horizon: number,
  color: string,
  offsetX: number,
  amplitude: number,
  frequency: number
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  for (let x = 0; x <= width; x += 8) {
    const wave = Math.sin((x + offsetX) * frequency) * amplitude;
    ctx.lineTo(x, horizon + wave);
  }
  ctx.lineTo(width, horizon + 40);
  ctx.lineTo(0, horizon + 40);
  ctx.closePath();
  ctx.fill();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, trunk: string, leaf: string) {
  const s = scale;
  ctx.fillStyle = trunk;
  ctx.fillRect(x - 3 * s, baseY - 18 * s, 6 * s, 18 * s);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.moveTo(x, baseY - 52 * s);
  ctx.lineTo(x - 16 * s, baseY - 16 * s);
  ctx.lineTo(x + 16 * s, baseY - 16 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, baseY - 30 * s, 12 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawGrassTuft(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - w * 0.2, y - h, x - w * 0.45, y - h * 0.35);
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + w * 0.15, y - h * 0.95, x + w * 0.35, y - h * 0.25);
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x, y - h * 1.05, x + w * 0.05, y - h * 0.55);
  ctx.stroke();
}

export function BattleFieldBackdrop({
  type,
  impact = false
}: {
  type: string;
  impact?: boolean;
}) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const impactRef = useRef(0);
  const frameRef = useRef<number>(0);
  const fieldType = normalizeFieldType(type);
  const scene = getFieldScene(fieldType);

  useEffect(() => {
    if (impact) impactRef.current = performance.now();
  }, [impact]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rand = mulberry32(fieldType.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0));
    let clouds = buildClouds(1, rand);
    let trees = buildTrees(1, rand);
    let tufts: Tuft[] = [];
    let ambient = buildAmbient(rand, scene.accent === 'snow' || scene.accent === 'lava' ? 18 : 10);
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      clouds = buildClouds(width, rand);
      trees = buildTrees(width, rand);
      tufts = buildTufts(width, height, rand);
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
        active: true
      };
    };

    const onLeave = () => {
      pointerRef.current.active = false;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    const draw = (time: number) => {
      const t = time * 0.001;
      const parallaxX = pointerRef.current.active ? pointerRef.current.x * 18 : Math.sin(t * 0.25) * 4;
      const parallaxY = pointerRef.current.active ? pointerRef.current.y * 8 : 0;
      const impactAge = impactRef.current ? time - impactRef.current : 9999;
      const impactFlash = impactAge < 420 ? 1 - impactAge / 420 : 0;

      ctx.clearRect(0, 0, width, height);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.62);
      skyGrad.addColorStop(0, scene.sky[0]);
      skyGrad.addColorStop(0.55, scene.sky[1]);
      skyGrad.addColorStop(1, scene.sky[2]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      if (scene.sun && !scene.indoor) {
        const sunX = width * 0.78 + parallaxX * 0.15;
        const sunY = height * 0.14 + parallaxY * 0.1;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 42);
        sunGrad.addColorStop(0, '#fffef8');
        sunGrad.addColorStop(0.35, scene.sunColor);
        sunGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
        ctx.fill();
      }

      if (scene.clouds && !scene.indoor) {
        for (const cloud of clouds) {
          const cx = ((cloud.x + t * cloud.speed * width * 60) % (width + cloud.w * width)) - cloud.w * width * 0.5;
          drawCloud(ctx, cx + parallaxX * 0.35, cloud.y * height, cloud.w * width, cloud.h * height, cloud.opacity);
        }
      }

      const horizon = height * 0.48;
      drawHill(ctx, width, horizon, scene.hillFar, parallaxX * 0.6 + t * 8, 14, 0.0045);
      drawHill(ctx, width, horizon + 10, scene.hillNear, parallaxX * 0.9 + t * 12, 10, 0.006);

      if (scene.trees && !scene.indoor) {
        for (const tree of trees) {
          const tx = tree.x * width + parallaxX * 1.1;
          drawTree(ctx, tx, horizon + 8, tree.scale, '#6a5038', adjustColor(scene.hillNear, tree.hue));
        }
      }

      const groundY = height * 0.52;
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
      groundGrad.addColorStop(0, scene.ground[0]);
      groundGrad.addColorStop(1, scene.ground[1]);
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, width, height - groundY);

      if (scene.accent === 'water') {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (let i = 0; i < 4; i++) {
          const y = groundY + 18 + i * 22 + Math.sin(t * 1.6 + i) * 3;
          ctx.fillRect(0, y, width, 2);
        }
      }

      if (scene.accent === 'sand' || scene.accent === 'rock' || scene.accent === 'cave') {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let i = 0; i < 30; i++) {
          const px = (i * 137 + t * 10) % width;
          const py = groundY + 20 + ((i * 53) % Math.floor(height - groundY - 20));
          ctx.fillRect(px, py, 2, 2);
        }
      }

      if (scene.accent === 'grass' || scene.accent === 'meadow') {
        for (const tuft of tufts) {
          drawGrassTuft(ctx, tuft.x + parallaxX * 1.4, tuft.y, tuft.w, tuft.h, adjustColor(scene.ground[0], 12));
        }
      }

      if (!reduced) {
        for (const bit of ambient) {
          const ax = bit.x * width + parallaxX * 1.6;
          const ay = bit.y * height + Math.sin(t * bit.speed + bit.phase) * 12;
          ctx.globalAlpha = 0.35 + Math.sin(t * bit.speed + bit.phase) * 0.25;
          if (scene.accent === 'snow') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ax, ay + (t * 28 + bit.phase * 10) % (height * 0.45), bit.size, bit.size);
          } else if (scene.accent === 'lava') {
            ctx.fillStyle = '#ffb060';
            ctx.beginPath();
            ctx.arc(ax, ay - (t * 22 + bit.phase * 8) % 80, bit.size, 0, Math.PI * 2);
            ctx.fill();
          } else if (scene.accent === 'water') {
            ctx.fillStyle = 'rgba(220,245,255,0.8)';
            ctx.beginPath();
            ctx.arc(ax, ay - (t * 18 + bit.phase * 6) % 60, bit.size, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = 'rgba(255,255,220,0.7)';
            ctx.beginPath();
            ctx.arc(ax, ay, bit.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }

      if (impactFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${impactFlash * 0.22})`;
        ctx.fillRect(0, 0, width, height);
      }

      if (!reduced) frameRef.current = requestAnimationFrame(draw);
    };

    if (reduced) {
      draw(0);
    } else {
      frameRef.current = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [fieldType, reduced, scene]);

  return (
    <div
      className={`field-backdrop field-type-${fieldType}${impact ? ' field-impact' : ''}${scene.indoor ? ' field-indoor' : ''}`}
      aria-hidden="true"
      style={
        {
          '--platform-top': scene.platformTop,
          '--platform-shadow': scene.platformShadow,
          '--platform-rim': scene.platformRim
        } as CSSProperties
      }
    >
      <canvas ref={canvasRef} className="field-canvas" />
    </div>
  );
}

function adjustColor(hex: string, delta: number) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = clamp(((num >> 16) & 255) + delta);
  const g = clamp(((num >> 8) & 255) + delta);
  const b = clamp((num & 255) + delta);
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, value));
}
