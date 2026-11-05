import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Repository } from '../../types/repository';
import { Button } from '../common/Button';

interface ProjectDetailSheetProps {
  repository: Repository | null;
  visible: boolean;
  onClose: () => void;
}

export const ProjectDetailSheet: React.FC<ProjectDetailSheetProps> = ({
  repository,
  visible,
  onClose,
}) => {
  const [isLaunching, setIsLaunching] = useState<boolean>(false);

  if (!repository) return null;

  const studentDisplayName =
    repository.student_name && repository.student_name.trim().length > 0
      ? repository.student_name
      : repository.student_email;

  const universityText =
    repository.university && repository.university.trim().length > 0
      ? repository.university
      : 'University not specified';

  const isValidHttpUrl = (urlStr: string): boolean => {
    const trimmed = urlStr.trim();
    if (!trimmed) return false;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleLaunchAgent = async () => {
    if (isLaunching) return;

    const rawUrl = repository.agent_execution_url?.trim();

    if (!rawUrl || !isValidHttpUrl(rawUrl)) {
      Alert.alert(
        'Invalid Deployment URL',
        'This agent does not have a valid HTTP or HTTPS deployment URL configured.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsLaunching(true);

      const supported = await Linking.canOpenURL(rawUrl);
      if (!supported) {
        Alert.alert(
          'Cannot Open URL',
          `Your device cannot open this URL:\n${rawUrl}\n\nPlease check the URL format or ensure a web browser is installed.`,
          [{ text: 'OK' }]
        );
        return;
      }

      await Linking.openURL(rawUrl);
    } catch (err: any) {
      console.error('[LaunchAgent] Error opening runtime URL:', err);
      Alert.alert(
        'Launch Error',
        `Failed to open the external runtime URL:\n${err?.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>← Back to Feed</Text>
          </TouchableOpacity>
          <View style={styles.topBarBadge}>
            <Text style={styles.topBarBadgeText}>Blueprint Detail</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.titleRow}>
              <Text style={styles.appName}>{repository.app_name}</Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.frameworkBadge}>
                <Text style={styles.frameworkBadgeText}>
                  {repository.framework}
                </Text>
              </View>
              {repository.created_at ? (
                <Text style={styles.dateText}>
                  Added {new Date(repository.created_at).toLocaleDateString()}
                </Text>
              ) : null}
            </View>

            {/* One-Liner */}
            <View style={styles.oneLinerCard}>
              <Text style={styles.oneLinerText}>{repository.one_liner}</Text>
            </View>
          </View>

          {/* Student & University Metadata */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Builder Information</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Student Name</Text>
              <Text style={styles.metaValue}>{studentDisplayName}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>University</Text>
              <Text style={styles.metaValue}>{universityText}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Student Email</Text>
              <Text style={styles.metaSubValue}>{repository.student_email}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Orchestration Framework</Text>
              <Text style={styles.metaValue}>{repository.framework}</Text>
            </View>
          </View>

          {/* System Prompt Section */}
          <View style={styles.sectionCard}>
            <View style={styles.promptHeaderRow}>
              <Text style={styles.sectionHeader}>Complete System Prompt</Text>
              <View style={styles.promptTag}>
                <Text style={styles.promptTagText}>Raw Prompt</Text>
              </View>
            </View>
            <Text style={styles.promptSubtitle}>
              Full operational instructions guiding this agent's reasoning
            </Text>

            {/* Scrollable readable prompt container */}
            <View style={styles.promptContainer}>
              <ScrollView
                style={styles.promptScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.promptText}>
                  {repository.system_prompt}
                </Text>
              </ScrollView>
            </View>
          </View>

          {/* Deployment Runtime Target */}
          <View style={styles.deploymentCard}>
            <Text style={styles.deploymentLabel}>Active Deployment Runtime</Text>
            <Text style={styles.deploymentUrl} numberOfLines={1}>
              {repository.agent_execution_url}
            </Text>
          </View>

          {/* Launch Agent Action */}
          <View style={styles.actionContainer}>
            <Button
              title={isLaunching ? 'Opening Runtime...' : 'Launch Agent 🚀'}
              onPress={handleLaunchAgent}
              loading={isLaunching}
              disabled={isLaunching}
              style={styles.launchButton}
              testID="launch-agent-button"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  closeButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '700',
  },
  topBarBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  topBarBadgeText: {
    color: '#4338CA',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 20,
  },
  titleRow: {
    marginBottom: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  frameworkBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  frameworkBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  dateText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  oneLinerCard: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  oneLinerText: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 22,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  metaRow: {
    marginVertical: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  metaSubValue: {
    fontSize: 14,
    color: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  promptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  promptTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  promptTagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  promptSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  promptContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    maxHeight: 240,
  },
  promptScrollView: {
    maxHeight: 210,
  },
  promptText: {
    color: '#F8FAFC',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  deploymentCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  deploymentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  deploymentUrl: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 4,
  },
  launchButton: {
    backgroundColor: '#2563EB',
    minHeight: 52,
    borderRadius: 12,
  },
});
