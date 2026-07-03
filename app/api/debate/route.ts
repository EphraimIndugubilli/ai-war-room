import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { AGENTS, AGENT_ORDER } from '@/lib/agents';
import { Claim, ConfidenceBreakdown, DecisionBrief, StreamEvent, SynthesisResult } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    const groqKey = process.env.GROQ_API_KEY;
    const orKey = process.env.OPENROUTER_API_KEY;
    if (groqKey) {
      _client = new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: groqKey,
      });
    } else if (orKey) {
      _client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: orKey,
        defaultHeaders: {
          'HTTP-Referer': 'https://github.com/EphraimIndugubilli/ai-war-room',
          'X-Title': 'AI War Room',
        },
      });
    } else {
      throw new Error('No API key set. Add GROQ_API_KEY or OPENROUTER_API_KEY to .env.local');
    }
  }
  return _client;
}

function send(controller: ReadableStreamDefaultController, event: StreamEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

function extractClaims(text: string, agentRole: string, phase: 'opening' | 'rebuttal'): Claim[] {
  const claims: Claim[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  sentences.slice(0, phase === 'rebuttal' ? 3 : 4).forEach((s, i) => {
    const t = s.trim();
    if (t.length < 20) return;
    const lower = t.toLowerCase();
    const type = phase === 'rebuttal' ? 'rebuttal'
      : i === 0 ? 'argument'
      : lower.includes('however') || lower.includes('but') ? 'challenge'
      : lower.includes('therefore') || lower.includes('thus') ? 'conclusion'
      : 'argument';
    claims.push({
      id: `${agentRole}-${phase}-${Date.now()}-${i}`,
      agentRole: agentRole as Claim['agentRole'],
      text: t,
      type,
      timestamp: Date.now(),
    });
  });
  return claims;
}

async function runAgent(
  role: string,
  question: string,
  history: string,
  controller: ReadableStreamDefaultController,
  phase: 'opening' | 'rebuttal' = 'opening',
  round = 1
): Promise<{ content: string; claims: Claim[] }> {
  const agent = AGENTS[role as keyof typeof AGENTS];

  send(controller, { type: 'round_start', agentRole: role as never, round, phase });

  let prompt: string;
  if (phase === 'opening') {
    prompt = history
      ? `The question being debated: "${question}"\n\nWhat other agents have said so far:\n${history}\n\nNow give your perspective as ${agent.name}. Be direct, specific, and respond to what others have said where relevant. 3-4 focused paragraphs.`
      : `The question being debated: "${question}"\n\nGive your opening argument as ${agent.name}. Be direct and specific. 3-4 focused paragraphs.`;
  } else {
    prompt = `The question being debated: "${question}"\n\nHere is what every agent said in Round 1:\n${history}\n\nYou are ${agent.name}. Write a focused rebuttal (2-3 paragraphs). Directly address the strongest arguments that challenge your position. Concede any points where others made you update your view — intellectual honesty is a strength. End with your refined conclusion.`;
  }

  const stream = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: phase === 'rebuttal' ? 350 : 500,
    temperature: 0.85,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) {
      full += token;
      send(controller, { type: 'token', agentRole: role as never, token, phase });
    }
  }

  const claims = extractClaims(full, role, phase);
  send(controller, { type: 'round_end', agentRole: role as never, content: full, claims, phase });
  return { content: full, claims };
}

// AI explanation layer ("why am I seeing this?") — 2026 AI UX trend. Surfaces
// how much agents actually challenged each other vs. converged, instead of
// presenting the confidence score as an unexplained black box.
function computeConfidenceBreakdown(allClaims: Claim[]): ConfidenceBreakdown {
  const challengeClaims = allClaims.filter(c => c.type === 'challenge' || c.type === 'rebuttal').length;
  const supportingClaims = allClaims.length - challengeClaims;
  const agreementScore = allClaims.length
    ? Math.round((supportingClaims / allClaims.length) * 100)
    : 50;

  const perAgent = AGENT_ORDER.map((agentRole) => {
    const agentClaims = allClaims.filter(c => c.agentRole === agentRole);
    const challenges = agentClaims.filter(c => c.type === 'challenge' || c.type === 'rebuttal').length;
    return { agentRole, challenges, total: agentClaims.length };
  });

  return { totalClaims: allClaims.length, challengeClaims, supportingClaims, agreementScore, perAgent };
}

