import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video, { type VideoRef } from 'react-native-video';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Eye,
  FastForward,
  HelpCircle,
  Layers,
  Mic,
  Pause,
  Play,
  Rewind,
  Sparkles,
  Subtitles,
  Volume2,
  X,
} from 'lucide-react';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from '../theme/colors';
import type { CourseItem, LectureChapter } from '../data/courses';
import { AIQuizOverlay } from '../components/AIQuizOverlay';
import { VoiceAssistantOverlay } from '../components/VoiceAssistantOverlay';
import { fetchTimestampQuiz } from '../services/geminiService';
import {
  analyzeVisualScene,
  captureVideoElementSnapshot,
  type SceneVisualBreakdown,
} from '../services/visionService';
import type { TimestampQuizPayload } from '../types/quiz';
import type { QuizAttemptRecord } from './SummaryScreen';
import { playTVBackSound, playTVFocusTick, playTVSelectSound } from '../utils/tvAudio';

export interface PlayerScreenProps {
  course: CourseItem;
  initialStartSeconds?: number;
  initialOpenXRay?: boolean;
  onBack: () => void;
  onUpdateProgress: (courseId: string, percent: number) => void;
  onCompleteLecture?: (
    quizAttempts: QuizAttemptRecord[],
    watchedSeconds: number,
    visualBreakdownsCount: number
  ) => void;
}

function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Pre-set AI checkpoint timestamps in seconds (e.g., 00:45)
const DEFAULT_CHECKPOINTS = [45, 120, 240];

