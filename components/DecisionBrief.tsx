'use client';

import { useState } from 'react';
import { AGENTS } from '@/lib/agents';
import { DecisionBrief } from '@/lib/types';

interface Props {
  brief: DecisionBrief;
}

export default function DecisionBriefCard({ brief }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const conf = brief.confidence ?? 50;
  const confColor = conf >= 70 ? '#10B981' : conf >= 40 ? '#F59E0B' : '#EF4444';
  const breakdown = brief.breakdown;

  return (
    <div className="rounded-2xl border fade-up" style={{ background: '#0d1320', borderColor: 'rgba(255,255,255,0.1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-base">⚖️</div>
          <h2 className="font-bold text-white">Decision Brief</h2>
        </div>
        <div className="flex items-center gap-3">
          {breakdown && (
            <button
              onClick={() => setShowWhy(v => !v)}
              className="text-xs text-slate-500 hover:text-slate-300 underline decoration-dotted transition-colors"
            >
              why this score?
            </button>
          )}
          <span className="text-xs text-slate-400">Confidence</span>
          <span className="font-bold text-lg" style={{ color: confColor }}>{conf}%</span>
        </div>
      </div>

      {/* AI explanation layer — surfaces how much agents agreed vs. challenged each other */}
      {breakdown && showWhy && (
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Why this confidence score</div>
          <p className="text-sm text-slate-400 mb-3">
            Across {breakdown.totalClaims} claims this round, {breakdown.agreementScore}% were supporting or
            concluding statements rather than direct challenges — {breakdown.challengeClaims} claims pushed back
            on another agent's position.
          </p>
          <div className="space-y-1.5">
            {breakdown.perAgent.map(({ agentRole, challenges, total }) => {
              const agent = AGENTS[agentRole];
              const pct = total > 0 ? Math.round((challenges / total) * 100) : 0;
              return (
                <div key={agentRole} className="flex items-center gap-2 text-xs">
                  <span className="w-32 flex-shrink-0 text-slate-400">{agent.emoji} {agent.name}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: agent.color }} />
                  </div>
                  <span className="w-24 flex-shrink-0 text-slate-500">{challenges}/{total} challenged</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Summary */}
        <div className="md:col-span-2 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Summary</div>
          <p className="text-sm text-slate-300 leading-relaxed">{brief.summary}</p>
        </div>

        {/* Majority */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="text-xs uppercase tracking-widest text-emerald-500 mb-2">Majority View</div>
          <p className="text-sm text-slate-300 leading-relaxed">{brief.majority}</p>
        </div>

        {/* Minority */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="text-xs uppercase tracking-widest text-red-400 mb-2">Minority View</div>
          <p className="text-sm text-slate-300 leading-relaxed">{brief.minority}</p>
        </div>

        {/* Recommendation */}
        <div className="md:col-span-2 rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div className="text-xs uppercase tracking-widest text-indigo-400 mb-2">Recommendation</div>
          <p className="text-sm font-medium text-white leading-relaxed">{brief.recommendation}</p>
        </div>

        {/* Risks */}
        {brief.risks?.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="text-xs uppercase tracking-widest text-amber-500 mb-3">Top Risks</div>
            <ul className="space-y-2">
              {brief.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">▲</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        {brief.nextSteps?.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <div className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Next Steps</div>
            <ul className="space-y-2">
              {brief.nextSteps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-cyan-400 mt-0.5 flex-shrink-0">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
