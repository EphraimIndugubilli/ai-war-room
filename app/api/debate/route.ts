import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { AGENTS, AGENT_ORDER } from '@/lib/agents';
import { Claim, DecisionBrief, StreamEvent } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/EphraimIndugubilli/ai-war-room',
    'X-Title': 'AI War Room',
  },
});

const MODEL = process.env.AI_MODEL || 'anthropic/claude-haiku-4-5-20251001';

function send(controller: ReadableStreamDefaultController, event: StreamEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

function extractClaims(text: string, agentRole: string): Claim[] {
  const claims: Claim[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  sentences.slice(0, 4).forEach((s, i) => {
    const t = s.trim();
    if (t.length < 20) return;
    const type = i === 0 ? 'argument'
      : t.toLowerCase().includes('however') || t.toLowerCase().includes('but') ? 'challenge'
      : t.toLowerCase().includes('therefore') || t.toLowerCase().includes('thus') ? 'conclusion'
      : 'argument';
    claims.push({
      id: `${agentRole}-${Date.now()}-${i}`,
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
  controller: ReadableStreamDefaultController
): Promise<string> {
  const agent = AGENTS[role as keyof typeof AGENTS];

  send(controller, { type: 'round_start', agentRole: role as never, round: 0 });

  const prompt = history
    ? `The question being debated: "${question}"\n\nWhat other agents have said so far:\n${history}\n\nNow give your perspective as ${agent.name}. Be direct, specific, and respond to what others have said where relevant. 3-4 focused paragraphs.`
    : `The question being debated: "${question}"\n\nGive your opening argument as ${agent.name}. Be direct and specific. 3-4 focused paragraphs.`;

  const stream = await openrouter.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: 500,
    temperature: 0.85,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) {
      full += token;
      send(controller, { type: 'token', agentRole: role as never, token });
    }
  }

  const claims = extractClaims(full, role);
  send(controller, { type: 'round_end', agentRole: role as never, content: full, claims });
  return full;
}

async function generateBrief(
  question: string,
  debate: string,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const stream = await openrouter.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a neutral decision analyst. Synthesize a multi-agent debate into a structured decision brief. Output valid JSON only, no markdown.',
      },
      {
        role: 'user',
        content: `Question: "${question}"\n\nDebate transcript:\n${debate}\n\nOutput a JSON object with exactly these fields:
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

  if (!process.env.OPENROUTER_API_KEY) {
    return new Response('OPENROUTER_API_KEY not configured', { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const debateHistory: string[] = [];

        for (const role of AGENT_ORDER) {
          const history = debateHistory
            .map((h, i) => `[${AGENTS[AGENT_ORDER[i]].name}]: ${h}`)
            .join('\n\n');
          const content = await runAgent(role, question, history, controller);
          debateHistory.push(content);
        }

        const fullDebate = debateHistory
          .map((h, i) => `[${AGENTS[AGENT_ORDER[i]].name}]:\n${h}`)
          .join('\n\n---\n\n');

        await generateBrief(question, fullDebate, controller);
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
