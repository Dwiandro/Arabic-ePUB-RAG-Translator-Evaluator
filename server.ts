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

// Load environment variables
import "dotenv/config";

// Import types and math utilities
import { 
  calculateBLEU, 
  calculateROUGEL, 
  calculateCosineSimilarity 
} from "./src/utils/eval.js";

// Express App Configuration
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Set body parsers with generous limits to support robust Base64 ePUB uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Global In-Memory Vector Store for RAG
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

// Lazy-initialized transformers.js embedding model
let transformersInstance: any = null;

async function getEmbeddingPipeline() {
  if (!transformersInstance) {
    try {
      // Dynamically import transformers.js to maintain esbuild CJS/ESM flexibility
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = false; // Pull from HuggingFace Hub on-demand without local caching errors
      transformersInstance = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    } catch (err) {
      console.error("Failed to load local transformers.js pipeline:", err);
      throw new Error(`Embedding model failure: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return transformersInstance;
}

/**
 * Computes embedding vector (384-dim) for a given text.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data) as number[];
}

/**
 * Lazy initialization helper for Gemini 3.5 Client
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
 * Solid utility with exponential backoff retry to handle Gemini API rate limits (HTTP 429) gracefully.
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
        delay *= 2; // Exponential scale
      } else {
        throw error;
      }
    }
  }
}

// -------------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------------

/**
 * Health check route
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", vectorStoreSize: vectorStore.length });
});

/**
 * 1. Upload & Parse Arabic ePUB File via Base64 JSON Payload.
 * Splitting text based strictly on intact paragraphs, cleaning noisy html, and populating RAG vector store.
 */
app.post("/api/upload-epub", async (req, res) => {
  try {
    const { name, file } = req.body;
    if (!file) {
      return res.status(400).json({ error: "Missing 'file' base64 parameters" });
    }

    console.log(`Parsing ePUB upload: "${name}"...`);
    const buffer = Buffer.from(file, "base64");
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // Store raw chapters list
    const chapters: any[] = [];
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/;

    // Filter and collect XHTML/HTML files
    const xhtmlEntries = zipEntries.filter(entry => 
      entry.entryName.endsWith(".xhtml") || 
      entry.entryName.endsWith(".html") || 
      entry.entryName.endsWith(".htm")
    );

    // Sort entries alphabetically or by path length if no formal spine is processed
    xhtmlEntries.sort((a, b) => a.entryName.localeCompare(b.entryName));

    let globalParagraphIdx = 0;
    const documentChunks: any[] = [];

    for (const entry of xhtmlEntries) {
      const htmlContent = entry.getData().toString("utf8");
      const $ = cheerio.load(htmlContent);

      // Extract Chapter Title: search h1, h2, h3, title, or fallback to file name
      let chapterTitle = $("h1").first().text().trim() || 
                         $("h2").first().text().trim() || 
                         $("title").first().text().trim() || 
                         path.basename(entry.entryName, path.extname(entry.entryName));

      // Standardize simple titles
      if (!chapterTitle || chapterTitle.length > 80) {
        chapterTitle = path.basename(entry.entryName, path.extname(entry.entryName));
      }

      const rawParagraphs: any[] = [];
      
      // Parse strictly targeting <p> tags
      $("p").each((pIndex, el) => {
        const pText = $(el).text().trim();
        
        // Parsing Rules: Preserve all Arabic characters and diacritics, length > 5, Arabic content only.
        if (pText.length > 5 && arabicRegex.test(pText)) {
          globalParagraphIdx++;
          rawParagraphs.push({
            index: rawParagraphs.length + 1,
            text: pText
          });

          // Queue RAG chunks
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

    // Embed and index retrieved chunks asynchronously into memory vector store
    console.log(`Generating embedding vectors for ${documentChunks.length} Arabic chunks...`);
    const tempStore: VectorItem[] = [];

    // Process chunk embeds sequentially to avoid overloading local CPU thread bounds
    for (const item of documentChunks) {
      try {
        const itemEmbedding = await generateEmbedding(item.text);
        tempStore.push({
          id: item.id,
          chunk: item,
          embedding: itemEmbedding
        });
      } catch (embErr) {
        console.error(`Skipping embedding generation for chunk ID ${item.id}:`, embErr);
      }
    }

    // Overwrite the vector store for the session
    vectorStore = tempStore;
    console.log(`Successfully parsed ePUB document and indexed ${vectorStore.length} chunks!`);

    res.json({
      name: name || "Dokumen Arab",
      chapters: chapters,
      totalIndexedChunks: vectorStore.length
    });

  } catch (error) {
    console.error("ePUB Parsing failure:", error);
    res.status(500).json({ error: `Gagal memproses file ePUB: ${error instanceof Error ? error.message : String(error)}` });
  }
});

/**
 * 2. Translate Chapter dynamically paragraph-by-paragraph using Gemini 3.5.
 * Uses a single batch call with JSON schema output to guarantee aligned paragraph structures.
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

    // Prepare JSON schema schema for the response
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
    
    // Mount translation back to paragraphs
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
 * 3. RAG Q&A Chatbot Pipeline
 * Calculates query vector, matches top 3 elements, and fetches context response.
 */
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

    // 1. Generate query vector
    const queryEmbedding = await generateEmbedding(query);

    // 2. Cosine match with vector store elements
    const scoredStore = vectorStore.map(item => ({
      ...item,
      score: calculateCosineSimilarity(queryEmbedding, item.embedding)
    }));

    // Sort descending and query top_k = 3
    scoredStore.sort((a, b) => b.score - a.score);
    const topK = scoredStore.slice(0, 3);

    // Formulate Context Block
    const contextBlock = topK.map((item, idx) => 
      `Sumber ${idx + 1}: [Bab: ${item.chunk.chapterTitle}, Paragraf ke-${item.chunk.paragraphIndex}]
Teks Arab: ${item.chunk.text}`
    ).join("\n\n");

    console.log(`Top similar chunk scores:`, topK.map(t => t.score));

    // 3. System Instructions
    const systemPrompt = `You are an expert assistant for analyzing Arabic literature. You must answer the user's question strictly based on the provided retrieved context. Do not hallucinate external information. If the context does not contain the answer, explicitly state that the information is not available in the text. You must respond in the EXACT same language that the user asks the question in (e.g., if asked in English, answer in English; if in Portuguese, answer in Portuguese; if in Indonesian, answer in Indonesian; if in Arabic, answer in Arabic, etc.).

Berikut adalah referensi konteks sastra Arab yang relevan untuk menjawab pertanyaan:
${contextBlock}`;

    // Map history to Google GenAI format (role 'user' or 'model')
    const contents: any[] = [];
    history.forEach((msg: any) => {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      });
    });

    // Add current query
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

/**
 * 4. Automated Evaluation Pipeline endpoint (Admin Dashboard)
 * Computes BLEU, ROUGE-L, and local Cosine Similarity against ground-truth in eval_dataset.json.
 * Uses a single highly optimized bulk request to prevent rate limiting issues (HTTP 429).
 */
app.post("/api/evaluate", async (req, res) => {
  try {
    const datasetPath = path.join(process.cwd(), "eval_dataset.json");
    if (!fs.existsSync(datasetPath)) {
      return res.status(404).json({ error: "File eval_dataset.json tidak ditemukan dilingkungan server." });
    }

    const rawData = fs.readFileSync(datasetPath, "utf-8");
    const testCases = JSON.parse(rawData);

    console.log(`Starting NLP Evaluation Pipeline for ${testCases.length} academic cases in bulk...`);
    const ai = getGeminiClient();

    // Prepare bulk request to avoid hitting 429 rate limit
    const inputDataset = testCases.map((test: any) => ({
      id: test.id,
      original_arabic: test.original_arabic,
      pertanyaan: test.pertanyaan
    }));

    const evaluationPrompt = `You are an academic NLP evaluation engine for Arabic literature. 
Below is an array of independent Arabic literary texts and associated Q&A questions.
For each item in the array, you MUST perform three tasks:
1. "system_translation": Translate the 'original_arabic' text to Indonesian of high literary and poetic quality. 
2. "system_summary": Provide a concise objective summary (1-2 sentences) of the 'original_arabic' text in Indonesian.
3. "system_answer": Answer the provided 'pertanyaan' strictly based on the 'original_arabic' text provided. Do not use external facts.

You must respond as a JSON array of objects following the exact responseSchema matching the index "id".

Input Array:
${JSON.stringify(inputDataset, null, 2)}`;

    console.log("Sending single optimized bulk evaluation query to Gemini API...");
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: evaluationPrompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER, description: "ID matching the input item ID" },
              system_translation: { type: Type.STRING, description: "The Indonesian translation of the Arabic text" },
              system_summary: { type: Type.STRING, description: "The Indonesian summary of the Arabic text" },
              system_answer: { type: Type.STRING, description: "The Indonesian answer to the question based ONLY on the Arabic text" }
            },
            required: ["id", "system_translation", "system_summary", "system_answer"]
          }
        }
      }
    }));

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Empty bulk generation response from Gemini.");
    }

    const bulkResults = JSON.parse(outputText.trim());
    console.log(`Successfully received bulk response for ${bulkResults.length} cases.`);

    const results: any[] = [];
    let sumBleu = 0;
    let sumRouge = 0;
    let sumSemantic = 0;

    for (const test of testCases) {
      // Find the generated results for this specific test ID
      const generated = bulkResults.find((r: any) => r && r.id === test.id) || {};
      
      const systemTranslation = (generated.system_translation || "").trim();
      const systemSummary = (generated.system_summary || "").trim();
      const systemAnswer = (generated.system_answer || "").trim();

      // Compute BLEU metric
      const bleuScore = calculateBLEU(systemTranslation, test.referensi_translasi);

      // Compute ROUGE-L metric
      const rougeScore = calculateROUGEL(systemSummary, test.referensi_ringkasan);

      // Generate embeddings to compute Semantic Cosine Similarity Score using transformers.js
      let semanticScore = 0;
      try {
        const sysAnswerVec = await generateEmbedding(systemAnswer);
        const refAnswerVec = await generateEmbedding(test.referensi_jawaban);
        semanticScore = calculateCosineSimilarity(sysAnswerVec, refAnswerVec);
      } catch (embErr) {
        console.error(`Local embedding failure during evaluation of case ID #${test.id}:`, embErr);
        // Fallback token-based overlap score in case local embedding pipeline failures
        semanticScore = calculateROUGEL(systemAnswer, test.referensi_jawaban);
      }

      // Add to sums
      sumBleu += bleuScore;
      sumRouge += rougeScore;
      sumSemantic += semanticScore;

      results.push({
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
      });
    }

    const summary = {
      average_bleu: Number((sumBleu / testCases.length).toFixed(4)),
      average_rouge: Number((sumRouge / testCases.length).toFixed(4)),
      average_semantic: Number((sumSemantic / testCases.length).toFixed(4)),
      total_cases: testCases.length,
      results: results
    };

    console.log("Automated bulk evaluation success! Metrics summary:", {
      avg_bleu: summary.average_bleu,
      avg_rouge: summary.average_rouge,
      avg_semantic: summary.average_semantic
    });

    res.json(summary);

  } catch (error) {
    console.error("Evaluation pipeline crashed:", error);
    res.status(500).json({ error: `Gagal menjalankan program evaluasi: ${error instanceof Error ? error.message : String(error)}` });
  }
});

// -------------------------------------------------------------------
// FRONTEND BUNDLE AND DEVELOPMENT ROUTING SETUP
// -------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite development server middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite Development server initialized.");
  } else {
    // Serve static files in production from 'dist' directory
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
