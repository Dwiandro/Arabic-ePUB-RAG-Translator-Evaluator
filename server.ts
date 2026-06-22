/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import AdmZip from "adm-zip";
import * as cheerio from "cheerio";

// Memuat variabel lingkungan (env)
import "dotenv/config";

// Mengimpor tipe data dan utilitas matematika
import { 
  calculateBLEU, 
  calculateROUGEL, 
  calculateCosineSimilarity 
} from "./src/utils/eval.js";

// Konfigurasi Aplikasi Express
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Mengatur body parser dengan batas besar untuk mendukung upload file ePUB Base64 yang andal
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Penyimpanan Vektor In-Memory Global untuk RAG
interface VectorItem {
  id: string;
  chunk: {
    id: string;
    text: string;
    chapterTitle: string;
    paragraphIndex: number;
    sourceFile: string;
  };
  embedding: number[];
}

let vectorStore: VectorItem[] = [];

let uploadProgress = {
  current: 0,
  total: 0,
  state: "idle",
  fileName: ""
};

// Integrasi cloud berbasis Google GenAI gemini-embedding-2-preview
/**
 * Menghitung vektor embedding (768 dimensi) untuk satu teks menggunakan gemini-embedding-2-preview.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  const response = await callGeminiWithRetry(() => ai.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: text,
  }));
  
  if (response.embedding) {
    return response.embedding.values;
  } else if (response.embeddings && response.embeddings[0]) {
    return response.embeddings[0].values;
  }
  throw new Error("Invalid response from Gemini Embedding API");
}

/**
 * Menghasilkan beberapa vektor embedding (768 dimensi) untuk teks yang diberikan.
 * Untuk menghormati batasan API dan menjamin presisi tinggi, pembantu ini memproses
 * teks dalam batch sekuensial dari permintaan individu secara aman untuk menghindari batasan laju (rate limit).
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const vector = await generateEmbedding(text);
    results.push(vector);
    // Jeda sebentar untuk menjaga kuota model standar
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return results;
}

/**
 * Pembantu inisialisasi malas (lazy initialization) untuk Klien Gemini 3.5
 */
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY is not defined. Please add it via the Settings > Secrets panel on Google AI Studio."
    );
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    }
  });
}

/**
 * Utilitas andal dengan percobaan ulang backoff eksponensial untuk menangani batasan laju api (rate limit) Gemini (HTTP 429) dengan anggun.
 */
