import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../../constants/typography';
import { FollowCounts } from '../../services/follows';
import { PressableScale } from '../animation/PressableScale';

interface FollowStatsProps {
  counts: FollowCounts;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}

/** "12 Followers · 8 Following" — each opens its list. */
export const FollowStats: React.FC<FollowStatsProps> = ({
  counts,
  onPressFollowers,
  onPressFollowing,
}) => (
  <View style={styles.stats}>
    <PressableScale
      style={styles.stat}
      onPress={onPressFollowers}
      disabled={!onPressFollowers}
      activeOpacity={0.6}
      accessibilityLabel={`${counts.followers} followers`}
    >
      <Text style={styles.statNumber}>{counts.followers}</Text>
      <Text style={styles.statLabel}>{counts.followers === 1 ? 'Follower' : 'Followers'}</Text>
    </PressableScale>
    <View style={styles.statDivider} />
    <PressableScale
      style={styles.stat}
      onPress={onPressFollowing}
      disabled={!onPressFollowing}
      activeOpacity={0.6}
      accessibilityLabel={`Following ${counts.following}`}
    >
      <Text style={styles.statNumber}>{counts.following}</Text>
      <Text style={styles.statLabel}>Following</Text>
    </PressableScale>
  </View>
);

interface FollowButtonProps {
  isFollowing: boolean;
  pending: boolean;
  onPress: () => void;
}

/** White "Follow" / outlined "Following". */
export const FollowButton: React.FC<FollowButtonProps> = ({ isFollowing, pending, onPress }) => (
  <PressableScale
    style={[styles.button, isFollowing ? styles.buttonFollowing : styles.buttonFollow]}
    onPress={onPress}
    activeOpacity={0.85}
    pressedScale={0.97}
    accessibilityLabel={isFollowing ? 'Unfollow' : 'Follow'}
    accessibilityState={{ selected: isFollowing, busy: pending }}
    testID="follow-button"
  >
    {pending ? (
      <ActivityIndicator size="small" color={isFollowing ? '#FFFFFF' : '#000000'} />
    ) : (
      <Text style={[styles.buttonText, isFollowing ? styles.buttonTextFollowing : styles.buttonTextFollow]}>
        {isFollowing ? 'Following' : 'Follow'}
      </Text>
    )}
  </PressableScale>
);

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#171717',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  statNumber: {
    fontSize: 15,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  statDivider: {
    width: 1,
    height: 14,
    marginHorizontal: 14,
    backgroundColor: '#262626',
  },
  button: {
    marginTop: 12,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFollow: {
    backgroundColor: '#FFFFFF',
  },
  buttonFollowing: {
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
  },
  buttonText: {
    fontSize: 13.5,
    fontFamily: FONTS.sans.semibold,
  },
  buttonTextFollow: {
    color: '#000000',
  },
  buttonTextFollowing: {
    color: '#EDEDED',
  },
});
