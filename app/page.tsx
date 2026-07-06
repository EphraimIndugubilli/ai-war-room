'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AGENTS, AGENT_ORDER } from '@/lib/agents';
import { AgentRole, Claim, DecisionBrief, StreamEvent } from '@/lib/types';
import AgentCard from '@/components/AgentCard';
import ArgumentGraph from '@/components/ArgumentGraph';
import DecisionBriefCard from '@/components/DecisionBrief';
import ShareBar from '@/components/ShareBar';
import DebateHistory, { saveDebate, DebateRecord } from '@/components/DebateHistory';
import DebateRail from '@/components/DebateRail';
import ConsensusBar from '@/components/ConsensusBar';

const EXAMPLE_CATEGORIES = [
  {
    label: 'Tech',
    emoji: '💻',
    questions: [
      'Should we rewrite our monolith in microservices?',
      'Is AI going to replace software engineers in the next 5 years?',
      'Should we build in-house or buy an off-the-shelf solution?',
    ],
  },
  {
    label: 'Startup',
    emoji: '🚀',
    questions: [
      'Should I build a SaaS product solo or find a co-founder first?',
      'Should a startup raise VC funding or stay bootstrapped?',
      'Is it better to launch early with bugs or wait for a polished v1?',
    ],
  },
  {
    label: 'Strategy',
    emoji: '♟️',
    questions: [
      'Should we expand internationally before dominating the domestic market?',
      'Is remote-first culture better for team productivity?',
      'Should we prioritize growth or profitability in year 2?',
    ],
  },
];