async function callGeminiWithRetry(
  aiCallFn: () => Promise<any>,
  maxRetries = 5,
  initialDelayMs = 3000
): Promise<any> {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await aiCallFn();
    } catch (error: any) {
      const errorMsg = String(error.message || error);
      const isRateLimit = 
        errorMsg.includes("429") || 
        errorMsg.includes("RESOURCE_EXHAUSTED") || 
        errorMsg.includes("quota") ||
        (error.status && error.status === 429);
      
      if (isRateLimit && attempt < maxRetries) {
        console.warn(`[Gemini API Rate Limit 429] Attempt ${attempt}/${maxRetries} failed. Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Skala eksponensial
      } else {
        throw error;
      }
    }
  }
}

/// -------------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------------

/**
 * Rute pemeriksaan kesehatan (health check)
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", vectorStoreSize: vectorStore.length });
});

/**
 * Endpoint untuk mengambil progres unggah, analisis, dan penyematan vektor (embedding) yang sedang berlangsung.
 */
app.get("/api/upload-progress", (req, res) => {
  res.json(uploadProgress);
});

/**
 * 1. Unggah & Analisis File ePUB Arab via Payload JSON Base64.
 * Membagi teks berdasarkan paragraf utuh, membersihkan HTML yang bising, dan mengisi toko vektor RAG.
 */
// 1. (EKSTRAKSI_EPUB) - Logic Parser ePUB, Ekstraksi Paragraf Arab, & Embedding (gemini-embedding-2-preview)
app.post("/api/upload-epub", async (req, res) => {
  try {
    const { name, file } = req.body;
    if (!file) {
      return res.status(400).json({ error: "Missing 'file' base64 parameters" });
    }

    uploadProgress = {
      current: 0,
      total: 0,
      state: "parsing",
      fileName: name || "Dokumen Arab"
    };

    console.log(`Parsing ePUB upload: "${name}"...`);
    const buffer = Buffer.from(file, "base64");
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // Menyimpan daftar bab mentah
    const chapters: any[] = [];
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/;

    // Memfilter dan mengumpulkan file XHTML/HTML
    const xhtmlEntries = zipEntries.filter(entry => 
      entry.entryName.endsWith(".xhtml") || 
      entry.entryName.endsWith(".html") || 
      entry.entryName.endsWith(".htm")
    );

    // Mengurutkan entri berdasarkan alfabet jika tidak ada tulang belakang (spine) dokumen formal yang diproses
    xhtmlEntries.sort((a, b) => a.entryName.localeCompare(b.entryName));

    let globalParagraphIdx = 0;
    const documentChunks: any[] = [];

    for (const entry of xhtmlEntries) {
      const htmlContent = entry.getData().toString("utf8");
      const $ = cheerio.load(htmlContent);

      // Ekstrak Judul Bab: cari h1, h2, h3, tag title, atau cadangan menggunakan nama file
      let chapterTitle = $("h1").first().text().trim() || 
                         $("h2").first().text().trim() || 
                         $("title").first().text().trim() || 
                         path.basename(entry.entryName, path.extname(entry.entryName));

      // Menstandardisasi judul sederhana
      if (!chapterTitle || chapterTitle.length > 80) {
        chapterTitle = path.basename(entry.entryName, path.extname(entry.entryName));
      }

      const rawParagraphs: any[] = [];
      
      // Menguraikan secara ketat menargetkan tag <p>
      $("p").each((pIndex, el) => {
        const pText = $(el).text().trim();
        
        // Aturan Penguraian: Pertahankan semua karakter Arab dan harakat, panjang > 5, hanya konten Arab.
        if (pText.length > 5 && arabicRegex.test(pText)) {
          globalParagraphIdx++;
          rawParagraphs.push({
            index: rawParagraphs.length + 1,
            text: pText
          });

          // Mengantrekan chunk RAG
          documentChunks.push({
            id: `chunk-${entry.entryName.replace(/\//g, "-")}-p-${rawParagraphs.length}`,
            text: pText,
            chapterTitle: chapterTitle,
            paragraphIndex: rawParagraphs.length,
            sourceFile: entry.entryName
          });
        }
      });

      if (rawParagraphs.length > 0) {
        chapters.push({
          id: entry.entryName,
          title: chapterTitle,
          paragraphs: rawParagraphs
        });
      }
    }

    if (chapters.length === 0) {
      return res.status(422).json({
        error: "No readable Arabic paragraphs with length > 5 found in the uploaded archive. Ensure it is a valid Arabic ePUB text containing uncompressed <p> content representing diacritic text."
      });
    }

    // Menyematkan (embedding) dan mengindeks chunk bab secara asinkron ke dalam memori toko vektor.
    // Untuk memastikan keandalan ekstrim, kami memproses chunk dengan perangkap kesalahan individu yang granular
    // sehingga kegagalan API pada satu chunk tidak menyebabkan semua chunk lainnya dibatalkan.
    console.log(`Generating embedding vectors for ${documentChunks.length} Arabic chunks with granular error handling...`);
    const tempStore: VectorItem[] = [];
    const CONCURRENCY_LIMIT = 3; // Sepenuhnya mematuhi batas laju standar dan menjaga responsivitas sistem
    
    uploadProgress.total = documentChunks.length;
    uploadProgress.state = "embedding";
    uploadProgress.current = 0;

    for (let i = 0; i < documentChunks.length; i += CONCURRENCY_LIMIT) {
      const chunkBatch = documentChunks.slice(i, i + CONCURRENCY_LIMIT);
      console.log(`Processing chunks ${i + 1} - ${Math.min(i + CONCURRENCY_LIMIT, documentChunks.length)} out of ${documentChunks.length}...`);
      
      const promises = chunkBatch.map(async (item) => {
        try {
          const embeddingValues = await generateEmbedding(item.text);
          return {
            id: item.id,
            chunk: item,
            embedding: embeddingValues
          };
        } catch (embErr) {
          console.error(`Skipping embedding generation for chunk ID ${item.id} due to API/formatting issue:`, embErr);
          return null;
        }
      });

      const results = await Promise.all(promises);

      // Akumulasikan semua embedding yang berhasil diselesaikan dengan aman
      for (const res of results) {
        if (res) {
          tempStore.push(res);
        }
      }

      uploadProgress.current = Math.min(i + CONCURRENCY_LIMIT, documentChunks.length);

      // Jeda jeda perlindungan batasan laju yang lembut di antara mikro-batch untuk mempertahankan pengiriman API yang stabil
      if (i + CONCURRENCY_LIMIT < documentChunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Menimpa toko vektor untuk sesi ini
    vectorStore = tempStore;
    console.log(`Successfully parsed ePUB document and indexed ${vectorStore.length} chunks!`);
    
    uploadProgress.state = "done";

    res.json({
      name: name || "Dokumen Arab",
      chapters: chapters,
      totalIndexedChunks: vectorStore.length
    });

  } catch (error) {
    console.error("ePUB Parsing failure:", error);
    uploadProgress.state = "error";
    res.status(500).json({ error: `Gagal memproses file ePUB: ${error instanceof Error ? error.message : String(error)}` });
  }
});
// code *END 1. (EKSTRAKSI_EPUB)*

