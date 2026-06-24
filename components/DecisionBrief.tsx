'use client';

import { DecisionBrief } from '@/lib/types';

interface Props {
  brief: DecisionBrief;
}

export default function DecisionBriefCard({ brief }: Props) {
  const conf = brief.confidence ?? 50;
  const confColor = conf >= 70 ? '#10B981' : conf >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div className="rounded-2xl border fade-up" style={{ background: '#0d1320', borderColor: 'rgba(255,255,255,0.1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-base">⚖️</div>
          <h2 className="font-bold text-white">Decision Brief</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Confidence</span>
          <span className="font-bold text-lg" style={{ color: confColor }}>{conf}%</span>
        </div>
      </div>

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
