import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { PublicEducation, degreeLabel } from '../../types/profile';
import { GraduationCapIcon, MapPinIcon, UserIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';

export interface ProfileCardProps {
  name: string;
  avatarUri?: string | null;
  /** Shown when there is no picture; empty → generic user icon. */
  initials?: string;
  /** Current qualification (first of the sorted education list). */
  currentEducation?: PublicEducation | null;
  /** Fallback line when there is no education (college / university). */
  college?: string | null;
  /** Text shown when neither education nor college exists (owner only). */
  collegePlaceholder?: string;
  location?: string | null;
  bio?: string | null;
  /** Limit bio lines (e.g. on the project page); omit for full bio. */
  bioLines?: number;
  avatarBusy?: boolean;
  /** Makes the whole card a button (e.g. open the publisher's profile). */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The one profile card used everywhere a person is shown: the Profile tab,
 * the publisher profile, and the project page. Picture, name, current
 * qualification with its institution, location and bio.
 */
export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  avatarUri,
  initials,
  currentEducation,
  college,
  collegePlaceholder,
  location,
  bio,
  bioLines,
  avatarBusy,
  onPress,
  accessibilityLabel,
  style,
  testID,
}) => {
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);
  useEffect(() => setAvatarFailed(false), [avatarUri]);

  const collegeLine = currentEducation
    ? `${currentEducation.institution_name}${
        currentEducation.status === 'completed' && currentEducation.graduation_year
          ? ` · ${currentEducation.graduation_year}`
          : ''
      }`
    : college?.trim() || '';

  const content = (
    <>
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          {avatarUri && !avatarFailed ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatarImg}
              onError={() => setAvatarFailed(true)}
              accessibilityLabel={`${name}'s profile picture`}
            />
          ) : (
            <View style={styles.avatarFallback}>
              {initials ? (
                <Text style={styles.avatarInitials}>{initials}</Text>
              ) : (
                <UserIcon size={24} color={STITCH_COLORS.onSurfaceVariant} />
              )}
            </View>
          )}
          {avatarBusy && (
            <View style={styles.avatarBusy}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          {currentEducation ? (
            <Text style={styles.eduTitle}>
              {degreeLabel(currentEducation)} — {currentEducation.specialization}
            </Text>
          ) : null}
          {collegeLine || collegePlaceholder ? (
            <View style={styles.collegeRow}>
              <View style={styles.collegeIcon}>
                <GraduationCapIcon size={13} color={STITCH_COLORS.primaryContainer} />
              </View>
              <Text style={[styles.college, !collegeLine && styles.placeholder]}>
                {collegeLine || collegePlaceholder}
              </Text>
            </View>
          ) : null}
          {location ? (
            <View style={styles.locationRow}>
              <MapPinIcon size={11} color="#A1A1A1" />
              <Text style={styles.location}>{location}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {bio?.trim() ? (
        <Text style={styles.bio} numberOfLines={bioLines}>
          {bio.trim()}
        </Text>
      ) : null}
    </>
  );

  return onPress ? (
    <PressableScale
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
      pressedScale={0.985}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {content}
    </PressableScale>
  ) : (
    <View style={[styles.card, style]} testID={testID}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatarWrap: {
    width: 64,
    height: 64,
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: STITCH_COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onPrimaryFixed,
    letterSpacing: 0.5,
  },
  avatarBusy: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 19,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.3,
  },
  eduTitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  collegeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 2,
  },
  collegeIcon: {
    marginTop: 2, // centre the 13px icon on the 17px first line
  },
  college: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  placeholder: {
    color: STITCH_COLORS.outline,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  location: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  bio: {
    marginTop: 12,
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: FONTS.sans.regular,
    color: '#D4D4D4',
  },
});
