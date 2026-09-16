'use client';

import { useState, useRef, useEffect } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { 
  sendCoachMessage, 
  CoachMessageResponse,
  SuggestedAction 
} from '@/lib/api';
import { 
  MessageSquareCode, 
  Send, 
  Sparkles, 
  BrainCircuit, 
  ArrowRight, 
  Share2, 
  Bot,
  User,
  CheckCircle2,
  FileCode,
  Layers,
  Database,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  intent?: string;
  confidence?: number;
  context_used?: Record<string, unknown>;
  evidence_references?: Array<{
    title: string;
    platform: string;
    repository?: string;
    file_path?: string;
    source_url?: string;
  }>;
  suggested_actions?: SuggestedAction[];
  detected_mistake_patterns?: Array<Record<string, unknown>>;
}

export default function CoachPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Hello! I am your Knowledge Mesh AI Coding Coach, grounded in your live PostgreSQL skill assessments & multi-platform telemetry (GitHub, LeetCode, HackerRank, Code Lab). Ask me about your skill gaps, recursion evidence, or recommended learning paths.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intent: 'GENERAL',
      confidence: 0.95,
      context_used: { grounded_platforms: ['GitHub', 'LeetCode', 'HackerRank'], evidence_pipeline: 'PostgreSQL Active' },
      suggested_actions: [
        { label: 'Why am I weak at recursion?', action_type: 'prompt', target_path: 'Why am I weak at recursion?' },
        { label: 'What should I practice next?', action_type: 'prompt', target_path: 'What should I practice next?' },
        { label: 'Inspect Knowledge Mesh', action_type: 'mesh', target_path: '/knowledge-mesh' },
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [isTyping, setIsTyping] = useState(false);
  const [openContextMap, setOpenContextMap] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleContextPanel = (id: string) => {
    setOpenContextMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsTyping(true);

    try {
      const res = await sendCoachMessage(textToSend, conversationId);
      if (res) {
        if (!conversationId) setConversationId(res.conversation_id);

        const aiMsg: ChatMessage = {
          id: res.message_id || `ai-${Date.now()}`,
          sender: 'ai',
          text: res.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intent: res.intent || 'GENERAL',
          confidence: res.confidence || 0.95,
          context_used: res.context_used,
          evidence_references: res.evidence_references,
          suggested_actions: res.suggested_actions,
          detected_mistake_patterns: res.detected_mistake_patterns,
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'ai',
            text: 'I am temporarily unable to reach the Knowledge Mesh telemetry service. Please ensure the backend is running.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error('Error contacting coach API:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionClick = (action: SuggestedAction) => {
    if (action.action_type === 'prompt') {
      handleSend(action.target_path);
    } else {
      router.push(action.target_path);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 flex flex-col w-full">
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
              <MessageSquareCode className="h-6 w-6 text-purple-400" />
              Grounded AI Coding Mentor
            </h1>
            <p className="text-xs text-slate-400">Grounded strictly in your live PostgreSQL evidence pipeline & multi-platform telemetry.</p>
          </div>

          {/* Context Trust Indicators */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              <CheckCircle2 className="h-3 w-3" /> Grounded Intelligence
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
              <Database className="h-3 w-3" /> Multi-Platform Telemetry
            </span>
          </div>
        </div>

        {/* Chat Interface Box */}
        <div className="glow-card flex-1 rounded-2xl flex flex-col justify-between overflow-hidden border border-purple-900/30 min-h-[540px]">
          
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-800 bg-[#0B0F1C] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-950 text-cyan-400 border border-purple-500/30">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <span className="font-mono text-sm font-bold text-white block flex items-center gap-1.5">
                  KNOWLEDGE MESH AI COACH
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Intent-Bounded Reasoning • Grounded References Only</span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <Link href="/knowledge-mesh" className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-purple-400" /> Open Mesh
              </Link>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-mesh-grid">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="h-8 w-8 rounded-xl bg-purple-950 text-cyan-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`max-w-xl space-y-3 ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  
                  {/* AI Intent & Confidence Header */}
                  {m.sender === 'ai' && (
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 font-bold uppercase">
                        INTENT: {m.intent || 'GENERAL'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800 flex items-center gap-1 font-bold">
                        <ShieldCheck className="h-3 w-3 text-emerald-400" />
                        {Math.round((m.confidence || 0.95) * 100)}% Confidence
                      </span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed font-mono whitespace-pre-wrap ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-purple-600/20'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                  }`}>
                    <p>{m.text}</p>
                    <span className="text-[10px] text-slate-400 mt-2 block text-right">{m.timestamp}</span>
                  </div>

                  {/* Detected Mistake Patterns Alert */}
                  {m.detected_mistake_patterns && m.detected_mistake_patterns.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> Anti-Pattern Warning: {String(m.detected_mistake_patterns[0].title)}
                      </span>
                      <p className="text-[11px] text-amber-200/80">{String(m.detected_mistake_patterns[0].description)}</p>
                    </div>
                  )}

                  {/* Collapsible WHY THIS ANSWER? Trust Panel */}
                  {m.sender === 'ai' && m.context_used && (
                    <div className="border border-slate-800 rounded-xl bg-slate-950/60 font-mono text-[11px]">
                      <button
                        onClick={() => toggleContextPanel(m.id)}
                        className="w-full px-3 py-2 flex items-center justify-between text-slate-400 hover:text-white transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                          <BrainCircuit className="h-3.5 w-3.5" /> WHY THIS ANSWER? (Context Used)
                        </span>
                        {openContextMap[m.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      {openContextMap[m.id] && (
                        <div className="px-3 pb-3 pt-2 border-t border-slate-800/80 space-y-2 text-slate-300">
                          {Array.isArray((m.context_used as { grounded_platforms?: string[] })?.grounded_platforms) && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-semibold">Grounded Platforms:</span>
                              {(m.context_used as { grounded_platforms: string[] }).grounded_platforms.map(p => (
                                <span key={p} className="px-2 py-0.5 rounded bg-slate-900 border border-purple-500/30 text-[10px] text-purple-300 font-bold">
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>Evidence Pipeline: PostgreSQL Grounded Telemetry</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grounded Evidence References */}
                  {m.evidence_references && m.evidence_references.length > 0 && (
                    <div className="space-y-1 pt-1 font-mono">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">GROUNDED EVIDENCE CITATIONS:</span>
                      <div className="flex flex-wrap gap-2">
                        {m.evidence_references.map((ref, idx) => (
                          <a
                            key={idx}
                            href={ref.source_url || '/code-intelligence'}
                            target={ref.source_url ? '_blank' : '_self'}
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-cyan-400 hover:border-cyan-500/40"
                          >
                            <FileCode className="h-3 w-3" />
                            {ref.repository ? `${ref.repository} (${ref.file_path})` : ref.title}
                            {ref.source_url && <ExternalLink className="h-2.5 w-2.5" />}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contextual Action Buttons */}
                  {m.suggested_actions && m.suggested_actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 font-mono">
                      {m.suggested_actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(act)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer font-mono transition-all"
                        >
                          {act.label}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {m.sender === 'user' && (
                  <div className="h-8 w-8 rounded-xl bg-slate-800 text-purple-400 border border-slate-700 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 animate-pulse pl-11">
                <Bot className="h-3.5 w-3.5" /> AI Coach is generating intent-grounded response from PostgreSQL...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }} 
            className="p-3 sm:p-4 border-t border-slate-800 bg-[#0B0F1C] flex gap-2 sm:gap-3 items-end"
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask AI Coach about your skill gaps, recursion evidence, or learning path... (Shift+Enter for new line)"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/60 font-mono resize-none max-h-32 min-h-[44px]"
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="px-4 sm:px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-xs font-semibold text-white shadow-md hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-50 font-mono shrink-0 h-[44px]"
            >
              <span className="hidden sm:inline">Send</span> <Send className="h-3.5 w-3.5" />
            </button>
          </form>

        </div>

      </main>
    </div>
  );
}
