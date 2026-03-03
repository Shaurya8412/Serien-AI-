/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle,
  Eye,
  Send,
  Upload,
  Loader2,
  User,
  Heart,
  RefreshCw,
  Download,
  ShieldCheck,
  Trash2,
  Settings
} from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { chatWithAI, analyzeImage } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'chat' | 'vision';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [loading, setLoading] = useState(false);
  const [bgColor, setBgColor] = useState('bg-zinc-50');
  const [showSettings, setShowSettings] = useState(false);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Vision State
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionMimeType, setVisionMimeType] = useState<string>('');
  const [visionPrompt, setVisionPrompt] = useState('What emotions or moods do you perceive in this image?');
  const [visionResult, setVisionResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Load messages from DB on mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/messages');
        const data = await res.json();
        if (data.length > 0) {
          setMessages(data.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        } else {
          setMessages([
            {
              id: '1',
              role: 'model',
              content: "Welcome to Serien. I'm your personal listener. Happy or sad, I'm with you. Share your joy and moments of life because I'm always here for you. ;) How are you feeling today?",
              timestamp: new Date()
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch history", err);
      }
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveMessage = async (msg: Message) => {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
    } catch (err) {
      console.error("Failed to save message", err);
    }
  };

  const clearHistory = async () => {
    if (confirm("Are you sure you want to clear our shared memories?")) {
      await fetch('/api/messages', { method: 'DELETE' });
      setMessages([{
        id: '1',
        role: 'model',
        content: "Memories cleared. Let's start a new chapter together. How are you?",
        timestamp: new Date()
      }]);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    saveMessage(userMessage);
    setChatInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      const response = await chatWithAI(chatInput, history);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response || "I'm here for you. Could you tell me more about that?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      saveMessage(aiMessage);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "I'm having a little trouble connecting right now, but I'm still here. Please try again in a moment.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVisionMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVisionImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVisionSubmit = async () => {
    if (!visionImage || loading) return;
    setLoading(true);
    setVisionResult(null);

    try {
      const base64Data = visionImage.split(',')[1];
      const response = await analyzeImage(visionPrompt, base64Data, visionMimeType);
      setVisionResult(response || "I see... how does this image make you feel?");
    } catch (error) {
      console.error(error);
      setVisionResult("I'm unable to analyze this image right now. Let's talk about it instead.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className={cn("min-h-screen flex flex-col transition-colors duration-500", bgColor)}>
      <div className="max-w-4xl mx-auto px-4 py-8 w-full flex-1 flex flex-col">
        {/* Header */}
        <header className="mb-8 text-center relative">
          <div className="absolute right-0 top-0 flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-12 z-50 glass-panel p-4 rounded-2xl shadow-xl flex flex-col gap-3 min-w-[200px]"
              >
                <p className="text-[10px] font-bold uppercase text-zinc-400 text-left">Background Color</p>
                <div className="flex gap-2 flex-wrap">
                  {['bg-zinc-50', 'bg-rose-50', 'bg-sky-50', 'bg-emerald-50', 'bg-amber-50', 'bg-indigo-50'].map(color => (
                    <button
                      key={color}
                      onClick={() => setBgColor(color)}
                      className={cn("w-6 h-6 rounded-full border border-black/5", color, bgColor === color && "ring-2 ring-indigo-500 ring-offset-2")}
                    />
                  ))}
                </div>
                <div className="h-px bg-zinc-100 my-1" />
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-2 text-red-500 text-xs font-medium hover:bg-red-50 p-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Memories
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4"
          >
            <ShieldCheck className="w-3 h-3" />
            Safe & Private Space
          </motion.div>
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-2">Serien AI</h1>
          <p className="text-zinc-500 max-w-md mx-auto italic">"Your Personal Listener, happy or sad I'm with you."</p>
        </header>

        {/* Tabs */}
        <nav className="flex items-center justify-center gap-2 mb-8 p-1 bg-zinc-200/50 rounded-2xl self-center">
          {[
            { id: 'chat', icon: MessageCircle, label: 'Therapy' },
            { id: 'vision', icon: Eye, label: 'Visual Analysis' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm",
                activeTab === tab.id
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <main className="flex-1 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 flex flex-col glass-panel rounded-3xl overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-4 max-w-[85%]",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        msg.role === 'user' ? "bg-zinc-900 text-white" : "bg-indigo-100 text-indigo-700"
                      )}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                      </div>
                      <div className={cn(
                        "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                        msg.role === 'user'
                          ? "bg-white text-zinc-800 border border-zinc-200 shadow-sm rounded-tr-none"
                          : "bg-indigo-50/50 text-zinc-800 border border-indigo-100 rounded-tl-none"
                      )}>
                        <div className="markdown-body">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="p-4 border-t border-zinc-200 bg-white">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Share what's on your mind..."
                      className="w-full pl-4 pr-12 py-3 bg-zinc-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={loading || !chatInput.trim()}
                      className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'vision' && (
              <motion.div
                key="vision"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 flex flex-col gap-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                  {/* Upload Section */}
                  <div className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                    {visionImage ? (
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 border border-zinc-200">
                        <img src={visionImage} alt="Uploaded" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          onClick={() => setVisionImage(null)}
                          className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-square rounded-2xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                      >
                        <div className="p-4 rounded-full bg-zinc-100 group-hover:bg-indigo-100 transition-colors">
                          <Upload className="w-8 h-8 text-zinc-400 group-hover:text-indigo-600" />
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold text-indigo-600">Upload a meaningful image</span>
                          <p className="text-zinc-500">Something that represents your mood</p>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    )}

                    <div className="w-full mt-4 space-y-3">
                      <input
                        type="text"
                        value={visionPrompt}
                        onChange={(e) => setVisionPrompt(e.target.value)}
                        placeholder="What should I look for?"
                        className="w-full px-4 py-2 bg-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                      <button
                        onClick={handleVisionSubmit}
                        disabled={!visionImage || loading}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        Analyze Mood
                      </button>
                    </div>
                  </div>

                  {/* Result Section */}
                  <div className="glass-panel rounded-3xl p-6 overflow-y-auto">
                    <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-indigo-600" />
                      Therapeutic Insight
                    </h3>
                    {visionResult ? (
                      <div className="markdown-body text-sm italic leading-relaxed">
                        <Markdown>{visionResult}</Markdown>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm italic">
                        {loading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            <p>Reflecting...</p>
                          </div>
                        ) : (
                          "Upload an image to receive a visual therapy insight."
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}


          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="mt-8 pt-8 border-t border-zinc-200 text-center text-zinc-400 text-[10px] uppercase tracking-widest">
          <p>© 2026 Serien AI • Your Personal Listener ;)</p>
        </footer>
      </div>
    </div>
  );
}
