/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility functions for evaluating NLP outputs.
 * Calculates standard BLEU, ROUGE-L, and Cosine Similarity scores.
 */

/**
 * Tokenizes a text into words (lowercased, removing punctuation)
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Generates N-grams from a list of tokens
 */
function getNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(" "));
  }
  return ngrams;
}

/**
 * Calculates BLEU score (smooth unigram BLEU-1 and bigram BLEU-2)
 * Formula: BLEU = BP * exp(w1 * ln(p1) + w2 * ln(p2) ...)
 * BP (Brevity Penalty) = c > r ? 1 : exp(1 - r/c)
 */
export function calculateBLEU(candidate: string, reference: string): number {
  const candTokens = tokenize(candidate);
  const refTokens = tokenize(reference);

  if (candTokens.length === 0 || refTokens.length === 0) {
    return 0;
  }

  // BLEU-1: Unigram Precision
  const candUnigrams = getNgrams(candTokens, 1);
  const refUnigrams = getNgrams(refTokens, 1);
  const refUnigramCounts: Record<string, number> = {};
  for (const ug of refUnigrams) {
    refUnigramCounts[ug] = (refUnigramCounts[ug] || 0) + 1;
  }

  let matchedUnigrams = 0;
  const tempRefCounts1 = { ...refUnigramCounts };
  for (const ug of candUnigrams) {
    if (tempRefCounts1[ug] && tempRefCounts1[ug] > 0) {
      matchedUnigrams++;
      tempRefCounts1[ug]--;
    }
  }
  const p1 = matchedUnigrams / candUnigrams.length;

  // BLEU-2: Bigram Precision (with smoothing fallback)
  const candBigrams = getNgrams(candTokens, 2);
  const refBigrams = getNgrams(refTokens, 2);
  let p2 = 0;

  if (candBigrams.length > 0 && refBigrams.length > 0) {
    const refBigramCounts: Record<string, number> = {};
    for (const bg of refBigrams) {
      refBigramCounts[bg] = (refBigramCounts[bg] || 0) + 1;
    }

    let matchedBigrams = 0;
    const tempRefCounts2 = { ...refBigramCounts };
    for (const bg of candBigrams) {
      if (tempRefCounts2[bg] && tempRefCounts2[bg] > 0) {
        matchedBigrams++;
        tempRefCounts2[bg]--;
      }
    }
    p2 = matchedBigrams / candBigrams.length;
  } else {
    // Smoothing fallback for short sentences
    p2 = p1 * 0.5;
  }

  // Soft geometric mean (BLEU-1 and BLEU-2)
  // Standard weight: w1 = 0.5, w2 = 0.5
  // If p1 or p2 are 0, use tiny values for smoothing
  const smoothP1 = p1 || 0.0001;
  const smoothP2 = p2 || 0.0001;
  const geometricMean = Math.exp(0.5 * Math.log(smoothP1) + 0.5 * Math.log(smoothP2));

  // Brevity Penalty (BP)
  const c = candTokens.length;
  const r = refTokens.length;
  const bp = c > r ? 1.0 : Math.exp(1.0 - r / c);

  const rawBLEU = bp * geometricMean;

  // Clamp between 0.0 and 1.0
  return Math.max(0, Math.min(1.0, rawBLEU));
}

/**
 * Calculates ROUGE-L (LCS-based F-measure)
 * LCS is calculated via dynamic programming.
 * Recall (Rlcs) = LCS(C,R) / m
 * Precision (Plcs) = LCS(C,R) / n
 * F1 = (2 * R * P) / (R + P)
 */
export function calculateROUGEL(candidate: string, reference: string): number {
  const candTokens = tokenize(candidate);
  const refTokens = tokenize(reference);

  const n = candTokens.length;
  const m = refTokens.length;

  if (n === 0 || m === 0) {
    return 0;
  }

  // Dynamic Programming LCS
  const dp: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (candTokens[i - 1] === refTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcsLength = dp[n][m];

  const recall = lcsLength / m;
  const precision = lcsLength / n;

  if (recall + precision === 0) {
    return 0;
  }

  const f1 = (2 * recall * precision) / (recall + precision);
  return f1;
}

/**
 * Computes the cosine similarity between two dimensional vectors.
 * Metric = (A . B) / (||A|| * ||B||)
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitudeA = Math.sqrt(normA);
  const magnitudeB = Math.sqrt(normB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}
