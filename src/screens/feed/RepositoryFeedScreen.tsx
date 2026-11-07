import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Repository } from '../../types/repository';
import { fetchRepositories } from '../../services/repositories';
import { ProjectDetailSheet } from '../../components/detail/ProjectDetailSheet';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import {
  ArrowRightIcon,
  RocketIcon,
} from '../../components/common/AppIcons';
import { LikeButton } from '../../components/common/LikeButton';
import { LikersSheet } from '../../components/engagement/LikersSheet';
import { useLikes } from '../../context/LikesContext';
import { useLikesLiveSync } from '../../hooks/useLikesLiveSync';


import {
  fetchScreenshotsForRepositories,
} from '../../services/screenshots';
import { ProjectScreenshot } from '../../types/screenshot';

import {
  ProjectTechnology,
  fetchTechnologiesForRepositories,
} from '../../services/technologies';
import { PressableScale } from '../../components/animation/PressableScale';
import { ProjectCard } from '../../components/feed/ProjectCard';
import { FadeInView } from '../../components/animation/FadeInView';



interface RepositoryFeedScreenProps {
  onNavigateToSubmit?: () => void;
  onSelectRepository?: (repo: Repository) => void;
  isActive?: boolean;
  /** Opens a person's profile (e.g. from the likers list). */
  onOpenUserProfile?: (userId: string) => void;
}

