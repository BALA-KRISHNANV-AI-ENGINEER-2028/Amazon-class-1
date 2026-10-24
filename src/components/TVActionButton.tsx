import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from '../theme/colors';
import { playTVFocusTick, playTVSelectSound } from '../utils/tvAudio';

export interface TVActionButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'subtle';
  icon?: React.ReactNode;
  hasTVPreferredFocus?: boolean;
  isSelected?: boolean;
  onPress: () => void;
  onFocusButton?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const TVActionButton: React.FC<TVActionButtonProps> = ({
  label,
  variant = 'secondary',
  icon,
  hasTVPreferredFocus = false,
  isSelected = false,
  onPress,
  onFocusButton,
  style,
  testID,
}) => {
  const [focused, setFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      hasTVPreferredFocus={hasTVPreferredFocus}
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
        onFocusButton?.();
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
          styles.base,
          variant === 'primary'
            ? styles.primaryIdle
            : variant === 'subtle'
              ? styles.subtleIdle
              : styles.secondaryIdle,
          isSelected && variant !== 'primary' ? styles.selectedSurface : undefined,
          focused
            ? variant === 'primary'
              ? styles.primaryFocused
              : styles.secondaryFocused
            : undefined,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        {icon}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            variant === 'primary' ? styles.labelInverse : styles.labelLight,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: TVFocusConfig.borderWidthFocused,
  },
  primaryIdle: {
    backgroundColor: AmazonDarkPalette.primaryAccent,
    borderColor: AmazonDarkPalette.primaryAccent,
  },
  primaryFocused: {
    backgroundColor: '#FFB340',
    borderColor: AmazonDarkPalette.textPrimary,
    shadowColor: AmazonDarkPalette.focusGlow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  secondaryIdle: {
    backgroundColor: AmazonDarkPalette.card,
    borderColor: AmazonDarkPalette.borderMuted,
  },
  subtleIdle: {
    backgroundColor: 'rgba(26, 34, 45, 0.78)',
    borderColor: AmazonDarkPalette.borderSubtle,
  },
  selectedSurface: {
    backgroundColor: AmazonDarkPalette.surfaceElevated,
    borderColor: AmazonDarkPalette.textSecondary,
  },
  secondaryFocused: {
    backgroundColor: AmazonDarkPalette.surfaceElevated,
    borderColor: AmazonDarkPalette.primaryAccent,
    shadowColor: AmazonDarkPalette.focusGlow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  label: {
    fontFamily: TVTypography.fontBody,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelInverse: {
    color: AmazonDarkPalette.textInverse,
  },
  labelLight: {
    color: AmazonDarkPalette.textPrimary,
  },
});

export default TVActionButton;
