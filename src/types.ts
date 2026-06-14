/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ArabicParagraph {
  index: number;
  text: string;
  translation?: string;
}

export interface EpubChapter {
  id: string;
  title: string;
  paragraphs: ArabicParagraph[];
}

export interface EpubDocument {
  name: string;
  chapters: EpubChapter[];
}

export interface Chunk {
  id: string;
  text: string;
  chapterTitle: string;
  paragraphIndex: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: Chunk[];
}

export interface EvaluationItem {
  id: number;
  category: string;
  original_arabic: string;
  referensi_translasi: string;
  referensi_ringkasan: string;
  pertanyaan: string;
  referensi_jawaban: string;
}

export interface EvaluationResult {
  id: number;
  category: string;
  original_arabic: string;
  system_translation: string;
  ref_translation: string;
  bleu_score: number;

  system_summary: string;
  ref_summary: string;
  rouge_score: number;

  pertanyaan: string;
  system_answer: string;
  ref_answer: string;
  semantic_score: number;
}

export interface EvaluationSummary {
  average_bleu: number;
  average_rouge: number;
  average_semantic: number;
  total_cases: number;
  results: EvaluationResult[];
}
