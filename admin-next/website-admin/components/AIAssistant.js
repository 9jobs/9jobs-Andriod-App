'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, User } from 'lucide-react';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I am your 9JOBS AI Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Simple AI Response logic (can be replaced with real API call)
    setTimeout(() => {
      const aiMsg = { role: 'ai', text: getAIResponse(input) };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  const getAIResponse = (query) => {
    const q = query.toLowerCase();
    if (q.includes('job')) return "We have many jobs available in IT, Marketing, and Sales. What's your field?";
    if (q.includes('contact')) return "You can reach us at contact@9jobs.co or via the contact form on our website.";
    if (q.includes('about')) return "9JOBS is a leading career platform dedicated to connecting talent with opportunity.";
    return "That's interesting! Could you tell me more about what you're looking for?";
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: '#000',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          zIndex: 1000,
          cursor: 'pointer'
        }}
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            style={{
              position: 'fixed',
              bottom: '7rem',
              right: '2rem',
              width: '380px',
              height: '550px',
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: '28px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 30px 60px rgba(0,0,0,0.15)',
              zIndex: 1000
            }}
          >
            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '12px' }}>
                <Bot size={20} color="#000" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>9JOBS AI</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Always active</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ 
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '1rem 1.2rem',
                  borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: m.role === 'user' ? '#000' : 'var(--surface)',
                  color: m.role === 'user' ? '#fff' : '#000',
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                  boxShadow: m.role === 'user' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                }}>
                  {m.text}
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.8rem' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message 9JOBS AI..."
                style={{
                  flex: 1,
                  background: 'var(--surface)',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '1rem',
                  color: '#000',
                  outline: 'none',
                  fontSize: '0.95rem'
                }}
              />
              <button onClick={handleSend} style={{ background: '#000', color: '#fff', padding: '1rem', borderRadius: '16px', display: 'flex' }}>
                <Send size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
