import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Delete, Search, X } from 'lucide-react';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from '../theme/colors';
import type { CourseItem } from '../data/courses';
import { FocusableCard } from './FocusableCard';
import { TVActionButton } from './TVActionButton';
import { playTVFocusTick, playTVSelectSound } from '../utils/tvAudio';

export interface TVSearchOverlayProps {
  query: string;
  courses: CourseItem[];
  progressMap: Record<string, number>;
  bookmarkedIds: string[];
  onChangeQuery: (q: string) => void;
  onSelectCourse: (courseId: string) => void;
  onCloseSearch: () => void;
}

const KEYBOARD_ROWS = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', '0', '1'],
];

const QUICK_TOPICS = ['Quantum', 'Attention', 'Robotics', 'CRISPR', 'Black Hole'];

export const TVSearchOverlay: React.FC<TVSearchOverlayProps> = ({
  query,
  courses,
  progressMap,
  bookmarkedIds,
  onChangeQuery,
  onSelectCourse,
  onCloseSearch,
}) => {
  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q) ||
        c.institution.toLowerCase().includes(q) ||
        c.synopsis.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [courses, query]);

  return (
    <View style={styles.searchContainer}>
      {/* Left Zone: Fire TV 10-Foot On-Screen D-Pad Keyboard */}
      <View style={styles.keyboardColumn}>
        <View style={styles.searchBarBox}>
          <Search size={20} color={AmazonDarkPalette.primaryAccent} />
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Search courses, professors, or labs..."
            accessibilityLabel="Search courses input"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.keyGrid}>
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <View key={rIdx} style={styles.keyRow}>
              {row.map((char, cIdx) => (
                <Pressable
                  key={char}
                  hasTVPreferredFocus={rIdx === 0 && cIdx === 0}
                  accessibilityLabel={`Letter ${char}`}
                  onFocus={() => playTVFocusTick()}
                  onPress={() => {
                    playTVSelectSound();
                    onChangeQuery(query + char.toLowerCase());
                  }}
                >
                  {({ focused }) => (
                    <View
                      style={[
                        styles.keyCell,
                        focused ? styles.keyCellFocused : undefined,
                      ]}
                    >
                      <Text style={styles.keyLabel}>{char}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          ))}

          {/* Space, Backspace, Clear Row */}
          <View style={styles.keyUtilityRow}>
            <TVActionButton
              label="Space"
              variant="secondary"
              onPress={() => onChangeQuery(`${query} `)}
              style={styles.utilityFlex}
            />
            <TVActionButton
              label="Delete"
              variant="secondary"
              icon={<Delete size={16} color={AmazonDarkPalette.textPrimary} />}
              onPress={() => onChangeQuery(query.slice(0, -1))}
            />
            <TVActionButton
              label="Clear"
              variant="subtle"
              icon={<X size={16} color={AmazonDarkPalette.textPrimary} />}
              onPress={() => onChangeQuery('')}
            />
          </View>
        </View>

        <View style={styles.quickTopicsSection}>
          <Text style={styles.quickHeading}>Suggested Searches</Text>
          <View style={styles.quickTopicsWrap}>
            {QUICK_TOPICS.map((topic) => (
              <Pressable
                key={topic}
                onFocus={() => playTVFocusTick()}
                onPress={() => {
                  playTVSelectSound();
                  onChangeQuery(topic);
                }}
              >
                {({ focused }) => (
                  <View
                    style={[
                      styles.topicBtn,
                      focused ? styles.keyCellFocused : undefined,
                    ]}
                  >
                    <Text style={styles.topicBtnText}>{topic}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <TVActionButton
          label="Close Search"
          variant="subtle"
          onPress={onCloseSearch}
        />
      </View>

      {/* Right Zone: Live High-Contrast Search Results Grid */}
      <View style={styles.resultsColumn}>
        <Text style={styles.resultsHeaderTitle}>
          {query.trim()
            ? `Results for "${query.trim()}" (${filteredCourses.length})`
            : `All Masterclasses (${filteredCourses.length})`}
        </Text>

        {filteredCourses.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Text style={styles.emptyTitle}>No matching lectures found</Text>
            <Text style={styles.emptySub}>
              Try searching for Quantum, Attention, CRISPR, or Robotics.
            </Text>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {filteredCourses.map((course) => (
              <FocusableCard
                key={course.id}
                id={course.id}
                title={course.title}
                instructor={course.instructor}
                institution={course.institution}
                duration={course.duration}
                thumbnailUri={course.thumbnailUri}
                progressPercent={progressMap[course.id] ?? course.initialProgressPercent}
                isBookmarked={bookmarkedIds.includes(course.id)}
                width={318}
                onPressCard={onSelectCourse}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 44,
    paddingHorizontal: 48,
    paddingVertical: 36,
    width: '100%',
  },
  keyboardColumn: {
    width: 390,
    gap: 22,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: AmazonDarkPalette.card,
    borderWidth: 2,
    borderColor: AmazonDarkPalette.borderMuted,
  },
  searchInput: {
    flex: 1,
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 17,
  },
  keyGrid: {
    gap: 8,
  },
  keyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyCell: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: AmazonDarkPalette.card,
    borderWidth: TVFocusConfig.borderWidthFocused,
    borderColor: AmazonDarkPalette.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCellFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: AmazonDarkPalette.surfaceElevated,
  },
  keyLabel: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontMono,
    fontSize: 16,
    fontWeight: '600',
  },
  keyUtilityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  utilityFlex: {
    flex: 1,
  },
  quickTopicsSection: {
    gap: 10,
  },
  quickHeading: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '600',
  },
  quickTopicsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: AmazonDarkPalette.card,
    borderWidth: TVFocusConfig.borderWidthFocused,
    borderColor: AmazonDarkPalette.borderSubtle,
  },
  topicBtnText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
    fontWeight: '500',
  },
  resultsColumn: {
    flex: 1,
    gap: 22,
  },
  resultsHeaderTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: TVTypography.sectionTitle,
    fontWeight: '700',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  emptyStateBox: {
    padding: 40,
    borderRadius: 12,
    backgroundColor: AmazonDarkPalette.card,
    borderWidth: 1,
    borderColor: AmazonDarkPalette.borderSubtle,
    gap: 8,
  },
  emptyTitle: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 20,
    fontWeight: '600',
  },
  emptySub: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 15,
  },
});

export default TVSearchOverlay;
