/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, BarChart2, ShieldAlert, Cpu } from 'lucide-react';

interface HeaderProps {
  activeTab: 'reader' | 'admin';
  setActiveTab: (tab: 'reader' | 'admin') => void;
  serverStatus: 'checking' | 'healthy' | 'error';
  vectorCount: number;
}

export default function Header({ activeTab, setActiveTab, serverStatus, vectorCount }: HeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-md sticky top-0 z-50 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Judul dan Branding Akademik */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-slate-900 font-bold shadow-md shadow-amber-500/10">
            <Cpu className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
              Sistem Analisis Sastra Arab
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Evaluator RAG & Penerjemah ePUB Bilingual • Proyek Tugas Akhir Akademik
            </p>
          </div>
        </div>

        {/* Indikator Status Kesehatan Server */}
        <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/50 px-3.5 py-1.5 rounded-full text-xs">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              serverStatus === 'healthy' ? 'bg-emerald-500 animate-pulse' :
              serverStatus === 'error' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
            }`} />
            <span className="font-semibold text-slate-300">
              {serverStatus === 'healthy' ? 'Server Aktif' :
               serverStatus === 'error' ? 'Koneksi Terputus' : 'Menghubungkan...'}
            </span>
          </div>
          {serverStatus === 'healthy' && (
            <span className="border-l border-slate-700 pl-2 text-slate-400">
              <span className="text-amber-400 font-mono font-medium">{vectorCount}</span> Index RAG
            </span>
          )}
        </div>

        {/* Tab Navigasi */}
        <nav className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('reader')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              activeTab === 'reader'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Membaca & Terjemah
          </button>
          
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Dashboard Evaluasi (Admin)
          </button>
        </nav>

      </div>
    </header>
  );
}