export const RepositoryFeedScreen: React.FC<RepositoryFeedScreenProps> = ({
  onNavigateToSubmit,
  onSelectRepository,
  isActive = true,
  onOpenUserProfile,
}) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  // Likers sheet (hold a like button)
  const [likersFor, setLikersFor] = useState<string | null>(null);

  // Selected repository for Project Detail Sheet
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState<boolean>(false);

  const isInitialMount = useRef(true);

  const { likes, pendingIds, refreshLikes, toggleLike } = useLikes();
  const [screenshots, setScreenshots] = useState<Record<string, ProjectScreenshot>>({});
  const [technologies, setTechnologies] = useState<Record<string, ProjectTechnology[]>>({});

  // Repositories first, then one batched like query and one batched
  // screenshot query (in parallel) for every loaded card. Failures there
  // don't block the feed: counts stay unknown / cards show no screenshot.
  const loadData = useCallback(async () => {
    setError(null);
    const result = await fetchRepositories();
    if (result.error) {
      setError(result.error);
    } else {
      const repos = result.data || [];
      setRepositories(repos);
      const ids = repos.map((r) => r.id);
      await Promise.all([
        refreshLikes(ids),
        fetchScreenshotsForRepositories(ids).then((res) => {
          if (res.data) setScreenshots(res.data);
        }),
        fetchTechnologiesForRepositories(ids).then((res) => {
          if (res.data) setTechnologies(res.data);
        }),
      ]);
    }
  }, [refreshLikes]);

  // Initial load
  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Refresh when the screen becomes active again
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isActive) {
      loadData();
    }
  }, [isActive, loadData]);

  // Live like counts while the feed is visible (realtime + app foreground).
  const repositoriesRef = useRef(repositories);
  repositoriesRef.current = repositories;
  const refreshVisibleLikes = useCallback(() => {
    const ids = repositoriesRef.current.map((r) => r.id);
    if (ids.length > 0) refreshLikes(ids);
  }, [refreshLikes]);
  useLikesLiveSync(isActive && !loading, refreshVisibleLikes);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectRepository = useCallback(
    (repo: Repository) => {
      if (onSelectRepository) {
        onSelectRepository(repo);
      } else {
        setSelectedRepository(repo);
        setIsDetailVisible(true);
      }
    },
    [onSelectRepository]
  );

  const handleCloseDetail = () => {
    setIsDetailVisible(false);
    setSelectedRepository(null);
  };

  const renderCard = useCallback(
    ({ item, index }: { item: Repository; index: number }) => {
      const summary = likes[item.id];
      return (
        <ProjectCard
          item={item}
          index={index}
          onPress={handleSelectRepository}
          likeCount={summary?.count}
          liked={summary?.likedByMe ?? false}
          likePending={pendingIds[item.id] === true}
          onToggleLike={toggleLike}
          onShowLikers={setLikersFor}
          screenshot={screenshots[item.id]}
          technologies={technologies[item.id]}
        />
      );
    },
    [handleSelectRepository, likes, pendingIds, toggleLike, screenshots, technologies]
  );

  const keyExtractor = useCallback((item: Repository) => item.id, []);

  const renderHeader = () => (
    <View style={styles.headerContainer}>

      {/* Hero Title & Subtitle */}
      <Text style={styles.heroTitle}>Student AI Projects</Text>
      <Text style={styles.heroSubtitle}>
        Discover AI projects built by university students.
      </Text>

    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {/* Call To Action Card */}
      <View style={styles.cohortCard}>
        <View style={styles.cohortBadgeRow}>
          <RocketIcon size={14} color="#ffffff" />
          <Text style={styles.cohortBadgeText}>COMMUNITY SHOWCASE</Text>
        </View>

        <Text style={styles.cohortTitle}>Submit Your Project</Text>
        <Text style={styles.cohortDesc}>
          Share your AI project with student builders and get feedback.
        </Text>

        <PressableScale
          style={styles.cohortButton}
          onPress={onNavigateToSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.cohortButtonText}>Submit a Project</Text>
          <ArrowRightIcon size={14} color={STITCH_COLORS.primary} />
        </PressableScale>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      {/* Main Stream */}
      {loading && !refreshing ? (
        <FadeInView offset={0} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={STITCH_COLORS.primary} />
          <Text style={styles.loadingText}>Loading student blueprints...</Text>
        </FadeInView>
      ) : error ? (
        <FadeInView style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <PressableScale
            style={styles.retryButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry Sync</Text>
          </PressableScale>
        </FadeInView>
      ) : (
        <FlatList
          data={repositories}
          keyExtractor={keyExtractor}
          renderItem={renderCard}
          extraData={[likes, screenshots, technologies]}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={11}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={renderHeader()}
          ListFooterComponent={renderFooter()}
          ListEmptyComponent={
            <FadeInView style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <RocketIcon size={28} color={STITCH_COLORS.outline} />
              </View>
              <Text style={styles.emptyTitle}>No Projects Yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to publish a student AI project.
              </Text>
            </FadeInView>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={STITCH_COLORS.primary}
              colors={[STITCH_COLORS.primary]}
            />
          }
        />
      )}

      <LikersSheet
        repositoryId={likersFor}
        appName={repositories.find((r) => r.id === likersFor)?.app_name}
        onClose={() => setLikersFor(null)}
        onOpenUser={onOpenUserProfile}
      />

      {/* Project Detail Sheet */}
      <ProjectDetailSheet
        repository={selectedRepository}
        visible={isDetailVisible}
        onClose={handleCloseDetail}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background, // #faf8ff
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
  },
  headerContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
    marginTop: 4,
    lineHeight: 20,
  },

  // Project Card

  // Call To Action Footer
  footerContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  cohortCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cohortBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cohortBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.sans.semibold,
    color: '#A1A1A1',
    letterSpacing: 0.8,
  },
  cohortTitle: {
    fontSize: 18,
    fontFamily: FONTS.sans.semibold,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  cohortDesc: {
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
    marginVertical: 8,
    lineHeight: 18,
  },
  cohortButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  cohortButtonText: {
    color: '#000000',
    fontSize: 13.5,
    fontFamily: FONTS.sans.semibold,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.outline,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  errorText: {
    color: STITCH_COLORS.error,
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    borderRadius: 8,
  },
  retryButtonText: {
    color: STITCH_COLORS.primary,
    fontFamily: FONTS.sans.semibold,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 28,
    fontFamily: FONTS.sans.regular,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.sans.semibold,
    letterSpacing: -0.3,
    color: STITCH_COLORS.onSurface,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.outline,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
