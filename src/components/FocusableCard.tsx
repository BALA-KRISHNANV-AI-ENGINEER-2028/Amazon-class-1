import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from '../theme/colors';
import { playTVFocusTick, playTVSelectSound } from '../utils/tvAudio';

export interface FocusableCardProps {
  id: string;
  title: string;
  instructor: string;
  institution?: string;
  duration: string;
  moduleCount?: string;
  thumbnailUri: string;
  progressPercent?: number;
  isBookmarked?: boolean;
  hasTVPreferredFocus?: boolean;
  width?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  onFocusCard?: (id: string) => void;
  onBlurCard?: (id: string) => void;
  onPressCard: (id: string) => void;
}

/**
 * Reusable Amazon Fire TV / Prime Video D-Pad Focusable Card
 * - Animates scale to 1.05 on D-Pad focus via native-driver spring physics
 * - Renders a 3px #FF9900 Amazon Gold focus ring with ambient elevation
 * - Triggers crisp 10-foot audio/visual earcons on focus, blur, and select
 * - Uses high-contrast unboxed 10-foot typography (zero pill clutter)
 */
export const FocusableCard: React.FC<FocusableCardProps> = ({
  id,
  title,
  instructor,
  institution,
  duration,
  moduleCount,
  thumbnailUri,
  progressPercent = 0,
  isBookmarked = false,
  hasTVPreferredFocus = false,
  width = 336,
  style,
  onFocusCard,
  onBlurCard,
  onPressCard,
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const scaleAnim = useRef(new Animated.Value(TVFocusConfig.scaleBlurred)).current;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    playTVFocusTick();
    Animated.spring(scaleAnim, {
      toValue: TVFocusConfig.scaleFocused,
      friction: TVFocusConfig.springFriction,
      tension: TVFocusConfig.springTension,
      useNativeDriver: true,
    }).start();
    onFocusCard?.(id);
  }, [id, onFocusCard, scaleAnim]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: TVFocusConfig.scaleBlurred,
      friction: TVFocusConfig.springFriction,
      tension: TVFocusConfig.springTension,
      useNativeDriver: true,
    }).start();
    onBlurCard?.(id);
  }, [id, onBlurCard, scaleAnim]);

  const handlePress = useCallback(() => {
    playTVSelectSound();
    onPressCard(id);
  }, [id, onPressCard]);

  const metadataParts = [instructor, institution, moduleCount, duration].filter(
    (part): part is string => Boolean(part)
  );

  return (
    <Pressable
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${title} by ${instructor}, ${duration}`}
      testID={`focusable-card-${id}`}
      style={style}
    >
      <Animated.View
        style={[
          styles.cardShell,
          { width, transform: [{ scale: scaleAnim }] },
          isFocused ? styles.cardShellFocused : styles.cardShellIdle,
        ]}
      >
        {/* 16:9 Widescreen Lecture Artwork */}
        <View style={styles.mediaFrame}>
          <Image
            source={{ uri: thumbnailUri }}
            alt={title}
            fallbackTitle={title}
            resizeMode="cover"
            style={styles.thumbnail}
          />

          {/* Subtle Bottom Scrim for Contrast */}
          <View style={styles.mediaBottomOverlay}>
            <Text style={styles.durationReadout} numberOfLines={1}>
              {isBookmarked ? `Saved · ${duration}` : duration}
            </Text>
          </View>

          {/* Prime Video Style Resume Progress Bar */}
          {progressPercent > 0 ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(4, progressPercent))}%` },
                ]}
              />
            </View>
          ) : null}
        </View>

        {/* High-Contrast 10-Foot Card Details */}
        <View style={styles.contentArea}>
          <Text
            style={[
              styles.titleText,
              isFocused ? styles.titleTextFocused : undefined,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          <Text style={styles.metadataText} numberOfLines={1}>
            {metadataParts.join(' · ')}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardShell: {
    backgroundColor: AmazonDarkPalette.card,
    borderRadius: TVFocusConfig.cardRadius,
    borderWidth: TVFocusConfig.borderWidthFocused,
    overflow: 'hidden',
  },
  cardShellIdle: {
    borderColor: AmazonDarkPalette.borderSubtle,
    shadowColor: 'rgba(0, 0, 0, 0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  cardShellFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: AmazonDarkPalette.surfaceElevated,
    shadowColor: AmazonDarkPalette.focusGlow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 28,
    zIndex: 10,
  },
  mediaFrame: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: AmazonDarkPalette.surfaceSubtle,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  mediaBottomOverlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: AmazonDarkPalette.surfaceOverlay,
  },
  durationReadout: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontMono,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AmazonDarkPalette.primaryAccent,
  },
  contentArea: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 5,
  },
  titleText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: TVTypography.cardTitle,
    fontWeight: '600',
    lineHeight: 25,
    letterSpacing: 0.2,
  },
  titleTextFocused: {
    color: AmazonDarkPalette.textPrimary,
  },
  metadataText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: TVTypography.metadata,
    fontWeight: '400',
    lineHeight: 20,
  },
});

export default FocusableCard;
