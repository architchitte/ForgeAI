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
import {
  GraduationCapIcon,
  ArrowRightIcon,
  SearchIcon,
  RocketIcon,
} from '../../components/common/AppIcons';

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

const getFrameworkBadgeStyle = (framework: string) => {
  const fw = (framework || '').toLowerCase();
  if (fw.includes('langgraph')) {
    return {
      bg: STITCH_COLORS.primaryFixed, // #e2dfff
      text: STITCH_COLORS.onPrimaryFixedVariant, // #3323cc
    };
  }
  if (fw.includes('crewai')) {
    return {
      bg: STITCH_COLORS.secondaryFixed, // #d8e2ff
      text: STITCH_COLORS.onSecondaryFixedVariant, // #004395
    };
  }
  if (fw.includes('dspy')) {
    return {
      bg: STITCH_COLORS.primaryFixed, // #e2dfff
      text: STITCH_COLORS.onPrimaryFixedVariant, // #3323cc
    };
  }
  return {
    bg: STITCH_COLORS.surfaceContainerHigh, // #e2e7ff
    text: STITCH_COLORS.onSurface,
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

  const renderCard = ({ item }: { item: Repository }) => {
    const studentDisplayName =
      item.student_name && item.student_name.trim().length > 0
        ? item.student_name.trim()
        : item.student_email;

    const creatorSubtitle = item.university
      ? `${studentDisplayName} · ${item.university}`
      : studentDisplayName;

    const fwBadge = getFrameworkBadgeStyle(item.framework);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelectRepository(item)}
        activeOpacity={0.8}
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
          <View style={[styles.frameworkBadge, { backgroundColor: fwBadge.bg }]}>
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
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Curated Showcase Badge */}
      <View style={styles.beaconBadge}>
        <View style={styles.beaconDot} />
        <Text style={styles.beaconText}>Curated Showcase</Text>
      </View>

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
            <TouchableOpacity
              key={chip.id}
              style={[
                styles.filterChip,
                isSelected && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFramework(chip.id)}
              activeOpacity={0.7}
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
            </TouchableOpacity>
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

        <TouchableOpacity
          style={styles.cohortButton}
          onPress={onNavigateToSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.cohortButtonText}>Submit a Project</Text>
          <ArrowRightIcon size={14} color={STITCH_COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      {/* Main Stream */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={STITCH_COLORS.primary} />
          <Text style={styles.loadingText}>Loading student blueprints...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry Sync</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRepositories}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <SearchIcon size={28} color={STITCH_COLORS.outline} />
              </View>
              <Text style={styles.emptyTitle}>No Projects Found</Text>
              <Text style={styles.emptySubtitle}>
                No student AI projects matched your search query or filter.
              </Text>
              {(searchQuery !== '' || selectedFramework !== 'all') && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFramework('all');
                  }}
                >
                  <Text style={styles.resetBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
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
    backgroundColor: STITCH_COLORS.secondaryFixed, // #d8e2ff
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
    backgroundColor: STITCH_COLORS.secondary, // #0058be
  },
  beaconText: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH_COLORS.onSecondaryFixed, // #001a42
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface, // #131b2e
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: STITCH_COLORS.onSurfaceVariant, // #464555
    marginTop: 4,
    lineHeight: 20,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STITCH_COLORS.surfaceContainerLowest, // #ffffff
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest, // #dae2fd
    height: 46,
    marginTop: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIconWrap: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    color: STITCH_COLORS.onSurface,
    fontSize: 14,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    color: STITCH_COLORS.outline,
    fontSize: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest, // #ffffff
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: STITCH_COLORS.primary, // #3525cd
    borderColor: STITCH_COLORS.primary,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH_COLORS.onSurfaceVariant,
  },
  chipLabelActive: {
    color: '#ffffff',
  },
  chipCountBadge: {
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  chipCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  chipCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
  },
  chipCountTextActive: {
    color: '#ffffff',
  },

  // Project Card
  card: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest, // #ffffff
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
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
    fontSize: 20,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  schoolIcon: {
    fontSize: 12,
  },
  cardAuthor: {
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  frameworkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  frameworkBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  oneLiner: {
    fontSize: 13.5,
    color: STITCH_COLORS.onSurfaceVariant,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: STITCH_COLORS.surfaceContainerLow,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  viewProjectLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewProjectText: {
    fontSize: 13,
    fontWeight: '600',
    color: STITCH_COLORS.primary,
  },
  viewProjectIcon: {
    fontSize: 14,
    color: STITCH_COLORS.primary,
  },

  // Call To Action Footer
  footerContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  cohortCard: {
    backgroundColor: STITCH_COLORS.primary, // #3525cd
    borderRadius: 16,
    padding: 20,
    shadowColor: STITCH_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  cohortBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rocketIcon: {
    fontSize: 14,
  },
  cohortBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.8,
  },
  cohortTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
  },
  cohortDesc: {
    fontSize: 13,
    color: '#dad7ff',
    marginVertical: 8,
    lineHeight: 18,
  },
  cohortButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  cohortButtonText: {
    color: STITCH_COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
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
    fontWeight: '700',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
  },
  emptySubtitle: {
    fontSize: 13,
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
    fontWeight: '700',
    color: STITCH_COLORS.primary,
  },
});
