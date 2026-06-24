'use client';

import { useEffect, useRef } from 'react';
import { Claim } from '@/lib/types';
import { AGENTS } from '@/lib/agents';

interface Props {
  claims: Claim[];
}

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  claim: Claim;
  radius: number;
}

export default function ArgumentGraph({ claims }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef  = useRef<Node[]>([]);
  const frameRef  = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;

    // Add new nodes for claims not yet in the graph
    const existingIds = new Set(nodesRef.current.map(n => n.id));
    for (const claim of claims) {
      if (!existingIds.has(claim.id)) {
        nodesRef.current.push({
          id: claim.id,
          x: W / 2 + (Math.random() - 0.5) * 200,
          y: H / 2 + (Math.random() - 0.5) * 200,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          claim,
          radius: claim.type === 'conclusion' ? 14 : 10,
        });
      }
    }

    const ctx = canvas.getContext('2d')!;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const nodes = nodesRef.current;

      // Physics
      for (const n of nodes) {
        // Repulsion between nodes
        for (const m of nodes) {
          if (n === m) continue;
          const dx = n.x - m.x, dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 120) {
            const force = (120 - dist) / dist * 0.4;
            n.vx += dx * force * 0.01;
            n.vy += dy * force * 0.01;
          }
        }
        // Center gravity
        n.vx += (W / 2 - n.x) * 0.001;
        n.vy += (H / 2 - n.y) * 0.001;
        // Damping
        n.vx *= 0.92;
        n.vy *= 0.92;
        n.x = Math.max(n.radius + 5, Math.min(W - n.radius - 5, n.x + n.vx));
        n.y = Math.max(n.radius + 5, Math.min(H - n.radius - 5, n.y + n.vy));
      }

      // Draw edges for challenges/rebuttals
      for (const n of nodes) {
        if (n.claim.challengesId) {
          const target = nodes.find(m => m.id === n.claim.challengesId);
          if (target) {
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const agent = AGENTS[n.claim.agentRole];
        const color = agent?.color || '#6366f1';

        // Glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 2.5);
        grd.addColorStop(0, color + '33');
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Node
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = color + '33';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Emoji
        ctx.font = `${n.radius}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(agent?.emoji || '•', n.x, n.y);
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [claims]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
