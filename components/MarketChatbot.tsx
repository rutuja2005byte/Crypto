'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, MessageCircle, Send, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type MarketChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const welcomeMessage: MarketChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi, I am your CoinPulse market assistant. Ask me about crypto trends, market terms, risk, portfolios, or share market basics.',
};

const MarketChatbot = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<MarketChatMessage[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);

  const apiMessages = useMemo(
    () =>
      messages
        .filter((message) => message.id !== welcomeMessage.id)
        .map(({ role, content }) => ({ role, content })),
    [messages],
  );

  const clearChat = () => {
    setMessages([welcomeMessage]);
    setInput('');
    inputRef.current?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = input.trim();
    if (!content || isLoading) return;

    const userMessage: MarketChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...apiMessages, { role: 'user', content }],
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply || data.error || 'I could not answer that right now.',
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'I could not reach the market assistant. Please try again in a moment.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="market-chatbot" className={cn(isOpen && 'is-open')}>
      {isOpen && (
        <section className="chat-panel" aria-label="Market assistant chat">
          <div className="chat-header">
            <div className="chat-title">
              <span className="bot-icon">
                <Bot size={18} />
              </span>
              <div>
                <h2>Market Assistant</h2>
                <p>Crypto and share market only</p>
              </div>
            </div>

            <div className="chat-actions">
              <button type="button" onClick={clearChat} aria-label="Clear chat" title="Clear chat">
                <Trash2 size={17} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="chat-messages custom-scrollbar">
            {messages.map((message) => (
              <div key={message.id} className={cn('chat-message', message.role)}>
                {message.content}
              </div>
            ))}

            {isLoading && (
              <div className="chat-message assistant loading">
                <Loader2 size={16} className="animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          <form className="chat-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about Bitcoin, stocks, trends..."
              aria-label="Ask the market assistant"
            />
            <button type="submit" disabled={isLoading || !input.trim()} aria-label="Send message">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chat-toggle"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? 'Close market assistant' : 'Open market assistant'}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={26} />}
      </button>
    </div>
  );
};

export default MarketChatbot;
