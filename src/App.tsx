import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bookmark, BookOpen, Check, Play, User } from 'lucide-react';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from './theme/colors';
import {
  AmazonHeader,
  type LearnerProfile,
  type TVHeaderTab,
} from './components/AmazonHeader';
import { FocusableCard } from './components/FocusableCard';
import { TVActionButton } from './components/TVActionButton';
import { PlayerScreen } from './screens/PlayerScreen';
import { SummaryScreen, type QuizAttemptRecord } from './screens/SummaryScreen';
import { TVSearchOverlay } from './components/TVSearchOverlay';
import { FireTVRemoteSimulator } from './components/FireTVRemoteSimulator';
import {
  COURSES_CATALOG,
  LEARNER_PROFILES,
  type CourseItem,
} from './data/courses';
import { HomeScreen } from './screens/HomeScreen';
import { useSpatialDPadNavigation } from './navigation/useSpatialDPadNavigation';
import { playTVFocusTick, playTVSelectSound } from './utils/tvAudio';

interface ActivePlayerState {
  course: CourseItem;
  openXRayImmediately: boolean;
}

interface ActiveSummaryState {
  course: CourseItem;
  quizAttempts: QuizAttemptRecord[];
  watchedSeconds: number;
  visualCount: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TVHeaderTab>('home');
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [activeProfile, setActiveProfile] = useState<LearnerProfile>(
    LEARNER_PROFILES[0]
  );

  // Featured hero course updates dynamically as the user focuses course cards via D-Pad
  const [spotlightCourseId, setSpotlightCourseId] = useState<string>(
    COURSES_CATALOG[0].id
  );
  const [playerState, setPlayerState] = useState<ActivePlayerState | null>(null);
  const [summaryState, setSummaryState] = useState<ActiveSummaryState | null>(null);

