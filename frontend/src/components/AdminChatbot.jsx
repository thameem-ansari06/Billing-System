import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { API } from '../config';
import { useAuth } from '../context/AuthContext';

export default function AdminChatbot() {
  const { user } = useAuth() || {};

  // Restrict chatbot rendering strictly to admin and ceo roles
  if (!user || !['admin', 'ceo'].includes(user.role)) {
    return null;
  }

  // State variables for chatbot open/close toggling, messages array, tracking loading status
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello Admin! Ask me anything about Customers, Invoices, or Products.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  // Auto scroll to bottom whenever a new message lands
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // 1. Add user's question to the chat container list immediately
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // 2. Direct hit to our brand new FastAPI endpoint
      const response = await fetch(`${API}/admin/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Server error or unauthorized access');
      }

      const data = await response.json();

      // 3. Append NVIDIA NIM's response context back to messages feed array
      setMessages((prev) => [...prev, { sender: 'ai', text: data.response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev, 
        { sender: 'ai', text: 'Error connecting to database engine. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* TRIGGER FLOATING BUTTON (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full shadow-xl transition-all duration-200 flex items-center justify-center group"
        >
          <MessageSquare className="h-6 w-6 group-hover:scale-105" />
        </button>
      )}

      {/* CHAT WINDOW COMPARTMENT - ULTRA COMPACT HIGH DENSITY DESIGN */}
      {isOpen && (
        <div className="w-80 md:w-96 h-[420px] bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300">
          
          {/* HEADER LAYER */}
          <div className="bg-slate-900 text-white px-3 py-2 flex justify-between items-center border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold tracking-wide">Admin AI Assistant</h3>
              <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Connected to Postgres
              </p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* CHAT MESSAGES SCROLL BOX */}
          <div className="flex-1 overflow-y-auto p-2.5 bg-slate-50 space-y-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-slate-800 rounded-bl-none font-medium'
                  }`}
                  style={{ whiteSpace: 'pre-line' }} // Keeps AI formatting and newlines clean
                >
                  {msg.text}
                </div>
              </div>
            ))}
            
            {/* TYPING LOADER STATUS */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  NVIDIA NIM querying database...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* INPUT FORM FIELD BAR */}
          <form onSubmit={handleSendMessage} className="p-2 bg-white border-t border-gray-100 flex gap-1.5 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me: e.g., Total active customers?"
              disabled={loading}
              className="flex-1 bg-slate-100 text-xs border-0 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 text-slate-800"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-gray-400 p-1.5 rounded-md transition-colors shadow-sm flex items-center justify-center"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}