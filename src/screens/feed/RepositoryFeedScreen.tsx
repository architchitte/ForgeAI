import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Repository } from '../../types/repository';
import { fetchRepositories } from '../../services/repositories';
import { ProjectDetailSheet } from '../../components/detail/ProjectDetailSheet';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import {
  GraduationCapIcon,
  ArrowRightIcon,
  SearchIcon,
  RocketIcon,
} from '../../components/common/AppIcons';
import { LikeButton } from '../../components/common/LikeButton';
import { useLikes } from '../../context/LikesContext';
import { useLikesLiveSync } from '../../hooks/useLikesLiveSync';
import { COMMUNITY_MEMBER_LABEL } from '../../constants/identity';
import { DesktopFrame, PhoneFrame } from '../../components/screenshot/ScreenshotFrames';
import {
  fetchScreenshotsForRepositories,
  getScreenshotUrl,
} from '../../services/screenshots';
import { ProjectScreenshot } from '../../types/screenshot';
import { TechnologyBadges } from '../../components/technology/TechnologyDisplay';
import {
  ProjectTechnology,
  fetchTechnologiesForRepositories,
} from '../../services/technologies';
import { PressableScale } from '../../components/animation/PressableScale';
import { FadeInView } from '../../components/animation/FadeInView';
import { staggerDelay } from '../../components/animation/motion';

// Only the first screenful of cards gets an entrance animation.
const ANIMATED_CARD_LIMIT = 8;
// Phone-frame width on mobile-screenshot cards (~30% of the screen): wide
// enough to fill the card's height beside the details, never dominating it.
const CARD_PHONE_MIN_WIDTH = 104;
const CARD_PHONE_MAX_WIDTH = 132;

interface RepositoryFeedScreenProps {
  onNavigateToSubmit?: () => void;
  onSelectRepository?: (repo: Repository) => void;
  isActive?: boolean;
}

// `techId` matches structured selections; `id` still matches legacy
// framework text, so old and new projects filter the same way.
const FRAMEWORK_FILTERS = [
  { id: 'all', label: 'All Projects', techId: null },
  { id: 'langgraph', label: 'LangGraph', techId: 'langgraph' },
  { id: 'crewai', label: 'CrewAI', techId: 'crewai' },
  { id: 'dspy', label: 'DSPy', techId: 'dspy' },
  { id: 'autogen', label: 'AutoGen', techId: 'microsoft-autogen' },
];

interface RepositoryCardProps {
  item: Repository;
  index: number;
  onPress: (repo: Repository) => void;
  /** Undefined until like state has loaded for this card. */
  likeCount?: number;
  liked: boolean;
  likePending: boolean;
  onToggleLike: (repositoryId: string) => void;
  /** The project's screenshot, if it has one. */
  screenshot?: ProjectScreenshot;
  /** Structured technologies; undefined/empty falls back to `framework`. */
  technologies?: ProjectTechnology[];
}

/**
 * Memoized so typing in search / toggling filters only re-renders cards
 * whose data actually changed.
 */
