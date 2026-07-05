import { NextResponse } from 'next/server';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type GroqChatResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  error?: {
    message?: string;
  };
};

const getUserFriendlyGroqError = (message?: string) => {
  const normalized = message?.toLowerCase() ?? '';

  if (normalized.includes('incorrect api key') || normalized.includes('invalid api key')) {
    return 'The Groq API key is not valid. Please add a valid Groq key in .env and restart the server.';
  }

  if (normalized.includes('model')) {
    return 'The selected Groq model is not available for this API key. Update GROQ_MODEL in .env or choose a model from the Groq console.';
  }

  if (normalized.includes('rate limit')) {
    return 'Groq is rate limited right now. Please wait a moment and try again.';
  }

  return 'I could not reach Groq right now. Please check the API key, model, and Groq account access.';
};

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MARKET_TERMS = [
  'crypto',
  'cryptocurrency',
  'bitcoin',
  'btc',
  'ethereum',
  'eth',
  'altcoin',
  'token',
  'coin',
  'blockchain',
  'defi',
  'nft',
  'stablecoin',
  'market',
  'stock',
  'share',
  'equity',
  'index',
  'nasdaq',
  'nyse',
  'sp500',
  's&p',
  'dow',
  'price',
  'trading',
  'portfolio',
  'volume',
  'market cap',
  'candlestick',
  'support',
  'resistance',
  'bullish',
  'bearish',
  'risk',
];

const SYSTEM_PROMPT = `You are CoinPulse Market Assistant.

Scope:
- Answer only questions about cryptocurrency markets, blockchain assets, stock/share markets, market tracking, portfolio education, risk management, and general market concepts.
- If the user asks about anything outside crypto or share markets, politely refuse and steer them back to market topics.
- Do not give personalized financial advice, guaranteed predictions, or instructions to buy/sell a specific asset.
- Keep answers concise, practical, and beginner-friendly.
- When relevant, mention that users should verify live prices and do their own research.`;

const isMarketQuestion = (content: string) => {
  const normalized = content.toLowerCase();

  return MARKET_TERMS.some((term) => normalized.includes(term));
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = body.messages?.slice(-10) ?? [];
    const latestMessage = messages.at(-1);

    if (!latestMessage?.content?.trim()) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    if (!isMarketQuestion(latestMessage.content)) {
      return NextResponse.json({
        reply:
          'I can only help with crypto and share market topics. Ask me about prices, market trends, risk, portfolios, trading terms, or blockchain assets.',
      });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Groq API key is missing. Add GROQ_API_KEY to .env.' },
        { status: 500 },
      );
    }

    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 450,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          ...messages,
        ],
      }),
    });

    const data = (await response.json()) as GroqChatResponse;

    if (!response.ok) {
      console.error('Groq API error:', {
        status: response.status,
        message: data.error?.message,
      });

      return NextResponse.json(
        { error: getUserFriendlyGroqError(data.error?.message) },
        { status: response.status },
      );
    }

    return NextResponse.json({
      reply: data.choices?.[0]?.message?.content?.trim() || 'I could not generate a response.',
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong while contacting Groq.' },
      { status: 500 },
    );
  }
}
