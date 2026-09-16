'use client';

import { useEffect, useRef } from 'react';

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mastery: number;
  status: 'mastered' | 'weak';
}

const NODES_DATA: Omit<Node, 'x' | 'y' | 'vx' | 'vy'>[] = [
  { id: '1', label: 'Arrays', mastery: 92, status: 'mastered' },
  { id: '2', label: 'Strings', mastery: 84, status: 'mastered' },
  { id: '3', label: 'Hashing', mastery: 78, status: 'mastered' },
  { id: '4', label: 'Recursion', mastery: 51, status: 'weak' },
  { id: '5', label: 'Trees', mastery: 41, status: 'weak' },
  { id: '6', label: 'Graphs', mastery: 35, status: 'weak' },
  { id: '7', label: 'Algorithms', mastery: 88, status: 'mastered' },
];

const EDGES = [
  ['1', '2'],
  ['1', '3'],
  ['1', '4'],
  ['3', '6'],
  ['4', '5'],
  ['5', '6'],
  ['7', '1'],
  ['7', '4'],
];

export function HeroMesh() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Resize handler
    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Canvas Mouse Move Handler (throttled pointer interaction)
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found: string | null = null;
      for (const node of nodes) {
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        if (dx * dx + dy * dy < 900) { // 30px radius squared
          found = node.id;
          break;
        }
      }
      hoveredNodeRef.current = found;
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    // Pause rendering when canvas is scrolled out of viewport
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    // Initialize node positions once
    const nodes: Node[] = NODES_DATA.map((d, i) => {
      const angle = (i / NODES_DATA.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.35;
      return {
        ...d,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius * 0.7,
        vx: prefersReducedMotion ? 0 : (Math.random() - 0.5) * 0.4,
        vy: prefersReducedMotion ? 0 : (Math.random() - 0.5) * 0.4,
      };
    });

    let particleProgress = 0;
    let lastTime = performance.now();

    const render = (time: number) => {
      animationFrameId = requestAnimationFrame(render);
      if (!isVisible) return;

      const delta = time - lastTime;
      if (delta < 16) return; // Cap at ~60 FPS
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Update positions
      if (!prefersReducedMotion) {
        nodes.forEach((node) => {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x < 80 || node.x > width - 80) node.vx *= -1;
          if (node.y < 60 || node.y > height - 60) node.vy *= -1;
        });

        particleProgress += 0.006;
        if (particleProgress > 1) particleProgress = 0;
      }

      const activeHover = hoveredNodeRef.current;

      // Draw Edges
      EDGES.forEach(([sourceId, targetId]) => {
        const source = nodes.find((n) => n.id === sourceId);
        const target = nodes.find((n) => n.id === targetId);
        if (!source || !target) return;

        const isHighlighted = activeHover === sourceId || activeHover === targetId;

        // Line
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = isHighlighted
          ? 'rgba(6, 182, 212, 0.7)'
          : 'rgba(124, 58, 237, 0.2)';
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.stroke();

        // Traveling particle (no expensive shadowBlur)
        if (!prefersReducedMotion) {
          const px = source.x + (target.x - source.x) * particleProgress;
          const py = source.y + (target.y - source.y) * particleProgress;

          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = source.status === 'weak' ? '#F59E0B' : '#06B6D4';
          ctx.fill();
        }
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const isHovered = activeHover === node.id;

        // Outer glow halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, isHovered ? 24 : 18, 0, Math.PI * 2);
        ctx.fillStyle = node.status === 'weak'
          ? 'rgba(245, 158, 11, 0.12)'
          : 'rgba(124, 58, 237, 0.12)';
        ctx.fill();

        // Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#111827';
        ctx.strokeStyle = node.status === 'weak' ? '#F59E0B' : '#7C3AED';
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.fill();
        ctx.stroke();

        // Mastery Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = node.status === 'weak' ? '#F59E0B' : '#06B6D4';
        ctx.fill();

        // Label
        ctx.font = isHovered ? '600 12px system-ui' : '500 11px system-ui';
        ctx.fillStyle = isHovered ? '#FFFFFF' : '#94A3B8';
        ctx.textAlign = 'center';
        ctx.fillText(`${node.label} (${node.mastery}%)`, node.x, node.y + 26);
      });
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[480px] rounded-2xl border border-purple-500/20 bg-[#080B14]/90 overflow-hidden shadow-2xl shadow-purple-950/40">
      <div className="absolute inset-0 bg-mesh-grid opacity-60 pointer-events-none" />
      
      {/* Top Banner overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-500/30 text-xs font-mono text-purple-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          KNOWLEDGE GRAPH PREVIEW
        </div>
        <div className="text-[11px] font-mono text-slate-400">Interactive Demo Visualization</div>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />
    </div>
  );
}
