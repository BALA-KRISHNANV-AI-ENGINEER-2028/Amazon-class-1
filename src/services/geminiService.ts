import { GoogleGenAI, Type } from '@google/genai';
import type { TimestampQuizPayload } from '../types/quiz';

/**
 * Timeout budget for Gemini API requests (in milliseconds)
 */
export const DEFAULT_GEMINI_TIMEOUT_MS = 12000;

/**
 * Fallback generator for offline/sandbox environments or when GEMINI_API_KEY is unset
 */
export function getCuratedFallbackQuiz(
  videoTitle: string,
  timestamp: number,
  contextText: string
): TimestampQuizPayload {
  const mins = Math.floor(timestamp / 60);
  const secs = timestamp % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return {
    conceptTitle: `${videoTitle} · Phase Analysis at ${timeFormatted}`,
    summary:
      contextText?.slice(0, 180) ||
      `At ${timeFormatted}, the lecture examines physical boundary constraints and energy preservation principles governing system evolution.`,
    quiz: {
      question: `What fundamental constraint governs the system dynamic highlighted at ${timeFormatted}?`,
      options: [
        'Conservation of energy and phase-space volume',
        'Arbitrary temperature fluctuations without feedback',
        'Disregard of higher-order boundary conditions',
      ],
      correctIndex: 0,
    },
    source: 'curated-fallback',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Server-side Gemini SDK client singleton
 */
let serverAiClient: GoogleGenAI | null = null;

export function getServerGenAIClient(): GoogleGenAI | null {
  const key =
    typeof process !== 'undefined' && process.env
      ? process.env.GEMINI_API_KEY
      : undefined;

  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }

  if (!serverAiClient) {
    serverAiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return serverAiClient;
}

/**
 * Server-side direct SDK generator with structured JSON Schema enforcement and timeout handling
 */
export async function generateTimestampQuizWithSDK(
  videoTitle: string,
  timestamp: number,
  contextText: string,
  timeoutMs: number = DEFAULT_GEMINI_TIMEOUT_MS
): Promise<TimestampQuizPayload> {
  const ai = getServerGenAIClient();
  if (!ai) {
    return getCuratedFallbackQuiz(videoTitle, timestamp, contextText);
  }

  const mins = Math.floor(timestamp / 60);
  const secs = timestamp % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const prompt = [
    `You are the AI Study Assistant for "ClassStream AI" running on Amazon Fire TV.`,
    `Video Title: "${videoTitle}"`,
    `Timestamp: ${timeFormatted} (${timestamp} seconds)`,
    `Lecture Context / Transcript snippet: "${contextText}"`,
    ``,
    `Analyze this specific moment in the lecture. Generate a concise concept title, a 2-sentence summary suitable for a 10-foot TV display, and a 3-option multiple-choice comprehension check question with exactly one correct option.`,
  ].join('\n');

  // Enforce API Timeout via Promise.race
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new Error(`Gemini API request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  const apiCallPromise = (async (): Promise<TimestampQuizPayload> => {
    // Note: using 'gemini-3.8-flash' as mandated by the gemini-api skill
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert university teaching assistant. Generate concise, high-contrast, intellectually rigorous study takeaways and a multiple choice quiz strictly conforming to the requested JSON schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            conceptTitle: {
              type: Type.STRING,
              description: 'A concise title for the concept being explained (3 to 6 words).',
            },
            summary: {
              type: Type.STRING,
              description: 'A 2-sentence summary of the concept at this timestamp.',
            },
            quiz: {
              type: Type.OBJECT,
              properties: {
                question: {
                  type: Type.STRING,
                  description: 'A clear conceptual question testing comprehension.',
                },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Exactly 3 plausible answer options.',
                },
                correctIndex: {
                  type: Type.INTEGER,
                  description: '0-based index (0, 1, or 2) of the correct option.',
                },
              },
              required: ['question', 'options', 'correctIndex'],
            },
          },
          required: ['conceptTitle', 'summary', 'quiz'],
        },
      },
    });

    const raw = response.text?.trim();
    if (!raw) {
      throw new Error('Gemini returned an empty response');
    }

    const parsed = JSON.parse(raw) as {
      conceptTitle: string;
      summary: string;
      quiz: { question: string; options: string[]; correctIndex: number };
    };

    return {
      conceptTitle: parsed.conceptTitle,
      summary: parsed.summary,
      quiz: {
        question: parsed.quiz.question,
        options: parsed.quiz.options,
        correctIndex: Math.max(0, Math.min(parsed.quiz.options.length - 1, parsed.quiz.correctIndex ?? 0)),
      },
      source: 'gemini',
      generatedAt: new Date().toISOString(),
    };
  })();

  try {
    return await Promise.race([apiCallPromise, timeoutPromise]);
  } catch (err) {
    console.warn(`[geminiService] Error or timeout during SDK quiz generation:`, err);
    return getCuratedFallbackQuiz(videoTitle, timestamp, contextText);
  }
}

/**
 * Primary deliverable function:
 * fetchTimestampQuiz(videoTitle: string, timestamp: number, contextText: string)
 *
 * Automatically detects execution environment:
 * - When called in Node/server: invokes direct GoogleGenAI SDK with timeout enforcement
 * - When called in the browser/client: proxies through server endpoint /api/ai/timestamp-quiz
 *   with an AbortController timeout to guarantee browser security (no client-side API keys)
 */
export async function fetchTimestampQuiz(
  videoTitle: string,
  timestamp: number,
  contextText: string,
  timeoutMs: number = DEFAULT_GEMINI_TIMEOUT_MS
): Promise<TimestampQuizPayload> {
  const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

  if (!isBrowser) {
    return generateTimestampQuizWithSDK(videoTitle, timestamp, contextText, timeoutMs);
  }

  // Client-side execution: proxy through server-side Express route with AbortController timeout
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch('/api/ai/timestamp-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoTitle,
        timestamp,
        contextText,
        timeoutMs,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server endpoint responded with status ${response.status}`);
    }

    const data = await response.json();
    if (data && data.conceptTitle && data.quiz) {
      return data as TimestampQuizPayload;
    }

    return getCuratedFallbackQuiz(videoTitle, timestamp, contextText);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.message.toLowerCase().includes('timeout'));

    if (isTimeout) {
      console.warn(`[geminiService] fetchTimestampQuiz aborted after ${timeoutMs}ms timeout`);
    } else {
      console.warn(`[geminiService] fetchTimestampQuiz network failure:`, err);
    }

    return getCuratedFallbackQuiz(videoTitle, timestamp, contextText);
  }
}

export default {
  fetchTimestampQuiz,
  generateTimestampQuizWithSDK,
  getCuratedFallbackQuiz,
  DEFAULT_GEMINI_TIMEOUT_MS,
};
