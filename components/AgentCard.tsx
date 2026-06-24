'use client';

import { Agent, AgentRole } from '@/lib/types';

interface Props {
  agent: Agent;
  isActive: boolean;
  isDone: boolean;
  content: string;
  isStreaming: boolean;
}

export default function AgentCard({ agent, isActive, isDone, content, isStreaming }: Props) {
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
        {isActive && (
          <div className="ml-auto flex-shrink-0">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: agent.color }} />
          </div>
        )}
        {isDone && !isActive && (
          <div className="ml-auto text-xs text-slate-500 flex-shrink-0">Done</div>
        )}
      </div>

      {/* Content */}
      <div className="min-h-[60px]">
        {isActive && !content && (
          <div className="typing text-slate-500 text-sm" style={{ color: agent.color }}>
            <span /><span /><span />
          </div>
        )}
        {content && (
          <p className="text-sm text-slate-300 leading-relaxed fade-up line-clamp-6">
            {content}
            {isStreaming && isActive && (
              <span
                className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle"
                style={{ background: agent.color }}
              />
            )}
          </p>
        )}
        {!isActive && !isDone && (
          <p className="text-sm text-slate-600 italic">Waiting…</p>
        )}
      </div>
    </div>
  );
}
