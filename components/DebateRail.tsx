'use client';

import { AgentRole } from '@/lib/types';
import { AGENTS, AGENT_ORDER } from '@/lib/agents';

interface AgentProgress {
  content: string;
  rebuttalContent: string;
  isActive: boolean;
}

interface Props {
  status: 'idle' | 'running' | 'complete';
  phase: 'opening' | 'rebuttal';
  agents: Record<AgentRole, AgentProgress>;
}

export default function DebateRail({ status, phase, agents }: Props) {
  if (status === 'idle') return null;

  const openingDone = AGENT_ORDER.filter(r => agents[r].content.length > 0).length;
  const rebuttalDone = AGENT_ORDER.filter(r => agents[r].rebuttalContent.length > 0).length;
  const totalDone = openingDone + rebuttalDone;
  const pct = Math.round((totalDone / 10) * 100);

  const activeRole = AGENT_ORDER.find(r => agents[r].isActive);
  const activeAgent = activeRole ? AGENTS[activeRole] : null;

  return (
    <div
      className="rounded-xl border px-4 py-3 mb-4 fade-up flex items-center gap-4 flex-wrap"
      style={{ background: 'rgba(17,22,34,0.9)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {/* Phase badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className={`w-2 h-2 rounded-full ${status === 'running' ? 'animate-pulse' : ''}`}
          style={{ background: status === 'complete' ? '#10B981' : '#F59E0B' }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: status === 'complete' ? '#10B981' : '#F59E0B' }}
        >
          {status === 'complete'
            ? 'Debate complete'
            : phase === 'opening'
            ? 'Round 1 · Opening Arguments'
            : 'Round 2 · Rebuttals'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 min-w-24 flex items-center gap-3">
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background:
                status === 'complete'
                  ? '#10B981'
                  : 'linear-gradient(90deg,#6366f1,#f59e0b)',
            }}
          />
        </div>
        <span className="text-xs tabular-nums text-slate-500 flex-shrink-0">
          {totalDone}/10
        </span>
      </div>

      {/* Per-agent turn dots — opening (dim) + rebuttal (bright) */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {AGENT_ORDER.map(role => {
          const a = agents[role];
          const openDone = a.content.length > 0;
          const rebDone = a.rebuttalContent.length > 0;
          const color = AGENTS[role].color;
          return (
            <div key={role} className="flex flex-col items-center gap-0.5" title={AGENTS[role].name}>
              <div
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{ background: openDone ? color : 'rgba(255,255,255,0.08)', opacity: 0.55 }}
              />
              <div
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{ background: rebDone ? color : 'rgba(255,255,255,0.05)' }}
              />
            </div>
          );
        })}
      </div>

      {/* Active agent pill */}
      {activeAgent && status === 'running' && (
        <div
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full flex-shrink-0"
          style={{
            background: `${activeAgent.color}18`,
            border: `1px solid ${activeAgent.color}40`,
            color: activeAgent.color,
          }}
        >
          <span>{activeAgent.emoji}</span>
          <span className="font-medium">{activeAgent.name}</span>
          <span className="opacity-60">speaking…</span>
        </div>
      )}

      {status === 'complete' && (
        <span className="text-xs text-emerald-400 flex-shrink-0">✓ Brief ready</span>
      )}
    </div>
  );
}
