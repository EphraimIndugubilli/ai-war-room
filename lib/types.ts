export type AgentRole =
  | 'devil_advocate'
  | 'optimist'
  | 'risk_analyst'
  | 'historian'
  | 'contrarian';

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
  agreementScore: number; // 0-100: share of claims that weren't challenges
  perAgent: { agentRole: AgentRole; challenges: number; total: number }[];
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
}

export interface DebateState {
  question: string;
  rounds: DebateRound[];
  brief: DecisionBrief | null;
  status: 'idle' | 'running' | 'complete';
}

export type StreamEvent =
  | { type: 'round_start'; agentRole: AgentRole; round: number; phase: 'opening' | 'rebuttal' }
  | { type: 'token'; agentRole: AgentRole; token: string; phase: 'opening' | 'rebuttal' }
  | { type: 'round_end'; agentRole: AgentRole; content: string; claims: Claim[]; phase: 'opening' | 'rebuttal' }
  | { type: 'phase_change'; phase: 'opening' | 'rebuttal' }
  | { type: 'brief'; brief: DecisionBrief }
  | { type: 'done' }
  | { type: 'error'; message: string };
