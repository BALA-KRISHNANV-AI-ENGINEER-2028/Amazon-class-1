import React, { useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AmazonDarkPalette, TVTypography } from '../theme/colors';
import type { CourseItem } from '../data/courses';
import { FocusableCard } from './FocusableCard';

export interface ContentCarouselProps {
  title: string;
  subtitle?: string;
  courses: CourseItem[];
  progressMap?: Record<string, number>;
  bookmarkedIds?: string[];
  cardWidth?: number;
  rowIndex?: number;
  onFocusCourse?: (courseId: string) => void;
  onPressCourse: (courseId: string) => void;
}

/**
 * ContentCarousel: Horizontal scrolling video list optimized for 10-foot Fire TV D-Pad navigation.
 * - Smooth Left/Right D-Pad navigation across FocusableCard components
 * - Automatically scrolls focused cards into clear view
 * - High-contrast section title and clean unboxed subtitles
 */
export const ContentCarousel: React.FC<ContentCarouselProps> = ({
  title,
  subtitle,
  courses,
  progressMap = {},
  bookmarkedIds = [],
  cardWidth = 336,
  rowIndex,
  onFocusCourse,
  onPressCourse,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleCardFocus = (id: string, cardElId?: string) => {
    onFocusCourse?.(id);

    // Auto-scroll the carousel so the focused card stays visible with breathing room
    if (scrollRef.current && cardElId) {
      const cardEl = document.getElementById(cardElId);
      if (cardEl) {
        const container = scrollRef.current;
        const containerRect = container.getBoundingClientRect();
        const cardRect = cardEl.getBoundingClientRect();

        const offsetLeft = cardRect.left - containerRect.left;
        const offsetRight = cardRect.right - containerRect.right;

        if (offsetLeft < 40) {
          container.scrollBy({ left: offsetLeft - 60, behavior: 'smooth' });
        } else if (offsetRight > -40) {
          container.scrollBy({ left: offsetRight + 60, behavior: 'smooth' });
        }
      }
    }
  };

  if (courses.length === 0) return null;

  return (
    <View style={styles.carouselSection} accessibilityRole="region" aria-label={title}>
      {/* 10-Foot Carousel Header */}
      <View style={styles.headerBlock}>
        <Text style={styles.titleText}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitleText}>{subtitle}</Text>
        ) : null}
      </View>

      {/* Horizontal Scroll Rail */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {courses.map((course, colIndex) => {
          const domId = `carousel-${rowIndex ?? 0}-card-${course.id}`;
          return (
            <div key={course.id} id={domId} style={{ display: 'inline-flex' }}>
              <FocusableCard
                id={course.id}
                title={course.title}
                instructor={course.instructor}
                institution={course.institution}
                moduleCount={course.moduleCount}
                duration={course.duration}
                thumbnailUri={course.thumbnailUri}
                progressPercent={progressMap[course.id] ?? course.initialProgressPercent}
                isBookmarked={bookmarkedIds.includes(course.id)}
                width={cardWidth}
                onFocusCard={() => handleCardFocus(course.id, domId)}
                onPressCard={onPressCourse}
                testID={`carousel-item-${rowIndex ?? 0}-${colIndex}`}
              />
            </div>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  carouselSection: {
    gap: 14,
    width: '100%',
  },
  headerBlock: {
    paddingHorizontal: 48,
    gap: 4,
  },
  titleText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: TVTypography.sectionTitle,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitleText: {
    color: AmazonDarkPalette.textMuted,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    gap: 24,
  },
});

export default ContentCarousel;
