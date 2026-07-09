import React, { useState, useRef, useEffect } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────
const API_URL   = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_ID = 'openrouter/auto';
const SITE_URL  = 'http://localhost:5173';
const SITE_NAME = 'Coral Reef Dashboard';

const SYSTEM_PROMPT = `You are a coral reef expert assistant for the Coral Reef Bleaching Prediction Dashboard. You only answer questions related to:
- Coral reef bleaching and its causes
- Sea surface temperature (SST) and anomalies (SSTA)
- Degree Heating Weeks (DHW) and what they mean
- The 5 reef zones: Great Barrier Reef, Coral Triangle, Caribbean, Red Sea, Indian Ocean
- The prediction model results and what the risk levels mean
- Ocean acidification and its effect on reefs
- Conservation actions for bleaching events
- Climate change impact on coral reefs
This dashboard was created by Suryadeep Banerjee. If anyone asks who built or created this dashboard, you may mention his name.
If asked anything unrelated to coral reefs or this dashboard, politely say you only assist with coral reef topics for this dashboard.`;

const WELCOME = `Hi! I'm your Reef Assistant 🪸 Ask me anything about coral bleaching, DHW levels, risk predictions, or the reef zones in this dashboard.`;

// ── Typing dots animation ─────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <div style={styles.botBubble}>
        <div style={styles.dots}>
          <span style={{ ...styles.dot, animationDelay: '0ms' }}   />
          <span style={{ ...styles.dot, animationDelay: '160ms' }} />
          <span style={{ ...styles.dot, animationDelay: '320ms' }} />
        </div>
      </div>
    </div>
  );
}

// ── Lightweight markdown renderer ────────────────────────────────────────────
function renderMarkdown(text) {
  // Split into lines, process each
  return text.split('\n').map((line, li) => {
    // Convert **bold** and *italic* within a line into React elements
    const parts = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let last = 0, match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index));
      if (match[0].startsWith('**')) {
        parts.push(<strong key={match.index}>{match[2]}</strong>);
      } else {
        parts.push(<em key={match.index}>{match[3]}</em>);
      }
      last = match.index + match[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return <span key={li}>{parts}<br /></span>;
  });
}

