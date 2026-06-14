/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Trash2, 
  Sparkles, 
  BookOpen, 
  Loader2, 
  HelpCircle,
  X,
  Share2
} from 'lucide-react';
import { ChatMessage, Chunk } from '../types';

interface SidebarChatProps {
  selectedParagraph: { text: string; chapterTitle: string; index: number } | null;
  onClearSelectedParagraph: () => void;
  isOpenOnMobile: boolean;
  onCloseMobile: () => void;
}

export default function SidebarChat({ 
  selectedParagraph, 
  onClearSelectedParagraph,
  isOpenOnMobile,
  onCloseMobile
}: SidebarChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with academic-themed system greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Ahlan wa Sahlan! Saya adalah Asisten RAG Akademik Anda. Unggah dokumen ePUB sastra Arab Anda dan mulailah berdiskusi secara interaktif.\n\nAnda dapat menanyakan tafsir makna, tata bahasa, filsafat teks, atau mengklik ikon bantuan (❓) pada paragraf tertentu untuk mengajukan pertanyaan terfokus dalam Bahasa Indonesia.',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    }
  }, []);

  // Sync scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle selected paragraph injection
  useEffect(() => {
    if (selectedParagraph) {
      setInputValue(`Berdasarkan paragraf ${selectedParagraph.index} di bab "${selectedParagraph.chapterTitle}", jelaskan makna filosofis dan konteks sastrawi dari kalimat berikut: "${selectedParagraph.text}"`);
    }
  }, [selectedParagraph]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    setInputValue('');
    onClearSelectedParagraph(); // Consume paragraph reference

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Map previous messages to context history
      const historyPayload = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          history: historyPayload
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server gagal menanggapi.');
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString(),
        sources: data.sources
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Gagal menghasilkan respon: ${err.message || 'Koneksi terputus.'}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    if (window.confirm('Hapus semua history percakapan RAG?')) {
      setMessages([
        {
          id: `reset-${Date.now()}`,
          role: 'assistant',
          content: 'History percakapan telah dibersihkan. Silakan ajukan pertanyaan baru berdasarkan buku yang diunggah.',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      onClearSelectedParagraph();
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 h-[100dvh] max-h-[100dvh] md:h-full md:max-h-full bg-slate-900 border-l border-slate-850 flex flex-col transition-all duration-300 transform ${
      isOpenOnMobile 
        ? 'translate-x-0 md:translate-x-0 md:static' 
        : 'translate-x-full md:hidden'
    }`}>
      
      {/* Sidebar Header */}
      <div className="bg-slate-950 px-4 py-4 border-b border-slate-850 flex items-center justify-between text-white shadow-sm select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 shadow-md shadow-amber-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">AI Assistant (RAG)</h3>
            <p className="text-[10px] text-amber-500 font-medium font-mono">Gemini 3.5 Active</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button
              onClick={handleResetChat}
              title="Reset Percakapan"
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-450 transition active:scale-95 cursor-pointer border border-transparent hover:border-slate-800"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* SANGAT JELAS: Tombol Tutup/Kembali yang mencolok */}
          <button
            onClick={onCloseMobile}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs transition duration-150 active:scale-95 shrink-0 shadow-sm border border-amber-600/20 cursor-pointer"
            title="Keluar / Tutup Chat"
          >
            <X className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>Tutup Chat</span>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-slate-950/20 text-slate-200 min-h-0 overscroll-contain scrollbar-thin"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] space-y-1 ${
              msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            {/* Sender and Time Indicator */}
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              {msg.role === 'user' ? (
                <>
                  <span>Pengguna</span>
                  <User className="w-3 h-3 text-emerald-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-amber-400" />
                  <span>Kecerdasan Buatan (AI)</span>
                </>
              )}
              <span className="font-mono text-[9px] text-slate-600 pl-1">({msg.timestamp})</span>
            </div>

            {/* Bubble content */}
            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-sans shadow-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-amber-500 text-slate-950 font-semibold rounded-tr-none'
                : 'bg-slate-800 text-slate-200 border border-slate-750 rounded-tl-none font-medium'
            }`}>
              {msg.content}
            </div>

            {/* Cited Sources (RAG specific!) */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="space-y-1.5 w-full mt-1">
                <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Konstruksi Rujukan Konteks (top-k=3):
                </span>
                <div className="flex flex-col gap-1 w-full">
                  {msg.sources.map((src, sIdx) => (
                    <div 
                      key={src.id || sIdx}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-400 hover:text-slate-300 transition-colors"
                      title={src.text}
                    >
                      <div className="flex justify-between font-semibold text-slate-300 mb-0.5">
                        <span>🏷️ Bab: {src.chapterTitle}</span>
                        <span className="text-amber-500 font-mono">P-{src.paragraphIndex}</span>
                      </div>
                      <p className="line-clamp-2 italic arabic-rtl text-right text-xs pr-1 border-r border-slate-700 mt-1 pb-1 text-slate-200" dir="rtl">
                        {src.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start gap-1 max-w-[85%] mr-auto animate-pulse">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>Pipeline RAG sedang menganalisis database & merumuskan jawapan...</span>
            </div>
            <div className="p-3 bg-slate-800/50 text-slate-400 border border-slate-750 rounded-2xl rounded-tl-none text-xs italic">
              Mengukur kedekatan semantik kueri dengan index pembobotan lokal...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Paragraph Focus Banner */}
      {selectedParagraph && (
        <div className="bg-amber-500/5 border-t border-b border-amber-500/10 px-4 py-2.5 flex items-start gap-2 animate-fade-in select-none">
          <HelpCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Fokus Analisis Paragraf #{selectedParagraph.index}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{selectedParagraph.chapterTitle}</p>
          </div>
          <button 
            onClick={onClearSelectedParagraph}
            className="text-slate-450 hover:text-slate-200 p-0.5 rounded hover:bg-slate-850"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Message input area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-850 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isLoading ? "Menunggu jawaban..." : "Tanya sesuatu dalam Bahasa Indonesia..."}
          disabled={isLoading}
          className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-400 text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-400/30 font-medium disabled:opacity-50 placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 rounded-xl flex items-center justify-center font-bold tracking-tight disabled:opacity-40 transition-colors shadow-md shadow-amber-500/5 cursor-pointer active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