/**
 * 2. Terjemahkan Bab secara dinamis paragraf-demi-paragraf menggunakan Gemini 3.5.
 * Menggunakan panggilan batch tunggal dengan output skema JSON untuk menjamin struktur paragraf yang selaras.
 */
app.post("/api/translate-chapter", async (req, res) => {
  try {
    const { chapterTitle, paragraphs } = req.body;
    if (!paragraphs || !Array.isArray(paragraphs) || paragraphs.length === 0) {
      return res.status(400).json({ error: "Missing required 'paragraphs' array." });
    }

    const ai = getGeminiClient();
    const arabicTexts = paragraphs.map(p => p.text);

    console.log(`Batch translating chapter "${chapterTitle}" (${paragraphs.length} paragraphs)...`);

    // Siapkan skema JSON untuk respons
    const prompt = `Terjemahkan daftar paragraf sastra Arab berikut ke dalam Bahasa Indonesia secara ekspresif, kontekstual, dan mengalir natural. Jangan menghilangkan makna harakat atau istilah khusus. Kembalikan HASIL TERJEMAHAN dalam format array JSON yang berisi string terjemahan secara berurutan persis sama dengan jumlah input (${arabicTexts.length} item).

Input Paragraf Arab:
${JSON.stringify(arabicTexts, null, 2)}`;

    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          },
          description: "Daftar terjemahan bahasa Indonesia yang tersinkronisasi 1:1."
        }
      }
    }));

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Empty translation output response from Gemini.");
    }

    const translatedArray = JSON.parse(outputText.trim());
    
    // Pasang kembali hasil terjemahan ke paragraf yang sesuai
    const updatedParagraphs = paragraphs.map((p, idx) => ({
      ...p,
      translation: translatedArray[idx] || "Terjemahan gagal digenerate oleh AI."
    }));

    res.json({
      chapterTitle,
      paragraphs: updatedParagraphs
    });

  } catch (error) {
    console.error("Batch translation failure:", error);
    res.status(500).json({ error: `Gagal menerjemahkan bab: ${error instanceof Error ? error.message : String(error)}` });
  }
});

/**
 * 3. Saluran Chatbot Tanya Jawab RAG (RAG Q&A Chatbot Pipeline)
 * Menghitung vektor kueri, mencocokkan 3 elemen teratas, dan mengambil respons berbasis konteks.
 */
