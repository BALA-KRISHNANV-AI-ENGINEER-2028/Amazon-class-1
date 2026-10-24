import React, { useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bookmark, BookOpen, Check, Play } from 'lucide-react';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from '../theme/colors';
import type { CourseItem } from '../data/courses';
import { playTVFocusTick, playTVSelectSound } from '../utils/tvAudio';

export interface AmazonHeroBannerProps {
  course: CourseItem;
  progressPercent?: number;
  isBookmarked?: boolean;
  hasTVPreferredFocus?: boolean;
  onWatch: (courseId: string) => void;
  onOpenXRay: (courseId: string) => void;
  onToggleWatchlist: (courseId: string) => void;
}

interface HeroButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'subtle';
  icon: React.ReactNode;
  hasTVPreferredFocus?: boolean;
  isSelected?: boolean;
  onPress: () => void;
  testID?: string;
}

const HeroActionButton: React.FC<HeroButtonProps> = ({
  label,
  variant = 'secondary',
  icon,
  hasTVPreferredFocus = false,
  isSelected = false,
  onPress,
  testID,
}) => {
  const [focused, setFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      hasTVPreferredFocus={hasTVPreferredFocus}
      tvGroup="hero-actions"
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onFocus={() => {
        setFocused(true);
        playTVFocusTick();
        Animated.spring(scaleAnim, {
          toValue: TVFocusConfig.scaleFocused,
          friction: TVFocusConfig.springFriction,
          tension: TVFocusConfig.springTension,
          useNativeDriver: true,
        }).start();
      }}
      onBlur={() => {
        setFocused(false);
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: TVFocusConfig.springFriction,
          tension: TVFocusConfig.springTension,
          useNativeDriver: true,
        }).start();
      }}
      onPress={() => {
        playTVSelectSound();
        onPress();
      }}
    >
      <Animated.View
        style={[
          styles.actionBtn,
          variant === 'primary'
            ? styles.primaryBtn
            : variant === 'subtle'
              ? styles.subtleBtn
              : styles.secondaryBtn,
          isSelected && variant !== 'primary' ? styles.selectedSurface : undefined,
          focused ? styles.actionBtnFocused : undefined,
          focused && variant === 'primary' ? styles.primaryBtnFocused : undefined,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {icon}
        <Text
          numberOfLines={1}
          style={[
            styles.actionLabel,
            variant === 'primary' ? styles.actionLabelDark : styles.actionLabelLight,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

/**
 * AmazonHeroBanner: High-impact featured educational video banner at the top of the TV screen.
 * - 16:9 cinematic artwork with measured Prime Video dark gradient scrims
 * - High-contrast 10-foot typography (title, kicker, clean unboxed metadata, synopsis)
 * - D-Pad focusable action buttons: "Watch & Learn", "Add to Watchlist", and "AI Study Guide"
 */
export const AmazonHeroBanner: React.FC<AmazonHeroBannerProps> = ({
  course,
  progressPercent = 0,
  isBookmarked = false,
  hasTVPreferredFocus = true,
  onWatch,
  onOpenXRay,
  onToggleWatchlist,
}) => {
  const watchLabel =
    progressPercent > 0
      ? `Resume & Learn (${progressPercent}%)`
      : 'Watch & Learn';

  return (
    <View style={styles.bannerContainer} accessibilityRole="region" aria-label="Featured Masterclass">
      {/* 16:9 Background Visual with Dual Contrast Scrims */}
      <View style={styles.backdropFrame}>
        <Image
          source={{ uri: course.heroUri }}
          alt={course.title}
          fallbackTitle={course.title}
          resizeMode="cover"
          style={styles.backdropImage}
        />
        {/* Horizontal Left-to-Right Readability Scrim (Prime Video style) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0B0E14] via-[#0B0E14]/85 to-transparent"
        />
        {/* Vertical Bottom-to-Top Fade to blend into carousel rows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/30 to-transparent"
        />
      </View>

      {/* High-Contrast 10-Foot Content Overlay */}
      <View style={styles.contentColumn}>
        <Text style={styles.kickerText} numberOfLines={1}>
          Featured Masterclass · {course.institution}
        </Text>

        <Text style={styles.headlineText} numberOfLines={2}>
          {course.title}
        </Text>

        {/* Clean Unboxed Metadata with · Separators (Zero-Pill Discipline) */}
        <Text style={styles.metadataText} numberOfLines={1}>
          {course.instructor} · {course.moduleCount} · {course.duration} ·{' '}
          {course.resolution} · {course.year}
        </Text>

        <Text style={styles.synopsisText} numberOfLines={3}>
          {course.synopsis}
        </Text>

        {/* Primary & Secondary TV Action Buttons */}
        <View style={styles.actionsCluster}>
          <HeroActionButton
            hasTVPreferredFocus={hasTVPreferredFocus}
            label={watchLabel}
            variant="primary"
            icon={<Play size={18} color={AmazonDarkPalette.textInverse} />}
            onPress={() => onWatch(course.id)}
            testID="hero-watch-and-learn-btn"
          />

          <HeroActionButton
            label={isBookmarked ? 'In Watchlist' : 'Add to Watchlist'}
            variant="subtle"
            isSelected={isBookmarked}
            icon={
              isBookmarked ? (
                <Check size={18} color={AmazonDarkPalette.primaryAccent} />
              ) : (
                <Bookmark size={18} color={AmazonDarkPalette.textPrimary} />
              )
            }
            onPress={() => onToggleWatchlist(course.id)}
            testID="hero-watchlist-btn"
          />

          <HeroActionButton
            label="AI Study Guide"
            variant="secondary"
            icon={<BookOpen size={18} color={AmazonDarkPalette.primaryAccent} />}
            onPress={() => onOpenXRay(course.id)}
            testID="hero-xray-guide-btn"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'relative',
    width: '100%',
    minHeight: 460,
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 44,
    overflow: 'hidden',
  },
  backdropFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '70%',
    overflow: 'hidden',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  contentColumn: {
    position: 'relative',
    zIndex: 5,
    maxWidth: 680,
    gap: 14,
  },
  kickerText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headlineText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: TVTypography.heroTitle,
    fontWeight: '700',
    lineHeight: 54,
    letterSpacing: -0.5,
  },
  metadataText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 16,
    fontWeight: '500',
  },
  synopsisText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 620,
  },
  actionsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: TVFocusConfig.borderWidthFocused,
  },
  primaryBtn: {
    backgroundColor: AmazonDarkPalette.primaryAccent,
    borderColor: AmazonDarkPalette.primaryAccent,
  },
  primaryBtnFocused: {
    backgroundColor: '#FFB340',
    borderColor: AmazonDarkPalette.textPrimary,
    shadowColor: AmazonDarkPalette.focusGlow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  secondaryBtn: {
    backgroundColor: AmazonDarkPalette.card,
    borderColor: AmazonDarkPalette.borderMuted,
  },
  subtleBtn: {
    backgroundColor: 'rgba(26, 34, 45, 0.85)',
    borderColor: AmazonDarkPalette.borderSubtle,
  },
  selectedSurface: {
    backgroundColor: AmazonDarkPalette.surfaceElevated,
    borderColor: AmazonDarkPalette.textSecondary,
  },
  actionBtnFocused: {
    backgroundColor: AmazonDarkPalette.surfaceElevated,
    borderColor: AmazonDarkPalette.primaryAccent,
    shadowColor: AmazonDarkPalette.focusGlow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  actionLabel: {
    fontFamily: TVTypography.fontBody,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionLabelDark: {
    color: AmazonDarkPalette.textInverse,
  },
  actionLabelLight: {
    color: AmazonDarkPalette.textPrimary,
  },
});

export default AmazonHeroBanner;
