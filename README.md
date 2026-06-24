# AI War Room

> Drop a hard question. Watch 5 specialist AI agents debate it in real-time.

**Live multi-agent debate system** — five AI personalities with distinct roles argue any decision, visible in real-time with a live argument graph and a structured decision brief at the end.

## Agents

| Agent | Role |
|-------|------|
| 😈 Devil's Advocate | Tears apart every assumption |
| 🚀 Optimist | Builds the strongest case for it |
| ⚠️ Risk Analyst | Quantifies what could go wrong |
| 📚 Historian | Finds past cases where this played out |
| 🔄 Contrarian | Argues the option nobody is considering |

## Features

- **Real-time SSE streaming** — each agent speaks token by token, visibly
- **Live argument graph** — canvas physics simulation showing claims as nodes
- **Decision brief** — structured output: majority/minority view, confidence %, risks, next steps
- **Model-agnostic** — swap any OpenRouter model via env var

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS**
- **OpenRouter** via OpenAI SDK (access Claude, GPT-4o, Llama, etc.)
- **Canvas API** for live argument graph

## Setup

```bash
git clone https://github.com/EphraimIndugubilli/ai-war-room
cd ai-war-room
npm install
cp .env.example .env.local
# Add your OPENROUTER_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Get an OpenRouter API key at [openrouter.ai](https://openrouter.ai)

## How it works

1. You submit a question
2. Five agents run sequentially, each reading the previous agents' arguments
3. Each agent streams its response token-by-token via SSE
4. Claims are extracted and rendered as a physics-simulated graph
5. After all agents finish, a neutral analyst synthesizes a decision brief

## Built by

Ephraim Indugubilli — [github.com/EphraimIndugubilli](https://github.com/EphraimIndugubilli)
