'use client';

import { useMemo } from 'react';
import { Claim } from '@/lib/types';

interface Props {
  claims: Claim[];
}

type ClaimType = Claim['type'];

const TYPE_META: Record<ClaimType, { label: string; color: string }> = {
  argument:   { label: 'Argument',   color: '#6366f1' },
  support:    { label: 'Support',    color: '#10b981' },
  rebuttal:   { label: 'Rebuttal',   color: '#f59e0b' },
  challenge:  { label: 'Challenge',  color: '#ef4444' },
  conclusion: { label: 'Conclusion', color: '#8b5cf6' },
};

const ORDER: ClaimType[] = ['argument', 'support', 'rebuttal', 'challenge', 'conclusion'];

export default function ConsensusBar({ claims }: Props) {
  const { counts, total, alignedPct, dissentPct } = useMemo(() => {
    const counts = Object.fromEntries(ORDER.map(t => [t, 0])) as Record<ClaimType, number>;
    for (const c of claims) counts[c.type] = (counts[c.type] ?? 0) + 1;
    const total = claims.length;
    const aligned = counts.support + counts.conclusion + counts.argument;
    const dissent  = counts.challenge + counts.rebuttal;
    return {
      counts,
      total,
      alignedPct: total > 0 ? Math.round((aligned / total) * 100) : 0,
      dissentPct:  total > 0 ? Math.round((dissent  / total) * 100) : 0,
    };
  }, [claims]);

  if (total === 0) return null;

  const consensusLabel =
    dissentPct >= 60 ? 'Highly contested' :
    dissentPct >= 35 ? 'Mixed signals'     :
    alignedPct >= 70 ? 'Strong consensus'  : 'Emerging consensus';

  const consensusColor =
    dissentPct >= 60 ? '#ef4444' :
    dissentPct >= 35 ? '#f59e0b' : '#10b981';

  return (
    <div
      className="rounded-xl border px-4 py-3 fade-up"
      style={{ background: '#0d1320', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-slate-500">Live Consensus</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${consensusColor}18`, color: consensusColor }}
          >
            {consensusLabel}
          </span>
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          {total} {total === 1 ? 'claim' : 'claims'} · {alignedPct}% aligned
        </span>
      </div>

      {/* Segmented bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px bg-white/5">
        {ORDER.filter(t => counts[t] > 0).map(t => (
          <div
            key={t}
            className="h-full transition-all duration-500"
            style={{ width: `${(counts[t] / total) * 100}%`, background: TYPE_META[t].color }}
            title={`${TYPE_META[t].label}: ${counts[t]}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {ORDER.filter(t => counts[t] > 0).map(t => (
          <span key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className="w-2 h-2 rounded-sm inline-block flex-shrink-0"
              style={{ background: TYPE_META[t].color }}
            />
            {TYPE_META[t].label}
            <span className="text-slate-600 tabular-nums">({counts[t]})</span>
          </span>
        ))}
      </div>
    </div>
  );
}
