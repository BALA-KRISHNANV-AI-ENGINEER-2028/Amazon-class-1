import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { generateTimestampQuizWithSDK } from './src/services/geminiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function createGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.post('/api/ai/xray-insights', async (req: Request, res: Response) => {
    const {
      courseTitle,
      instructor,
      chapterTitle,
      timestampFormatted,
      transcriptSnippet,
      fallbackInsights,
    } = req.body ?? {};

    const ai = createGenAIClient();
    if (!ai) {
      res.json({
        source: 'curated',
        ...fallbackInsights,
      });
      return;
    }

    try {
      const prompt = [
        `Generate concise 10-foot Smart TV X-Ray study insights for the university lecture "${courseTitle}" taught by ${instructor}.`,
        `Current Chapter (${timestampFormatted}): "${chapterTitle}".`,
        `Lecture Context: ${transcriptSnippet}`,
        `Keep bullet points crisp and high-contrast for 10-foot television viewing (under 18 words per bullet).`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an academic study companion built into a Smart TV educational streaming app. Produce structured, rigorous, concise lecture takeaways and one multiple-choice check question suitable for TV remote D-Pad selection.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Two-sentence executive summary of the current lecture segment.',
              },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Three crisp conceptual takeaways under 18 words each.',
              },
              coreEquation: {
                type: Type.STRING,
                description: 'One canonical formula, invariant, or principle from this topic.',
              },
              quizQuestion: {
                type: Type.STRING,
                description: 'A clear conceptual multiple-choice question testing comprehension.',
              },
              quizOptions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 concise answer choices.',
              },
              correctOptionIndex: {
                type: Type.INTEGER,
                description: '0-based index (0, 1, or 2) of the correct option.',
              },
              explanation: {
                type: Type.STRING,
                description: 'One-sentence explanation of why that answer is right.',
              },
            },
            required: [
              'summary',
              'keyTakeaways',
              'coreEquation',
              'quizQuestion',
              'quizOptions',
              'correctOptionIndex',
              'explanation',
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.json({ source: 'curated', ...fallbackInsights });
        return;
      }

      const parsed = JSON.parse(rawText.trim());
      res.json({
        source: 'live',
        ...parsed,
      });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unable to generate study insights';
      if (fallbackInsights) {
        res.json({
          source: 'curated',
          notice: errMessage,
          ...fallbackInsights,
        });
        return;
      }
      res.status(500).json({ error: errMessage });
    }
  });

  app.post('/api/ai/ask-tutor', async (req: Request, res: Response) => {
    const { courseTitle, chapterTitle, question } = req.body ?? {};
    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Please provide a question.' });
      return;
    }

    const ai = createGenAIClient();
    if (!ai) {
      res.json({
        answer: `In "${chapterTitle}" (${courseTitle}), focus on how the primary state variables govern system stability: isolating the dominant coupling term lets you predict behavior before higher-order perturbations take effect.`,
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Course: ${courseTitle}\nChapter: ${chapterTitle}\nStudent Question: ${question}`,
        config: {
          systemInstruction:
            'Answer the student question clearly in 2 to 3 crisp sentences optimized for reading from 10 feet away on a television screen. Avoid markdown bullets or code blocks.',
        },
      });

      res.json({
        answer:
          response.text?.trim() ||
          'Review the active chapter concept invariant and compare how boundary conditions modify system response.',
      });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Tutor request failed';
      res.status(500).json({ error: errMessage });
    }
  });

  app.post('/api/ai/timestamp-quiz', async (req: Request, res: Response) => {
    const { videoTitle, timestamp, contextText, timeoutMs } = req.body ?? {};
    try {
      const result = await generateTimestampQuizWithSDK(
        String(videoTitle || 'Lecture Masterclass'),
        Number(timestamp) || 0,
        String(contextText || ''),
        Number(timeoutMs) || 12000
      );
      res.json(result);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Quiz generation failed';
      res.status(500).json({ error: errMessage });
    }
  });

  // DELIVERABLE 1: Visual AI Scene Analyzer (Multi-modal Gemini 2.0 / 3.8 Flash)
  app.post('/api/ai/vision-scene-analysis', async (req: Request, res: Response) => {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      courseTitle,
      timestampSeconds = 0,
      chapterTitle,
      transcriptSnippet,
      fallbackData,
    } = req.body ?? {};

    const ai = createGenAIClient();
    if (!ai) {
      res.json({
        source: 'curated-vision',
        ...(fallbackData || {
          detectedCategory: 'diagram',
          title: 'Quantum Phase Representation',
          primaryElement: 'Bloch Sphere State Vector with Surface Superposition',
          detailedBreakdown: 'Visualizes pure single-qubit states as points on the unit sphere surface |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩.',
          keyAnnotations: [
            { label: 'North Pole', significance: 'Basis state |0⟩' },
            { label: 'Equator', significance: 'Equal superposition state |+⟩ with zero relative phase' },
          ],
          pedagogicalSignificance: 'Geometric intuition is critical for debugging unitary rotation gates before physical qubit microwave pulse synthesis.',
        }),
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    try {
      const cleanBase64 = String(imageBase64 || '').replace(/^data:image\/[a-z]+;base64,/, '');
      const promptText = [
        `You are a Computer Vision Lecture Analyzer on Amazon Fire TV examining a university lecture frame.`,
        `Course: "${courseTitle || 'Advanced STEM Lecture'}"`,
        `Current Timestamp: ${Math.floor(Number(timestampSeconds))}s (${chapterTitle || 'Lecture Scene'})`,
        `Context: "${transcriptSnippet || ''}"`,
        `Task: Inspect the visual scene (diagram, apparatus, equation, or slide). Identify the primary subject and generate a structured visual breakdown suitable for TV 10-foot viewing. Keep text crisp and authoritative.`,
      ].join('\n');

      const contentParts: Array<string | { inlineData: { mimeType: string; data: string } }> = [];
      if (cleanBase64 && cleanBase64.length > 50) {
        contentParts.push({
          inlineData: {
            mimeType: String(mimeType || 'image/jpeg'),
            data: cleanBase64,
          },
        });
      }
      const contentsPayload =
        cleanBase64 && cleanBase64.length > 50
          ? [
              {
                inlineData: {
                  mimeType: String(mimeType || 'image/jpeg'),
                  data: cleanBase64,
                },
              },
              promptText,
            ]
          : promptText;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini Vision timeout')), 8000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contentsPayload,
          config: {
            systemInstruction:
              'You are a multimodal AI visual inspector for educational television. Return strict JSON matching the schema.',
            responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedCategory: {
                type: Type.STRING,
                description: 'One of: diagram, physical_apparatus, historical_context, mathematical_proof, microscopic_structure',
              },
              title: {
                type: Type.STRING,
                description: 'Short 2-5 word title of the visual element on screen.',
              },
              primaryElement: {
                type: Type.STRING,
                description: 'Name of the core object, equation, or graph.',
              },
              detailedBreakdown: {
                type: Type.STRING,
                description: 'Two concise sentences explaining what is displayed visually and how to interpret it.',
              },
              keyAnnotations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    significance: { type: Type.STRING },
                  },
                  required: ['label', 'significance'],
                },
                description: '2 to 3 prominent visual callouts or labels.',
              },
              pedagogicalSignificance: {
                type: Type.STRING,
                description: 'Why this visual concept matters in real-world application.',
              },
            },
            required: [
              'detectedCategory',
              'title',
              'primaryElement',
              'detailedBreakdown',
              'keyAnnotations',
              'pedagogicalSignificance',
            ],
          },
        },
      }),
      timeoutPromise,
    ]);

      const raw = response.text;
      if (!raw) {
        res.json({ source: 'curated-vision', ...fallbackData });
        return;
      }
      const parsed = JSON.parse(raw.trim());
      res.json({
        source: 'gemini-vision',
        ...parsed,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Vision scene analysis failed, returning fallback:', error);
      res.json({
        source: 'curated-vision',
        ...fallbackData,
        generatedAt: new Date().toISOString(),
      });
    }
  });

  // DELIVERABLE 2: Multi-Modal Voice Query Handler
  app.post('/api/ai/voice-query', async (req: Request, res: Response) => {
    const {
      question,
      imageBase64,
      mimeType = 'image/jpeg',
      courseTitle,
      chapterTitle,
      timestampSeconds = 0,
    } = req.body ?? {};

    const cleanQuestion = String(question || '').trim();
    if (!cleanQuestion) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    const ai = createGenAIClient();
    if (!ai) {
      res.json({
        answer: `In this segment of "${courseTitle || 'the lecture'}", the visual diagram demonstrates state coherence over time. Notice the boundary limits where perturbation dampens toward zero equilibrium.`,
        spokenText: `In this segment, the visual diagram shows state coherence over time. Notice how the boundaries dampen toward equilibrium.`,
        suggestedFollowUps: [
          'Can you break down the mathematical formulation?',
          'How does this apply to real-world engineering?',
        ],
      });
      return;
    }

    try {
      const voicePrompt = [
        `Course: "${courseTitle || 'Educational Lecture'}"`,
        `Chapter: "${chapterTitle || 'Active Section'}" at ${Math.floor(Number(timestampSeconds))}s`,
        `Student Spoken Voice Query: "${cleanQuestion}"`,
        `Answer clearly in 2-3 spoken sentences. Reference visual diagrams or equations on screen if apparent.`,
      ].join('\n');

      const contentsPayload =
        cleanBase64 && cleanBase64.length > 50
          ? [
              {
                inlineData: {
                  mimeType: String(mimeType || 'image/jpeg'),
                  data: cleanBase64,
                },
              },
              voicePrompt,
            ]
          : voicePrompt;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Voice Query timeout')), 8000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contentsPayload,
          config: {
            systemInstruction:
              'You are the Fire TV Voice Assistant for ClassStream AI. Speak clearly, authoritatively, and conversationally to a university learner sitting 10 feet away. Provide an answer and two concise suggested follow-up questions.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                answer: {
                  type: Type.STRING,
                  description: '2 to 3 sentences suitable for on-screen TV display.',
                },
                spokenText: {
                  type: Type.STRING,
                  description: 'Natural text suitable for text-to-speech audio reading.',
                },
                suggestedFollowUps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Exactly 2 suggested follow-up questions under 10 words each.',
                },
              },
              required: ['answer', 'spokenText', 'suggestedFollowUps'],
            },
          },
        }),
        timeoutPromise,
      ]);

      const parsed = JSON.parse(response.text?.trim() || '{}');
      res.json(parsed);
    } catch (error) {
      console.warn('Voice query error, responding with fallback:', error);
      res.json({
        answer: `Regarding "${cleanQuestion}": the key takeaway at ${Math.floor(Number(timestampSeconds))}s is that physical boundary constraints strictly limit noise propagation across interconnected stages.`,
        spokenText: `The key takeaway here is that physical boundary constraints limit noise propagation across connected stages.`,
        suggestedFollowUps: [
          'What is the practical application?',
          'What should I review next?',
        ],
      });
    }
  });

  // DELIVERABLE 3: Generative Post-Video Adaptive Study Plan
  app.post('/api/ai/adaptive-study-plan', async (req: Request, res: Response) => {
    const {
      courseTitle,
      incorrectQuestions = [],
      totalQuizzes = 0,
      score = 0,
      courseSynopsis = '',
    } = req.body ?? {};

    const ai = createGenAIClient();
    if (!ai) {
      res.json({
        overallAssessment: `Strong foundational grasp across ${courseTitle}. Targeted review of boundary scaling conditions will solidify your mastery from 75% to 100%.`,
        masteryLevel: score >= 80 ? 'Advanced Mastery' : score >= 50 ? 'Proficient' : 'Needs Reinforcement',
        keyWeaknesses: [
          {
            concept: 'Boundary Phase Superposition',
            timestampRecommendation: 'Review segment at 00:45',
            remediationAdvice: 'Re-examine how the relative phase theta introduces decoherence along the equator of the state sphere.',
          },
        ],
        practiceProblems: [
          {
            challenge: 'Calculate the phase rotation induced by a π/4 pulse on the ground state |0⟩.',
            hint: 'Use the Hadamard transformation matrix followed by phase gate S.',
          },
        ],
        nextMilestone: 'Ready for Live Laboratory Simulation module.',
      });
      return;
    }

    try {
      const prompt = [
        `Course: "${courseTitle}"`,
        `Course Synopsis: "${courseSynopsis}"`,
        `Student Exam Results: ${score}% (${totalQuizzes} total checkpoint questions)`,
        `Questions Missed: ${JSON.stringify(incorrectQuestions)}`,
        `Task: Formulate a tailored Adaptive Study Plan addressing the exact conceptual misunderstandings. Provide targeted timestamp recommendations and one hands-on challenge.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an AI Dean of Studies on Amazon Fire TV. Synthesize a sharp, encouraging, highly structured study plan for the learner.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallAssessment: { type: Type.STRING },
              masteryLevel: { type: Type.STRING },
              keyWeaknesses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    concept: { type: Type.STRING },
                    timestampRecommendation: { type: Type.STRING },
                    remediationAdvice: { type: Type.STRING },
                  },
                  required: ['concept', 'timestampRecommendation', 'remediationAdvice'],
                },
              },
              practiceProblems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    challenge: { type: Type.STRING },
                    hint: { type: Type.STRING },
                  },
                  required: ['challenge', 'hint'],
                },
              },
              nextMilestone: { type: Type.STRING },
            },
            required: [
              'overallAssessment',
              'masteryLevel',
              'keyWeaknesses',
              'practiceProblems',
              'nextMilestone',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      res.json(parsed);
    } catch (error) {
      console.warn('Adaptive study plan generation failed:', error);
      res.json({
        overallAssessment: `Completed ${courseTitle}. Targeted review of core principles will ensure complete concept retention.`,
        masteryLevel: 'Proficient',
        keyWeaknesses: [
          {
            concept: 'First-Principles Boundary Invariants',
            timestampRecommendation: 'Review lecture segment at 00:45',
            remediationAdvice: 'Focus on how conservation laws govern system state shifts under external drive.',
          },
        ],
        practiceProblems: [
          {
            challenge: 'Derive the steady-state equilibrium equation using active chapter parameters.',
            hint: 'Set time-derivative terms to zero and solve for the state vector.',
          },
        ],
        nextMilestone: 'Advanced Laboratory Seminars',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClassStream AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