// ── Single message bubble ─────────────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user';
  const isErr  = msg.error;

  return (
    <div style={{
      display:        'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom:   8,
    }}>
      <div style={isUser ? styles.userBubble : isErr ? styles.errBubble : styles.botBubble}>
        {isUser ? msg.content : renderMarkdown(msg.content)}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export function ReefChatbot() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [history, setHistory] = useState([]);          // API conversation history
  const [messages, setMessages] = useState([          // display messages
    { role: 'assistant', content: WELCOME },
  ]);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Auto-scroll on new message or open
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || typing) return;

    const userMsg    = { role: 'user', content: text };
    const newHistory = [...history, userMsg];

    setMessages(prev => [...prev, userMsg]);
    setHistory(newHistory);
    setInput('');
    setTyping(true);

    try {
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!apiKey) throw new Error('API key not configured — add VITE_OPENROUTER_API_KEY to .env');

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
          'HTTP-Referer':  SITE_URL,
          'X-Title':       SITE_NAME,
        },
        body: JSON.stringify({
          model:       MODEL_ID,
          messages:    [{ role: 'system', content: SYSTEM_PROMPT }, ...newHistory],
          max_tokens:  400,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err}`);
      }

      const data    = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from model');

      const botMsg = { role: 'assistant', content };
      setHistory(prev => [...prev, botMsg]);
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', error: true, content: `Sorry, couldn't reach the AI. Check your API key or try again.\n(${e.message})` },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Closed state — floating button ─────────────────────────────────────────
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={styles.fab} title="Open Reef Assistant">
        🪸
      </button>
    );
  }

  // ── Open state — chat window ────────────────────────────────────────────────
  return (
    <div style={styles.window}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>🪸 Reef Assistant</span>
        <button onClick={() => setOpen(false)} style={styles.closeBtn}>✕</button>
      </div>

      {/* Message area */}
      <div style={styles.messageArea}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {typing && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={styles.inputRow}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about coral reefs..."
          disabled={typing}
          style={styles.inputField}
        />
        <button
          onClick={sendMessage}
          disabled={typing || !input.trim()}
          style={styles.sendBtn}
          title="Send"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ── Styles (use CSS variables so they auto-respond to theme toggle) ───────────
const styles = {
  fab: {
    position:       'fixed',
    bottom:         16,
    right:          16,
    zIndex:         9999,
    width:          56,
    height:         56,
    borderRadius:   '50%',
    background:     '#00b4d8',
    border:         'none',
    cursor:         'pointer',
    fontSize:       26,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    boxShadow:      '0 4px 20px rgba(0,180,216,0.5)',
    transition:     'transform 0.15s, box-shadow 0.15s',
  },
  window: {
    position:       'fixed',
    bottom:         16,
    right:          16,
    left:           'auto',     // desktop: anchored right
    zIndex:         9999,
    width:          'min(360px, calc(100vw - 32px))',  // never wider than viewport
    maxWidth:       '100vw',
    height:         'min(480px, calc(100dvh - 32px))',
    maxHeight:      '85dvh',
    background:     'var(--d2)',
    border:         '1px solid #00b4d8',
    borderRadius:   16,
    boxShadow:      '0 8px 32px rgba(0,0,0,0.25)',
    display:        'flex',
    flexDirection:  'column',
    overflow:       'hidden',
    fontFamily:     'var(--font-body, Inter, system-ui, sans-serif)',
    transition:     'background 0.2s',
    boxSizing:      'border-box',
  },
  header: {
    background:     '#00b4d8',            // accent — always teal
    padding:        '12px 16px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    flexShrink:     0,
  },
  headerTitle: {
    color:      '#fff',
    fontWeight: 700,
    fontSize:   15,
  },
  closeBtn: {
    background: 'transparent',
    border:     'none',
    color:      '#fff',
    fontSize:   18,
    cursor:     'pointer',
    lineHeight: 1,
    padding:    '0 4px',
  },
  messageArea: {
    flexGrow:       1,
    overflowY:      'auto',
    padding:        12,
    display:        'flex',
    flexDirection:  'column',
    gap:            0,
    background:     'var(--d1)',          // page bg — lightest surface
  },
  userBubble: {
    background:   '#00b4d8',             // always teal
    color:        '#fff',
    borderRadius: '12px 12px 2px 12px',
    padding:      '10px 14px',
    fontSize:     13,
    maxWidth:     '85%',
    lineHeight:   1.5,
    whiteSpace:   'pre-wrap',
  },
  botBubble: {
    background:   'var(--d2)',           // card bg
    color:        'var(--tx1)',          // primary text
    borderRadius: '12px 12px 12px 2px',
    border:       '1px solid var(--bd)',
    padding:      '10px 14px',
    fontSize:     13,
    maxWidth:     '85%',
    lineHeight:   1.5,
  },
  errBubble: {
    background:   'rgba(220,38,38,0.1)',
    color:        '#ef4444',
    borderRadius: '12px 12px 12px 2px',
    padding:      '10px 14px',
    fontSize:     13,
    maxWidth:     '85%',
    lineHeight:   1.5,
    border:       '1px solid rgba(220,38,38,0.3)',
  },
  inputRow: {
    background:  'var(--d2)',            // card bg
    borderTop:   '1px solid var(--bd)', // theme border
    padding:     '10px 12px',
    display:     'flex',
    gap:         8,
    flexShrink:  0,
  },
  inputField: {
    flexGrow:     1,
    background:   'var(--d3)',           // deep/inset bg
    color:        'var(--tx1)',          // primary text
    border:       '1px solid var(--bd)',
    borderRadius: 8,
    padding:      '8px 12px',
    fontSize:     13,
    outline:      'none',
  },
  sendBtn: {
    background:     '#00b4d8',
    color:          '#fff',
    border:         'none',
    borderRadius:   8,
    width:          36,
    height:         36,
    fontSize:       18,
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    transition:     'opacity 0.15s',
  },
  dots: {
    display:    'flex',
    gap:        5,
    alignItems: 'center',
    padding:    '2px 0',
  },
  dot: {
    display:      'inline-block',
    width:        7,
    height:       7,
    borderRadius: '50%',
    background:   '#00b4d8',
    animation:    'dotPulse 1s ease-in-out infinite',
  },
};

// Inject keyframe for dots into document head (once)
if (typeof document !== 'undefined' && !document.getElementById('reef-chat-keyframes')) {
  const style = document.createElement('style');
  style.id = 'reef-chat-keyframes';
  style.textContent = `
    @keyframes dotPulse {
      0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
      40%            { opacity: 1;   transform: scale(1);   }
    }
  `;
  document.head.appendChild(style);
}
