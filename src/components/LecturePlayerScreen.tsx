import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video, { type VideoRef } from 'react-native-video';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FastForward,
  Pause,
  Play,
  RefreshCw,
  Rewind,
  Subtitles,
  XCircle,
} from 'lucide-react';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from '../theme/colors';
import type { CourseItem, XRayInsightsData } from '../data/courses';
import { TVActionButton } from './TVActionButton';
import { playTVFocusTick, playTVSelectSound } from '../utils/tvAudio';
import { fetchTimestampQuiz } from '../services/geminiService';

export interface LecturePlayerScreenProps {
  course: CourseItem;
  initialOpenXRay?: boolean;
  onUpdateProgress: (courseId: string, percent: number) => void;
  onClosePlayer: () => void;
}

function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const PRESET_QUESTIONS = [
  'Explain the physical intuition behind this equation',
  'What is the key engineering bottleneck here?',
  'How is this validated experimentally?',
];

export const LecturePlayerScreen: React.FC<LecturePlayerScreenProps> = ({
  course,
  initialOpenXRay = false,
  onUpdateProgress,
  onClosePlayer,
}) => {
  const videoRef = useRef<VideoRef | null>(null);
  const initialStart = useMemo(
    () => Math.floor((course.initialProgressPercent / 100) * course.durationSeconds * 0.6),
    [course.initialProgressPercent, course.durationSeconds]
  );

  const [paused, setPaused] = useState<boolean>(false);
  const [subtitlesOn, setSubtitlesOn] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(initialStart);
  const [duration, setDuration] = useState<number>(course.durationSeconds);
  const [xrayOpen, setXrayOpen] = useState<boolean>(initialOpenXRay);

  const [xrayData, setXrayData] = useState<XRayInsightsData>(course.defaultXRay);
  const [loadingXRay, setLoadingXRay] = useState<boolean>(false);
  const [selectedQuizIdx, setSelectedQuizIdx] = useState<number | null>(null);

  const [tutorAnswer, setTutorAnswer] = useState<string>('');
  const [loadingTutor, setLoadingTutor] = useState<boolean>(false);

  useEffect(() => {
    if (initialStart > 0) {
      const id = window.setTimeout(() => {
        videoRef.current?.seek(initialStart);
      }, 60);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [initialStart]);

  const activeChapter = useMemo(() => {
    let current = course.chapters[0];
    for (const ch of course.chapters) {
      if (currentTime >= ch.startSeconds) {
        current = ch;
      }
    }
    return current;
  }, [course.chapters, currentTime]);

  const durationRef = useRef<number>(course.durationSeconds);
  durationRef.current = duration;

  const currentTimeRef = useRef<number>(initialStart);
  currentTimeRef.current = currentTime;

  const activeChapterRef = useRef(activeChapter);
  activeChapterRef.current = activeChapter;

  const refreshXRayWithGemini = useCallback(async () => {
    setLoadingXRay(true);
    setSelectedQuizIdx(null);
    const currTime = currentTimeRef.current;
    const currChapter = activeChapterRef.current;
    try {
      const [insightsRes, quizPayload] = await Promise.allSettled([
        fetch('/api/ai/xray-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseTitle: course.title,
            instructor: course.instructor,
            chapterTitle: currChapter.title,
            timestampFormatted: formatTimecode(currTime),
            transcriptSnippet: currChapter.transcriptSnippet,
            fallbackInsights: course.defaultXRay,
          }),
        }).then((r) => r.json()),
        fetchTimestampQuiz(
          course.title,
          Math.floor(currTime),
          currChapter.transcriptSnippet
        ),
      ]);

      const data = insightsRes.status === 'fulfilled' ? insightsRes.value : null;
      const quiz = quizPayload.status === 'fulfilled' ? quizPayload.value : null;

      setXrayData({
        summary: quiz?.summary || data?.summary || course.defaultXRay.summary,
        keyTakeaways: data?.keyTakeaways ?? course.defaultXRay.keyTakeaways,
        coreEquation: data?.coreEquation ?? course.defaultXRay.coreEquation,
        quizQuestion: quiz?.quiz?.question || data?.quizQuestion || course.defaultXRay.quizQuestion,
        quizOptions: quiz?.quiz?.options || data?.quizOptions || course.defaultXRay.quizOptions,
        correctOptionIndex: quiz?.quiz?.correctIndex ?? data?.correctOptionIndex ?? 0,
        explanation: data?.explanation ?? course.defaultXRay.explanation,
      });
    } catch {
      setXrayData(course.defaultXRay);
    } finally {
      setLoadingXRay(false);
    }
  }, [course]);

  useEffect(() => {
    if (xrayOpen) {
      refreshXRayWithGemini();
    }
  }, [xrayOpen, activeChapter.id, refreshXRayWithGemini]);

  const handleVideoLoad = useCallback((meta: { duration: number }) => {
    if (meta.duration > 0) {
      setDuration(meta.duration);
    }
  }, []);

  const handleVideoProgress = useCallback(
    (prog: { currentTime: number }) => {
      setCurrentTime(prog.currentTime);
      const curDur = durationRef.current || course.durationSeconds || 1;
      const pct = Math.round((prog.currentTime / curDur) * 100);
      onUpdateProgress(course.id, pct);
    },
    [course.id, course.durationSeconds, onUpdateProgress]
  );

  const handleAskPresetQuestion = async (question: string) => {
    setLoadingTutor(true);
    try {
      const response = await fetch('/api/ai/ask-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: course.title,
          chapterTitle: activeChapter.title,
          question,
        }),
      });
      const data = await response.json();
      if (data.answer) {
        setTutorAnswer(data.answer);
      }
    } catch {
      setTutorAnswer(
        `In ${activeChapter.title}, isolate the primary coupling constant first to see how noise scales with system size.`
      );
    } finally {
      setLoadingTutor(false);
    }
  };

  const handleSeekRelative = (deltaSec: number) => {
    const next = Math.max(0, Math.min(duration, currentTime + deltaSec));
    setCurrentTime(next);
    videoRef.current?.seek(next);
  };

  const handleSelectChapter = (startSeconds: number) => {
    setCurrentTime(startSeconds);
    videoRef.current?.seek(startSeconds);
  };

  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div id="tv-player-scope" style={{ width: '100%', minHeight: '100vh', backgroundColor: '#0B0E14' }}>
      <View style={styles.playerRoot}>
        {/* Main Split: Video Stage + Optional Prime Video X-Ray Study Companion */}
        <View style={styles.stageRow}>
          <View style={[styles.videoColumn, xrayOpen ? styles.videoColumnCompact : undefined]}>
            <View style={styles.videoViewport}>
              <Video
                ref={videoRef}
                source={{
                  uri: course.videoUri,
                  poster: course.heroUri,
                  lectureTheme: course.lectureTheme,
                  durationSeconds: course.durationSeconds,
                }}
                paused={paused}
                onLoad={handleVideoLoad}
                onProgress={handleVideoProgress}
                style={styles.videoElement}
              />

              {/* Top Overlay Header Inside Video Frame */}
              <View style={styles.topVideoScrim}>
                <View style={styles.topBarLeft}>
                  <TVActionButton
                    label="Back to Browse"
                    variant="subtle"
                    icon={<ArrowLeft size={18} color={AmazonDarkPalette.textPrimary} />}
                    onPress={onClosePlayer}
                  />
                  <View style={styles.lectureMetaBlock}>
                    <Text style={styles.lectureTitle} numberOfLines={1}>
                      {course.title}
                    </Text>
                    <Text style={styles.lectureSub} numberOfLines={1}>
                      {course.instructor} · {activeChapter.title}
                    </Text>
                  </View>
                </View>

                <TVActionButton
                  label={xrayOpen ? 'Hide X-Ray Guide' : 'X-Ray Study Guide'}
                  variant={xrayOpen ? 'primary' : 'secondary'}
                  icon={
                    <BookOpen
                      size={18}
                      color={
                        xrayOpen
                          ? AmazonDarkPalette.textInverse
                          : AmazonDarkPalette.primaryAccent
                      }
                    />
                  }
                  onPress={() => setXrayOpen((prev) => !prev)}
                />
              </View>

              {/* High-Contrast 10-Foot Closed Captions */}
              {subtitlesOn ? (
                <View style={styles.captionOverlay}>
                  <View style={styles.captionBox}>
                    <Text style={styles.captionText}>{activeChapter.subtitleCue}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Fire TV D-Pad Transport Scrubber & Controls */}
            <View style={styles.transportDeck}>
              <View style={styles.scrubberRow}>
                <Text style={styles.timecodeText}>{formatTimecode(currentTime)}</Text>
                <View style={styles.scrubberTrack}>
                  <View
                    style={[
                      styles.scrubberFill,
                      { width: `${Math.max(1, progressRatio * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.timecodeText}>{formatTimecode(duration)}</Text>
              </View>

              <View style={styles.controlsButtonRow}>
                <View style={styles.transportCluster}>
                  <TVActionButton
                    hasTVPreferredFocus={!initialOpenXRay}
                    label={paused ? 'Play' : 'Pause'}
                    variant="primary"
                    icon={
                      paused ? (
                        <Play size={18} color={AmazonDarkPalette.textInverse} />
                      ) : (
                        <Pause size={18} color={AmazonDarkPalette.textInverse} />
                      )
                    }
                    onPress={() => setPaused((p) => !p)}
                  />
                  <TVActionButton
                    label="-15s"
                    variant="secondary"
                    icon={<Rewind size={17} color={AmazonDarkPalette.textPrimary} />}
                    onPress={() => handleSeekRelative(-15)}
                  />
                  <TVActionButton
                    label="+15s"
                    variant="secondary"
                    icon={<FastForward size={17} color={AmazonDarkPalette.textPrimary} />}
                    onPress={() => handleSeekRelative(15)}
                  />
                  <TVActionButton
                    label={subtitlesOn ? 'Captions: On' : 'Captions: Off'}
                    variant="secondary"
                    isSelected={subtitlesOn}
                    icon={<Subtitles size={17} color={AmazonDarkPalette.textPrimary} />}
                    onPress={() => setSubtitlesOn((s) => !s)}
                  />
                </View>

                {/* Chapter Selector Buttons */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chapterStrip}
                >
                  {course.chapters.map((ch) => {
                    const isCurrent = ch.id === activeChapter.id;
                    return (
                      <Pressable
                        key={ch.id}
                        onFocus={() => playTVFocusTick()}
                        onPress={() => {
                          playTVSelectSound();
                          handleSelectChapter(ch.startSeconds);
                        }}
                      >
                        {({ focused }) => (
                          <View
                            style={[
                              styles.chapterBtn,
                              isCurrent ? styles.chapterBtnActive : undefined,
                              focused ? styles.chapterBtnFocused : undefined,
                            ]}
                          >
                            <Text style={styles.chapterBtnTitle} numberOfLines={1}>
                              {ch.title}
                            </Text>
                            <Text style={styles.chapterBtnMeta}>
                              {formatTimecode(ch.startSeconds)}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Right Zone: Prime Video X-Ray AI Study Companion */}
          {xrayOpen ? (
            <View style={styles.xrayPanel}>
              <View style={styles.xrayHeader}>
                <View>
                  <Text style={styles.xrayHeading}>X-Ray Study Insights</Text>
                  <Text style={styles.xraySubheading} numberOfLines={1}>
                    Synced to {activeChapter.title}
                  </Text>
                </View>
                <TVActionButton
                  hasTVPreferredFocus={initialOpenXRay}
                  label={loadingXRay ? 'Syncing...' : 'Refresh'}
                  variant="subtle"
                  icon={<RefreshCw size={15} color={AmazonDarkPalette.primaryAccent} />}
                  onPress={refreshXRayWithGemini}
                />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.xrayScrollContent}
              >
                <Text style={styles.xraySummaryText}>{xrayData.summary}</Text>

                {/* Canonical Equation / Invariant */}
                <View style={styles.equationSurface}>
                  <Text style={styles.sectionKicker}>Core Invariant</Text>
                  <Text style={styles.equationMono}>{xrayData.coreEquation}</Text>
                </View>

                {/* Key Lecture Takeaways */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionKicker}>Chapter Takeaways</Text>
                  {xrayData.keyTakeaways.map((point, idx) => (
                    <Text key={idx} style={styles.takeawayLine}>
                      {idx + 1}. {point}
                    </Text>
                  ))}
                </View>

                {/* D-Pad Mastery Check Quiz */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionKicker}>Concept Check (Select with D-Pad)</Text>
                  <Text style={styles.quizPrompt}>{xrayData.quizQuestion}</Text>
                  <View style={styles.quizOptionsStack}>
                    {xrayData.quizOptions.map((option, idx) => {
                      const isPicked = selectedQuizIdx === idx;
                      const isCorrect = idx === xrayData.correctOptionIndex;
                      return (
                        <Pressable
                          key={idx}
                          onFocus={() => playTVFocusTick()}
                          onPress={() => {
                            playTVSelectSound();
                            setSelectedQuizIdx(idx);
                          }}
                        >
                          {({ focused }) => (
                            <View
                              style={[
                                styles.quizOptionBtn,
                                isPicked && isCorrect ? styles.quizOptionCorrect : undefined,
                                isPicked && !isCorrect ? styles.quizOptionWrong : undefined,
                                focused ? styles.quizOptionFocused : undefined,
                              ]}
                            >
                              <View style={styles.quizOptionRow}>
                                {isPicked ? (
                                  isCorrect ? (
                                    <CheckCircle2
                                      size={18}
                                      color={AmazonDarkPalette.statusCompleted}
                                    />
                                  ) : (
                                    <XCircle size={18} color={AmazonDarkPalette.statusAlert} />
                                  )
                                ) : null}
                                <Text style={styles.quizOptionLabel}>{option}</Text>
                              </View>
                              {isPicked ? (
                                <Text style={styles.quizStatusLabel}>
                                  {isCorrect
                                    ? `Correct · ${xrayData.explanation}`
                                    : 'Try another option · Re-examine the chapter invariant'}
                                </Text>
                              ) : null}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* One-Press TV Remote Tutor Prompts */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionKicker}>Ask Lecture Tutor</Text>
                  <View style={styles.quizOptionsStack}>
                    {PRESET_QUESTIONS.map((q) => (
                      <Pressable
                        key={q}
                        onFocus={() => playTVFocusTick()}
                        onPress={() => {
                          playTVSelectSound();
                          handleAskPresetQuestion(q);
                        }}
                      >
                        {({ focused }) => (
                          <View
                            style={[
                              styles.promptBtn,
                              focused ? styles.quizOptionFocused : undefined,
                            ]}
                          >
                            <Text style={styles.promptBtnText}>{q}</Text>
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </View>
                  {loadingTutor ? (
                    <Text style={styles.tutorResponseText}>Synthesizing explanation...</Text>
                  ) : tutorAnswer ? (
                    <Text style={styles.tutorResponseText}>{tutorAnswer}</Text>
                  ) : null}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>
    </div>
  );
};

const styles = StyleSheet.create({
  playerRoot: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: AmazonDarkPalette.background,
    paddingHorizontal: 40,
    paddingVertical: 28,
    gap: 20,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 24,
    width: '100%',
  },
  videoColumn: {
    flex: 1,
    gap: 18,
  },
  videoColumnCompact: {
    flex: 1,
  },
  videoViewport: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 620,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: AmazonDarkPalette.surfaceSubtle,
    borderWidth: 1,
    borderColor: AmazonDarkPalette.borderSubtle,
  },
  videoElement: {
    width: '100%',
    height: '100%',
  },
  topVideoScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    backgroundColor: 'rgba(11, 14, 20, 0.72)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flex: 1,
  },
  lectureMetaBlock: {
    gap: 2,
    flex: 1,
  },
  lectureTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 22,
    fontWeight: '700',
  },
  lectureSub: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
  },
  captionOverlay: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 24,
    alignItems: 'center',
  },
  captionBox: {
    maxWidth: 780,
    backgroundColor: 'rgba(11, 14, 20, 0.88)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AmazonDarkPalette.borderSubtle,
  },
  captionText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
  },
  transportDeck: {
    backgroundColor: AmazonDarkPalette.card,
    borderRadius: 12,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: AmazonDarkPalette.borderSubtle,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  timecodeText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontMono,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  scrubberTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
  },
  scrubberFill: {
    height: '100%',
    backgroundColor: AmazonDarkPalette.primaryAccent,
  },
  controlsButtonRow: {
    flexDirection: 'column',
    gap: 16,
  },
  transportCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  chapterStrip: {
    gap: 12,
    paddingVertical: 4,
  },
  chapterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: AmazonDarkPalette.surfaceSubtle,
    borderWidth: TVFocusConfig.borderWidthFocused,
    borderColor: AmazonDarkPalette.borderSubtle,
    minWidth: 220,
    maxWidth: 270,
    gap: 3,
  },
  chapterBtnActive: {
    backgroundColor: AmazonDarkPalette.surfaceElevated,
    borderColor: AmazonDarkPalette.textSecondary,
  },
  chapterBtnFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: AmazonDarkPalette.surfaceElevated,
  },
  chapterBtnTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '600',
  },
  chapterBtnMeta: {
    color: AmazonDarkPalette.textMuted,
    fontFamily: TVTypography.fontMono,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  xrayPanel: {
    width: 440,
    backgroundColor: AmazonDarkPalette.card,
    borderRadius: 14,
    padding: 24,
    gap: 18,
    borderWidth: 1,
    borderColor: AmazonDarkPalette.borderSubtle,
    maxHeight: 820,
  },
  xrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: AmazonDarkPalette.borderSubtle,
  },
  xrayHeading: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 21,
    fontWeight: '700',
  },
  xraySubheading: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
  },
  xrayScrollContent: {
    gap: 20,
    paddingBottom: 12,
  },
  xraySummaryText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 15,
    lineHeight: 23,
  },
  equationSurface: {
    backgroundColor: AmazonDarkPalette.surfaceSubtle,
    borderRadius: 10,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: AmazonDarkPalette.borderSubtle,
  },
  sectionKicker: {
    color: AmazonDarkPalette.textMuted,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '600',
  },
  equationMono: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontMono,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  sectionBlock: {
    gap: 10,
  },
  takeawayLine: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    lineHeight: 21,
  },
  quizPrompt: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  quizOptionsStack: {
    gap: 10,
  },
  quizOptionBtn: {
    padding: 13,
    borderRadius: 10,
    backgroundColor: AmazonDarkPalette.surfaceSubtle,
    borderWidth: TVFocusConfig.borderWidthFocused,
    borderColor: AmazonDarkPalette.borderSubtle,
    gap: 6,
  },
  quizOptionFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: AmazonDarkPalette.surfaceElevated,
  },
  quizOptionCorrect: {
    borderColor: AmazonDarkPalette.statusCompleted,
  },
  quizOptionWrong: {
    borderColor: AmazonDarkPalette.statusAlert,
  },
  quizOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quizOptionLabel: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  quizStatusLabel: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    lineHeight: 19,
  },
  promptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: AmazonDarkPalette.surfaceSubtle,
    borderWidth: TVFocusConfig.borderWidthFocused,
    borderColor: AmazonDarkPalette.borderSubtle,
  },
  promptBtnText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '500',
  },
  tutorResponseText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    lineHeight: 22,
    paddingTop: 4,
  },
});

export default LecturePlayerScreen;
