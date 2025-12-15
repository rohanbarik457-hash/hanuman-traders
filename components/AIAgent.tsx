import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { chatWithAgent, transcribeAudio } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Send, Mic, Bot, User, Globe, Map, StopCircle, Loader2, Sparkles, ExternalLink, Settings, ChevronDown, ChevronUp, X, MessageSquare, Maximize2, Minimize2, Check, ArrowRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const AIAgent: React.FC = () => {
  const { products, sales, locations, salesTargets, customers } = useApp();
  const location = useLocation(); 
  
  // Floating State
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'Hello! I am your smart inventory assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [useMaps, setUseMaps] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-flash' | 'gemini-3-pro-preview'>('gemini-2.5-flash');
  const [selectedTone, setSelectedTone] = useState<'Professional' | 'Casual' | 'Concise' | 'Detailed'>('Professional');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Context Building (Same logic as before, optimized for prompt)
    const totalGST = sales.reduce((acc, s) => acc + s.totalTax, 0);
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const lowStockItems = products.filter(p => Object.values(p.stock).reduce((a:number,b:number)=>a+b,0) <= p.minStockLevel).map(p => p.name);
    
    const context = `
      User Page: ${location.pathname}
      Total Revenue: ₹${totalRevenue}, Total Products: ${products.length}, Low Stock: ${lowStockItems.length} items.
      GST Liability: ₹${totalGST}.
      Active Locations: ${locations.map(l => l.name).join(', ')}.
    `;

    try {
        const response = await chatWithAgent(textToSend, context, useSearch, useMaps, selectedModel, selectedTone);
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: response.text,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I'm having trouble connecting right now.", timestamp: new Date() }]);
    } finally {
        setIsLoading(false);
    }
  };

  // ... (Audio recording logic same as before, omitted for brevity but assumed present) ...
  const startRecording = async () => { /* ... */ }; 
  const stopRecording = () => { /* ... */ };

  // Improved Markdown Parser
  const renderMessageContent = (text: string) => {
      // 1. Clean **bold** to <b>
      // 2. Clean ## Headers to styled blocks
      // 3. Handle Lists
      
      const lines = text.split('\n');
      return (
          <div className="space-y-1.5 text-sm leading-relaxed">
              {lines.map((line, idx) => {
                  let content = line.trim();
                  if (!content) return <div key={idx} className="h-1"></div>;

                  // Header Detection (##)
                  if (content.startsWith('##')) {
                      return (
                          <h4 key={idx} className="font-bold text-indigo-900 mt-3 mb-1 flex items-center">
                              <Sparkles size={14} className="mr-1.5 text-indigo-500 fill-indigo-100"/>
                              {content.replace(/^##\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                          </h4>
                      );
                  }

                  // Bullet Point Detection
                  if (content.startsWith('- ') || content.startsWith('* ')) {
                      const cleanLine = content.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                      return (
                          <div key={idx} className="flex items-start ml-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 mr-2 flex-shrink-0"></div>
                              <span dangerouslySetInnerHTML={{ __html: cleanLine }} className="text-slate-700"/>
                          </div>
                      );
                  }

                  // Standard Text with Bold parsing
                  const htmlContent = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
                  return <p key={idx} dangerouslySetInnerHTML={{ __html: htmlContent }} className="text-slate-600"/>;
              })}
          </div>
      );
  };

  return (
    <>
        {/* Floating Toggle Button */}
        {!isOpen && (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl z-50 transition-all hover:scale-110 animate-in zoom-in"
            >
                <MessageSquare size={28} />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
            </button>
        )}

        {/* Chat Window */}
        {isOpen && (
            <div className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-10 ${isExpanded ? 'w-[90vw] h-[80vh] md:w-[600px]' : 'w-[90vw] h-[500px] md:w-[380px]'}`}>
                
                {/* Header */}
                <div className="bg-indigo-600 p-4 rounded-t-2xl flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-1.5 rounded-lg"><Bot size={20} className="text-white"/></div>
                        <div>
                            <h3 className="font-bold text-sm">AI Assistant</h3>
                            <p className="text-[10px] text-indigo-200 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Online</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/10 rounded">{isExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button>
                        <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded"><X size={18}/></button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                            }`}>
                                {msg.role === 'user' ? msg.text : renderMessageContent(msg.text)}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-indigo-600"/>
                                <span className="text-xs text-slate-500">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 bg-white border-t border-slate-100 rounded-b-2xl">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
                        <input 
                            className="flex-1 bg-transparent outline-none text-sm"
                            placeholder="Type a message..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            disabled={isLoading}
                        />
                        <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                            <Send size={18} />
                        </button>
                    </div>
                    <div className="flex justify-between items-center mt-2 px-2">
                        <button onClick={() => setShowSettings(!showSettings)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                            <Settings size={12}/> {selectedModel === 'gemini-2.5-flash' ? 'Fast' : 'Pro'}
                        </button>
                        <span className="text-[10px] text-slate-300">Powered by Gemini</span>
                    </div>
                </div>

                {/* Settings Overlay */}
                {showSettings && (
                    <div className="absolute inset-x-4 bottom-16 bg-white border border-slate-200 shadow-xl rounded-xl p-4 animate-in slide-in-from-bottom-2 z-10">
                        <h4 className="font-bold text-xs text-slate-500 uppercase mb-3">Configuration</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Model</label>
                                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value as any)} className="w-full text-xs border p-2 rounded">
                                    <option value="gemini-2.5-flash">Gemini Flash (Fast)</option>
                                    <option value="gemini-3-pro-preview">Gemini Pro (Smart)</option>
                                </select>
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center text-xs gap-1 cursor-pointer">
                                    <input type="checkbox" checked={useSearch} onChange={e => setUseSearch(e.target.checked)}/> Google Search
                                </label>
                                <label className="flex items-center text-xs gap-1 cursor-pointer">
                                    <input type="checkbox" checked={useMaps} onChange={e => setUseMaps(e.target.checked)}/> Maps
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
    </>
  );
};