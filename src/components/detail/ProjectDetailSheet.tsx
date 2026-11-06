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
import { STITCH_COLORS } from '../../constants/theme';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  UserIcon,
  CopyIcon,
  AccountTreeIcon,
  CloudIcon,
} from '../common/AppIcons';

interface ProjectDetailViewProps {
  repository: Repository;
  onBack?: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  repository,
  onBack,
}) => {
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const studentDisplayName =
    repository.student_name && repository.student_name.trim().length > 0
      ? repository.student_name.trim()
      : repository.student_email;

  const universityText =
    repository.university && repository.university.trim().length > 0
      ? repository.university.trim()
      : 'Student Builder';

  const promptFileName = `${
    repository.app_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'agent_system'
  }.prompt`;

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

  const handleCopyEndpoint = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  // Split prompt lines for the terminal window
  const promptLines = (repository.system_prompt || '')
    .trim()
    .split('\n')
    .filter((line) => line.length > 0);

  // Student Initials
  const initials = studentDisplayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Metadata Section */}
        <View style={styles.headerSection}>
          <View style={styles.tagsRow}>
            <View style={styles.frameworkChip}>
              <Text style={styles.frameworkChipText}>
                {repository.framework.toUpperCase()}
              </Text>
            </View>
            <View style={styles.envChip}>
              <Text style={styles.envChipText}>Production</Text>
            </View>
          </View>

          <Text style={styles.appName}>{repository.app_name}</Text>
          <Text style={styles.oneLinerText}>{repository.one_liner}</Text>
        </View>

        {/* Creator Card */}
        <View style={styles.card}>
          <View style={styles.creatorHeader}>
            <View style={styles.avatarCircle}>
              {initials ? (
                <Text style={styles.avatarText}>{initials}</Text>
              ) : (
                <UserIcon size={18} color={STITCH_COLORS.primaryContainer} />
              )}
            </View>
            <View style={styles.creatorInfo}>
              <View style={styles.creatorNameRow}>
                <Text style={styles.creatorName}>{studentDisplayName}</Text>
                <View style={styles.verifiedIconWrap}>
                  <Text style={styles.verifiedIcon}>✓</Text>
                </View>
              </View>
              <Text style={styles.creatorSub}>{universityText}</Text>
            </View>
          </View>

          <View style={styles.creatorMetricsRow}>
            <View style={styles.metricWell}>
              <Text style={styles.metricLabel}>Framework</Text>
              <Text style={styles.metricValue}>{repository.framework}</Text>
            </View>
          </View>
        </View>

        {/* Architecture Specs Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Architecture Specs</Text>

          <View style={styles.specsGrid}>
            <View style={styles.specCard}>
              <View style={styles.specLabelRow}>
                <AccountTreeIcon size={14} color={STITCH_COLORS.outline} />
                <Text style={styles.specLabel}>Orchestration</Text>
              </View>
              <Text style={styles.specValue}>{repository.framework}</Text>
            </View>
          </View>

          {/* Endpoint Box */}
          <View style={styles.endpointBox}>
            <View style={styles.endpointLeft}>
              <View style={styles.httpMethodBadge}>
                <Text style={styles.httpMethodText}>GET</Text>
              </View>
              <Text style={styles.endpointUrlText} numberOfLines={1}>
                {repository.agent_execution_url}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyEndpoint}
              activeOpacity={0.7}
            >
              <CopyIcon size={13} color={STITCH_COLORS.primaryContainer} />
              <Text style={styles.copyButtonText}>
                {copied ? 'COPIED' : 'COPY'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* System Prompt Template Section */}
        <View style={styles.sectionBlock}>
          <View style={styles.promptHeaderRow}>
            <Text style={styles.sectionTitle}>System Prompt Template</Text>
            <View style={styles.promptFileBadge}>
              <Text style={styles.promptFileBadgeText}>{promptFileName}</Text>
            </View>
          </View>

          <View style={styles.terminalWindow}>
            {/* macOS-style Window Header */}
            <View style={styles.windowHeader}>
              <View style={styles.windowControls}>
                <View style={[styles.controlDot, { backgroundColor: '#FF5F56' }]} />
                <View style={[styles.controlDot, { backgroundColor: '#FFBD2E' }]} />
                <View style={[styles.controlDot, { backgroundColor: '#27C93F' }]} />
                <Text style={styles.windowLabel}>system_instructions</Text>
              </View>
              <Text style={styles.encodingLabel}>UTF-8</Text>
            </View>

            {/* Code Body */}
            <View style={styles.codeBody}>
              {promptLines.length === 0 ? (
                <Text style={styles.emptyPromptText}>[Empty System Prompt]</Text>
              ) : (
                promptLines.map((line, index) => {
                  const lineNum = String(index + 1).padStart(2, '0');
                  return (
                    <View key={index} style={styles.codeLineRow}>
                      <Text style={styles.codeLineNumber}>{lineNum}</Text>
                      <Text style={styles.codeLineText}>{line}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>

        {/* Space for docked bottom action bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Docked Bottom Action Bar */}
      <View style={styles.dockedActionBar}>
        <TouchableOpacity
          style={styles.launchButton}
          onPress={handleLaunchAgent}
          disabled={isLaunching}
          activeOpacity={0.8}
        >
          <Text style={styles.launchButtonText}>
            {isLaunching ? 'Opening Runtime...' : 'Launch App'}
          </Text>
          <ArrowRightIcon size={16} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  if (!repository) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeAreaModal}>
        <ProjectDetailView repository={repository} onBack={onClose} />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background, // #faf8ff
  },
  safeAreaModal: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerSection: {
    marginBottom: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  frameworkChip: {
    backgroundColor: STITCH_COLORS.primaryFixed, // #e2dfff
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  frameworkChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.onPrimaryFixedVariant, // #3323cc
    letterSpacing: 0.6,
  },
  envChip: {
    backgroundColor: STITCH_COLORS.surfaceContainer, // #eaedff
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  envChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: STITCH_COLORS.onSurfaceVariant,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  oneLinerText: {
    fontSize: 14,
    color: STITCH_COLORS.onSurfaceVariant,
    lineHeight: 22,
  },
  card: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest, // #ffffff
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,   // #dae2fd
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: STITCH_COLORS.primaryContainer,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
  },
  verifiedIconWrap: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: STITCH_COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIcon: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  creatorSub: {
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  creatorMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  metricWell: {
    flex: 1,
    backgroundColor: STITCH_COLORS.surfaceContainerLow, // #f2f3ff
    borderRadius: 8,
    padding: 10,
  },
  metricLabel: {
    fontSize: 11,
    color: STITCH_COLORS.onSurfaceVariant,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
  },
  metricValuePrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: STITCH_COLORS.primaryContainer,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  specCard: {
    flex: 1,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
  },
  specLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  specIcon: {
    fontSize: 13,
  },
  specLabel: {
    fontSize: 11,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  specValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: STITCH_COLORS.onSurface,
  },
  endpointBox: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  endpointLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  httpMethodBadge: {
    backgroundColor: STITCH_COLORS.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  httpMethodText: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH_COLORS.onPrimaryFixed,
  },
  endpointUrlText: {
    flex: 1,
    fontSize: 12,
    color: STITCH_COLORS.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyButtonText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: STITCH_COLORS.primaryContainer,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  promptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promptFileBadge: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  promptFileBadgeText: {
    fontSize: 10.5,
    color: STITCH_COLORS.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  terminalWindow: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
    overflow: 'hidden',
  },
  windowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: STITCH_COLORS.surfaceContainerHighest,
  },
  windowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  windowLabel: {
    fontSize: 11,
    color: STITCH_COLORS.onSurfaceVariant,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  encodingLabel: {
    fontSize: 10,
    color: STITCH_COLORS.outline,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeBody: {
    padding: 12,
  },
  codeLineRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  codeLineNumber: {
    width: 26,
    fontSize: 11,
    color: STITCH_COLORS.outline,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeLineText: {
    flex: 1,
    fontSize: 12,
    color: STITCH_COLORS.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  emptyPromptText: {
    fontSize: 12,
    color: STITCH_COLORS.outline,
    fontStyle: 'italic',
  },
  dockedActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(250, 248, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: STITCH_COLORS.surfaceContainerHighest,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  launchButton: {
    height: 48,
    backgroundColor: STITCH_COLORS.primaryContainer, // #4f46e5
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  launchButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  launchButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