function useDebateTimer(running: boolean): string {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      setElapsed(0);
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000));
      }, 1000);
      return () => clearInterval(id);
    } else {
      startRef.current = null;
    }
  }, [running]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m > 0 ? `${m}m ` : ''}${s}s`;
}

type AgentState = {
  content: string;
  rebuttalContent: string;
  isActive: boolean;
  isDone: boolean;
  isStreaming: boolean;
};
type AgentsMap = Record<AgentRole, AgentState>;

const freshAgents = (): AgentsMap =>
  Object.fromEntries(
    AGENT_ORDER.map(r => [r, { content: '', rebuttalContent: '', isActive: false, isDone: false, isStreaming: false }])
  ) as AgentsMap;

export default function WarRoom() {
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const elapsedStr = useDebateTimer(status === 'running');
  const [agents, setAgents] = useState<AgentsMap>(freshAgents);
  const [currentPhase, setCurrentPhase] = useState<'opening' | 'rebuttal'>('opening');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [brief, setBrief] = useState<DecisionBrief | null>(null);
  const [error, setError] = useState('');
  const [currentDebateId, setCurrentDebateId] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const phaseRef = useRef<'opening' | 'rebuttal'>('opening');
  const questionRef = useRef<string>('');

  const reset = useCallback(() => {
    abortRef.current?.abort();
    phaseRef.current = 'opening';
    setAgents(freshAgents());
    setCurrentPhase('opening');
    setClaims([]); setBrief(null); setError(''); setStatus('idle');
  }, []);

  const startDebate = useCallback(async (q?: string) => {
    const finalQ = (q || question).trim();
    if (!finalQ) return;
    if (q) setQuestion(q);
    reset();
    await new Promise(r => setTimeout(r, 50));
    const debateId = `debate-${Date.now()}`;
    setCurrentDebateId(debateId);
    questionRef.current = finalQ;
    setStatus('running');
    phaseRef.current = 'opening';
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: finalQ }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) { setError(await res.text()); setStatus('idle'); return; }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try { handleEvent(JSON.parse(line.slice(6)) as StreamEvent); } catch { /* partial */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') { setError('Connection lost.'); setStatus('idle'); }
    }
  }, [question, reset]);

  function handleEvent(ev: StreamEvent) {
    if (ev.type === 'phase_change') {
      phaseRef.current = ev.phase;
      setCurrentPhase(ev.phase);
      // Reset all agents to not-active for the new round
      setAgents(p =>
        Object.fromEntries(
          AGENT_ORDER.map(r => [r, { ...p[r], isActive: false, isStreaming: false }])
        ) as AgentsMap
      );
    } else if (ev.type === 'round_start') {
      setAgents(p => ({ ...p, [ev.agentRole]: { ...p[ev.agentRole], isActive: true, isStreaming: true } }));
    } else if (ev.type === 'token') {
      const phase = ev.phase;
      setAgents(p => ({
        ...p,
        [ev.agentRole]: {
          ...p[ev.agentRole],
          ...(phase === 'opening'
            ? { content: p[ev.agentRole].content + ev.token }
            : { rebuttalContent: p[ev.agentRole].rebuttalContent + ev.token }
          ),
          isStreaming: true,
        },
      }));
    } else if (ev.type === 'round_end') {
      const phase = ev.phase;
      setAgents(p => ({
        ...p,
        [ev.agentRole]: {
          ...p[ev.agentRole],
          isActive: false,
          isDone: true,
          isStreaming: false,
          ...(phase === 'opening'
            ? { content: ev.content }
            : { rebuttalContent: ev.content }
          ),
        },
      }));
      setClaims(p => [...p, ...ev.claims]);
    } else if (ev.type === 'brief') {
      setBrief(ev.brief);
      setCurrentDebateId(id => {
        if (id) saveDebate({ id, question: questionRef.current, brief: ev.brief, timestamp: Date.now() });
        return id;
      });
    } else if (ev.type === 'done') {
      setStatus('complete');
    } else if (ev.type === 'error') {
      setError(ev.message); setStatus('idle');
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#080c14' }}>
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md"
        style={{ background: 'rgba(8,12,20,0.9)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xl">⚔️</div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">AI War Room</h1>
            <p className="text-xs text-slate-500">Multi-agent debate · 2 rounds</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === 'running' && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                {AGENT_ORDER.map(role => (
                  <div
                    key={role}
                    title={role}
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{
                      background: agents[role].isDone
                        ? '#22c55e'
                        : agents[role].isActive
                        ? '#f59e0b'
                        : 'rgba(255,255,255,0.15)',
                      boxShadow: agents[role].isActive ? '0 0 6px #f59e0b' : 'none',
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400">
                  {currentPhase === 'opening' ? 'Round 1 — Opening' : 'Round 2 — Rebuttals'}
                </span>
              </div>
              <span className="text-xs tabular-nums text-slate-500 font-mono">{elapsedStr}</span>
            </div>
          )}
          <DebateHistory
            currentId={currentDebateId}
            onSelect={(rec: DebateRecord) => {
              reset();
              setQuestion(rec.question);
              questionRef.current = rec.question;
              setBrief(rec.brief);
              setCurrentDebateId(rec.id);
              setStatus('complete');
            }}
          />
          {status !== 'idle' && (
            <button onClick={reset} className="text-xs px-3 py-1.5 rounded-lg border text-slate-400 hover:text-white transition-colors" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>← New</button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {status === 'idle' && (
          <div className="max-w-2xl mx-auto mb-12 fade-up">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">Drop a hard question.<br /><span className="text-indigo-400">Watch 5 AI minds fight over it.</span></h2>
              <p className="text-slate-400 text-sm">Devil&apos;s Advocate, Optimist, Risk Analyst, Historian, and Contrarian debate in 2 rounds — then a decision brief is synthesized.</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ background: '#0d1320', borderColor: 'rgba(255,255,255,0.08)' }}>
              <textarea value={question} onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) startDebate(); }}
                placeholder="e.g. Should I quit my job to build a startup?" rows={3}
                className="w-full bg-transparent text-white placeholder-slate-600 text-base resize-none outline-none leading-relaxed" />
              <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <span className="text-xs text-slate-600">⌘/Ctrl + Enter</span>
                <button onClick={() => startDebate()} disabled={!question.trim()}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                  Start Debate ⚔️
                </button>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-400 text-center">{error}</p>}
            <p className="text-xs text-slate-600 mt-5 mb-3 text-center">Try an example</p>
            <div className="space-y-2">
              {EXAMPLE_CATEGORIES.map(cat => (
                <div key={cat.label} className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-slate-600 w-16 shrink-0 text-right">{cat.emoji} {cat.label}</span>
                  {cat.questions.map(q => (
                    <button key={q} onClick={() => startDebate(q)}
                      className="text-xs px-3 py-1.5 rounded-full border text-slate-400 hover:text-white transition-all text-left"
                      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                      {q}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {status !== 'idle' && (
          <div>
            <div className="rounded-xl px-5 py-3 mb-4 border fade-up" style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)' }}>
              <span className="text-xs text-indigo-400 uppercase tracking-widest mr-3">Question</span>
              <span className="text-white font-medium">{question}</span>
              {status === 'running' && <button onClick={() => abortRef.current?.abort()} className="ml-4 text-xs text-slate-500 hover:text-red-400 transition-colors">Stop</button>}
            </div>
            <DebateRail status={status} phase={currentPhase} agents={agents} />
            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
            {claims.length > 0 && <ConsensusBar claims={claims} />}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-1 flex flex-col gap-3">
                {AGENT_ORDER.map(role => (
                  <AgentCard
                    key={role}
                    agent={AGENTS[role]}
                    isActive={agents[role].isActive}
                    isDone={agents[role].isDone}
                    content={agents[role].content}
                    rebuttalContent={agents[role].rebuttalContent}
                    isStreaming={agents[role].isStreaming}
                    currentPhase={currentPhase}
                    claims={claims}
                  />
                ))}
              </div>
              <div className="xl:col-span-2 flex flex-col gap-6">
                <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1320', borderColor: 'rgba(255,255,255,0.07)', height: 320 }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <span className="text-xs uppercase tracking-widest text-slate-500">Argument Graph</span>
                    {claims.length > 0 && <span className="text-xs text-slate-600 ml-2">· {claims.length} claims</span>}
                  </div>
                  {claims.length === 0
                    ? <div className="flex items-center justify-center h-full"><p className="text-slate-700 text-sm">Claims appear as agents speak…</p></div>
                    : <ArgumentGraph claims={claims} />}
                </div>
                {brief && (
                  <>
                    <DecisionBriefCard brief={brief} />
                    <ShareBar
                      question={question}
                      agentContents={Object.fromEntries(AGENT_ORDER.map(r => [r, agents[r].content]))}
                      brief={brief}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