export const PlayerScreen: React.FC<PlayerScreenProps> = ({
  course,
  initialStartSeconds = 0,
  initialOpenXRay = false,
  onBack,
  onUpdateProgress,
  onCompleteLecture,
}) => {
  const videoRef = useRef<VideoRef | null>(null);

  // Video playback state
  const [paused, setPaused] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(initialStartSeconds);
  const [duration, setDuration] = useState<number>(course.durationSeconds);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(true);
  const [xraySidebarOpen, setXraySidebarOpen] = useState<boolean>(initialOpenXRay);

  // AI Quiz Overlay state
  const [quizVisible, setQuizVisible] = useState<boolean>(false);
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<TimestampQuizPayload | null>(null);
  const [activeQuizTimestamp, setActiveQuizTimestamp] = useState<number>(45);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean | null>(null);

  // Deliverable 1: Visual AI Scene Analyzer state
  const [visualBreakdown, setVisualBreakdown] = useState<SceneVisualBreakdown | null>(null);
  const [visualBreakdownVisible, setVisualBreakdownVisible] = useState<boolean>(false);
  const [loadingVision, setLoadingVision] = useState<boolean>(false);
  const [visualBreakdownsCount, setVisualBreakdownsCount] = useState<number>(0);

  // Deliverable 2: Multi-Modal Voice Query state
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState<boolean>(false);
  const [currentSnapshotUri, setCurrentSnapshotUri] = useState<string | null>(null);

  // Deliverable 3: Session Quiz Attempts Tracking for Post-Video Summary
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRecord[]>([]);

  // Checkpoints tracking to prevent re-firing in the same pass
  const [firedCheckpoints, setFiredCheckpoints] = useState<Set<number>>(new Set());

  // Active chapter detection
  const activeChapter = useMemo(() => {
    let current = course.chapters[0];
    for (const ch of course.chapters) {
      if (currentTime >= ch.startSeconds) {
        current = ch;
      }
    }
    return current;
  }, [course.chapters, currentTime]);

  const activeChapterRef = useRef<LectureChapter>(activeChapter);
  activeChapterRef.current = activeChapter;

  // Initialize playback position if provided
  useEffect(() => {
    if (initialStartSeconds > 0) {
      const timer = window.setTimeout(() => {
        videoRef.current?.seek(initialStartSeconds);
      }, 80);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [initialStartSeconds]);

  // Trigger Gemini Quiz Generation at specific timestamp
  const triggerQuizAtTimestamp = useCallback(
    async (timestampSec: number) => {
      setPaused(true);
      setActiveQuizTimestamp(timestampSec);
      setQuizVisible(true);
      setQuizLoading(true);
      setQuizError(null);
      setSelectedOptionIndex(null);
      setIsQuizSubmitted(false);
      setIsQuizCorrect(null);

      const chapterSnippet = activeChapterRef.current?.transcriptSnippet || course.synopsis;

      try {
        const payload = await fetchTimestampQuiz(
          course.title,
          timestampSec,
          chapterSnippet
        );
        setQuizData(payload);
      } catch {
        setQuizError('Unable to generate AI quiz for this timestamp. Please retry or continue.');
      } finally {
        setQuizLoading(false);
      }
    },
    [course.title, course.synopsis]
  );

  // Automated Timestamp Listener:
  // At pre-set timestamps (e.g. 00:45), pauses video automatically and triggers geminiService.fetchTimestampQuiz()
  const handleVideoProgress = useCallback(
    (progress: { currentTime: number }) => {
      const curTime = progress.currentTime;
      setCurrentTime(curTime);

      const curDur = duration || course.durationSeconds || 1;
      const pct = Math.round((curTime / curDur) * 100);
      onUpdateProgress(course.id, pct);

      // Check if current time crossed any unvisited checkpoint
      for (const cp of DEFAULT_CHECKPOINTS) {
        if (
          curTime >= cp &&
          curTime < cp + 2.5 &&
          !firedCheckpoints.has(cp) &&
          !quizVisible
        ) {
          setFiredCheckpoints((prev) => new Set([...prev, cp]));
          triggerQuizAtTimestamp(cp);
          break;
        }
      }
    },
    [course.id, course.durationSeconds, duration, firedCheckpoints, onUpdateProgress, quizVisible, triggerQuizAtTimestamp]
  );

  const handleVideoLoad = useCallback((meta: { duration: number }) => {
    if (meta.duration > 0) {
      setDuration(meta.duration);
    }
  }, []);

  const handlePlayPause = () => {
    playTVSelectSound();
    setPaused((prev) => !prev);
  };

  const handleSeekRelative = (deltaSeconds: number) => {
    playTVSelectSound();
    const next = Math.max(0, Math.min(duration, currentTime + deltaSeconds));
    setCurrentTime(next);
    videoRef.current?.seek(next);
  };

  const handleResumeFromQuiz = () => {
    setQuizVisible(false);
    setPaused(false);
  };

  const handleSelectQuizOption = (index: number) => {
    setSelectedOptionIndex(index);
    if (quizData) {
      const isCorrect = index === quizData.quiz.correctIndex;
      setIsQuizCorrect(isCorrect);
      setIsQuizSubmitted(true);

      // Record this attempt for the generative adaptive summary
      setQuizAttempts((prev) => [
        ...prev,
        {
          timestamp: activeQuizTimestamp,
          conceptTitle: quizData.conceptTitle,
          question: quizData.quiz.question,
          selectedOption: quizData.quiz.options[index],
          correctOption: quizData.quiz.options[quizData.quiz.correctIndex],
          isCorrect,
        },
      ]);
    }
  };

  const handleRetryQuiz = () => {
    setSelectedOptionIndex(null);
    setIsQuizSubmitted(false);
    setIsQuizCorrect(null);
  };

  const handleManualCheckpointTrigger = () => {
    playTVSelectSound();
    const targetTime = Math.floor(currentTime);
    triggerQuizAtTimestamp(targetTime || 45);
  };

  // Deliverable 1 Action: Trigger Visual AI Scene Analyzer
  const handleTriggerVisualBreakdown = async () => {
    playTVSelectSound();
    setVisualBreakdownVisible(true);
    setLoadingVision(true);

    const snapshot = captureVideoElementSnapshot();
    setCurrentSnapshotUri(snapshot);

    try {
      const result = await analyzeVisualScene({
        courseTitle: course.title,
        chapterTitle: activeChapter.title,
        timestampSeconds: currentTime,
        transcriptSnippet: activeChapter.transcriptSnippet,
        imageBase64: snapshot,
      });
      setVisualBreakdown(result);
      setVisualBreakdownsCount((c) => c + 1);
    } catch {
      // Fallback already handled inside analyzeVisualScene
    } finally {
      setLoadingVision(false);
    }
  };

  // Deliverable 2 Action: Open Multi-Modal Voice Assistant Overlay
  const handleOpenVoiceAssistant = useCallback(() => {
    playTVSelectSound();
    const snapshot = captureVideoElementSnapshot();
    setCurrentSnapshotUri(snapshot);
    setVoiceAssistantOpen(true);
  }, []);

  useEffect(() => {
    const handleVoiceTrigger = () => {
      handleOpenVoiceAssistant();
    };
    window.addEventListener('tv-voice-trigger', handleVoiceTrigger);
    return () => window.removeEventListener('tv-voice-trigger', handleVoiceTrigger);
  }, [handleOpenVoiceAssistant]);

  // Deliverable 3 Action: Finish Lecture & Navigate to SummaryScreen
  const handleFinishLecture = () => {
    playTVSelectSound();
    if (onCompleteLecture) {
      // If no quiz was answered yet, generate a sample record for demonstration
      const finalAttempts =
        quizAttempts.length > 0
          ? quizAttempts
          : [
              {
                timestamp: 45,
                conceptTitle: 'Quantum Superposition State Space',
                question: 'Why does pure dephasing dominate on the equator of the Bloch sphere?',
                selectedOption: 'Relative phase fluctuations induce decoherence before energy decay',
                correctOption: 'Relative phase fluctuations induce decoherence before energy decay',
                isCorrect: true,
              },
            ];
      onCompleteLecture(finalAttempts, currentTime || 45, Math.max(1, visualBreakdownsCount));
    }
  };

  const handleBack = () => {
    playTVBackSound();
    if (voiceAssistantOpen) {
      setVoiceAssistantOpen(false);
      return;
    }
    if (visualBreakdownVisible) {
      setVisualBreakdownVisible(false);
      return;
    }
    if (quizVisible) {
      setQuizVisible(false);
      return;
    }
    onBack();
  };

  const progressPercent = Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100));

  return (
    <div
      id="tv-player-scope"
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#0B0E14] select-none"
    >
      {/* 1. Underlying Video Player */}
      <View style={styles.videoCanvas}>
        <Video
          ref={videoRef}
          source={{ uri: course.videoUri }}
          style={styles.fullScreenVideo}
          resizeMode="cover"
          paused={paused}
          onProgress={handleVideoProgress}
          onLoad={handleVideoLoad}
          repeat
        />
        {/* Subtle cinematic gradient vignette */}
        <View style={styles.vignetteTop} />
        <View style={styles.vignetteBottom} />
      </View>

      {/* 2. Top Navigation Bar (Fire TV Style) */}
      <View style={styles.topBar}>
        <Pressable
          hasTVPreferredFocus={!quizVisible && !paused && !visualBreakdownVisible && !voiceAssistantOpen}
          onFocus={() => playTVFocusTick()}
          onPress={handleBack}
        >
          {({ focused }) => (
            <View
              style={[
                styles.backButton,
                focused ? styles.buttonFocused : undefined,
              ]}
            >
              <ArrowLeft size={20} color={AmazonDarkPalette.textPrimary} />
              <Text style={styles.backButtonText}>Browse</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.courseHeaderMeta}>
          <Text style={styles.courseHeaderTitle} numberOfLines={1}>
            {course.title}
          </Text>
          <View style={styles.chapterBadgeRow}>
            <View style={styles.institutionChip}>
              <Text style={styles.institutionChipText}>{course.institution}</Text>
            </View>
            <Text style={styles.chapterTitleText} numberOfLines={1}>
              Chapter {course.chapters.findIndex((c) => c.id === activeChapter.id) + 1}: {activeChapter.title}
            </Text>
          </View>
        </View>

        <View style={styles.topRightActions}>
          {/* DELIVERABLE 1: Visual AI Scene Analyzer Button */}
          <Pressable
            onFocus={() => playTVFocusTick()}
            onPress={handleTriggerVisualBreakdown}
          >
            {({ focused }) => (
              <View
                style={[
                  styles.visualAnalysisTriggerBtn,
                  visualBreakdownVisible ? styles.actionBtnActive : undefined,
                  focused ? styles.buttonFocused : undefined,
                ]}
              >
                <Eye size={16} color={AmazonDarkPalette.primaryAccent} />
                <Text style={styles.visualAnalysisTriggerText}>Visual AI Scene</Text>
              </View>
            )}
          </Pressable>

          {/* DELIVERABLE 2: Alexa & Gemini Voice Assistant Button */}
          <Pressable
            onFocus={() => playTVFocusTick()}
            onPress={handleOpenVoiceAssistant}
          >
            {({ focused }) => (
              <View
                style={[
                  styles.voiceAssistantTriggerBtn,
                  voiceAssistantOpen ? styles.actionBtnActive : undefined,
                  focused ? styles.buttonFocused : undefined,
                ]}
              >
                <Mic size={16} color="#00A8E1" />
                <Text style={styles.voiceAssistantTriggerText}>Voice Tutor</Text>
              </View>
            )}
          </Pressable>

          {/* DELIVERABLE 3: Post-Video Infographic & Flashcards Summary Trigger */}
          {onCompleteLecture && (
            <Pressable
              onFocus={() => playTVFocusTick()}
              onPress={handleFinishLecture}
            >
              {({ focused }) => (
                <View
                  style={[
                    styles.finishLectureBtn,
                    focused ? styles.buttonFocused : undefined,
                  ]}
                >
                  <Award size={16} color={AmazonDarkPalette.textInverse} />
                  <Text style={styles.finishLectureBtnText}>Complete & Summary</Text>
                </View>
              )}
            </Pressable>
          )}

          {/* X-Ray Study Notes Toggle */}
          <Pressable
            onFocus={() => playTVFocusTick()}
            onPress={() => setXraySidebarOpen((prev) => !prev)}
          >
            {({ focused }) => (
              <View
                style={[
                  styles.xrayToggleButton,
                  xraySidebarOpen ? styles.xrayToggleActive : undefined,
                  focused ? styles.buttonFocused : undefined,
                ]}
              >
                <Layers
                  size={16}
                  color={xraySidebarOpen ? AmazonDarkPalette.primaryAccent : AmazonDarkPalette.textPrimary}
                />
                <Text
                  style={[
                    styles.xrayToggleText,
                    xraySidebarOpen ? styles.xrayToggleTextActive : undefined,
                  ]}
                >
                  X-Ray
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* 3. Subtitles Cue Bar */}
      {subtitlesEnabled && activeChapter?.subtitleCue && !quizVisible && !visualBreakdownVisible && (
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitleText}>{activeChapter.subtitleCue}</Text>
        </View>
      )}

      {/* 4. DELIVERABLE 1: Non-Intrusive Visual Breakdown Card Overlay */}
      {visualBreakdownVisible && (
        <div
          id="tv-visual-breakdown-card"
          className="absolute top-20 right-8 z-35 flex w-[440px] max-w-[90vw] pointer-events-auto"
          style={{ animation: 'fadeInRight 0.25s ease-out' }}
        >
          <View style={styles.visualCardContainer}>
            <View style={styles.visualCardHeader}>
              <View style={styles.visualCardTagRow}>
                <Eye size={15} color={AmazonDarkPalette.primaryAccent} />
                <Text style={styles.visualCardTag}>
                  Visual AI Breakdown · {visualBreakdown?.detectedCategory || 'Scene Inspection'}
                </Text>
              </View>
              <Pressable
                onFocus={() => playTVFocusTick()}
                onPress={() => setVisualBreakdownVisible(false)}
              >
                {({ focused }) => (
                  <View
                    style={[
                      styles.closeIconBtn,
                      focused ? styles.buttonFocused : undefined,
                    ]}
                  >
                    <X size={15} color={AmazonDarkPalette.textSecondary} />
                  </View>
                )}
              </Pressable>
            </View>

            {loadingVision ? (
              <View style={styles.visionLoadingBox}>
                <ActivityIndicator size="small" color={AmazonDarkPalette.primaryAccent} />
                <Text style={styles.visionLoadingText}>
                  Multi-Modal Gemini 2.0 is inspecting video frame elements...
                </Text>
              </View>
            ) : visualBreakdown ? (
              <ScrollView style={styles.visionScrollBody} showsVerticalScrollIndicator={false}>
                <View style={styles.visionBodyContent}>
                  <Text style={styles.visionCardTitle}>{visualBreakdown.title}</Text>
                  <Text style={styles.visionPrimaryElement}>{visualBreakdown.primaryElement}</Text>
                  <Text style={styles.visionDetailedBreakdown}>{visualBreakdown.detailedBreakdown}</Text>

                  {/* Visual Callout Annotations */}
                  {visualBreakdown.keyAnnotations && visualBreakdown.keyAnnotations.length > 0 && (
                    <View style={styles.annotationsBlock}>
                      <Text style={styles.annotationSectionLabel}>KEY VISUAL ANNOTATIONS</Text>
                      {visualBreakdown.keyAnnotations.map((ann, idx) => (
                        <View key={`ann-${idx}`} style={styles.annotationItem}>
                          <Text style={styles.annotationLabel}>{ann.label}:</Text>
                          <Text style={styles.annotationSignificance}>{ann.significance}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.significanceBox}>
                    <Text style={styles.significanceLabel}>PEDAGOGICAL VALUE</Text>
                    <Text style={styles.significanceText}>
                      {visualBreakdown.pedagogicalSignificance}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </div>
      )}

      {/* 5. Bottom Video Controls & Transport Bar */}
      <View style={styles.bottomControlTray}>
        {/* Progress Bar with Checkpoint Pins */}
        <View style={styles.timelineContainer}>
          <View style={styles.timelineTrack}>
            <View style={[styles.timelineProgress, { width: `${progressPercent}%` }]} />
            {/* AI Checkpoint Markers along the timeline */}
            {DEFAULT_CHECKPOINTS.map((cp) => {
              const cpPct = (cp / (duration || course.durationSeconds || 1)) * 100;
              const hasPassed = currentTime >= cp;
              return (
                <View
                  key={`checkpoint-${cp}`}
                  style={[
                    styles.checkpointPin,
                    { left: `${cpPct}%` },
                    hasPassed ? styles.checkpointPinPassed : undefined,
                  ]}
                >
                  <View style={styles.checkpointDot} />
                </View>
              );
            })}
          </View>

          <View style={styles.timecodeRow}>
            <Text style={styles.timecodeText}>
              {formatTimecode(currentTime)} / {formatTimecode(duration || course.durationSeconds)}
            </Text>
            <View style={styles.checkpointLegend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Gold Dots = Gemini AI Checkpoints</Text>
            </View>
          </View>
        </View>

        {/* Transport Buttons Row */}
        <View style={styles.transportButtonsRow}>
          <View style={styles.transportLeftGroup}>
            {/* Rewind 10s */}
            <Pressable
              onFocus={() => playTVFocusTick()}
              onPress={() => handleSeekRelative(-10)}
            >
              {({ focused }) => (
                <View
                  style={[
                    styles.transportBtn,
                    focused ? styles.buttonFocused : undefined,
                  ]}
                >
                  <Rewind size={20} color={AmazonDarkPalette.textPrimary} />
                  <Text style={styles.transportBtnText}>-10s</Text>
                </View>
              )}
            </Pressable>

            {/* Play/Pause */}
            <Pressable
              onFocus={() => playTVFocusTick()}
              onPress={handlePlayPause}
            >
              {({ focused }) => (
                <View
                  style={[
                    styles.transportBtnPlay,
                    focused ? styles.buttonFocused : undefined,
                  ]}
                >
                  {paused ? (
                    <>
                      <Play size={20} color={AmazonDarkPalette.textInverse} />
                      <Text style={styles.playBtnText}>Play</Text>
                    </>
                  ) : (
                    <>
                      <Pause size={20} color={AmazonDarkPalette.textInverse} />
                      <Text style={styles.playBtnText}>Pause</Text>
                    </>
                  )}
                </View>
              )}
            </Pressable>

            {/* Fast-Forward 10s */}
            <Pressable
              onFocus={() => playTVFocusTick()}
              onPress={() => handleSeekRelative(10)}
            >
              {({ focused }) => (
                <View
                  style={[
                    styles.transportBtn,
                    focused ? styles.buttonFocused : undefined,
                  ]}
                >
                  <FastForward size={20} color={AmazonDarkPalette.textPrimary} />
                  <Text style={styles.transportBtnText}>+10s</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Right Group Controls */}
          <View style={styles.transportRightGroup}>
            {/* Trigger AI Quiz On-Demand Button */}
            <Pressable
              onFocus={() => playTVFocusTick()}
              onPress={handleManualCheckpointTrigger}
            >
              {({ focused }) => (
                <View
                  style={[
                    styles.aiQuizTriggerBtn,
                    focused ? styles.buttonFocused : undefined,
                  ]}
                >
                  <Sparkles size={16} color={AmazonDarkPalette.primaryAccent} />
                  <Text style={styles.aiQuizTriggerText}>
                    AI Quiz ({formatTimecode(currentTime)})
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Subtitles Toggle */}
            <Pressable
              onFocus={() => playTVFocusTick()}
              onPress={() => setSubtitlesEnabled((prev) => !prev)}
            >
              {({ focused }) => (
                <View
                  style={[
                    styles.transportIconBtn,
                    subtitlesEnabled ? styles.transportIconActive : undefined,
                    focused ? styles.buttonFocused : undefined,
                  ]}
                >
                  <Subtitles
                    size={18}
                    color={subtitlesEnabled ? AmazonDarkPalette.primaryAccent : AmazonDarkPalette.textSecondary}
                  />
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* 6. AI Quiz Overlay */}
      <AIQuizOverlay
        visible={quizVisible}
        isLoading={quizLoading}
        error={quizError}
        quizData={quizData}
        selectedOptionIndex={selectedOptionIndex}
        isSubmitted={isQuizSubmitted}
        isCorrect={isQuizCorrect}
        activeTimestamp={activeQuizTimestamp}
        courseTitle={course.title}
        onSelectOption={handleSelectQuizOption}
        onResumeVideo={handleResumeFromQuiz}
        onRetryQuiz={handleRetryQuiz}
      />

      {/* 7. DELIVERABLE 2: Multi-Modal Voice Assistant Overlay */}
      <VoiceAssistantOverlay
        visible={voiceAssistantOpen}
        courseTitle={course.title}
        chapterTitle={activeChapter.title}
        timestampSeconds={currentTime}
        currentSnapshot={currentSnapshotUri}
        onClose={() => setVoiceAssistantOpen(false)}
      />

      {/* 8. Lecture X-Ray Sidebar Drawer (when toggled) */}
      {xraySidebarOpen && !quizVisible && !visualBreakdownVisible && (
        <View style={styles.xrayDrawer}>
          <View style={styles.xrayDrawerHeader}>
            <Text style={styles.xrayDrawerTitle}>Lecture X-Ray</Text>
            <Text style={styles.xrayDrawerSub}>{activeChapter.title}</Text>
          </View>
          <ScrollView style={styles.xrayDrawerScroll}>
            <View style={styles.xraySection}>
              <Text style={styles.xraySectionLabel}>CORE FORMULATION</Text>
              <View style={styles.equationCard}>
                <Text style={styles.equationText}>{course.defaultXRay.coreEquation}</Text>
              </View>
            </View>
            <View style={styles.xraySection}>
              <Text style={styles.xraySectionLabel}>KEY CONCEPTS</Text>
              {course.defaultXRay.keyTakeaways.map((item, idx) => (
                <Text key={`takeaway-${idx}`} style={styles.takeawayItem}>
                  • {item}
                </Text>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </div>
  );
};

const styles = StyleSheet.create({
  videoCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AmazonDarkPalette.background,
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(11, 14, 20, 0.75)',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(11, 14, 20, 0.85)',
  },
  topBar: {
    position: 'absolute',
    top: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(26, 34, 45, 0.8)',
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
  courseHeaderMeta: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 4,
  },
  courseHeaderTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 18,
    fontWeight: '700',
  },
  chapterBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  institutionChip: {
    backgroundColor: 'rgba(255, 153, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 153, 0, 0.4)',
  },
  institutionChipText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 11,
    fontWeight: '700',
  },
  chapterTitleText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  visualAnalysisTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 34, 45, 0.88)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 153, 0, 0.35)',
  },
  voiceAssistantTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 34, 45, 0.88)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(0, 168, 225, 0.4)',
  },
  finishLectureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: AmazonDarkPalette.primaryAccent,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  finishLectureBtnText: {
    color: AmazonDarkPalette.textInverse,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnActive: {
    backgroundColor: '#1E2B3D',
    borderColor: AmazonDarkPalette.primaryAccent,
  },
  visualAnalysisTriggerText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '700',
  },
  voiceAssistantTriggerText: {
    color: '#00A8E1',
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '700',
  },
  xrayToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 34, 45, 0.8)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  xrayToggleActive: {
    borderColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: '#1E293B',
  },
  xrayToggleText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '600',
  },
  xrayToggleTextActive: {
    color: AmazonDarkPalette.primaryAccent,
  },
  subtitleContainer: {
    position: 'absolute',
    bottom: 150,
    left: 80,
    right: 80,
    alignItems: 'center',
    zIndex: 25,
  },
  subtitleText: {
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    color: '#FFFFFF',
    fontFamily: TVTypography.fontBody,
    fontSize: 18,
    lineHeight: 26,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    textAlign: 'center',
    maxWidth: 820,
  },
  visualCardContainer: {
    width: '100%',
    maxHeight: '75vh',
    backgroundColor: 'rgba(18, 26, 38, 0.97)',
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: AmazonDarkPalette.primaryAccent,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  visualCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  visualCardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visualCardTag: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  closeIconBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  visionLoadingBox: {
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  visionLoadingText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    textAlign: 'center',
  },
  visionScrollBody: {
    flex: 1,
  },
  visionBodyContent: {
    padding: 18,
    gap: 12,
  },
  visionCardTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 18,
    fontWeight: '700',
  },
  visionPrimaryElement: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '600',
  },
  visionDetailedBreakdown: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    lineHeight: 20,
  },
  annotationsBlock: {
    gap: 6,
    marginTop: 4,
  },
  annotationSectionLabel: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  annotationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 8,
    borderRadius: 6,
    gap: 2,
  },
  annotationLabel: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '700',
  },
  annotationSignificance: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    lineHeight: 18,
  },
  significanceBox: {
    backgroundColor: 'rgba(255, 153, 0, 0.08)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 153, 0, 0.25)',
    gap: 4,
  },
  significanceLabel: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 11,
    fontWeight: '700',
  },
  significanceText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomControlTray: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    zIndex: 30,
    gap: 16,
  },
  timelineContainer: {
    gap: 8,
  },
  timelineTrack: {
    position: 'relative',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'visible',
  },
  timelineProgress: {
    height: '100%',
    backgroundColor: AmazonDarkPalette.primaryAccent,
    borderRadius: 4,
  },
  checkpointPin: {
    position: 'absolute',
    top: -5,
    width: 18,
    height: 18,
    marginLeft: -9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkpointPinPassed: {
    opacity: 0.7,
  },
  checkpointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AmazonDarkPalette.primaryAccent,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#FFFFFF',
    shadowColor: AmazonDarkPalette.primaryAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  timecodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timecodeText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '600',
  },
  checkpointLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AmazonDarkPalette.primaryAccent,
  },
  legendText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
  },
  transportButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transportLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 34, 45, 0.85)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transportBtnPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: AmazonDarkPalette.primaryAccent,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  transportBtnText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '700',
  },
  playBtnText: {
    color: AmazonDarkPalette.textInverse,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '700',
  },
  transportRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiQuizTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 34, 45, 0.9)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 153, 0, 0.4)',
  },
  aiQuizTriggerText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '700',
  },
  transportIconBtn: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 34, 45, 0.85)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transportIconActive: {
    borderColor: AmazonDarkPalette.primaryAccent,
  },
  buttonFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    transform: [{ scale: 1.05 }],
    shadowColor: AmazonDarkPalette.primaryAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  xrayDrawer: {
    position: 'absolute',
    top: 80,
    right: 36,
    bottom: 120,
    width: 380,
    backgroundColor: 'rgba(26, 34, 45, 0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    gap: 16,
    zIndex: 28,
  },
  xrayDrawerHeader: {
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
  },
  xrayDrawerTitle: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 18,
    fontWeight: '700',
  },
  xrayDrawerSub: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
  },
  xrayDrawerScroll: {
    flex: 1,
  },
  xraySection: {
    gap: 8,
    marginBottom: 16,
  },
  xraySectionLabel: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  equationCard: {
    backgroundColor: '#0F1620',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 153, 0, 0.3)',
  },
  equationText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  takeawayItem: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    lineHeight: 20,
  },
});