// 2. (RAG_CHATBOT) - Pipeline Pencarian Cosine Similarity & Generasi Respon Kontekstual Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const { query, history = [] } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing user query text." });
    }

    if (vectorStore.length === 0) {
      return res.status(400).json({ 
        error: "Silakan unggah dokumen ePUB terlebih dahulu sebelum berkonsultasi dengan RAG Chatbot." 
      });
    }

    console.log(`Retrieving RAG context for question: "${query}"...`);

    // 1. Hasilkan vektor kueri
    const queryEmbedding = await generateEmbedding(query);

    // 2. Pencocokan kesamaan kosinus (cosine similarity) dengan elemen toko vektor
    const scoredStore = vectorStore.map(item => ({
      ...item,
      score: calculateCosineSimilarity(queryEmbedding, item.embedding)
    }));

    // Urutkan menurun dan ambil top_k = 3
    scoredStore.sort((a, b) => b.score - a.score);
    const topK = scoredStore.slice(0, 3);

    // Rumuskan Blok Konteks
    const contextBlock = topK.map((item, idx) => 
      `Sumber ${idx + 1}: [Bab: ${item.chunk.chapterTitle}, Paragraf ke-${item.chunk.paragraphIndex}]
Teks Arab: ${item.chunk.text}`
    ).join("\n\n");

    console.log(`Top similar chunk scores:`, topK.map(t => t.score));

    // 3. Instruksi Sistem
    const systemPrompt = `You are an expert assistant for analyzing Arabic literature. You must answer the user's question strictly based on the provided retrieved context. Do not hallucinate external information. If the context does not contain the answer, explicitly state that the information is not available in the text. You must respond in the EXACT same language that the user asks the question in (e.g., if asked in English, answer in English; if in Portuguese, answer in Portuguese; if in Indonesian, answer in Indonesian; if in Arabic, answer in Arabic, etc.).

Berikut adalah referensi konteks sastra Arab yang relevan untuk menjawab pertanyaan:
${contextBlock}`;

    // Petakan riwayat percakapan ke format Google GenAI (peran 'user' atau 'model')
    const contents: any[] = [];
    history.forEach((msg: any) => {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      });
    });

    // Tambahkan kueri saat ini
    contents.push({
      role: "user",
      parts: [{ text: query }]
    });

    const ai = getGeminiClient();
    const chatResponse = await callGeminiWithRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        maxOutputTokens: 1024,
      }
    }));

    const reply = chatResponse.text || "Mohon maaf, sistem gagal merumuskan jawaban.";

    res.json({
      answer: reply,
      sources: topK.map(item => item.chunk)
    });

  } catch (error) {
    console.error("RAG pipeline error:", error);
    res.status(500).json({ error: `Gagal memproses RAG Q&A: ${error instanceof Error ? error.message : String(error)}` });
  }
});
// code *END 2. (RAG_CHATBOT)*

/**
 * 4. Endpoint Saluran Evaluasi Otomatis (Dasbor Admin)
 * Menghitung skor BLEU, ROUGE-L, dan Kesamaan Semantik terhadap data acuan asli (ground-truth) di eval_dataset.json.
 * Menggunakan pemrosesan sekuensial dengan interval jeda untuk sepenuhnya memintas batasan laju panggilan 15 RPM.
 * Memanfaatkan Server-Sent Events (SSE) untuk mengalirkan pembaruan progres langsung ke dasbor frontend.
 */
// 3. (EVALUASI_TERJEMAHAN) - Logic Hitung BLEU, ROUGE-L, & Cosine Semantic Similarity via SSE
app.get("/api/evaluate", async (req, res) => {
  // Atur header untuk Server-Sent Events (SSE)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    const datasetPath = path.join(process.cwd(), "eval_dataset.json");
    if (!fs.existsSync(datasetPath)) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "File eval_dataset.json tidak ditemukan dilingkungan server." })}\n\n`);
      return res.end();
    }

    const rawData = fs.readFileSync(datasetPath, "utf-8");
    const testCases = JSON.parse(rawData);

    console.log(`Starting NLP SSE Evaluation Pipeline for ${testCases.length} academic cases...`);
    const ai = getGeminiClient();

    const results: any[] = [];
    let sumBleu = 0;
    let sumRouge = 0;
    let sumSemantic = 0;

    for (let i = 0; i < testCases.length; i++) {
      const test = testCases[i];
      console.log(`Evaluating case ${i + 1}/${testCases.length} (ID: ${test.id})...`);

      // Susun prompt isolasi untuk satu kasus uji guna mencapai akurasi eksekusi prompt maksimal
      const evaluationPrompt = `You are an academic NLP evaluation engine for Arabic literature.
We are analyzing this specific Arabic literary text:
Original Arabic: "${test.original_arabic}"
Question: "${test.pertanyaan}"

Please perform three tasks:
1. "system_translation": Translate the 'original_arabic' text to Indonesian of high literary and poetic quality. 
2. "system_summary": Provide a concise objective summary (1-2 sentences) of the 'original_arabic' text in Indonesian.
3. "system_answer": Answer the provided 'pertanyaan' strictly based on the 'original_arabic' text provided. Do not use external facts.

