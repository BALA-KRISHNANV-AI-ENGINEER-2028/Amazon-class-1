import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers,
  QrCode as QrIcon,
  RefreshCw,
  RotateCw,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from '../theme/colors';
import type { CourseItem } from '../data/courses';
import { playTVBackSound, playTVFocusTick, playTVSelectSound } from '../utils/tvAudio';

export interface QuizAttemptRecord {
  timestamp: number;
  conceptTitle: string;
  question: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
}

export interface AdaptivePlanData {
  overallAssessment: string;
  masteryLevel: string;
  keyWeaknesses: Array<{
    concept: string;
    timestampRecommendation: string;
    remediationAdvice: string;
  }>;
  practiceProblems: Array<{
    challenge: string;
    hint: string;
  }>;
  nextMilestone: string;
}

export interface FlashcardItem {
  id: string;
  topic: string;
  frontQuestion: string;
  backEquation: string;
  backExplanation: string;
}

export interface SummaryScreenProps {
  course: CourseItem;
  quizAttempts: QuizAttemptRecord[];
  watchedDurationSeconds?: number;
  visualBreakdownsCount?: number;
  onReplayLecture: () => void;
  onBackToBrowse: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  course,
  quizAttempts,
  watchedDurationSeconds = 45,
  visualBreakdownsCount = 2,
  onReplayLecture,
  onBackToBrowse,
}) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'flashcards' | 'qr'>('plan');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [adaptivePlan, setAdaptivePlan] = useState<AdaptivePlanData | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(true);

  // Flashcard states
  const [currentCardIdx, setCurrentCardIdx] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Compute metrics
  const totalQuestions = quizAttempts.length;
  const correctCount = quizAttempts.filter((q) => q.isCorrect).length;
  const masteryScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 85;

  const missedAttempts = useMemo(
    () => quizAttempts.filter((q) => !q.isCorrect),
    [quizAttempts]
  );

  // Build Study Flashcards from course & chapters
  const flashcards: FlashcardItem[] = useMemo(() => {
    return [
      {
        id: 'fc-1',
        topic: course.chapters[0]?.title || 'Core Principle',
        frontQuestion: `What is the fundamental constraint governing ${course.chapters[0]?.title || 'this system'}?`,
        backEquation: course.defaultXRay.coreEquation,
        backExplanation: course.defaultXRay.summary,
      },
      {
        id: 'fc-2',
        topic: 'Boundary Conditions',
        frontQuestion: 'How does state coherence decay under thermal or environmental noise?',
        backEquation: 'T_2^* = [1 / (2 T_1) + 1 / T_φ]^-1',
        backExplanation:
          'Dephasing noise T_φ dominates on the equator of the state space, causing irreversible pure dephasing before energy relaxation T_1 occurs.',
      },
      {
        id: 'fc-3',
        topic: 'Engineering Application',
        frontQuestion: course.defaultXRay.quizQuestion,
        backEquation: 'ΔE · Δt ≥ ℏ / 2',
        backExplanation: course.defaultXRay.explanation,
      },
    ];
  }, [course]);

  // Generate QR Code data URL for scannable smartphone summary
  useEffect(() => {
    const payload = JSON.stringify({
      app: 'ClassStream AI',
      course: course.title,
      score: `${masteryScore}%`,
      instructor: course.instructor,
      institution: course.institution,
      url: `https://classstream.ai/verify/${course.id}`,
      completedAt: new Date().toISOString(),
    });

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0B0E14',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR code gen error:', err));
  }, [course, masteryScore]);

  // Fetch AI Adaptive Study Plan from Gemini
  useEffect(() => {
    let isMounted = true;
    async function fetchPlan() {
      setLoadingPlan(true);
      try {
        const response = await fetch('/api/ai/adaptive-study-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseTitle: course.title,
            courseSynopsis: course.synopsis,
            incorrectQuestions: missedAttempts,
            totalQuizzes: totalQuestions,
            score: masteryScore,
          }),
        });
        const data = await response.json();
        if (isMounted) {
          setAdaptivePlan(data);
        }
      } catch {
        if (isMounted) {
          setAdaptivePlan({
            overallAssessment: `Completed ${course.title}. Targeted review of core equations will secure 100% exam readiness.`,
            masteryLevel: masteryScore >= 80 ? 'Mastery Level: Advanced' : 'Mastery Level: Proficient',
            keyWeaknesses: [
              {
                concept: 'Boundary Phase Superposition',
                timestampRecommendation: 'Review lecture checkpoint at 00:45',
                remediationAdvice: 'Re-examine how the relative phase theta introduces decoherence along the equator of the state sphere.',
              },
            ],
            practiceProblems: [
              {
                challenge: 'Calculate the phase rotation induced by a π/4 pulse on the ground state |0⟩.',
                hint: 'Use the Hadamard transformation matrix followed by phase gate S.',
              },
            ],
            nextMilestone: 'Laboratory Simulation Seminar',
          });
        }
      } finally {
        if (isMounted) setLoadingPlan(false);
      }
    }
    fetchPlan();
    return () => {
      isMounted = false;
    };
  }, [course.title, course.synopsis, masteryScore, missedAttempts, totalQuestions]);

  const handlePrevCard = () => {
    playTVSelectSound();
    setIsFlipped(false);
    setCurrentCardIdx((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
  };

  const handleNextCard = () => {
    playTVSelectSound();
    setIsFlipped(false);
    setCurrentCardIdx((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
  };

  const handleToggleFlip = () => {
    playTVSelectSound();
    setIsFlipped((prev) => !prev);
  };

  const activeCard = flashcards[currentCardIdx];

  return (
    <div
      id="tv-summary-screen"
      className="flex min-h-screen w-full flex-col bg-[#0B0E14] text-white select-none pb-16"
    >
      {/* Top Header Navigation */}
      <View style={styles.topHeaderBar}>
        <Pressable
          hasTVPreferredFocus
          onFocus={() => playTVFocusTick()}
          onPress={() => {
            playTVBackSound();
            onBackToBrowse();
          }}
        >
          {({ focused }) => (
            <View
              style={[
                styles.backButton,
                focused ? styles.buttonFocused : undefined,
              ]}
            >
              <ArrowLeft size={20} color={AmazonDarkPalette.textPrimary} />
              <Text style={styles.backButtonText}>Return to Catalog</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.headerTitleGroup}>
          <View style={styles.headerBadge}>
            <Sparkles size={14} color={AmazonDarkPalette.primaryAccent} />
            <Text style={styles.headerBadgeText}>ClassStream AI · Lecture Mastery Summary</Text>
          </View>
          <Text style={styles.courseTitleHeadline} numberOfLines={1}>
            {course.title}
          </Text>
        </View>

        <Pressable
          onFocus={() => playTVFocusTick()}
          onPress={() => {
            playTVSelectSound();
            onReplayLecture();
          }}
        >
          {({ focused }) => (
            <View
              style={[
                styles.replayButton,
                focused ? styles.buttonFocused : undefined,
              ]}
            >
              <RefreshCw size={16} color={AmazonDarkPalette.primaryAccent} />
              <Text style={styles.replayButtonText}>Replay Lecture</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Hero Performance Infographic Cards */}
      <View style={styles.metricsRow}>
        {/* Metric 1: Mastery Score */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <Award size={24} color={AmazonDarkPalette.primaryAccent} />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricValue}>{masteryScore}%</Text>
            <Text style={styles.metricLabel}>Comprehension Score</Text>
          </View>
        </View>

        {/* Metric 2: Checkpoints Answered */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <Target size={24} color="#00A8E1" />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricValue}>
              {correctCount} / {Math.max(1, totalQuestions)}
            </Text>
            <Text style={styles.metricLabel}>AI Quizzes Mastered</Text>
          </View>
        </View>

        {/* Metric 3: Visual Scenes Inspected */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <Layers size={24} color="#00D084" />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricValue}>{visualBreakdownsCount}</Text>
            <Text style={styles.metricLabel}>Visual Scenes Analyzed</Text>
          </View>
        </View>

        {/* Metric 4: Time In Focus */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <Flame size={24} color="#E53935" />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricValue}>{formatTime(watchedDurationSeconds)}</Text>
            <Text style={styles.metricLabel}>Deep Focus Time</Text>
          </View>
        </View>
      </View>

      {/* Tabs Row (Adaptive Study Plan, Flashcards, Scannable QR Code) */}
      <View style={styles.tabsRow}>
        <Pressable
          onFocus={() => playTVFocusTick()}
          onPress={() => {
            playTVSelectSound();
            setActiveTab('plan');
          }}
        >
          {({ focused }) => (
            <View
              style={[
                styles.tabButton,
                activeTab === 'plan' ? styles.tabButtonActive : undefined,
                focused ? styles.buttonFocused : undefined,
              ]}
            >
              <Sparkles size={16} color={activeTab === 'plan' ? AmazonDarkPalette.primaryAccent : AmazonDarkPalette.textSecondary} />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'plan' ? styles.tabButtonTextActive : undefined,
                ]}
              >
                AI Adaptive Study Plan
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onFocus={() => playTVFocusTick()}
          onPress={() => {
            playTVSelectSound();
            setActiveTab('flashcards');
          }}
        >
          {({ focused }) => (
            <View
              style={[
                styles.tabButton,
                activeTab === 'flashcards' ? styles.tabButtonActive : undefined,
                focused ? styles.buttonFocused : undefined,
              ]}
            >
              <BookOpen size={16} color={activeTab === 'flashcards' ? AmazonDarkPalette.primaryAccent : AmazonDarkPalette.textSecondary} />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'flashcards' ? styles.tabButtonTextActive : undefined,
                ]}
              >
                Interactive Flashcards ({flashcards.length})
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onFocus={() => playTVFocusTick()}
          onPress={() => {
            playTVSelectSound();
            setActiveTab('qr');
          }}
        >
          {({ focused }) => (
            <View
              style={[
                styles.tabButton,
                activeTab === 'qr' ? styles.tabButtonActive : undefined,
                focused ? styles.buttonFocused : undefined,
              ]}
            >
              <QrIcon size={16} color={activeTab === 'qr' ? AmazonDarkPalette.primaryAccent : AmazonDarkPalette.textSecondary} />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'qr' ? styles.tabButtonTextActive : undefined,
                ]}
              >
                Sync to Mobile (QR Code)
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Main Tab Panels */}
      <View style={styles.tabContentArea}>
        {/* TAB 1: AI ADAPTIVE STUDY PLAN */}
        {activeTab === 'plan' && (
          <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>
            {loadingPlan ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={AmazonDarkPalette.primaryAccent} />
                <Text style={styles.loadingHeadline}>Gemini is Synthesizing Your Adaptive Study Plan</Text>
                <Text style={styles.loadingSub}>
                  Correlating missed quiz checkpoints with core mathematical derivations...
                </Text>
              </View>
            ) : adaptivePlan ? (
              <View style={styles.planContainer}>
                {/* Executive Assessment Card */}
                <View style={styles.assessmentCard}>
                  <View style={styles.assessmentHeader}>
                    <Text style={styles.assessmentMasteryBadge}>
                      {adaptivePlan.masteryLevel}
                    </Text>
                    <Text style={styles.assessmentMilestone}>
                      Next Goal: {adaptivePlan.nextMilestone}
                    </Text>
                  </View>
                  <Text style={styles.assessmentBody}>{adaptivePlan.overallAssessment}</Text>
                </View>

                {/* Targeted Concept Remediation */}
                <View style={styles.remediationSection}>
                  <Text style={styles.sectionHeadline}>TARGETED TOPIC REMEDIATION</Text>
                  <View style={styles.remediationGrid}>
                    {adaptivePlan.keyWeaknesses.map((item, idx) => (
                      <View key={`weakness-${idx}`} style={styles.remediationCard}>
                        <View style={styles.remediationTop}>
                          <Text style={styles.remediationConcept}>{item.concept}</Text>
                          <View style={styles.timestampPill}>
                            <Text style={styles.timestampPillText}>
                              {item.timestampRecommendation}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.remediationAdvice}>{item.remediationAdvice}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Practice Challenge */}
                <View style={styles.practiceSection}>
                  <Text style={styles.sectionHeadline}>HANDS-ON FORMULATION CHALLENGE</Text>
                  {adaptivePlan.practiceProblems.map((prob, idx) => (
                    <View key={`prob-${idx}`} style={styles.practiceCard}>
                      <Text style={styles.practiceChallenge}>{prob.challenge}</Text>
                      <View style={styles.hintBox}>
                        <Text style={styles.hintLabel}>HINT:</Text>
                        <Text style={styles.hintText}>{prob.hint}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}

        {/* TAB 2: INTERACTIVE STUDY FLASHCARDS */}
        {activeTab === 'flashcards' && (
          <View style={styles.flashcardsContainer}>
            <View style={styles.flashcardHeader}>
              <Text style={styles.cardCounter}>
                Card {currentCardIdx + 1} of {flashcards.length}
              </Text>
              <Text style={styles.cardTopicBadge}>{activeCard.topic}</Text>
            </View>

            {/* 3D Flip Card */}
            <Pressable
              hasTVPreferredFocus
              onFocus={() => playTVFocusTick()}
              onPress={handleToggleFlip}
            >
              {({ focused }) => (
                <View
                  style={[
                    styles.flashcardBody,
                    isFlipped ? styles.flashcardFlipped : undefined,
                    focused ? styles.flashcardFocused : undefined,
                  ]}
                >
                  <View style={styles.cardFlipIndicator}>
                    <RotateCw size={16} color={AmazonDarkPalette.primaryAccent} />
                    <Text style={styles.cardFlipText}>
                      {isFlipped ? 'Answer Side (Press SELECT to Flip)' : 'Question Side (Press SELECT to Flip)'}
                    </Text>
                  </View>

                  {!isFlipped ? (
                    <View style={styles.cardFrontContent}>
                      <Text style={styles.cardQuestionText}>{activeCard.frontQuestion}</Text>
                      <Text style={styles.cardHintPrompt}>Press SELECT on Fire TV Remote to reveal formulation</Text>
                    </View>
                  ) : (
                    <View style={styles.cardBackContent}>
                      <View style={styles.formulaCard}>
                        <Text style={styles.formulaText}>{activeCard.backEquation}</Text>
                      </View>
                      <Text style={styles.explanationText}>{activeCard.backExplanation}</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>

            {/* Flashcard Navigation Buttons */}
            <View style={styles.flashcardNavRow}>
              <Pressable
                onFocus={() => playTVFocusTick()}
                onPress={handlePrevCard}
              >
                {({ focused }) => (
                  <View
                    style={[
                      styles.cardNavBtn,
                      focused ? styles.buttonFocused : undefined,
                    ]}
                  >
                    <ChevronLeft size={20} color={AmazonDarkPalette.textPrimary} />
                    <Text style={styles.cardNavBtnText}>Previous Card</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onFocus={() => playTVFocusTick()}
                onPress={handleToggleFlip}
              >
                {({ focused }) => (
                  <View
                    style={[
                      styles.cardFlipActionBtn,
                      focused ? styles.buttonFocused : undefined,
                    ]}
                  >
                    <RotateCw size={18} color={AmazonDarkPalette.textInverse} />
                    <Text style={styles.cardFlipActionText}>Flip Card</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onFocus={() => playTVFocusTick()}
                onPress={handleNextCard}
              >
                {({ focused }) => (
                  <View
                    style={[
                      styles.cardNavBtn,
                      focused ? styles.buttonFocused : undefined,
                    ]}
                  >
                    <Text style={styles.cardNavBtnText}>Next Card</Text>
                    <ChevronRight size={20} color={AmazonDarkPalette.textPrimary} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* TAB 3: DOWNLOADABLE / SCANNABLE QR CODE SUMMARY */}
        {activeTab === 'qr' && (
          <View style={styles.qrCodeContainer}>
            <View style={styles.qrCard}>
              <View style={styles.qrImageFrame}>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="ClassStream AI Lecture Summary QR Code"
                    className="w-64 h-64 rounded-lg bg-white p-2 shadow-2xl"
                  />
                ) : (
                  <ActivityIndicator size="large" color={AmazonDarkPalette.primaryAccent} />
                )}
              </View>

              <View style={styles.qrDetailsCol}>
                <View style={styles.qrTitleBadge}>
                  <Sparkles size={16} color={AmazonDarkPalette.primaryAccent} />
                  <Text style={styles.qrTitleBadgeText}>Scan with Phone Camera</Text>
                </View>
                <Text style={styles.qrTitleHeadline}>Carry Your AI Study Notes Anywhere</Text>
                <Text style={styles.qrDescriptionText}>
                  Point your smartphone camera at this screen to instantly sync your lecture takeaways, formula sheets, and adaptive study plan directly to your mobile browser or Notion notebook.
                </Text>

                <View style={styles.verifiedCredentialBox}>
                  <CheckCircle2 size={18} color={AmazonDarkPalette.statusCompleted} />
                  <Text style={styles.verifiedCredentialText}>
                    Verified Certificate of Lecture Completion · {course.institution}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </div>
  );
};

const styles = StyleSheet.create({
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    paddingTop: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: AmazonDarkPalette.card,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  backButtonText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitleGroup: {
    alignItems: 'center',
    gap: 4,
    maxWidth: 680,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBadgeText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  courseTitleHeadline: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 153, 0, 0.12)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 153, 0, 0.4)',
  },
  replayButtonText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 20,
    paddingHorizontal: 48,
    paddingVertical: 24,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: 250,
    backgroundColor: AmazonDarkPalette.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextCol: {
    gap: 2,
  },
  metricValue: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 24,
    fontWeight: '700',
  },
  metricLabel: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 48,
    paddingBottom: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: AmazonDarkPalette.card,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButtonActive: {
    borderColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: '#1E293B',
  },
  tabButtonText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: AmazonDarkPalette.textPrimary,
    fontWeight: '700',
  },
  tabContentArea: {
    flex: 1,
    paddingHorizontal: 48,
  },
  tabScroll: {
    flex: 1,
  },
  loadingBox: {
    paddingVertical: 64,
    alignItems: 'center',
    gap: 14,
  },
  loadingHeadline: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 20,
    fontWeight: '700',
  },
  loadingSub: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
  },
  planContainer: {
    gap: 24,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 32,
  },
  assessmentCard: {
    backgroundColor: AmazonDarkPalette.card,
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 153, 0, 0.35)',
    gap: 12,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assessmentMasteryBadge: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  assessmentMilestone: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
  },
  assessmentBody: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 16,
    lineHeight: 24,
  },
  sectionHeadline: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  remediationSection: {
    gap: 10,
  },
  remediationGrid: {
    gap: 12,
  },
  remediationCard: {
    backgroundColor: '#121A26',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  remediationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remediationConcept: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 16,
    fontWeight: '700',
  },
  timestampPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timestampPillText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '600',
  },
  remediationAdvice: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    lineHeight: 22,
  },
  practiceSection: {
    gap: 10,
  },
  practiceCard: {
    backgroundColor: '#121A26',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  practiceChallenge: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 10,
    borderRadius: 8,
  },
  hintLabel: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '700',
  },
  hintText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
  },
  flashcardsContainer: {
    maxWidth: 760,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 12,
  },
  flashcardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardCounter: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '600',
  },
  cardTopicBadge: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  flashcardBody: {
    width: '100%',
    minHeight: 280,
    backgroundColor: AmazonDarkPalette.card,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 28,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  flashcardFlipped: {
    borderColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: '#162232',
  },
  flashcardFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    transform: [{ scale: 1.02 }],
    shadowColor: AmazonDarkPalette.primaryAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  cardFlipIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardFlipText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardFrontContent: {
    gap: 14,
    marginVertical: 24,
  },
  cardQuestionText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
  },
  cardHintPrompt: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
  },
  cardBackContent: {
    gap: 14,
    marginVertical: 16,
  },
  formulaCard: {
    backgroundColor: '#0A0F17',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 153, 0, 0.3)',
    alignItems: 'center',
  },
  formulaText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '700',
  },
  explanationText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 15,
    lineHeight: 24,
  },
  flashcardNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  cardNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: AmazonDarkPalette.card,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardNavBtnText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '600',
  },
  cardFlipActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: AmazonDarkPalette.primaryAccent,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  cardFlipActionText: {
    color: AmazonDarkPalette.textInverse,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '700',
  },
  qrCodeContainer: {
    maxWidth: 820,
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 16,
  },
  qrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AmazonDarkPalette.card,
    borderRadius: 16,
    padding: 32,
    gap: 36,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  qrImageFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrDetailsCol: {
    flex: 1,
    gap: 12,
  },
  qrTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qrTitleBadgeText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  qrTitleHeadline: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  qrDescriptionText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    lineHeight: 22,
  },
  verifiedCredentialBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(0, 208, 132, 0.3)',
    marginTop: 8,
  },
  verifiedCredentialText: {
    color: AmazonDarkPalette.statusCompleted,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '600',
  },
  buttonFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    transform: [{ scale: 1.04 }],
    backgroundColor: '#202E42',
    shadowColor: AmazonDarkPalette.primaryAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
});
