import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from '../theme/colors';
import type { TimestampQuizPayload } from '../types/quiz';
import { playTVFocusTick, playTVSelectSound } from '../utils/tvAudio';

export interface AIQuizOverlayProps {
  visible: boolean;
  isLoading: boolean;
  error?: string | null;
  quizData: TimestampQuizPayload | null;
  selectedOptionIndex: number | null;
  isSubmitted: boolean;
  isCorrect: boolean | null;
  activeTimestamp: number;
  courseTitle?: string;
  onSelectOption: (index: number) => void;
  onSubmitAnswer?: () => void;
  onResumeVideo: () => void;
  onRetryQuiz?: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const AIQuizOverlay: React.FC<AIQuizOverlayProps> = ({
  visible,
  isLoading,
  error,
  quizData,
  selectedOptionIndex,
  isSubmitted,
  isCorrect,
  activeTimestamp,
  courseTitle,
  onSelectOption,
  onSubmitAnswer,
  onResumeVideo,
  onRetryQuiz,
}) => {
  if (!visible) {
    return null;
  }

  const handleOptionPress = (index: number) => {
    playTVSelectSound();
    onSelectOption(index);
    if (onSubmitAnswer) {
      onSubmitAnswer();
    }
  };

  const handleResume = () => {
    playTVSelectSound();
    onResumeVideo();
  };

  const handleRetry = () => {
    playTVSelectSound();
    if (onRetryQuiz) {
      onRetryQuiz();
    }
  };

  return (
    <div
      id="tv-quiz-overlay"
      className="absolute top-6 bottom-6 right-8 z-40 flex w-[500px] max-w-[92vw] pointer-events-auto"
      style={{
        animation: 'fadeInRight 0.28s ease-out',
      }}
    >
      <View style={styles.cardContainer}>
        {/* Amazon Gold Accent Stripe */}
        <View style={styles.goldHeaderBar} />

        {/* Header Ribbon */}
        <View style={styles.headerRow}>
          <View style={styles.aiTag}>
            <Sparkles size={14} color={AmazonDarkPalette.primaryAccent} />
            <Text style={styles.aiTagText}>ClassStream AI · Checkpoint</Text>
          </View>
          <View style={styles.timestampBadge}>
            <Clock size={13} color={AmazonDarkPalette.textSecondary} />
            <Text style={styles.timestampText}>{formatTimecode(activeTimestamp)}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={AmazonDarkPalette.primaryAccent} />
              <Text style={styles.loadingTitle}>Generating Real-Time Assessment</Text>
              <Text style={styles.loadingSub}>
                Gemini 2.0 is analyzing lecture context and synthesizing comprehension checks...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorState}>
              <AlertTriangle size={32} color={AmazonDarkPalette.statusAlert} />
              <Text style={styles.errorTitle}>Checkpoint Analysis Paused</Text>
              <Text style={styles.errorSub}>{error}</Text>
              <Pressable
                hasTVPreferredFocus
                onFocus={() => playTVFocusTick()}
                onPress={handleResume}
              >
                {({ focused }) => (
                  <View
                    style={[
                      styles.resumeButton,
                      focused ? styles.buttonFocused : undefined,
                    ]}
                  >
                    <Play size={16} color={AmazonDarkPalette.textInverse} />
                    <Text style={styles.resumeButtonText}>Resume Lecture</Text>
                  </View>
                )}
              </Pressable>
            </View>
          ) : quizData ? (
            <>
              {/* Concept Title & Summary */}
              <View style={styles.conceptBlock}>
                <Text style={styles.conceptTitle}>{quizData.conceptTitle}</Text>
                <Text style={styles.conceptSummary}>{quizData.summary}</Text>
              </View>

              {/* Quiz Question */}
              <View style={styles.questionBlock}>
                <Text style={styles.questionLabel}>COMPREHENSION CHECK</Text>
                <Text style={styles.questionText}>{quizData.quiz.question}</Text>
              </View>

              {/* Multiple Choice Options (A, B, C) */}
              <View style={styles.optionsList}>
                {quizData.quiz.options.map((optionText, idx) => {
                  const letter = OPTION_LETTERS[idx] || `${idx + 1}`;
                  const isSelected = selectedOptionIndex === idx;
                  const isCorrectOption = idx === quizData.quiz.correctIndex;

                  let optionCardStyle = styles.optionCard;
                  let optionLetterStyle = styles.optionLetter;
                  let showCorrectIcon = false;
                  let showIncorrectIcon = false;

                  if (isSubmitted) {
                    if (isCorrectOption) {
                      optionCardStyle = styles.optionCardCorrect;
                      optionLetterStyle = styles.optionLetterCorrect;
                      showCorrectIcon = true;
                    } else if (isSelected && !isCorrectOption) {
                      optionCardStyle = styles.optionCardIncorrect;
                      optionLetterStyle = styles.optionLetterIncorrect;
                      showIncorrectIcon = true;
                    }
                  } else if (isSelected) {
                    optionCardStyle = styles.optionCardSelected;
                  }

                  return (
                    <Pressable
                      key={`opt-${idx}`}
                      hasTVPreferredFocus={!isSubmitted && idx === 0}
                      onFocus={() => playTVFocusTick()}
                      onPress={() => handleOptionPress(idx)}
                    >
                      {({ focused }) => (
                        <View
                          style={[
                            optionCardStyle,
                            focused ? styles.optionCardFocused : undefined,
                          ]}
                        >
                          <View
                            style={[
                              styles.optionLetterBadge,
                              optionLetterStyle,
                              focused ? styles.optionLetterFocused : undefined,
                            ]}
                          >
                            <Text style={styles.optionLetterText}>{letter}</Text>
                          </View>
                          <Text
                            style={[
                              styles.optionLabelText,
                              focused ? styles.optionLabelFocused : undefined,
                            ]}
                          >
                            {optionText}
                          </Text>
                          {showCorrectIcon ? (
                            <CheckCircle2
                              size={20}
                              color={AmazonDarkPalette.statusCompleted}
                            />
                          ) : showIncorrectIcon ? (
                            <XCircle
                              size={20}
                              color={AmazonDarkPalette.statusAlert}
                            />
                          ) : null}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Feedback Message */}
              {isSubmitted && (
                <View
                  style={[
                    styles.feedbackBanner,
                    isCorrect
                      ? styles.feedbackBannerCorrect
                      : styles.feedbackBannerIncorrect,
                  ]}
                >
                  {isCorrect ? (
                    <>
                      <Award size={20} color={AmazonDarkPalette.statusCompleted} />
                      <View style={styles.feedbackTextCol}>
                        <Text style={styles.feedbackTitleCorrect}>Correct! Concept Mastered</Text>
                        <Text style={styles.feedbackBody}>
                          Great retention! Your comprehension score has been updated in your profile.
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={20} color={AmazonDarkPalette.statusAlert} />
                      <View style={styles.feedbackTextCol}>
                        <Text style={styles.feedbackTitleIncorrect}>Not Quite</Text>
                        <Text style={styles.feedbackBody}>
                          Review the highlighted green answer above to reinforce your understanding.
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Action Buttons: Resume & Retry */}
              <View style={styles.actionButtonsRow}>
                <Pressable
                  hasTVPreferredFocus={isSubmitted}
                  onFocus={() => playTVFocusTick()}
                  onPress={handleResume}
                >
                  {({ focused }) => (
                    <View
                      style={[
                        styles.resumeButton,
                        focused ? styles.buttonFocused : undefined,
                      ]}
                    >
                      <Play size={16} color={AmazonDarkPalette.textInverse} />
                      <Text style={styles.resumeButtonText}>Resume Lecture</Text>
                    </View>
                  )}
                </Pressable>

                {isSubmitted && !isCorrect && onRetryQuiz ? (
                  <Pressable
                    onFocus={() => playTVFocusTick()}
                    onPress={handleRetry}
                  >
                    {({ focused }) => (
                      <View
                        style={[
                          styles.retryButton,
                          focused ? styles.buttonFocused : undefined,
                        ]}
                      >
                        <RotateCcw size={16} color={AmazonDarkPalette.textPrimary} />
                        <Text style={styles.retryButtonText}>Try Again</Text>
                      </View>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </div>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(26, 34, 45, 0.96)',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 153, 0, 0.35)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: -8, height: 12 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
  },
  goldHeaderBar: {
    height: 4,
    width: '100%',
    backgroundColor: AmazonDarkPalette.primaryAccent,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiTagText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timestampText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  loadingState: {
    paddingVertical: 64,
    alignItems: 'center',
    gap: 16,
  },
  loadingTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingSub: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 380,
  },
  errorState: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 16,
  },
  errorTitle: {
    color: AmazonDarkPalette.statusAlert,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorSub: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    textAlign: 'center',
  },
  conceptBlock: {
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  conceptTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  conceptSummary: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    lineHeight: 22,
  },
  questionBlock: {
    gap: 8,
  },
  questionLabel: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  questionText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#121822',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 14,
  },
  optionCardSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#1C2736',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: AmazonDarkPalette.primaryAccent,
    gap: 14,
  },
  optionCardFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: '#202E42',
    transform: [{ scale: 1.02 }],
    shadowColor: AmazonDarkPalette.primaryAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  optionCardCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 208, 132, 0.15)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: AmazonDarkPalette.statusCompleted,
    gap: 14,
  },
  optionCardIncorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: AmazonDarkPalette.statusAlert,
    gap: 14,
  },
  optionLetterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetter: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  optionLetterFocused: {
    backgroundColor: AmazonDarkPalette.primaryAccent,
  },
  optionLetterCorrect: {
    backgroundColor: AmazonDarkPalette.statusCompleted,
  },
  optionLetterIncorrect: {
    backgroundColor: AmazonDarkPalette.statusAlert,
  },
  optionLetterText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '700',
  },
  optionLabelText: {
    flex: 1,
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  optionLabelFocused: {
    color: AmazonDarkPalette.textPrimary,
    fontWeight: '600',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  feedbackBannerCorrect: {
    backgroundColor: 'rgba(0, 208, 132, 0.12)',
    borderColor: AmazonDarkPalette.statusCompleted,
  },
  feedbackBannerIncorrect: {
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
    borderColor: AmazonDarkPalette.statusAlert,
  },
  feedbackTextCol: {
    flex: 1,
    gap: 4,
  },
  feedbackTitleCorrect: {
    color: AmazonDarkPalette.statusCompleted,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackTitleIncorrect: {
    color: AmazonDarkPalette.statusAlert,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackBody: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AmazonDarkPalette.primaryAccent,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonFocused: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.05 }],
    shadowColor: AmazonDarkPalette.primaryAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  resumeButtonText: {
    color: AmazonDarkPalette.textInverse,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '700',
  },
  retryButtonText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '600',
  },
});
