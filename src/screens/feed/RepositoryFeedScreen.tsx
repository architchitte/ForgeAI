import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Repository } from '../../types/repository';
import { fetchRepositories } from '../../services/repositories';
import { ProjectDetailSheet } from '../../components/detail/ProjectDetailSheet';
import { STITCH_COLORS, STITCH_ASSETS } from '../../constants/theme';

interface RepositoryFeedScreenProps {
  onNavigateToSubmit?: () => void;
  onSelectRepository?: (repo: Repository) => void;
  isActive?: boolean;
}

const FRAMEWORK_FILTERS = [
  { id: 'all', label: 'All Projects' },
  { id: 'langgraph', label: 'LANGGRAPH' },
  { id: 'crewai', label: 'CREWAI' },
  { id: 'dspy', label: 'DSPY' },
  { id: 'autogen', label: 'AUTOGEN' },
];

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

  // Animation for beacon ping
  const beaconPing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(beaconPing, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, [beaconPing]);

  const beaconScale = beaconPing.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const beaconOpacity = beaconPing.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

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

  // Diagram Topology Visualizers matching the 4 Stitch variants
  const renderTopologyDisplay = (framework: string, index: number) => {
    const fw = framework.toLowerCase();
    const variantIndex = index % 4;

    if (fw.includes('crew') || variantIndex === 1) {
      // Variant 2: HPC Cluster Node Visualizer
      return (
        <View style={styles.topologyContainer}>
          <View style={styles.clusterGrid}>
            {[1, 2, 3, 4].map((node) => (
              <View key={node} style={styles.clusterTile}>
                <View style={styles.clusterTileHeader}>
                  <Text style={styles.clusterTileTag}>NODE 0{node}</Text>
                  <View
                    style={[
                      styles.clusterTileDot,
                      node <= 2 && { backgroundColor: STITCH_COLORS.primaryContainer },
                    ]}
                  />
                </View>
                <View style={styles.clusterBar}>
                  <View
                    style={[
                      styles.clusterBarFill,
                      { width: `${30 + node * 18}%` },
                    ]}
                  />
                </View>
                <Text style={styles.clusterMetric}>GPU CLUSTER #{node}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (fw.includes('dspy') || variantIndex === 2) {
      // Variant 3: Dialectic Orbit Graph Preview
      return (
        <View style={styles.topologyContainer}>
          <View style={styles.orbitContainer}>
            <View style={styles.orbitEllipseOuter} />
            <View style={styles.orbitEllipseInner} />
            <View style={styles.centralCore}>
              <View style={styles.centralCoreDot} />
            </View>
            <View style={styles.satellite1}>
              <Text style={styles.satelliteLabel}>SYNTH</Text>
            </View>
            <View style={styles.satellite2}>
              <Text style={styles.satelliteLabel}>DIALECTIC</Text>
            </View>
          </View>
        </View>
      );
    }

    if (fw.includes('autogen') || variantIndex === 3) {
      // Variant 4: Molecular Reaction Network
      return (
        <View style={styles.topologyContainer}>
          <View style={styles.moleculeContainer}>
            <View style={styles.moleculeNode1}>
              <Text style={styles.moleculeLabel}>CATALYST</Text>
            </View>
            <View style={styles.moleculeBond} />
            <View style={styles.moleculeNode2}>
              <Text style={styles.moleculeLabel}>SYNTH-ISO</Text>
            </View>
            <View style={styles.moleculeBond2} />
            <View style={styles.moleculeNode3} />
          </View>
        </View>
      );
    }

    // Variant 1: Schematic DAG Topology Display (Ingest, Parser, Cross-Ref, Eval-Loop, Horizon)
    return (
      <View style={styles.topologyContainer}>
        <View style={styles.dagContent}>
          <View style={styles.dagNodeGroup}>
            <View style={[styles.dagNodeCircle, { borderColor: STITCH_COLORS.primaryContainer }]}>
              <View style={styles.dagCoreOrange} />
            </View>
            <Text style={styles.dagNodeLabel}>INGEST</Text>
          </View>

          <View style={styles.dagWire} />

          <View style={styles.dagNodeGroup}>
            <View style={[styles.dagNodeCircle, { borderColor: STITCH_COLORS.secondaryContainer }]}>
              <View style={styles.dagCoreAmber} />
            </View>
            <Text style={styles.dagNodeLabel}>PARSER</Text>
          </View>

          <View style={styles.dagWireOrange} />

          <View style={styles.dagNodeGroup}>
            <View style={[styles.dagNodeCircle, { borderColor: STITCH_COLORS.primary }]}>
              <View style={styles.dagCorePeach} />
            </View>
            <Text style={styles.dagNodeLabel}>EVAL-LOOP</Text>
          </View>

          <View style={styles.dagWire} />

          <View style={styles.dagNodeGroup}>
            <View style={[styles.dagNodeCircle, { borderColor: STITCH_COLORS.primaryContainer }]}>
              <View style={styles.dagCoreOrange} />
            </View>
            <Text style={styles.dagNodeLabel}>HORIZON</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCard = ({ item, index }: { item: Repository; index: number }) => {
    const studentDisplayName =
      item.student_name && item.student_name.trim().length > 0
        ? item.student_name
        : item.student_email;

    const creatorSubtitle = item.university
      ? `${studentDisplayName} · ${item.university}`
      : studentDisplayName;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelectRepository(item)}
        activeOpacity={0.8}
        testID={`repository-card-${item.id}`}
      >
        {/* Accretion top gradient accent */}
        <View style={styles.cardAccentLine} />

        {/* Metadata Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleCol}>
            <Text style={styles.cardAppName} numberOfLines={1}>
              {item.app_name}
            </Text>
            <Text style={styles.cardAuthor} numberOfLines={1}>
              {creatorSubtitle}
            </Text>
          </View>
          <View style={styles.frameworkBadge}>
            <Text style={styles.frameworkBadgeText}>
              {item.framework.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Schematic DAG Topology Visualizer */}
        {renderTopologyDisplay(item.framework, index)}

        {/* Description */}
        <Text style={styles.oneLiner} numberOfLines={2}>
          {item.one_liner}
        </Text>

        {/* Telemetry Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerTag}>
            <View style={styles.footerTagDot} />
            <Text style={styles.footerTagText}>
              {item.university || 'FORGE AGENT'}
            </Text>
          </View>

          <View style={styles.viewProjectLink}>
            <Text style={styles.viewProjectText}>View Project</Text>
            <Text style={styles.viewProjectIcon}>↗</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Ambient Relativistic Light Field */}
      <View style={styles.ambientAura} pointerEvents="none" />

      {/* Header Horizon */}
      <View style={styles.topHorizon}>
        <View style={styles.beaconBadge}>
          <View style={styles.beaconDotWrap}>
            <Animated.View
              style={[
                styles.beaconPulseRing,
                {
                  transform: [{ scale: beaconScale }],
                  opacity: beaconOpacity,
                },
              ]}
            />
            <View style={styles.beaconDot} />
          </View>
          <Text style={styles.beaconText}>STUDENT PROJECTS</Text>
        </View>
        <Text style={styles.heroTitle}>Student AI Projects</Text>
        <Text style={styles.heroSubtitle}>
          Discover AI projects and workflows built by university students.
        </Text>
      </View>

      {/* Command Horizon Search & Filter Terminal */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarWrapper}>
          <Text style={styles.terminalPromptIcon}>&gt;_</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search projects, frameworks, schools..."
            placeholderTextColor={STITCH_COLORS.outlineVariant}
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
            const isSelected = selectedFramework === chip.id;
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
                <View
                  style={[
                    styles.chipDot,
                    isSelected && styles.chipDotActive,
                  ]}
                />
                <Text
                  style={[
                    styles.chipLabel,
                    isSelected && styles.chipLabelActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {/* Cosmic Cohort Callout Card */}
      <View style={styles.cohortCard}>
        <View style={styles.cohortGlow1} pointerEvents="none" />
        <View style={styles.cohortGlow2} pointerEvents="none" />

        <View style={styles.cohortBadgeRow}>
          <View style={styles.beaconDotWrap}>
            <Animated.View
              style={[
                styles.beaconPulseRing,
                {
                  transform: [{ scale: beaconScale }],
                  opacity: beaconOpacity,
                },
              ]}
            />
            <View style={styles.beaconDot} />
          </View>
          <Text style={styles.cohortBadgeText}>COMMUNITY SHOWCASE</Text>
        </View>

        <Text style={styles.cohortTitle}>Submit Your Project</Text>
        <Text style={styles.cohortDesc}>
          Share your AI project with the student community and get feedback.
        </Text>

        <TouchableOpacity
          style={styles.cohortButton}
          onPress={onNavigateToSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.cohortButtonText}>Submit a Project →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      {/* Main Stream */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={STITCH_COLORS.primaryContainer} />
          <Text style={styles.loadingText}>Syncing Event Horizon...</Text>
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
              <Text style={styles.emptyIcon}>⚡</Text>
              <Text style={styles.emptyTitle}>No Projects Found</Text>
              <Text style={styles.emptySubtitle}>
                No student agent blueprint matches your telemetry filters. Alter query coordinates or reset active parameters.
              </Text>
              {(searchQuery !== '' || selectedFramework !== 'all') && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFramework('all');
                  }}
                >
                  <Text style={styles.resetBtnText}>Reset Horizon Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={STITCH_COLORS.primaryContainer}
              colors={[STITCH_COLORS.primaryContainer]}
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
    backgroundColor: STITCH_COLORS.background,
  },
  appBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: STITCH_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: STITCH_COLORS.surfaceContainerHighest + '40',
  },
  appBarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appBarLogo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.3,
  },
  appBarSub: {
    fontSize: 10,
    color: STITCH_COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appBarAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: STITCH_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerContainer: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  ambientAura: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    width: 280,
    height: 200,
    borderRadius: 140,
    backgroundColor: STITCH_COLORS.primaryContainer,
    opacity: 0.1,
  },
  topHorizon: {
    marginBottom: 16,
  },
  beaconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  beaconDotWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    position: 'relative',
  },
  beaconPulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: STITCH_COLORS.primaryContainer,
  },
  beaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.primaryContainer,
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  beaconText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.primary,
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  searchSection: {
    marginBottom: 12,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: STITCH_COLORS.outlineVariant + '40',
    height: 44,
  },
  terminalPromptIcon: {
    fontSize: 13,
    fontWeight: '800',
    color: STITCH_COLORS.primary,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  searchInput: {
    flex: 1,
    color: STITCH_COLORS.onSurface,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    gap: 6,
    marginTop: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
  },
  filterChipActive: {
    backgroundColor: STITCH_COLORS.primaryContainer,
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 2,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.outlineVariant,
    marginRight: 5,
  },
  chipDotActive: {
    backgroundColor: '#FFFFFF',
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH_COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  chipLabelActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  cardAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: STITCH_COLORS.primaryContainer,
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
    fontSize: 17,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
  },
  cardAuthor: {
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  frameworkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
  },
  frameworkBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.primary,
    letterSpacing: 0.8,
  },
  topologyContainer: {
    height: 84,
    borderRadius: 8,
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '40',
    overflow: 'hidden',
    paddingHorizontal: 10,
  },
  dagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
  },
  dagNodeGroup: {
    alignItems: 'center',
  },
  dagNodeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  dagCoreOrange: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: STITCH_COLORS.primaryContainer,
  },
  dagCoreAmber: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: STITCH_COLORS.secondary,
  },
  dagCorePeach: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: STITCH_COLORS.primary,
  },
  dagNodeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dagWire: {
    flex: 1,
    height: 1,
    backgroundColor: STITCH_COLORS.outlineVariant,
    marginHorizontal: 4,
  },
  dagWireOrange: {
    flex: 1,
    height: 1.5,
    backgroundColor: STITCH_COLORS.primaryContainer,
    marginHorizontal: 4,
  },
  clusterGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 6,
  },
  clusterTile: {
    flex: 1,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '50',
  },
  clusterTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clusterTileTag: {
    fontSize: 7,
    fontWeight: '700',
    color: STITCH_COLORS.outline,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  clusterTileDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: STITCH_COLORS.outlineVariant,
  },
  clusterBar: {
    height: 3,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
    borderRadius: 1.5,
    marginVertical: 4,
    overflow: 'hidden',
  },
  clusterBarFill: {
    height: '100%',
    backgroundColor: STITCH_COLORS.secondary,
  },
  clusterMetric: {
    fontSize: 6,
    color: STITCH_COLORS.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  orbitContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orbitEllipseOuter: {
    position: 'absolute',
    width: 180,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: STITCH_COLORS.primaryContainer + '40',
    transform: [{ rotate: '-15deg' }],
  },
  orbitEllipseInner: {
    position: 'absolute',
    width: 120,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: STITCH_COLORS.secondary + '30',
    transform: [{ rotate: '15deg' }],
  },
  centralCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: STITCH_COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  centralCoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  satellite1: {
    position: 'absolute',
    left: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
  },
  satellite2: {
    position: 'absolute',
    right: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
  },
  satelliteLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: STITCH_COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  moleculeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  moleculeNode1: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: STITCH_COLORS.primaryContainer,
  },
  moleculeNode2: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: STITCH_COLORS.secondary,
  },
  moleculeNode3: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: STITCH_COLORS.primary,
  },
  moleculeLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: STITCH_COLORS.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  moleculeBond: {
    width: 24,
    height: 2,
    backgroundColor: STITCH_COLORS.primaryContainer,
  },
  moleculeBond2: {
    width: 20,
    height: 1.5,
    backgroundColor: STITCH_COLORS.secondary,
  },
  oneLiner: {
    fontSize: 13,
    color: STITCH_COLORS.onSurfaceVariant,
    lineHeight: 18,
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: STITCH_COLORS.surfaceContainerHighest + '40',
  },
  footerTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerTagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: STITCH_COLORS.primaryContainer,
    marginRight: 6,
  },
  footerTagText: {
    fontSize: 11,
    color: STITCH_COLORS.outline,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  viewProjectLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewProjectText: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH_COLORS.primary,
    letterSpacing: 0.5,
  },
  viewProjectIcon: {
    fontSize: 12,
    color: STITCH_COLORS.primary,
    marginLeft: 3,
  },
  footerContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  cohortCard: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '70',
    overflow: 'hidden',
  },
  cohortGlow1: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: STITCH_COLORS.primaryContainer,
    opacity: 0.15,
  },
  cohortGlow2: {
    position: 'absolute',
    left: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: STITCH_COLORS.secondaryContainer,
    opacity: 0.1,
  },
  cohortBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cohortBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.primary,
    letterSpacing: 1.2,
  },
  cohortTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
  },
  cohortDesc: {
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
    marginVertical: 6,
    lineHeight: 17,
  },
  cohortButton: {
    backgroundColor: STITCH_COLORS.primaryContainer,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  cohortButtonText: {
    color: '#FFFFFF',
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
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    color: STITCH_COLORS.primaryContainer,
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH_COLORS.primary,
  },
});
