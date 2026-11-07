import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { COMMUNITY_MEMBER_LABEL } from '../../constants/identity';
import { formatRelativeTime } from '../../constants/time';
import { Repository } from '../../types/repository';
import { fetchUserRepositories } from '../../services/repositories';
import {
  ActivityEvent,
  fetchActivityForRepositories,
  fetchNewFollowers,
} from '../../services/activity';
import { fetchPublicProfiles, PublicProfileSummary } from '../../services/profiles';
import { getAvatarUrl } from '../../services/ownProfile';
import { Avatar } from '../../components/common/Avatar';
import { CommentIcon, HeartIcon, UserIcon } from '../../components/common/AppIcons';
import { PressableScale } from '../../components/animation/PressableScale';

type Filter = 'all' | 'like' | 'comment' | 'follow';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'like', label: 'Likes' },
  { id: 'comment', label: 'Comments' },
  { id: 'follow', label: 'Follows' },
];

interface ActivityScreenProps {
  isActive?: boolean;
  onSelectRepository: (repo: Repository) => void;
  /** Opens a person's profile (e.g. a new follower). */
  onOpenUserProfile?: (userId: string) => void;
}

/**
 * Activity on the signed-in user's projects: who liked and who commented,
 * newest first. Three batched requests: my projects → likes + comments on
 * them → commenters' / likers' names and pictures.
 */
export const ActivityScreen: React.FC<ActivityScreenProps> = ({
  isActive = true,
  onSelectRepository,
  onOpenUserProfile,
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Record<string, Repository>>({});
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [people, setPeople] = useState<Record<string, PublicProfileSummary>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    if (!user?.email) return;
    const mine = await fetchUserRepositories(user.email);
    if (mine.error || !mine.data) {
      setError(mine.error || 'Failed to load your projects.');
      return;
    }
    const byId = Object.fromEntries(mine.data.map((r) => [r.id, r]));
    setProjects(byId);
    const [act, follows] = await Promise.all([
      fetchActivityForRepositories(Object.keys(byId), user.id),
      fetchNewFollowers(user.id),
    ]);
    if (act.error || !act.data) {
      setError(act.error || 'Failed to load activity.');
      return;
    }
    setError(null);
    const all = [...act.data, ...(follows.data ?? [])].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
    setEvents(all);
    const prof = await fetchPublicProfiles(all.map((e) => e.user_id));
    if (prof.data) setPeople(prof.data);
  }, [user?.email, user?.id]);

  useEffect(() => {
    if (!isActive) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      load().finally(() => setLoading(false));
    } else {
      load();
    }
  }, [isActive, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const shown = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.kind === filter)),
    [events, filter]
  );
  const counts = useMemo(
    () => ({
      like: events.filter((e) => e.kind === 'like').length,
      comment: events.filter((e) => e.kind === 'comment').length,
      follow: events.filter((e) => e.kind === 'follow').length,
    }),
    [events]
  );

  const renderItem = ({ item }: { item: ActivityEvent }) => {
    const person = people[item.user_id];
    const name = person?.name || COMMUNITY_MEMBER_LABEL;
    const project = item.repository_id ? projects[item.repository_id] : undefined;
    const isLike = item.kind === 'like';
    const isFollow = item.kind === 'follow';
    return (
      <PressableScale
        style={styles.item}
        onPress={() =>
          isFollow ? onOpenUserProfile?.(item.user_id) : project && onSelectRepository(project)
        }
        activeOpacity={0.85}
        pressedScale={0.985}
        accessibilityHint={isFollow ? 'Opens their profile' : 'Opens the project'}
      >
        {/* Picture / name → their profile; the rest of the row → the project */}
        <PressableScale
          onPress={() => onOpenUserProfile?.(item.user_id)}
          disabled={!onOpenUserProfile}
          activeOpacity={0.7}
          pressedScale={0.94}
          accessibilityLabel={`View ${name}'s profile`}
        >
          <Avatar uri={person?.avatarPath ? getAvatarUrl(person.avatarPath) : null} name={name} size={40} />
          <View style={styles.kindBadge}>
            {isFollow ? (
              <UserIcon size={10} color="#000000" />
            ) : isLike ? (
              <HeartIcon size={10} filled color="#000000" />
            ) : (
              <CommentIcon size={10} color="#000000" />
            )}
          </View>
        </PressableScale>
        <View style={styles.itemBody}>
          {isFollow ? (
            <Text style={styles.itemText}>
              <Text style={styles.strong}>{name}</Text> started following you
            </Text>
          ) : (
            <Text style={styles.itemText}>
              <Text
                style={styles.strong}
                onPress={onOpenUserProfile ? () => onOpenUserProfile(item.user_id) : undefined}
              >
                {name}
              </Text>
              {isLike ? ' liked ' : ' commented on '}
              <Text style={styles.strong}>{project?.app_name ?? 'your project'}</Text>
            </Text>
          )}
          {item.kind === 'comment' ? (
            <Text style={styles.snippet} numberOfLines={2}>
              “{item.content}”
            </Text>
          ) : null}
          <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Likes, comments and new followers.</Text>
        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const on = filter === f.id;
            const n = f.id === 'all' ? events.length : counts[f.id];
            return (
              <PressableScale
                key={f.id}
                style={[styles.filter, on && styles.filterOn]}
                onPress={() => setFilter(f.id)}
                activeOpacity={0.8}
                pressedScale={0.95}
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{f.label}</Text>
                <Text style={[styles.filterCount, on && styles.filterTextOn]}>{n}</Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.spinner} color={STITCH_COLORS.onSurfaceVariant} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(e) => `${e.kind}-${e.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={STITCH_COLORS.primary} colors={[STITCH_COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                {error ? 'Could not load activity' : 'No activity yet'}
              </Text>
              <Text style={styles.empty}>
                {error ||
                  (Object.keys(projects).length === 0
                    ? 'Publish a project — likes, comments and follows show up here.'
                    : 'When someone likes, comments or follows you, it shows up here.')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: STITCH_COLORS.background },
  top: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 26, fontFamily: FONTS.sans.semibold, color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle: { marginTop: 4, fontSize: 13.5, fontFamily: FONTS.sans.regular, color: '#A1A1A1' },
  filters: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 8 },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#000000',
  },
  filterOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  filterText: { fontSize: 12.5, fontFamily: FONTS.sans.medium, color: '#A1A1A1' },
  filterTextOn: { fontFamily: FONTS.sans.semibold, color: '#000000' },
  filterCount: { fontSize: 11, fontFamily: FONTS.mono.medium, color: '#737373' },
  spinner: { marginTop: 40 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: '#111111' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  kindBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: STITCH_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemText: { fontSize: 13.5, lineHeight: 19, fontFamily: FONTS.sans.regular, color: '#A1A1A1' },
  strong: { fontFamily: FONTS.sans.semibold, color: '#FFFFFF' },
  snippet: { marginTop: 4, fontSize: 13, lineHeight: 18, fontFamily: FONTS.sans.regular, color: '#D4D4D4' },
  time: { marginTop: 4, fontSize: 11.5, fontFamily: FONTS.sans.regular, color: '#737373' },
  emptyBox: { marginTop: 48, alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontFamily: FONTS.sans.semibold, color: '#EDEDED' },
  empty: { fontSize: 13, lineHeight: 18, fontFamily: FONTS.sans.regular, color: '#737373', textAlign: 'center' },
});