You MUST reply with a JSON object following this exact schema:
{
  "system_translation": "string",
  "system_summary": "string",
  "system_answer": "string"
}`;

      // Hubungi Gemini API untuk kasus uji spesifik tunggal ini
      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: evaluationPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              system_translation: { type: Type.STRING, description: "Translation of the Arabic text to Indonesian" },
              system_summary: { type: Type.STRING, description: "Summary of the Arabic text to Indonesian" },
              system_answer: { type: Type.STRING, description: "Answer to the question based on the Arabic text" }
            },
            required: ["system_translation", "system_summary", "system_answer"]
          }
        }
      }));

      const outputText = response.text;
      if (!outputText) {
        throw new Error(`Empty response returned from Gemini for case ID #${test.id}`);
      }

      const generated = JSON.parse(outputText.trim());
      const systemTranslation = (generated.system_translation || "").trim();
      const systemSummary = (generated.system_summary || "").trim();
      const systemAnswer = (generated.system_answer || "").trim();

      // Hitung skor BLEU
      const bleuScore = calculateBLEU(systemTranslation, test.referensi_translasi);

      // Hitung skor ROUGE-L
      const rougeScore = calculateROUGEL(systemSummary, test.referensi_ringkasan);

      // Hitung kesamaan Semantik menggunakan vektor cloud generator embedding
      let semanticScore = 0;
      try {
        const sysAnswerVec = await generateEmbedding(systemAnswer);
        const refAnswerVec = await generateEmbedding(test.referensi_jawaban);
        semanticScore = calculateCosineSimilarity(sysAnswerVec, refAnswerVec);
      } catch (embErr) {
        console.error(`Cloud embedding failure during evaluation of case ID #${test.id}:`, embErr);
        semanticScore = calculateROUGEL(systemAnswer, test.referensi_jawaban);
      }

      // Tambahkan ke rata-rata
      sumBleu += bleuScore;
      sumRouge += rougeScore;
      sumSemantic += semanticScore;

      const testResult = {
        id: test.id,
        category: test.category,
        original_arabic: test.original_arabic,
        system_translation: systemTranslation,
        ref_translation: test.referensi_translasi,
        bleu_score: Number(bleuScore.toFixed(4)),

        system_summary: systemSummary,
        ref_summary: test.referensi_ringkasan,
        rouge_score: Number(rougeScore.toFixed(4)),

        pertanyaan: test.pertanyaan,
        system_answer: systemAnswer,
        ref_answer: test.referensi_jawaban,
        semantic_score: Number(semanticScore.toFixed(4))
      };

      results.push(testResult);

      // Alirkan progres dan hasil dari kasus uji yang selesai ini kembali ke klien
      res.write(`data: ${JSON.stringify({ 
        type: "progress", 
        current: i + 1, 
        total: testCases.length, 
        message: `Berhasil memproses Kasus ${i + 1} dari ${testCases.length} (${test.category})...`,
        result: testResult
      })}\n\n`);

      // Jeda jeda perlindungan batasan laju yang lembut di antara item
      if (i < testCases.length - 1) {
        console.log(`Rate limit guard sleep: waiting 4000ms for next item...`);
        await sleep(4000);
      }
    }

    const summary = {
      average_bleu: Number((sumBleu / testCases.length).toFixed(4)),
      average_rouge: Number((sumRouge / testCases.length).toFixed(4)),
      average_semantic: Number((sumSemantic / testCases.length).toFixed(4)),
      total_cases: testCases.length,
      results: results
    };

    console.log("Automated sequential evaluation success! Summary:", {
      avg_bleu: summary.average_bleu,
      avg_rouge: summary.average_rouge,
      avg_semantic: summary.average_semantic
    });

    res.write(`data: ${JSON.stringify({ type: "complete", summary })}\n\n`);
    res.end();

  } catch (error) {
    console.error("Evaluation pipeline crashed:", error);
    res.write(`data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : String(error) })}\n\n`);
    res.end();
  }
});
// code *END 3. (EVALUASI_TERJEMAHAN)*

// -------------------------------------------------------------------
// PENYIAPAN FRONTEND BUNDLE DAN DETEKSI DRIVER DEVELOPMENT
// -------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Pasang middleware server pengembangan Vite dalam mode middlewareMode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite Development server initialized.");
  } else {
    // Sajikan file statis dalam produksi dari direktori 'dist'
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static build from /dist production foldering.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`-----------------------------------------------------`);
    console.log(`Arabic RAG System fully backed on port ${PORT}`);
    console.log(`Local Time: ${new Date().toISOString()}`);
    console.log(`-----------------------------------------------------`);
  });
}

startServer();
