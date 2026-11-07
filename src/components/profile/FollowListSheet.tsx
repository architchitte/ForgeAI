import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { COMMUNITY_MEMBER_LABEL } from '../../constants/identity';
import { useAuth } from '../../context/AuthContext';
import { FollowRow, fetchFollowers, fetchFollowing } from '../../services/follows';
import { fetchPublicProfiles, PublicProfileSummary } from '../../services/profiles';
import { getAvatarUrl } from '../../services/ownProfile';
import { Avatar } from '../common/Avatar';
import { ArrowRightIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';

export type FollowListKind = 'followers' | 'following';

interface FollowListSheetProps {
  /** Whose lists to show; null = hidden. */
  userId: string | null;
  kind: FollowListKind;
  onChangeKind: (kind: FollowListKind) => void;
  onClose: () => void;
  /** Opens a person's profile (the sheet closes first). */
  onOpenUser?: (userId: string) => void;
}

const Body: React.FC<FollowListSheetProps> = ({ userId, kind, onChangeKind, onClose, onOpenUser }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [rows, setRows] = useState<FollowRow[] | null>(null);
  const [people, setPeople] = useState<Record<string, PublicProfileSummary>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setRows(null);
    setError(null);
    (kind === 'followers' ? fetchFollowers(userId) : fetchFollowing(userId)).then(async (res) => {
      if (cancelled) return;
      if (res.error || !res.data) {
        setError(res.error || 'Failed to load.');
        setRows([]);
        return;
      }
      setRows(res.data);
      const p = await fetchPublicProfiles(res.data.map((r) => r.user_id));
      if (!cancelled && p.data) setPeople(p.data);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, kind]);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.handle} />
        <View style={styles.tabs}>
          {(['followers', 'following'] as const).map((k) => {
            const on = kind === k;
            return (
              <PressableScale
                key={k}
                style={[styles.tab, on && styles.tabOn]}
                onPress={() => onChangeKind(k)}
                activeOpacity={0.8}
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>
                  {k === 'followers' ? 'Followers' : 'Following'}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {rows === null ? (
          <ActivityIndicator style={styles.spinner} color={STITCH_COLORS.onSurfaceVariant} />
        ) : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>
            {kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(r) => r.user_id}
            style={styles.list}
            renderItem={({ item }) => {
              const p = people[item.user_id];
              const name = p?.name || COMMUNITY_MEMBER_LABEL;
              const isMe = item.user_id === user?.id;
              return (
                <PressableScale
                  style={styles.row}
                  onPress={() => onOpenUser?.(item.user_id)}
                  disabled={!onOpenUser}
                  activeOpacity={0.8}
                  accessibilityHint="Opens their profile"
                >
                  <Avatar uri={p?.avatarPath ? getAvatarUrl(p.avatarPath) : null} name={name} size={38} />
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                    {isMe ? <Text style={styles.you}>  · You</Text> : null}
                  </Text>
                  {onOpenUser && <ArrowRightIcon size={14} color={STITCH_COLORS.outline} />}
                </PressableScale>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

/** Slide-up list of followers / following (tabs), tap a person → profile. */
export const FollowListSheet: React.FC<FollowListSheetProps> = (props) => (
  <Modal
    visible={!!props.userId}
    transparent
    animationType="slide"
    onRequestClose={props.onClose}
    statusBarTranslucent
    navigationBarTranslucent
  >
    <SafeAreaProvider>
      <Body {...props} />
    </SafeAreaProvider>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    maxHeight: '75%',
    minHeight: 260,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333333',
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#000000',
  },
  tab: { flex: 1, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 12.5, fontFamily: FONTS.sans.medium, color: '#A1A1A1' },
  tabTextOn: { fontFamily: FONTS.sans.semibold, color: '#000000' },
  spinner: { marginTop: 32 },
  empty: { marginTop: 28, textAlign: 'center', fontSize: 13, fontFamily: FONTS.sans.regular, color: '#737373' },
  list: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  name: { flex: 1, fontSize: 14, fontFamily: FONTS.sans.medium, color: '#EDEDED' },
  you: { fontFamily: FONTS.sans.regular, color: '#737373' },
});
