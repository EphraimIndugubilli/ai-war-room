'use client';

import { useEffect, useState } from 'react';
import { DecisionBrief } from '@/lib/types';

export interface DebateRecord {
  id: string;
  question: string;
  brief: DecisionBrief;
  timestamp: number;
}

const STORAGE_KEY = 'ai_war_room_history';
const MAX_RECORDS = 10;

export function saveDebate(record: DebateRecord) {
  try {
    const existing = loadHistory();
    const updated = [record, ...existing.filter(r => r.id !== record.id)].slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* storage full */ }
}

export function loadHistory(): DebateRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

interface Props {
  onSelect: (record: DebateRecord) => void;
  currentId?: string;
}

export default function DebateHistory({ onSelect, currentId }: Props) {
  const [records, setRecords] = useState<DebateRecord[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRecords(loadHistory());
  }, [open]);

  if (records.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#94a3b8' }}
      >
        🕐 History ({records.length})
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 w-80 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{ background: '#0d1320', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <span className="text-xs uppercase tracking-widest text-slate-500">Past Debates</span>
            <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-white text-sm">✕</button>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {records.map(rec => (
              <button
                key={rec.id}
                onClick={() => { onSelect(rec); setOpen(false); }}
                className="w-full text-left px-4 py-3 border-b hover:bg-white/5 transition-colors"
                style={{
                  borderColor: 'rgba(255,255,255,0.05)',
                  background: rec.id === currentId ? 'rgba(99,102,241,0.08)' : undefined,
                }}
              >
                <p className="text-sm text-white leading-snug line-clamp-2 mb-1">{rec.question}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-400">{rec.brief.confidence}% confidence</span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs text-slate-600">
                    {new Date(rec.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
