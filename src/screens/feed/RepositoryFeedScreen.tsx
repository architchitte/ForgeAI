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
import { PressableScale } from '../../components/animation/PressableScale';
import { FadeInView } from '../../components/animation/FadeInView';
import { staggerDelay } from '../../components/animation/motion';

// Only the first screenful of cards gets an entrance animation.
const ANIMATED_CARD_LIMIT = 8;

interface RepositoryFeedScreenProps {
  onNavigateToSubmit?: () => void;
  onSelectRepository?: (repo: Repository) => void;
  isActive?: boolean;
}

const FRAMEWORK_FILTERS = [
  { id: 'all', label: 'All Projects' },
  { id: 'langgraph', label: 'LangGraph' },
  { id: 'crewai', label: 'CrewAI' },
  { id: 'dspy', label: 'DSPy' },
  { id: 'autogen', label: 'AutoGen' },
];

const getFrameworkBadgeStyle = (_framework: string) => {
  return {
    bg: '#111111',
    text: '#A1A1A1',
    border: '#262626',
  };
};

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

  const loadData = useCallback(async () => {
    setError(null);
    const result = await fetchRepositories();
    if (result.error) {
      setError(result.error);
    } else {
      setRepositories(result.data || []);
    }
  }, []);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectRepository = (repo: Repository) => {
    if (onSelectRepository) {
      onSelectRepository(repo);
    } else {
      setSelectedRepository(repo);
      setIsDetailVisible(true);
    }
  };

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
        (repo.university && repo.university.toLowerCase().includes(query)) ||
        (repo.student_name && repo.student_name.toLowerCase().includes(query));

      const matchesFramework =
        selectedFramework === 'all' ||
        repo.framework.toLowerCase().includes(selectedFramework.toLowerCase());

      return matchesSearch && matchesFramework;
    });
  }, [repositories, searchQuery, selectedFramework]);

  const renderCard = ({ item, index }: { item: Repository; index: number }) => {
    const studentDisplayName =
      item.student_name && item.student_name.trim().length > 0
        ? item.student_name.trim()
        : item.student_email;

    const creatorSubtitle = item.university
      ? `${studentDisplayName} · ${item.university}`
      : studentDisplayName;

    const fwBadge = getFrameworkBadgeStyle(item.framework);

    return (
      <FadeInView delay={staggerDelay(index)} disabled={index >= ANIMATED_CARD_LIMIT}>
      <PressableScale
        style={styles.card}
        onPress={() => handleSelectRepository(item)}
        activeOpacity={0.8}
        pressedScale={0.98}
        testID={`repository-card-${item.id}`}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleCol}>
            <Text style={styles.cardAppName} numberOfLines={1}>
              {item.app_name}
            </Text>
            <View style={styles.authorRow}>
              <GraduationCapIcon size={14} color={STITCH_COLORS.primaryContainer} />
              <Text style={styles.cardAuthor} numberOfLines={1}>
                {creatorSubtitle}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.frameworkBadge,
              {
                backgroundColor: fwBadge.bg,
                borderColor: fwBadge.border,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.frameworkBadgeText, { color: fwBadge.text }]}>
              {item.framework}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.oneLiner} numberOfLines={2}>
          {item.one_liner}
        </Text>

        {/* Card Bottom: Active Status Pill & View Project Button */}
        <View style={styles.cardFooter}>
          <View style={styles.activeStatusPill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeStatusText}>Active</Text>
          </View>

          <View style={styles.viewProjectLink}>
            <Text style={styles.viewProjectText}>View Project</Text>
            <ArrowRightIcon size={14} color={STITCH_COLORS.primaryContainer} />
          </View>
        </View>
      </PressableScale>
      </FadeInView>
    );
  };

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
          placeholder="Search projects, frameworks, schools..."
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
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
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
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  schoolIcon: {
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
  },
  cardAuthor: {
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  frameworkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  frameworkBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
  },
  oneLiner: {
    fontSize: 13.5,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#171717',
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
  viewProjectLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewProjectText: {
    fontSize: 13,
    fontFamily: FONTS.sans.medium,
    color: '#FFFFFF',
  },
  viewProjectIcon: {
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    color: '#FFFFFF',
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
