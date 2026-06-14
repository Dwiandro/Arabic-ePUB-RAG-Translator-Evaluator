/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadArea from './components/UploadArea';
import ReaderView from './components/ReaderView';
import SidebarChat from './components/SidebarChat';
import AdminPanel from './components/AdminPanel';
import { EpubDocument } from './types';
import { HelpCircle, ChevronRight, MessageSquare, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'reader' | 'admin'>('reader');
  const [serverStatus, setServerStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [document, setDocument] = useState<EpubDocument | null>(null);
  const [selectedParagraph, setSelectedParagraph] = useState<{ text: string; chapterTitle: string; index: number } | null>(null);
  const [isChatOpenMobile, setIsChatOpenMobile] = useState(false);
  const [vectorCount, setVectorCount] = useState(0);

  // Check the backend server health on mount & check RAG index capacity
  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setServerStatus('healthy');
        setVectorCount(data.vectorStoreSize || 0);
      } else {
        setServerStatus('error');
      }
    } catch {
      setServerStatus('error');
    }
  };

  useEffect(() => {
    checkHealth();
    // Periodically sync vector store index size
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUploadSuccess = (parsedData: any) => {
    setDocument({
      name: parsedData.name,
      chapters: parsedData.chapters
    });
    setVectorCount(parsedData.totalIndexedChunks || 0);
  };

  const handleSelectParagraphForChat = (text: string, chapterTitle: string, index: number) => {
    setSelectedParagraph({ text, chapterTitle, index });
    setIsChatOpenMobile(true); // Auto expand chat drawer
  };

  return (
    <div className="h-screen max-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 transition-colors duration-200 overflow-hidden">
      
      {/* Header element */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        serverStatus={serverStatus}
        vectorCount={vectorCount}
      />

      {/* Main Core View Area */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        
        {activeTab === 'reader' ? (
          
          !document ? (
            // Upload area if no book is loaded
            <div className="flex-1 flex items-center justify-center">
              <UploadArea onUploadSuccess={handleUploadSuccess} />
            </div>
          ) : (
            // Flex row containing ebook reader and chat sidebar
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative h-full min-h-0">
              
              {/* eBook Reading frame */}
              <div className="flex-grow md:flex-1 flex flex-col min-h-0">
                <ReaderView 
                  document={document} 
                  onSelectParagraphForChat={handleSelectParagraphForChat}
                  isChatOpen={isChatOpenMobile}
                  onToggleChat={() => setIsChatOpenMobile(prev => !prev)}
                />
              </div>

              {/* Backdrop overlay for mobile drawer */}
              {isChatOpenMobile && (
                <div 
                  onClick={() => setIsChatOpenMobile(false)}
                  className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[55] md:hidden transition-opacity"
                />
              )}

              {/* RAG chat drawer sidebar */}
              <SidebarChat 
                selectedParagraph={selectedParagraph}
                onClearSelectedParagraph={() => setSelectedParagraph(null)}
                isOpenOnMobile={isChatOpenMobile}
                onCloseMobile={() => setIsChatOpenMobile(false)}
              />

              {/* Floating Chat Trigger Button (Hides when drawer is open, accessible on all screen widths) */}
              {!isChatOpenMobile && (
                <button
                  onClick={() => setIsChatOpenMobile(true)}
                  className="fixed bottom-6 right-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold p-4 rounded-full shadow-lg flex items-center justify-center z-36 transition hover:scale-105 active:scale-95 cursor-pointer border border-amber-600/20"
                  title="Buka Asisten AI"
                >
                  <MessageSquare className="w-6 h-6" />
                </button>
              )}

            </div>
          )

        ) : (
          // Admin Evaluation view
          <AdminPanel />
        )}

      </main>

    </div>
  );
}
