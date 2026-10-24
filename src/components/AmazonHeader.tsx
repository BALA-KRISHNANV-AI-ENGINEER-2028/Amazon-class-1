import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Search, User } from 'lucide-react';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from '../theme/colors';
import { playTVFocusTick, playTVSelectSound } from '../utils/tvAudio';

export type TVHeaderTab = 'home' | 'courses' | 'labs' | 'library';

export interface LearnerProfile {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface AmazonHeaderProps {
  activeTab: TVHeaderTab;
  isSearchActive?: boolean;
  activeProfile: LearnerProfile;
  onSelectTab: (tab: TVHeaderTab) => void;
  onOpenSearch: () => void;
  onOpenProfileModal: () => void;
}

interface NavTabItem {
  id: TVHeaderTab;
  label: string;
}

const NAV_TABS: NavTabItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'courses', label: 'Courses' },
  { id: 'labs', label: 'Live Labs' },
  { id: 'library', label: 'My Stuff' },
];

interface HeaderFocusableItemProps {
  label: string;
  isActive?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  testID?: string;
}

const HeaderFocusableNavLink: React.FC<HeaderFocusableItemProps> = ({
  label,
  isActive = false,
  onPress,
  icon,
  testID,
}) => {
  const [focused, setFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      tvGroup="header"
      testID={testID}
      accessibilityRole="tab"
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
          styles.navItemContainer,
          isActive ? styles.navItemActive : undefined,
          focused ? styles.navItemFocused : undefined,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {icon}
        <Text
          numberOfLines={1}
          style={[
            styles.navItemLabel,
            isActive || focused ? styles.navItemLabelBright : undefined,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

/**
 * Amazon Prime Video / Fire TV Top Navigation Bar
 * Strict 3-Zone Top Bar Architecture:
 *   Zone 1: Single-line ClassStream AI brand wordmark
 *   Zone 2: Search & single-line D-Pad focusable navigation tabs
 *   Zone 3: Active learner profile indicator button
 */
export const AmazonHeader: React.FC<AmazonHeaderProps> = ({
  activeTab,
  isSearchActive = false,
  activeProfile,
  onSelectTab,
  onOpenSearch,
  onOpenProfileModal,
}) => {
  const [profileFocused, setProfileFocused] = useState(false);
  const profileScale = useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.headerWrapper} accessibilityRole="banner">
      {/* Zone 1: Single-Line Brand Wordmark */}
      <Pressable
        tvGroup="header"
        accessibilityRole="link"
        accessibilityLabel="ClassStream AI Home"
        onFocus={() => playTVFocusTick()}
        onPress={() => {
          playTVSelectSound();
          onSelectTab('home');
        }}
      >
        {({ focused }) => (
          <View
            style={[
              styles.brandButton,
              focused ? styles.brandButtonFocused : undefined,
            ]}
          >
            <Text style={styles.brandWordmark} numberOfLines={1}>
              ClassStream AI
            </Text>
          </View>
        )}
      </Pressable>

      {/* Zone 2: Search + Concise Single-Line TV Navigation Links */}
      <View style={styles.centerNavRow}>
        <HeaderFocusableNavLink
          label="Search"
          isActive={isSearchActive}
          onPress={onOpenSearch}
          testID="header-search-btn"
          icon={
            <Search
              size={18}
              color={
                isSearchActive
                  ? AmazonDarkPalette.primaryAccent
                  : AmazonDarkPalette.textSecondary
              }
            />
          }
        />

        {NAV_TABS.map((item) => (
          <HeaderFocusableNavLink
            key={item.id}
            label={item.label}
            isActive={!isSearchActive && activeTab === item.id}
            onPress={() => onSelectTab(item.id)}
            testID={`header-tab-${item.id}`}
          />
        ))}
      </View>

      {/* Zone 3: Single Primary Profile Action */}
      <Pressable
        tvGroup="header"
        testID="header-profile-btn"
        accessibilityRole="button"
        accessibilityLabel={`Active profile ${activeProfile.name}. Select to switch learner profile.`}
        onFocus={() => {
          setProfileFocused(true);
          playTVFocusTick();
          Animated.spring(profileScale, {
            toValue: TVFocusConfig.scaleFocused,
            friction: TVFocusConfig.springFriction,
            tension: TVFocusConfig.springTension,
            useNativeDriver: true,
          }).start();
        }}
        onBlur={() => {
          setProfileFocused(false);
          Animated.spring(profileScale, {
            toValue: 1,
            friction: TVFocusConfig.springFriction,
            tension: TVFocusConfig.springTension,
            useNativeDriver: true,
          }).start();
        }}
        onPress={() => {
          playTVSelectSound();
          onOpenProfileModal();
        }}
      >
        <Animated.View
          style={[
            styles.profileTrigger,
            profileFocused ? styles.profileTriggerFocused : undefined,
            { transform: [{ scale: profileScale }] },
          ]}
        >
          <View style={styles.avatarCircle}>
            <User size={15} color={AmazonDarkPalette.textInverse} />
          </View>
          <Text style={styles.profileName} numberOfLines={1}>
            {activeProfile.name}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    width: '100%',
    height: 76,
    paddingHorizontal: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 32,
    backgroundColor: AmazonDarkPalette.surfaceHeader,
    borderBottomWidth: 1,
    borderBottomColor: AmazonDarkPalette.borderSubtle,
    zIndex: 40,
  },
  brandButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  brandButtonFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
  },
  brandWordmark: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  centerNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: TVFocusConfig.borderWidthFocused,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  navItemActive: {
    borderBottomColor: AmazonDarkPalette.textPrimary,
  },
  navItemFocused: {
    borderTopColor: AmazonDarkPalette.primaryAccent,
    borderRightColor: AmazonDarkPalette.primaryAccent,
    borderBottomColor: AmazonDarkPalette.primaryAccent,
    borderLeftColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: AmazonDarkPalette.surfaceElevated,
  },
  navItemLabel: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  navItemLabelBright: {
    color: AmazonDarkPalette.textPrimary,
  },
  profileTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingLeft: 9,
    paddingRight: 16,
    borderRadius: 10,
    backgroundColor: AmazonDarkPalette.card,
    borderWidth: TVFocusConfig.borderWidthFocused,
    borderColor: AmazonDarkPalette.borderSubtle,
  },
  profileTriggerFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    backgroundColor: AmazonDarkPalette.surfaceElevated,
    shadowColor: AmazonDarkPalette.focusGlow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AmazonDarkPalette.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AmazonHeader;
