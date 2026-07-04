'use client';

import { useState } from 'react';
import { Agent, Claim } from '@/lib/types';

interface Props {
  agent: Agent;
  isActive: boolean;
  isDone: boolean;
  content: string;
  rebuttalContent: string;
  isStreaming: boolean;
  currentPhase: 'opening' | 'rebuttal';
  claims?: Claim[];
}

const CLAIM_LABELS: Record<string, string> = {
  argument:   'arg',
  challenge:  'chal',
  rebuttal:   'rebut',
  support:    'sup',
  conclusion: 'concl',
};

export default function AgentCard({
  agent, isActive, isDone, content, rebuttalContent, isStreaming, currentPhase, claims = [],
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const showRebuttal = rebuttalContent || (isActive && currentPhase === 'rebuttal');
  const isExpandable = isDone && (content.length > 280 || rebuttalContent.length > 180);

  const agentClaims = claims.filter(c => c.agentRole === agent.role);
  const claimCounts = agentClaims.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className="rounded-2xl p-4 border transition-all duration-300"
      style={{
        background: '#0d1320',
        borderColor: isActive ? agent.color : 'rgba(255,255,255,0.07)',
        boxShadow: isActive
          ? `0 0 0 1px ${agent.color}40, 0 0 32px ${agent.color}18`
          : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${agent.color}18`, border: `1px solid ${agent.color}40` }}
        >
          {agent.emoji}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-white leading-tight">{agent.name}</div>
          <div className="text-xs mt-0.5" style={{ color: agent.color }}>{agent.tagline}</div>
        </div>
        <div className="ml-auto flex-shrink-0 flex items-center gap-2">
          {isActive && (
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: agent.color }} />
          )}
          {isDone && !isActive && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="text-xs text-slate-500 tabular-nums">
                {(content.split(/\s+/).filter(Boolean).length + rebuttalContent.split(/\s+/).filter(Boolean).length)} words
              </span>
              {Object.entries(claimCounts).map(([type, count]) => (
                <span
                  key={type}
                  title={`${count} ${type} claim${count !== 1 ? 's' : ''}`}
                  className="text-[10px] px-1.5 py-0.5 rounded-full tabular-nums"
                  style={{
                    background: `${agent.color}18`,
                    color: `${agent.color}cc`,
                    border: `1px solid ${agent.color}30`,
                  }}
                >
                  {CLAIM_LABELS[type] ?? type} ×{count}
                </span>
              ))}
            </div>
          )}
          {isExpandable && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs px-2 py-0.5 rounded-md transition-colors"
              style={{
                color: agent.color,
                background: `${agent.color}15`,
                border: `1px solid ${agent.color}30`,
              }}
              aria-label={expanded ? 'Collapse argument' : 'Expand argument'}
            >
              {expanded ? '↑ less' : '↓ more'}
            </button>
          )}
        </div>
      </div>

      {/* Round 1: Opening */}
      <div className="min-h-[60px]">
        {isActive && currentPhase === 'opening' && !content && (
          <div className="typing text-slate-500 text-sm" style={{ color: agent.color }}>
            <span /><span /><span />
          </div>
        )}
        {content && (
          <p className={`text-sm text-slate-300 leading-relaxed fade-up${expanded ? '' : ' line-clamp-6'}`}>
            {content}
            {isStreaming && isActive && currentPhase === 'opening' && (
              <span
                className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle"
                style={{ background: agent.color }}
              />
            )}
          </p>
        )}
        {!isActive && !isDone && !content && (
          <div className="space-y-2 py-1" aria-label="Waiting for agent">
            <div className="h-3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: '88%' }} />
            <div className="h-3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: '72%', animationDelay: '150ms' }} />
            <div className="h-3 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: '60%', animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* Round 2: Rebuttal */}
      {showRebuttal && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="text-xs mb-2 font-medium" style={{ color: `${agent.color}99` }}>
            ↩ Rebuttal
          </div>
          {isActive && currentPhase === 'rebuttal' && !rebuttalContent && (
            <div className="typing text-slate-500 text-sm" style={{ color: agent.color }}>
              <span /><span /><span />
            </div>
          )}
          {rebuttalContent && (
            <p className={`text-sm text-slate-300 leading-relaxed fade-up${expanded ? '' : ' line-clamp-5'}`}>
              {rebuttalContent}
              {isStreaming && isActive && currentPhase === 'rebuttal' && (
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle"
                  style={{ background: agent.color }}
                />
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