// 2026 Agentic UX trend: a meta-agent that synthesizes across all debate agents,
// surfacing consensus, core tension, and ranked decision factors — the "battlemap"
// a decision-maker needs BEFORE reading the full transcript.
async function runSynthesis(
  question: string,
  fullTranscript: string,
  controller: ReadableStreamDefaultController,
): Promise<void> {
  send(controller, { type: 'phase_change', phase: 'synthesis' });
  try {
    const resp = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: AGENTS.synthesis.systemPrompt },
        {
          role: 'user',
          content: `Question debated: "${question}"\n\nFull debate transcript:\n${fullTranscript}\n\nOutput the synthesis JSON now.`,
        },
      ],
      max_tokens: 400,
      temperature: 0.2,
      stream: false,
    });
    const raw = resp.choices[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result: SynthesisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      consensus: ['Multiple perspectives were considered.'],
      coreTension: 'Core trade-offs remain unresolved.',
      decisionFactors: ['Context and constraints', 'Risk tolerance', 'Available alternatives'],
    };
    send(controller, { type: 'synthesis', result });
  } catch {
    // Synthesis failure is non-fatal — the brief still generates
  }
}

async function generateBrief(
  question: string,
  debate: string,
  controller: ReadableStreamDefaultController,
  breakdown: ConfidenceBreakdown
): Promise<void> {
  const stream = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a neutral decision analyst. Synthesize a multi-agent debate into a structured decision brief. Output valid JSON only, no markdown.',
      },
      {
        role: 'user',
        content: `Question: "${question}"\n\nDebate transcript (includes opening arguments and rebuttals):\n${debate}\n\nOutput a JSON object with exactly these fields:
{
  "summary": "2-sentence neutral summary of the core tension",
  "majority": "The strongest case FOR (1-2 sentences)",
  "minority": "The strongest case AGAINST (1-2 sentences)",
  "recommendation": "Clear recommended action with brief reasoning",
  "confidence": 72,
  "risks": ["top risk 1", "top risk 2", "top risk 3"],
  "nextSteps": ["concrete next step 1", "concrete next step 2", "concrete next step 3"]
}`,
      },
    ],
    max_tokens: 600,
    temperature: 0.3,
    stream: true,
  });

  let raw = '';
  for await (const chunk of stream) {
    raw += chunk.choices[0]?.delta?.content || '';
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const brief: DecisionBrief = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      summary: 'Debate complete.',
      majority: 'Multiple perspectives were shared.',
      minority: 'Counterarguments were raised.',
      recommendation: 'Review the debate transcript and decide.',
      confidence: 50,
      risks: [],
      nextSteps: [],
    };
    brief.breakdown = breakdown;
    send(controller, { type: 'brief', brief });
  } catch {
    send(controller, { type: 'error', message: 'Failed to generate decision brief.' });
  }
}

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  if (!question?.trim()) {
    return new Response('Question required', { status: 400 });
  }

  if (!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return new Response('No API key configured. Add GROQ_API_KEY or OPENROUTER_API_KEY to .env.local', { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Round 1: Opening arguments
        const allClaims: Claim[] = [];
        const openingResults: string[] = [];
        for (const role of AGENT_ORDER) {
          const history = openingResults
            .map((h, i) => `[${AGENTS[AGENT_ORDER[i]].name}]: ${h}`)
            .join('\n\n');
          const { content, claims } = await runAgent(role, question, history, controller, 'opening', 1);
          openingResults.push(content);
          allClaims.push(...claims);
        }

        // Signal phase transition
        send(controller, { type: 'phase_change', phase: 'rebuttal' });

        // Round 2: Rebuttals — every agent reads all of round 1
        const fullRound1 = openingResults
          .map((h, i) => `[${AGENTS[AGENT_ORDER[i]].name}]:\n${h}`)
          .join('\n\n---\n\n');

        const rebuttalResults: string[] = [];
        for (const role of AGENT_ORDER) {
          const { content, claims } = await runAgent(role, question, fullRound1, controller, 'rebuttal', 2);
          rebuttalResults.push(content);
          allClaims.push(...claims);
        }

        // Full transcript for synthesis and brief
        const fullDebate = [
          '=== ROUND 1: OPENING ARGUMENTS ===',
          fullRound1,
          '',
          '=== ROUND 2: REBUTTALS ===',
          rebuttalResults
            .map((h, i) => `[${AGENTS[AGENT_ORDER[i]].name}]:\n${h}`)
            .join('\n\n---\n\n'),
        ].join('\n');

        const breakdown = computeConfidenceBreakdown(allClaims);
        await runSynthesis(question, fullDebate, controller);
        await generateBrief(question, fullDebate, controller, breakdown);
        send(controller, { type: 'done' });
      } catch (err) {
        send(controller, {
          type: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
