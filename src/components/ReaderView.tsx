/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  BookOpen, 
  Languages, 
  HelpCircle, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  ArrowRightLeft,
  MessageSquare
} from 'lucide-react';
import { EpubDocument, EpubChapter, ArabicParagraph } from '../types';

interface ReaderViewProps {
  document: EpubDocument;
  onSelectParagraphForChat: (text: string, chapterTitle: string, index: number) => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
}

export default function ReaderView({ 
  document, 
  onSelectParagraphForChat,
  isChatOpen,
  onToggleChat
}: ReaderViewProps) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Keep localized translations cache mapping chapter ID -> updated paragraphs
  const [translatedChapters, setTranslatedChapters] = useState<Record<string, ArabicParagraph[]>>({});

  const activeChapter: EpubChapter = document.chapters[activeChapterIndex];

  // Reset states when changing chapters
  useEffect(() => {
    setShowTranslation(false);
    setError(null);
  }, [activeChapterIndex]);

  const handleTranslateToggle = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    const chapterId = activeChapter.id;

    // Utilize local cache if already translated
    if (translatedChapters[chapterId]) {
      setShowTranslation(true);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch('/api/translate-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterTitle: activeChapter.title,
          paragraphs: activeChapter.paragraphs
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menerjemahkan teks Arab.');
      }

      setTranslatedChapters(prev => ({
        ...prev,
        [chapterId]: data.paragraphs
      }));

      setShowTranslation(true);

    } catch (err: any) {
      setError(err.message || 'Koneksi dengan server terganggu.');
    } finally {
      setIsTranslating(false);
    }
  };

  const currentParagraphs = translatedChapters[activeChapter.id] || activeChapter.paragraphs;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto space-y-6">
      
      {/* Header and Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            Dokumen Aktif: {document.name}
          </span>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {activeChapter.title}
          </h2>
        </div>

        {/* Core Control Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Chapter Selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-slate-500">Bab:</span>
            <select
              value={activeChapterIndex}
              onChange={(e) => setActiveChapterIndex(Number(e.target.value))}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200/85 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              {document.chapters.map((ch, idx) => (
                <option key={ch.id} value={idx}>
                  {idx + 1}. {ch.title.substring(0, 30)}{ch.title.length > 30 ? '...' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Translate Button */}
          <button
            onClick={handleTranslateToggle}
            disabled={isTranslating}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              showTranslation
                ? 'bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200'
                : 'bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50'
            }`}
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Menerjemahkan Bab...
              </>
            ) : (
              <>
                <Languages className="w-3.5 h-3.5" />
                {showTranslation ? 'Sembunyikan Terjemah' : 'Terjemah Bilingual'}
              </>
            )}
          </button>

          {/* Toggle Chat Sidebar Button */}
          <button
            onClick={onToggleChat}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border cursor-pointer active:scale-95 ${
              isChatOpen
                ? 'bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={isChatOpen ? "Sembunyikan Asisten Obrolan" : "Tampilkan Asisten Obrolan"}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{isChatOpen ? 'Tutup Asisten' : 'Asisten AI'}</span>
          </button>

        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      )}

      {/* Main Bilingual Paragraph Area */}
      <div className="space-y-6">
        {currentParagraphs.map((par) => (
          <div
            key={par.index}
            className="group relative bg-white border border-slate-150 rounded-2xl p-5 hover:border-amber-400 hover:shadow-md transition-all duration-250 flex flex-col space-y-4"
          >
            {/* Arabic Paragraph Container */}
            <div className="flex justify-between items-start gap-4">
              
              {/* Question Trigger Actions */}
              <div className="flex flex-col gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-sans font-bold text-slate-500 border border-slate-200">
                  {par.index}
                </span>
                
                <button
                  onClick={() => onSelectParagraphForChat(par.text, activeChapter.title, par.index)}
                  title="Konsultasikan alinea Arab ini pada Chatbot RAG"
                  className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 text-amber-700 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Arabic Text Display */}
              <div className="arabic-rtl text-slate-900 text-2xl tracking-wide max-w-full leading-loose pr-2 select-text" dir="rtl">
                {par.text}
              </div>

            </div>

            {/* Translation Output Container (Dynamic Side-by-Side or Stacked layout) */}
            {showTranslation && (
              <div className="border-t border-dashed border-slate-100 pt-4 flex flex-col md:flex-row gap-4 items-start bg-slate-50/50 p-4 rounded-xl">
                <div className="flex items-center gap-1.5 text-amber-700 text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5">
                  <Languages className="w-3.5 h-3.5" />
                  ID Translation
                </div>
                <div className="text-sm text-slate-600 leading-relaxed font-sans text-left font-medium select-text">
                  {par.translation || (
                    <span className="text-slate-400 italic">Terjemahan sedang berjalan / memuat...</span>
                  )}
                </div>
              </div>
            )}

            {/* Micro Hover Hint */}
            <div className="absolute bottom-2.5 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <span>Klik ikon tanya</span>
              <HelpCircle className="w-3 h-3 text-amber-400" />
              <span>untuk meneliti paragraf ini</span>
            </div>

          </div>
        ))}
      </div>

      {/* Guide text if translation is invisible */}
      {!showTranslation && (
        <div className="text-center py-6">
          <p className="text-xs text-slate-400 font-medium font-sans">
            Gunakan tombol <strong className="text-slate-500 font-semibold">Terjemah Bilingual</strong> untuk menyinkronkan arti dari bab {activeChapter.title} secara 1:1.
          </p>
        </div>
      )}

    </div>
  );
}
