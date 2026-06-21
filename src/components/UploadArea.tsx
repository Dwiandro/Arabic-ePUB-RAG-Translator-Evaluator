/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface UploadAreaProps {
  onUploadSuccess: (doc: any) => void;
}

export default function UploadArea({ onUploadSuccess }: UploadAreaProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    state: string;
    fileName: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let intervalId: any = null;
    if (isLoading) {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch('/api/upload-progress');
          if (response.ok) {
            const data = await response.json();
            setProgress(data);
          }
        } catch (err) {
          console.error("Error fetching upload progress:", err);
        }
      }, 700);
    } else {
      setProgress(null);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoading]);

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.epub')) {
      setError('Format file tidak sesuai. Sistem hanya mengevaluasi file berekstensi .epub');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      
      // Convert file to base64 string
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        try {
          const response = await fetch('/api/upload-epub', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              file: base64String
            })
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Terjadi kesalahan saat memparsing ePUB.');
          }

          onUploadSuccess(data);
        } catch (postErr: any) {
          setError(postErr.message || 'Gagal mengirim file ke server.');
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setError('Gagal membaca file lokal.');
        setIsLoading(false);
      };

      reader.readAsDataURL(file);

    } catch (err: any) {
      setError(err.message || 'Gagal memulai parsing file.');
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-2xl mx-auto my-12 px-4">
      
      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 relative group flex flex-col items-center justify-center ${
          isDragActive 
            ? 'border-amber-500 bg-amber-500/5 shadow-inner'
            : 'border-slate-350 hover:border-amber-400 bg-white hover:bg-slate-50/50 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub"
          onChange={handleFileInput}
          className="hidden"
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="space-y-5 py-4 w-full max-w-md mx-auto">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
            <div className="space-y-3">
              {(!progress || progress.state === 'parsing') ? (
                <>
                  <p className="text-sm font-bold text-slate-850 animate-pulse text-center">Menambang & Memparsing Berkas ePUB...</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto text-center">
                    Mengekstrak file XHTML, menyaring paragraf bertashkil (harakat), serta menguraikan struktur dokumen.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-800 text-center">
                    Menghasilkan Embedding: <span className="text-amber-600 font-mono text-base">{progress.current}</span> / <span className="text-slate-500 font-mono text-sm">{progress.total}</span> chunk
                  </p>
                  
                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200/60 overflow-hidden relative shadow-xs">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                      style={{ width: `${progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px] text-slate-500 px-1 font-medium">
                    <span>Progres: {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</span>
                    <span className="animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block" />
                      Memproses vektor embeddings...
                    </span>
                  </div>
                  
                  <p className="text-[11.5px] text-slate-400 text-center">
                    Menggunakan model <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono font-semibold text-slate-600">gemini-embedding-2-preview</code>
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-amber-100/80 rounded-full flex items-center justify-center text-amber-600 mx-auto group-hover:scale-110 transition-transform duration-250">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-md sm:text-lg font-bold text-slate-800">
                Seret & Lepas file ePUB Arab Anda di sini
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                atau klik untuk memilih berkas dari komputer Anda (Maksimal 50MB)
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 text-slate-600 text-[11px] font-semibold px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Mendukung RTL & Harakat Otomatis
            </span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Terjadi Kendala Teknis</h4>
            <p className="text-xs text-rose-700/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Instructional info for final thesis presentation */}
      <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-slate-500" />
          Alur Kerja Pipeline parsing (ePUB-to-RAG)
        </h4>
        <ul className="text-xs text-slate-600 space-y-2.5 list-none pl-1">
          <li className="flex gap-2">
            <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0 mt-0.5">1</span>
            <div>
              <strong className="text-slate-800 font-semibold">Struktural Text Mining:</strong> Sistem mengekstrak arsip XHTML ePUB menggunakan <code className="bg-slate-200 px-1 py-0.2 rounded font-mono text-slate-700 font-bold">adm-zip</code> dan memonitor tanda paragraf <code className="bg-slate-200 px-1 py-0.2 rounded font-mono text-slate-700 font-bold">&lt;p&gt;</code> via <code className="bg-slate-200 px-1 py-0.2 rounded font-mono text-slate-700 font-bold">cheerio</code>.
            </div>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0 mt-0.5">2</span>
            <div>
              <strong className="text-slate-800 font-semibold">Linguistic Filtering:</strong> Menapis paragraf kosong dan melestarikan huruf Arab berserta harakat diakritik lengkap secara aman.
            </div>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0 mt-0.5">3</span>
            <div>
              <strong className="text-slate-800 font-semibold">Cloud-Powered Gemini Embedding:</strong> Paragraf utuh dikonversi menjadi representasi vektor 768-dimensi secara real-time menggunakan model <code className="bg-slate-200 px-1 py-0.2 rounded font-mono text-slate-700 font-bold">gemini-embedding-2-preview</code> dari Google Cloud, memampukan pencarian kedekatan semantik (cosine similarity) berpresisi tinggi.
            </div>
          </li>
        </ul>
      </div>

    </div>
  );
}
