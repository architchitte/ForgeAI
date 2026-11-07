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
import { formatRelativeTime } from '../../constants/time';
import { useAuth } from '../../context/AuthContext';
import { fetchLikers, LIKERS_LIMIT } from '../../services/activity';
import { fetchPublicProfiles, PublicProfileSummary } from '../../services/profiles';
import { getAvatarUrl } from '../../services/ownProfile';
import { Avatar } from '../common/Avatar';
import { HeartIcon } from '../common/AppIcons';

interface LikersSheetProps {
  /** Project whose likers are shown; null = hidden. */
  repositoryId: string | null;
  appName?: string;
  onClose: () => void;
}

interface Liker {
  user_id: string;
  created_at: string;
}

const SheetBody: React.FC<LikersSheetProps> = ({ repositoryId, appName, onClose }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [likers, setLikers] = useState<Liker[] | null>(null);
  const [profiles, setProfiles] = useState<Record<string, PublicProfileSummary>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repositoryId) return;
    let cancelled = false;
    setLikers(null);
    setError(null);
    fetchLikers(repositoryId).then(async (res) => {
      if (cancelled) return;
      if (res.error || !res.data) {
        setError(res.error || 'Failed to load likes.');
        setLikers([]);
        return;
      }
      setLikers(res.data);
      const p = await fetchPublicProfiles(res.data.map((l) => l.user_id));
      if (!cancelled && p.data) setProfiles(p.data);
    });
    return () => {
      cancelled = true;
    };
  }, [repositoryId]);

  const own = (user?.user_metadata?.full_name || user?.user_metadata?.name || '') as string;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <HeartIcon size={15} filled color="#FFFFFF" />
          <Text style={styles.title}>
            {likers === null ? 'Likes' : `Liked by ${likers.length}${likers.length >= LIKERS_LIMIT ? '+' : ''}`}
          </Text>
        </View>
        {appName ? <Text style={styles.subtitle} numberOfLines={1}>{appName}</Text> : null}

        {likers === null ? (
          <ActivityIndicator style={styles.spinner} color={STITCH_COLORS.onSurfaceVariant} />
        ) : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : likers.length === 0 ? (
          <Text style={styles.empty}>No likes yet.</Text>
        ) : (
          <FlatList
            data={likers}
            keyExtractor={(l) => l.user_id}
            style={styles.list}
            renderItem={({ item }) => {
              const isMe = item.user_id === user?.id;
              const p = profiles[item.user_id];
              const name = p?.name || (isMe && own.trim()) || COMMUNITY_MEMBER_LABEL;
              return (
                <View style={styles.row}>
                  <Avatar uri={p?.avatarPath ? getAvatarUrl(p.avatarPath) : null} name={name} size={36} />
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                      {isMe ? <Text style={styles.you}>  · You</Text> : null}
                    </Text>
                  </View>
                  <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

/**
 * Bottom sheet listing who liked a project. Opened by holding the like
 * button. Slides up; tap outside or swipe back to close.
 */
export const LikersSheet: React.FC<LikersSheetProps> = (props) => (
  <Modal
    visible={!!props.repositoryId}
    transparent
    animationType="slide"
    onRequestClose={props.onClose}
    statusBarTranslucent
    navigationBarTranslucent
  >
    <SafeAreaProvider>
      <SheetBody {...props} />
    </SafeAreaProvider>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    maxHeight: '70%',
    minHeight: 220,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12.5,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  spinner: {
    marginTop: 32,
  },
  empty: {
    marginTop: 28,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  list: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  you: {
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  time: {
    fontSize: 11.5,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
});
