import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI interview coach. Ask me anything about DSA, system design, or behavioural prep." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', content: input };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/chatbot/message', {
        message: userMessage.content,
        history: updated.map(({ role, content }) => ({ role, content })),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="page-container">
      <h2>AI Interview Coach</h2>

      <div className="chat-container" style={{ height: 420 }}>
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === 'user' ? 'chat-bubble user' : 'chat-bubble assistant'}
            >
              {m.content}
            </div>
          ))}
          {loading && <div className="chat-loading">Thinking...</div>}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="chat-input-row">
        <div className="chat-input-wrap">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question... (Enter to send, Shift+Enter for new line)"
            className="chat-textarea"
          />
        </div>

        <button className="chat-send-button" onClick={handleSend} disabled={loading} aria-label="Send message">
          {/* Paper airplane SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}