const RepositoryCard = React.memo<RepositoryCardProps>(({
  item,
  index,
  onPress,
  likeCount,
  liked,
  likePending,
  onToggleLike,
  screenshot,
  technologies,
}) => {
  // A screenshot that fails to load falls back to the plain card layout.
  const [screenshotFailed, setScreenshotFailed] = useState<boolean>(false);
  const screenshotPath = screenshot?.storage_path;
  useEffect(() => setScreenshotFailed(false), [screenshotPath]);
  const screenshotUri =
    screenshotPath && !screenshotFailed ? getScreenshotUrl(screenshotPath) : null;
  const layout: 'plain' | 'desktop' | 'mobile' = screenshotUri
    ? screenshot!.screenshot_type
    : 'plain';

  // Never fall back to the submitter's email — it is private.
  const studentDisplayName =
    item.student_name && item.student_name.trim().length > 0
      ? item.student_name.trim()
      : COMMUNITY_MEMBER_LABEL;

  const { width: windowWidth } = useWindowDimensions();
  const phoneWidth = Math.min(
    CARD_PHONE_MAX_WIDTH,
    Math.max(CARD_PHONE_MIN_WIDTH, Math.round(windowWidth * 0.3))
  );

  const creatorSubtitle = item.university
    ? `${studentDisplayName} · ${item.university}`
    : studentDisplayName;


  // Shared pieces, arranged differently per layout below.
  const header = (
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleCol}>
        <Text style={styles.cardAppName} numberOfLines={layout === 'mobile' ? 2 : 1}>
          {item.app_name}
        </Text>
        <View style={styles.authorRow}>
          <View style={styles.authorIcon}>
            <GraduationCapIcon size={14} color={STITCH_COLORS.primaryContainer} />
          </View>
          {/* Wraps onto more lines so long university names stay fully visible */}
          <Text style={styles.cardAuthor}>{creatorSubtitle}</Text>
        </View>
      </View>
    </View>
  );

  // AI technologies: first three + "+N" (legacy: framework text)
  const techBadges = (
    <TechnologyBadges technologies={technologies} legacyFramework={item.framework} />
  );

  // Active status & like. The whole card is the button that opens the project.
  const footer = (
    <View style={[styles.cardFooter, layout === 'mobile' && styles.cardFooterWrap]}>
      <View style={styles.footerLeft}>
        <View style={styles.activeStatusPill}>
          <View style={styles.activeDot} />
          <Text style={styles.activeStatusText}>Active</Text>
        </View>
        <LikeButton
          repositoryId={item.id}
          count={likeCount}
          liked={liked}
          pending={likePending}
          onToggle={onToggleLike}
        />
      </View>
    </View>
  );

  return (
    <FadeInView delay={staggerDelay(index)} disabled={index >= ANIMATED_CARD_LIMIT}>
    <PressableScale
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      pressedScale={0.98}
      testID={`repository-card-${item.id}`}
      accessibilityHint="Opens the project details"
    >
      {layout === 'mobile' ? (
        // Mobile showcase: every detail in the left column; the phone preview
        // fills the right side for the full height of the card.
        <View style={styles.mobileCardRow}>
          <View style={styles.mobileCardInfo}>
            <View>
              {header}
              <Text style={styles.oneLiner} numberOfLines={4}>
                {item.one_liner}
              </Text>
              {techBadges}
            </View>
            {footer}
          </View>
          <PhoneFrame
            uri={screenshotUri!}
            width={phoneWidth}
            thumbnail
            style={styles.mobileCardPhone}
            onError={() => setScreenshotFailed(true)}
            accessibilityLabel={`${item.app_name} mobile screenshot`}
          />
        </View>
      ) : (
        <>
          {header}
          {/* Description */}
          <Text style={styles.oneLiner} numberOfLines={2}>
            {item.one_liner}
          </Text>
          {layout === 'desktop' && (
            // Desktop showcase: wide browser-window preview under the copy.
            <DesktopFrame
              uri={screenshotUri!}
              compact
              thumbnail
              style={styles.desktopPreview}
              onError={() => setScreenshotFailed(true)}
              accessibilityLabel={`${item.app_name} desktop screenshot`}
            />
          )}
          {techBadges}
          {footer}
        </>
      )}
    </PressableScale>
    </FadeInView>
  );
});
RepositoryCard.displayName = 'RepositoryCard';

