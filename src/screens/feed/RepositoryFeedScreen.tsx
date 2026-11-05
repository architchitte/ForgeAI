import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Repository } from '../../types/repository';
import { fetchRepositories } from '../../services/repositories';
import { Button } from '../../components/common/Button';
import { ProjectDetailSheet } from '../../components/detail/ProjectDetailSheet';

interface RepositoryFeedScreenProps {
  onNavigateToSubmit?: () => void;
  isActive?: boolean;
}

export const RepositoryFeedScreen: React.FC<RepositoryFeedScreenProps> = ({
  onNavigateToSubmit,
  isActive = true,
}) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    setSelectedRepository(repo);
    setIsDetailVisible(true);
  };

  const handleCloseDetail = () => {
    setIsDetailVisible(false);
    setSelectedRepository(null);
  };

  const renderItem = ({ item }: { item: Repository }) => {
    const studentDisplayName =
      item.student_name && item.student_name.trim().length > 0
        ? item.student_name
        : item.student_email;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelectRepository(item)}
        activeOpacity={0.75}
        testID={`repository-card-${item.id}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.appName} numberOfLines={1}>
            {item.app_name}
          </Text>
          <View style={styles.frameworkBadge}>
            <Text style={styles.frameworkBadgeText}>{item.framework}</Text>
          </View>
        </View>

        <Text style={styles.oneLiner} numberOfLines={2}>
          {item.one_liner}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.studentInfoRow}>
            <Text style={styles.studentLabel}>Student:</Text>
            <Text style={styles.studentName} numberOfLines={1}>
              {studentDisplayName}
            </Text>
          </View>

          <Text style={styles.viewDetailsText}>View Details →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>ForgeAI Repositories</Text>
        </View>
        <Text style={styles.title}>Browse AI Blueprints</Text>
        <Text style={styles.subtitle}>
          Discover student-built AI applications published on ForgeAI
        </Text>
      </View>

      {/* Loading state */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Fetching blueprints...</Text>
        </View>
      ) : null}

      {/* Error state */}
      {error && !loading ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Failed to Load Feed</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Retry Connection"
              variant="outline"
              onPress={() => {
                setLoading(true);
                loadData().finally(() => setLoading(false));
              }}
              style={styles.retryButton}
            />
          </View>
        </View>
      ) : null}

      {/* Empty state */}
      {!loading && !error && repositories.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Blueprints Found</Text>
            <Text style={styles.emptySubtitle}>
              No student applications have been published yet. Be the first to
              publish your blueprint!
            </Text>
            {onNavigateToSubmit ? (
              <Button
                title="Submit First Blueprint"
                onPress={onNavigateToSubmit}
                style={styles.emptyButton}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Feed List */}
      {!loading && !error && repositories.length > 0 ? (
        <FlatList
          data={repositories}
          keyExtractor={(item) => item.id || `${item.app_name}-${item.created_at}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
            />
          }
        />
      ) : null}

      {/* Project Detail Sheet Modal */}
      <ProjectDetailSheet
        repository={selectedRepository}
        visible={isDetailVisible}
        onClose={handleCloseDetail}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 6,
  },
  tagText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    minHeight: 44,
  },
  emptyBox: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyButton: {
    minHeight: 46,
    paddingHorizontal: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  frameworkBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  frameworkBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  oneLiner: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  studentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginRight: 4,
  },
  studentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
});
