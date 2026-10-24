import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AmazonDarkPalette } from '../theme/colors';
import {
  AmazonHeader,
  type LearnerProfile,
  type TVHeaderTab,
} from '../components/AmazonHeader';
import { AmazonHeroBanner } from '../components/AmazonHeroBanner';
import { ContentCarousel } from '../components/ContentCarousel';
import {
  COURSES_CATALOG,
  LEARNER_PROFILES,
  type CourseItem,
} from '../data/courses';

export interface HomeScreenProps {
  activeTab?: TVHeaderTab;
  activeProfile?: LearnerProfile;
  progressMap: Record<string, number>;
  bookmarkedIds: string[];
  isSearchActive?: boolean;
  onSelectTab: (tab: TVHeaderTab) => void;
  onOpenSearch: () => void;
  onOpenProfileModal: () => void;
  onLaunchCourse: (courseId: string, openXRay?: boolean) => void;
  onToggleWatchlist: (courseId: string) => void;
}

/**
 * HomeScreen: Main Amazon Fire TV interface for ClassStream AI.
 * - Integrates AmazonHeader, high-impact AmazonHeroBanner, and multiple ContentCarousel rows
 * - Orchestrates seamless Vertical (Up/Down) D-Pad navigation between rows
 * - Features categories: "Continue Learning", "Popular Science", "History Deep Dives",
 *   "Frontier AI & Robotics Engineering", and "Quantum Mechanics & Supercomputing"
 */
export const HomeScreen: React.FC<HomeScreenProps> = ({
  activeTab = 'home',
  activeProfile = LEARNER_PROFILES[0],
  progressMap,
  bookmarkedIds,
  isSearchActive = false,
  onSelectTab,
  onOpenSearch,
  onOpenProfileModal,
  onLaunchCourse,
  onToggleWatchlist,
}) => {
  // Hero spotlight updates when user browses or focuses cards
  const [spotlightId, setSpotlightId] = useState<string>(COURSES_CATALOG[0].id);
  const verticalScrollRef = useRef<HTMLDivElement | null>(null);

  const spotlightCourse = useMemo(
    () => COURSES_CATALOG.find((c) => c.id === spotlightId) ?? COURSES_CATALOG[0],
    [spotlightId]
  );

  const handleCardFocused = useCallback((courseId: string) => {
    setSpotlightId(courseId);
  }, []);

  // Filter courses into curated thematic rows matching prompt
  const continueWatching = useMemo(
    () => COURSES_CATALOG.filter((c) => (progressMap[c.id] ?? 0) > 0),
    [progressMap]
  );

  const popularScience = useMemo(
    () =>
      COURSES_CATALOG.filter(
        (c) =>
          c.category === 'popular-science' ||
          c.category === 'science' ||
          c.id === 'abyssal-geobiology' ||
          c.id === 'relativistic-astrophysics'
      ),
    []
  );

  const historyDeepDives = useMemo(
    () =>
      COURSES_CATALOG.filter(
        (c) =>
          c.category === 'history' ||
          c.id === 'origins-of-computation' ||
          c.id === 'programmable-gene-editing'
      ),
    []
  );

  const frontierAiAndRobotics = useMemo(
    () =>
      COURSES_CATALOG.filter(
        (c) => c.category === 'ai' || c.category === 'robotics'
      ),
    []
  );

  const quantumEngineering = useMemo(
    () =>
      COURSES_CATALOG.filter(
        (c) => c.category === 'quantum' || c.id === 'quantum-error-correction'
      ),
    []
  );

  return (
    <View style={styles.screenContainer}>
      {/* 1. Prime Video / Fire TV Top Bar */}
      <AmazonHeader
        activeTab={activeTab}
        isSearchActive={isSearchActive}
        activeProfile={activeProfile}
        onSelectTab={onSelectTab}
        onOpenSearch={onOpenSearch}
        onOpenProfileModal={onOpenProfileModal}
      />

      {/* Main Vertical Scroll Container with Smooth Up/Down D-Pad Navigation */}
      <ScrollView
        ref={verticalScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
      >
        {/* 2. High-Impact Amazon Hero Banner */}
        <AmazonHeroBanner
          course={spotlightCourse}
          progressPercent={progressMap[spotlightCourse.id] ?? spotlightCourse.initialProgressPercent}
          isBookmarked={bookmarkedIds.includes(spotlightCourse.id)}
          hasTVPreferredFocus={true}
          onWatch={(id) => onLaunchCourse(id, false)}
          onOpenXRay={(id) => onLaunchCourse(id, true)}
          onToggleWatchlist={onToggleWatchlist}
        />

        {/* 3. Multiple ContentCarousel Video Rails */}
        <View style={styles.carouselsContainer}>
          {continueWatching.length > 0 ? (
            <ContentCarousel
              rowIndex={0}
              title={`Continue Learning for ${activeProfile.name}`}
              subtitle="Pick up right where you paused with instant AI lecture notes"
              courses={continueWatching}
              progressMap={progressMap}
              bookmarkedIds={bookmarkedIds}
              cardWidth={336}
              onFocusCourse={handleCardFocused}
              onPressCourse={(id) => onLaunchCourse(id, false)}
            />
          ) : null}

          <ContentCarousel
            rowIndex={1}
            title="Popular Science"
            subtitle="Groundbreaking observational physics and extreme ocean biospheres"
            courses={popularScience}
            progressMap={progressMap}
            bookmarkedIds={bookmarkedIds}
            cardWidth={356}
            onFocusCourse={handleCardFocused}
            onPressCourse={(id) => onLaunchCourse(id, false)}
          />

          <ContentCarousel
            rowIndex={2}
            title="History Deep Dives"
            subtitle="From Turing’s Bombe at Bletchley to the dawn of molecular genetics"
            courses={historyDeepDives}
            progressMap={progressMap}
            bookmarkedIds={bookmarkedIds}
            cardWidth={356}
            onFocusCourse={handleCardFocused}
            onPressCourse={(id) => onLaunchCourse(id, false)}
          />

          <ContentCarousel
            rowIndex={3}
            title="Frontier AI & Robotics Engineering"
            subtitle="Diffusion policies, FlashAttention tiling, and closed-loop robot control"
            courses={frontierAiAndRobotics}
            progressMap={progressMap}
            bookmarkedIds={bookmarkedIds}
            cardWidth={376}
            onFocusCourse={handleCardFocused}
            onPressCourse={(id) => onLaunchCourse(id, true)}
          />

          <ContentCarousel
            rowIndex={4}
            title="Quantum Mechanics & Supercomputing"
            subtitle="Surface-code logical qubits and cryogenic microwave resonators"
            courses={quantumEngineering}
            progressMap={progressMap}
            bookmarkedIds={bookmarkedIds}
            cardWidth={356}
            onFocusCourse={handleCardFocused}
            onPressCourse={(id) => onLaunchCourse(id, false)}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: AmazonDarkPalette.background,
  },
  scrollBody: {
    paddingBottom: 72,
    gap: 20,
  },
  carouselsContainer: {
    gap: 36,
    paddingBottom: 24,
  },
});

export default HomeScreen;