  const [progressByCourse, setProgressByCourse] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const c of COURSES_CATALOG) {
      initial[c.id] = c.initialProgressPercent;
    }
    return initial;
  });

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([
    'quantum-error-correction',
    'transformer-scaling-laws',
  ]);

  const spotlightCourse = useMemo(
    () =>
      COURSES_CATALOG.find((c) => c.id === spotlightCourseId) ?? COURSES_CATALOG[0],
    [spotlightCourseId]
  );

  const handleBackNavigation = useCallback((): boolean => {
    if (profileModalOpen) {
      setProfileModalOpen(false);
      return true;
    }
    if (summaryState) {
      setSummaryState(null);
      return true;
    }
    if (playerState) {
      setPlayerState(null);
      return true;
    }
    if (searchOpen) {
      setSearchOpen(false);
      return true;
    }
    if (activeTab !== 'home') {
      setActiveTab('home');
      return true;
    }
    return false;
  }, [profileModalOpen, summaryState, playerState, searchOpen, activeTab]);

  const activeScopeSelector = profileModalOpen
    ? '#tv-profile-modal'
    : summaryState
      ? '#tv-summary-screen'
      : playerState
        ? '#tv-player-scope'
        : undefined;

  const { triggerDPadAction } = useSpatialDPadNavigation({
    onBack: handleBackNavigation,
    scopeSelector: activeScopeSelector,
  });

  const handleLaunchCourse = useCallback(
    (courseId: string, openXRayImmediately = false) => {
      const target = COURSES_CATALOG.find((c) => c.id === courseId);
      if (target) {
        setSearchOpen(false);
        setSummaryState(null);
        setPlayerState({ course: target, openXRayImmediately });
      }
    },
    []
  );

  const handleToggleBookmark = useCallback((courseId: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  }, []);

  const handleUpdateProgress = useCallback((courseId: string, percent: number) => {
    setProgressByCourse((prev) => ({
      ...prev,
      [courseId]: Math.max(prev[courseId] ?? 0, Math.min(100, percent)),
    }));
  }, []);

  const continueWatchingCourses = useMemo(
    () => COURSES_CATALOG.filter((c) => (progressByCourse[c.id] ?? 0) > 0),
    [progressByCourse]
  );

  const aiAndRoboticsCourses = useMemo(
    () =>
      COURSES_CATALOG.filter(
        (c) => c.category === 'ai' || c.category === 'robotics' || c.category === 'quantum'
      ),
    []
  );

  const tabFilteredCourses = useMemo(() => {
    if (activeTab === 'labs') {
      return COURSES_CATALOG.filter((c) => c.isLiveLab);
    }
    if (activeTab === 'library') {
      return COURSES_CATALOG.filter((c) => bookmarkedIds.includes(c.id));
    }
    return COURSES_CATALOG;
  }, [activeTab, bookmarkedIds]);

  const isSpotlightSaved = bookmarkedIds.includes(spotlightCourse.id);

  // Deliverable 3: Post-Video Infographic & Flashcards Route
  if (summaryState) {
    return (
      <>
        <SummaryScreen
          course={summaryState.course}
          quizAttempts={summaryState.quizAttempts}
          watchedDurationSeconds={summaryState.watchedSeconds}
          visualBreakdownsCount={summaryState.visualCount}
          onReplayLecture={() => {
            const courseToReplay = summaryState.course;
            setSummaryState(null);
            setPlayerState({ course: courseToReplay, openXRayImmediately: false });
          }}
          onBackToBrowse={() => setSummaryState(null)}
        />
        <FireTVRemoteSimulator onDPadAction={triggerDPadAction} />
      </>
    );
  }

  // Full-Screen Fire TV Lecture Player Route
  if (playerState) {
    const currentProgressPct = progressByCourse[playerState.course.id] ?? 0;
    const initialStart = Math.floor(
      (currentProgressPct / 100) * playerState.course.durationSeconds * 0.5
    );
    return (
      <>
        <PlayerScreen
          course={playerState.course}
          initialStartSeconds={initialStart}
          initialOpenXRay={playerState.openXRayImmediately}
          onUpdateProgress={handleUpdateProgress}
          onCompleteLecture={(attempts, watchedSec, visCount) => {
            setSummaryState({
              course: playerState.course,
              quizAttempts: attempts,
              watchedSeconds: watchedSec,
              visualCount: visCount,
            });
            setPlayerState(null);
          }}
          onBack={() => setPlayerState(null)}
        />
        <FireTVRemoteSimulator onDPadAction={triggerDPadAction} />
      </>
    );
  }

  return (
    <View style={styles.screenCanvas}>
      {/* Deliverable 4: Amazon Prime Video / Fire TV Top Bar */}
      <AmazonHeader
        activeTab={activeTab}
        isSearchActive={searchOpen}
        activeProfile={activeProfile}
        onSelectTab={(tab) => {
          setSearchOpen(false);
          setActiveTab(tab);
        }}
        onOpenSearch={() => setSearchOpen((prev) => !prev)}
        onOpenProfileModal={() => setProfileModalOpen(true)}
      />

      {searchOpen ? (
        <>
          <AmazonHeader
            activeTab={activeTab}
            isSearchActive={searchOpen}
            activeProfile={activeProfile}
            onSelectTab={(tab) => {
              setSearchOpen(false);
              setActiveTab(tab);
            }}
            onOpenSearch={() => setSearchOpen((prev) => !prev)}
            onOpenProfileModal={() => setProfileModalOpen(true)}
          />
          <TVSearchOverlay
            query={searchQuery}
            courses={COURSES_CATALOG}
            progressMap={progressByCourse}
            bookmarkedIds={bookmarkedIds}
            onChangeQuery={setSearchQuery}
            onSelectCourse={(id) => handleLaunchCourse(id, false)}
            onCloseSearch={() => setSearchOpen(false)}
          />
        </>
      ) : activeTab === 'home' ? (
        <HomeScreen
          activeTab={activeTab}
          activeProfile={activeProfile}
          progressMap={progressByCourse}
          bookmarkedIds={bookmarkedIds}
          isSearchActive={searchOpen}
          onSelectTab={(tab) => {
            setSearchOpen(false);
            setActiveTab(tab);
          }}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenProfileModal={() => setProfileModalOpen(true)}
          onLaunchCourse={handleLaunchCourse}
          onToggleWatchlist={handleToggleBookmark}
        />
      ) : (
        /* Category Tab Views: Courses, Live Labs, My Stuff */
        <View style={styles.categoryViewWrapper}>
          <View style={styles.categoryHeaderBlock}>
            <Text style={styles.categoryTitle}>
              {activeTab === 'courses'
                ? 'University Course Catalog'
                : activeTab === 'labs'
                  ? 'Interactive X-Ray Lab Seminars'
                  : `${activeProfile.name}'s Saved Library`}
            </Text>
            <Text style={styles.categorySubtitle}>
              {activeTab === 'courses'
                ? 'Select any lecture with your Fire TV Remote to stream in 4K UHD with live X-Ray study notes.'
                : activeTab === 'labs'
                  ? 'Hands-on laboratory sessions with real-time equation breakdowns and comprehension checks.'
                  : 'Bookmarked courses and in-progress lectures synced to your learner profile.'}
            </Text>
          </View>

          {tabFilteredCourses.length === 0 ? (
            <View style={styles.emptyLibraryCard}>
              <Text style={styles.emptyLibraryTitle}>Your watchlist is currently empty</Text>
              <Text style={styles.emptyLibrarySub}>
                Browse Home or Courses and select Add to My Stuff on any lecture.
              </Text>
              <TVActionButton
                hasTVPreferredFocus
                label="Explore Courses"
                variant="primary"
                onPress={() => setActiveTab('home')}
              />
            </View>
          ) : (
            <View style={styles.categoryGrid}>
              {tabFilteredCourses.map((course, idx) => (
                <FocusableCard
                  key={`tab-${course.id}`}
                  id={course.id}
                  hasTVPreferredFocus={idx === 0}
                  title={course.title}
                  instructor={course.instructor}
                  institution={course.institution}
                  moduleCount={course.moduleCount}
                  duration={course.duration}
                  thumbnailUri={course.thumbnailUri}
                  progressPercent={progressByCourse[course.id]}
                  isBookmarked={bookmarkedIds.includes(course.id)}
                  width={356}
                  onPressCard={(id) =>
                    handleLaunchCourse(id, activeTab === 'labs')
                  }
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Who's Learning? Fire TV Profile Switcher Modal */}
      {profileModalOpen ? (
        <div
          id="tv-profile-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0E14]/90 p-8 backdrop-blur-md"
        >
          <View style={styles.modalDialog}>
            <Text style={styles.modalTitle}>Who&apos;s Learning Today?</Text>
            <Text style={styles.modalSubtitle}>
              Switch learner profiles to personalize course progress and saved lectures.
            </Text>

            <View style={styles.profileCardsRow}>
              {LEARNER_PROFILES.map((profile) => {
                const isSelected = profile.id === activeProfile.id;
                return (
                  <Pressable
                    key={profile.id}
                    hasTVPreferredFocus={isSelected}
                    onFocus={() => playTVFocusTick()}
                    onPress={() => {
                      playTVSelectSound();
                      setActiveProfile(profile);
                      setProfileModalOpen(false);
                    }}
                  >
                    {({ focused }) => (
                      <View
                        style={[
                          styles.profileCard,
                          isSelected ? styles.profileCardActive : undefined,
                          focused ? styles.profileCardFocused : undefined,
                        ]}
                      >
                        <View style={styles.profileAvatarLarge}>
                          <User size={28} color={AmazonDarkPalette.textInverse} />
                        </View>
                        <Text style={styles.profileCardName} numberOfLines={1}>
                          {profile.name}
                        </Text>
                        <Text style={styles.profileCardRole} numberOfLines={1}>
                          {profile.role}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalFooterRow}>
              <TVActionButton
                label="Cancel"
                variant="subtle"
                onPress={() => setProfileModalOpen(false)}
              />
            </View>
          </View>
        </div>
      ) : null}

      {/* Interactive Fire TV Remote D-Pad Companion */}
      <FireTVRemoteSimulator onDPadAction={triggerDPadAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenCanvas: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: AmazonDarkPalette.background,
    paddingBottom: 64,
  },
  browseBody: {
    width: '100%',
    gap: 28,
  },
  heroBannerSection: {
    position: 'relative',
    width: '100%',
    minHeight: 450,
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 44,
    overflow: 'hidden',
  },
  heroBackdropContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '68%',
    overflow: 'hidden',
  },
  heroBackdropImage: {
    width: '100%',
    height: '100%',
  },
  heroContentColumn: {
    position: 'relative',
    zIndex: 5,
    maxWidth: 660,
    gap: 14,
  },
  heroKicker: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  heroHeadline: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: TVTypography.heroTitle,
    fontWeight: '700',
    lineHeight: 54,
    letterSpacing: -0.5,
  },
  heroMetadataLine: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 16,
    fontWeight: '500',
  },
  heroSynopsis: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 600,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 8,
  },
  railsStack: {
    gap: 34,
    paddingBottom: 24,
  },
  railSection: {
    gap: 14,
  },
  railHeading: {
    paddingHorizontal: 48,
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: TVTypography.sectionTitle,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  railScrollRow: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    gap: 24,
  },
  categoryViewWrapper: {
    paddingHorizontal: 48,
    paddingVertical: 36,
    gap: 28,
  },
  categoryHeaderBlock: {
    gap: 8,
    maxWidth: 720,
  },
  categoryTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 34,
    fontWeight: '700',
  },
  categorySubtitle: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 17,
    lineHeight: 26,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 26,
    paddingVertical: 8,
  },
  emptyLibraryCard: {
    maxWidth: 540,
    backgroundColor: AmazonDarkPalette.card,
    borderRadius: 14,
    padding: 32,
    gap: 14,
    borderWidth: 1,
    borderColor: AmazonDarkPalette.borderSubtle,
    alignItems: 'flex-start',
  },
  emptyLibraryTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 22,
    fontWeight: '700',
  },
  emptyLibrarySub: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 16,
    lineHeight: 24,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: AmazonDarkPalette.card,
    borderRadius: 16,
    padding: 36,
    gap: 24,
    borderWidth: 1,
    borderColor: AmazonDarkPalette.borderMuted,
    alignItems: 'center',
  },
  modalTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 16,
    textAlign: 'center',
  },
  profileCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
    paddingVertical: 8,
  },
  profileCard: {
    width: 220,
    padding: 24,
    borderRadius: 14,
    backgroundColor: AmazonDarkPalette.surfaceSubtle,
    borderWidth: TVFocusConfig.borderWidthFocused,
    borderColor: AmazonDarkPalette.borderSubtle,
    alignItems: 'center',
    gap: 10,
  },
  profileCardActive: {
    borderColor: AmazonDarkPalette.textSecondary,
  },
  profileCardFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: AmazonDarkPalette.surfaceElevated,
  },
  profileAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AmazonDarkPalette.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  profileCardName: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 19,
    fontWeight: '700',
  },
  profileCardRole: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
  },
  modalFooterRow: {
    marginTop: 4,
  },
});
