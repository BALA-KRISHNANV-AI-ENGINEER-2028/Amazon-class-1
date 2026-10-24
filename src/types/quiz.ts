/**
 * TypeScript interface definitions for ClassStream AI video timestamps,
 * structured quiz payloads, and TV overlay state management.
 */

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TimestampQuizPayload {
  conceptTitle: string;
  summary: string;
  quiz: QuizQuestion;
  source?: 'gemini' | 'curated-fallback';
  generatedAt?: string;
}

export interface VideoTimestampMarker {
  id: string;
  seconds: number;
  formattedTime: string;
  label: string;
  contextSnippet: string;
  isCompleted?: boolean;
}

export interface QuizOverlayState {
  isVisible: boolean;
  isLoading: boolean;
  error: string | null;
  activeTimestamp: number;
  videoTitle: string;
  contextSnippet: string;
  quizData: TimestampQuizPayload | null;
  selectedOptionIndex: number | null;
  isSubmitted: boolean;
  isCorrect: boolean | null;
  attemptsCount: number;
  streakCount: number;
}

export type QuizOverlayAction =
  | {
      type: 'OPEN_QUIZ';
      videoTitle: string;
      timestamp: number;
      contextSnippet: string;
    }
  | { type: 'CLOSE_QUIZ' }
  | { type: 'REQUEST_START' }
  | { type: 'REQUEST_SUCCESS'; payload: TimestampQuizPayload }
  | { type: 'REQUEST_FAILURE'; error: string }
  | { type: 'SELECT_OPTION'; index: number }
  | { type: 'SUBMIT_ANSWER' }
  | { type: 'RETRY_CURRENT_QUIZ' }
  | { type: 'RESET_STATE' };

export const initialQuizOverlayState: QuizOverlayState = {
  isVisible: false,
  isLoading: false,
  error: null,
  activeTimestamp: 0,
  videoTitle: '',
  contextSnippet: '',
  quizData: null,
  selectedOptionIndex: null,
  isSubmitted: false,
  isCorrect: null,
  attemptsCount: 0,
  streakCount: 0,
};

export function quizOverlayReducer(
  state: QuizOverlayState,
  action: QuizOverlayAction
): QuizOverlayState {
  switch (action.type) {
    case 'OPEN_QUIZ':
      return {
        ...state,
        isVisible: true,
        isLoading: true,
        error: null,
        videoTitle: action.videoTitle,
        activeTimestamp: action.timestamp,
        contextSnippet: action.contextSnippet,
        selectedOptionIndex: null,
        isSubmitted: false,
        isCorrect: null,
        attemptsCount: 0,
      };

    case 'CLOSE_QUIZ':
      return {
        ...state,
        isVisible: false,
        isLoading: false,
        error: null,
      };

    case 'REQUEST_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        selectedOptionIndex: null,
        isSubmitted: false,
        isCorrect: null,
      };

    case 'REQUEST_SUCCESS':
      return {
        ...state,
        isLoading: false,
        error: null,
        quizData: action.payload,
        selectedOptionIndex: null,
        isSubmitted: false,
        isCorrect: null,
      };

    case 'REQUEST_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };

    case 'SELECT_OPTION':
      if (state.isSubmitted && state.isCorrect) {
        return state;
      }
      return {
        ...state,
        selectedOptionIndex: action.index,
        error: null,
      };

    case 'SUBMIT_ANSWER': {
      if (state.selectedOptionIndex === null || !state.quizData) {
        return state;
      }
      const correct = state.selectedOptionIndex === state.quizData.quiz.correctIndex;
      return {
        ...state,
        isSubmitted: true,
        isCorrect: correct,
        attemptsCount: state.attemptsCount + 1,
        streakCount: correct ? state.streakCount + 1 : 0,
      };
    }

    case 'RETRY_CURRENT_QUIZ':
      return {
        ...state,
        selectedOptionIndex: null,
        isSubmitted: false,
        isCorrect: null,
      };

    case 'RESET_STATE':
      return initialQuizOverlayState;

    default:
      return state;
  }
}
