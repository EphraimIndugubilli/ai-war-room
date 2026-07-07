export type AgentRole =
  | 'devil_advocate'
  | 'optimist'
  | 'risk_analyst'
  | 'historian'
  | 'contrarian'
  | 'synthesis';

export interface Agent {
  role: AgentRole;
  name: string;
  emoji: string;
  color: string;
  tagline: string;
  systemPrompt: string;
}

export interface Claim {
  id: string;
  agentRole: AgentRole;
  text: string;
  type: 'argument' | 'challenge' | 'rebuttal' | 'support' | 'conclusion';
  challengesId?: string;
  timestamp: number;
}

export interface DebateRound {
  round: number;
  agentRole: AgentRole;
  content: string;
  claims: Claim[];
  timestamp: number;
}

export interface ConfidenceBreakdown {
  totalClaims: number;
  challengeClaims: number;
  supportingClaims: number;
  agreementScore: number;
  perAgent: { agentRole: AgentRole; challenges: number; total: number }[];
}

// 2026 AI transparency trend: expose which agents updated their position
// after hearing counterarguments — a leading signal of debate quality.
export interface StanceShift {
  agentRole: string;
  shifted: boolean;
  strength: 'none' | 'weak' | 'strong';
  cue: string;
}

export interface DecisionBrief {
  summary: string;
  majority: string;
  minority: string;
  recommendation: string;
  confidence: number;
  risks: string[];
  nextSteps: string[];
  breakdown?: ConfidenceBreakdown;
  stanceShifts?: StanceShift[];
}

export interface DebateState {
  question: string;
  rounds: DebateRound[];
  brief: DecisionBrief | null;
  status: 'idle' | 'running' | 'complete';
}

// 2026 Agentic UX: meta-agent output after all debate rounds complete.
export interface SynthesisResult {
  consensus: string[];
  coreTension: string;
  decisionFactors: string[];
}

export type StreamEvent =
  | { type: 'round_start'; agentRole: AgentRole; round: number; phase: 'opening' | 'rebuttal' }
  | { type: 'token'; agentRole: AgentRole; token: string; phase: 'opening' | 'rebuttal' }
  | { type: 'round_end'; agentRole: AgentRole; content: string; claims: Claim[]; phase: 'opening' | 'rebuttal' }
  | { type: 'phase_change'; phase: 'opening' | 'rebuttal' | 'synthesis' }
  | { type: 'synthesis'; result: SynthesisResult }
  | { type: 'brief'; brief: DecisionBrief }
  | { type: 'stance_shifts'; shifts: StanceShift[] }
  | { type: 'done' }
  | { type: 'error'; message: string };