export const RepositoryFeedScreen: React.FC<RepositoryFeedScreenProps> = ({
  onNavigateToSubmit,
  onSelectRepository,
  isActive = true,
}) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFramework, setSelectedFramework] = useState<string>('all');

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

  // Filtered repositories based on search and framework
  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        repo.app_name.toLowerCase().includes(query) ||
        repo.one_liner.toLowerCase().includes(query) ||
        repo.framework.toLowerCase().includes(query) ||
        (technologies[repo.id] ?? []).some((t) =>
          t.technology_name.toLowerCase().includes(query)
        ) ||
        (repo.university && repo.university.toLowerCase().includes(query)) ||
        (repo.student_name && repo.student_name.toLowerCase().includes(query));

      const filter = FRAMEWORK_FILTERS.find((f) => f.id === selectedFramework);
      const matchesFramework =
        selectedFramework === 'all' ||
        repo.framework.toLowerCase().includes(selectedFramework.toLowerCase()) ||
        (!!filter?.techId &&
          (technologies[repo.id] ?? []).some((t) => t.technology_id === filter.techId));

      return matchesSearch && matchesFramework;
    });
  }, [repositories, searchQuery, selectedFramework, technologies]);

  const renderCard = useCallback(
    ({ item, index }: { item: Repository; index: number }) => {
      const summary = likes[item.id];
      return (
        <RepositoryCard
          item={item}
          index={index}
          onPress={handleSelectRepository}
          likeCount={summary?.count}
          liked={summary?.likedByMe ?? false}
          likePending={pendingIds[item.id] === true}
          onToggleLike={toggleLike}
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

      {/* Modern Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchIconWrap}>
          <SearchIcon size={16} color={STITCH_COLORS.outline} />
        </View>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search projects, technologies, schools..."
          placeholderTextColor={STITCH_COLORS.outline}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Framework Filter Chips */}
      <View style={styles.chipsScroll}>
        {FRAMEWORK_FILTERS.map((chip) => {
          const isSelected = selectedFramework.toLowerCase() === chip.id.toLowerCase();
          return (
            <PressableScale
              key={chip.id}
              style={[
                styles.filterChip,
                isSelected && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFramework(chip.id)}
              activeOpacity={0.7}
              pressedScale={0.95}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelActive,
                ]}
              >
                {chip.label}
              </Text>
              {chip.id === 'all' && (
                <View
                  style={[
                    styles.chipCountBadge,
                    isSelected && styles.chipCountBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipCountText,
                      isSelected && styles.chipCountTextActive,
                    ]}
                  >
                    {repositories.length}
                  </Text>
                </View>
              )}
            </PressableScale>
          );
        })}
      </View>
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
          data={filteredRepositories}
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
                <SearchIcon size={28} color={STITCH_COLORS.outline} />
              </View>
              <Text style={styles.emptyTitle}>No Projects Found</Text>
              <Text style={styles.emptySubtitle}>
                No student AI projects matched your search query or filter.
              </Text>
              {(searchQuery !== '' || selectedFramework !== 'all') && (
                <PressableScale
                  style={styles.resetBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFramework('all');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resetBtnText}>Reset Filters</Text>
                </PressableScale>
              )}
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
  beaconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    marginBottom: 8,
    gap: 6,
  },
  beaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  beaconText: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
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
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#262626',
    height: 44,
    marginTop: 14,
    marginBottom: 12,
  },
  searchIconWrap: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    color: '#EDEDED',
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    color: '#737373',
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
  },
  chipsScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#262626',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  chipLabelActive: {
    color: '#000000',
    fontFamily: FONTS.sans.semibold,
  },
  chipCountBadge: {
    backgroundColor: '#171717',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  chipCountBadgeActive: {
    backgroundColor: '#E5E5E5',
  },
  chipCountText: {
    fontSize: 11,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
  },
  chipCountTextActive: {
    color: '#000000',
  },

  // Project Card
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  cardAppName: {
    fontSize: 18,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 3,
  },
  authorIcon: {
    marginTop: 1, // align with the first text line
  },
  schoolIcon: {
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
  },
  cardAuthor: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  oneLiner: {
    fontSize: 13.5,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
    lineHeight: 19,
    marginBottom: 12,
  },
  desktopPreview: {
    marginBottom: 12,
  },
  mobileCardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  mobileCardInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  mobileCardPhone: {
    alignSelf: 'center',
  },
  cardFooterWrap: {
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#171717',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  activeStatusText: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },

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
  rocketIcon: {
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
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
  resetBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
  },
  resetBtnText: {
    fontSize: 12,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.primary,
  },
});
