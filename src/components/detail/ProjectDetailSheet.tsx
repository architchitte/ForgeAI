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

interface ProjectDetailViewProps {
  repository: Repository;
  onBack: () => void;
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

  // Dynamic formatted creation date
  const formattedDate = (() => {
    try {
      if (repository.created_at) {
        return new Date(repository.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      // Fallback
    }
    return 'Active';
  })();

  // Dynamic file name for the prompt terminal
  const promptFileName = `${repository.app_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'agent_system'}.prompt`;

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
      {/* Back Navigation Bar */}
      <View style={styles.backRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Back to Projects</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. PROJECT INFORMATION (ABOVE ALONG WITH LAUNCH BUTTON) */}
        <View style={styles.projectInfoCard}>
          <View style={styles.cardAccentLine} />

          {/* Title Header with Framework */}
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <View style={styles.frameworkBadge}>
                <Text style={styles.frameworkBadgeText}>
                  {repository.framework.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.appName}>{repository.app_name}</Text>
            </View>

            {/* Orbiting Black Hole Motif */}
            <View style={styles.blackHoleMotif}>
              <View style={styles.blackHoleAura} />
              <View style={styles.blackHoleRing} />
              <View style={styles.blackHoleCore} />
            </View>
          </View>

          {/* One-Liner Description */}
          <Text style={styles.oneLinerText}>{repository.one_liner}</Text>

          {/* Active Deployment Runtime URL Tile */}
          <View style={styles.endpointTile}>
            <View style={styles.endpointLeft}>
              <Text style={styles.endpointIcon}>🔒</Text>
              <View style={styles.endpointTextCol}>
                <Text style={styles.endpointTitle}>ENDPOINT URL</Text>
                <Text style={styles.endpointUrl} numberOfLines={1}>
                  {repository.agent_execution_url}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopyEndpoint}
              activeOpacity={0.7}
            >
              <Text style={styles.copyBtnText}>
                {copied ? 'COPIED' : 'COPY'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Prominent Launch App Button Right with Project Information */}
          <TouchableOpacity
            style={styles.launchBtn}
            onPress={handleLaunchAgent}
            disabled={isLaunching}
            activeOpacity={0.8}
          >
            <Text style={styles.launchBtnIcon}>🚀</Text>
            <Text style={styles.launchBtnText}>
              {isLaunching ? 'Opening Runtime...' : 'Launch App'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. COMPLETE SYSTEM PROMPT MONOSPACE HORIZON (MIDDLE) */}
        <View style={styles.terminalSection}>
          <View style={styles.terminalHeaderRow}>
            <Text style={styles.sectionHeader}>System Prompt</Text>
            <View style={styles.lockedPromptBadge}>
              <Text style={styles.lockedIcon}>🔒</Text>
              <Text style={styles.lockedText}>LOCKED PROMPT</Text>
            </View>
          </View>

          <View style={styles.terminalWindow}>
            {/* Window Header */}
            <View style={styles.terminalHeader}>
              <View style={styles.terminalDots}>
                <View style={[styles.terminalDot, { backgroundColor: STITCH_COLORS.primaryContainer }]} />
                <View style={[styles.terminalDot, { backgroundColor: STITCH_COLORS.secondary }]} />
                <View style={[styles.terminalDot, { backgroundColor: STITCH_COLORS.surfaceContainerHighest }]} />
                <Text style={styles.terminalFileName}>{promptFileName}</Text>
              </View>
              <Text style={styles.terminalEncoding}>UTF-8</Text>
            </View>

            {/* Terminal Monospace Content */}
            <View style={styles.terminalBody}>
              {promptLines.length === 0 ? (
                <Text style={styles.terminalEmptyText}>[Empty System Prompt]</Text>
              ) : (
                promptLines.map((line, index) => {
                  const lineNum = String(index + 1).padStart(2, '0');
                  return (
                    <View key={index} style={styles.promptLineRow}>
                      <Text style={styles.promptLineNumber}>{lineNum}</Text>
                      <Text style={styles.promptLineCode}>{line}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>

        {/* 3. PROJECT OWNER DETAILS (BOTTOM) */}
        <View style={styles.ownerCard}>
          <Text style={styles.sectionHeader}>Project Owner</Text>

          <View style={styles.ownerHeader}>
            <View style={styles.initialsAvatar}>
              <Text style={styles.initialsText}>{initials || '👤'}</Text>
            </View>
            <View style={styles.ownerDetails}>
              <View style={styles.ownerNameRow}>
                <Text style={styles.ownerName}>{studentDisplayName}</Text>
                <Text style={styles.verifiedBadge}>✓</Text>
              </View>
              <Text style={styles.ownerSub}>{universityText}</Text>
              <Text style={styles.ownerEmail}>{repository.student_email}</Text>
            </View>
          </View>

          <View style={styles.ownerFooterRow}>
            <View style={styles.ownerMetaTag}>
              <Text style={styles.ownerMetaLabel}>PUBLISHED</Text>
              <Text style={styles.ownerMetaValue}>{formattedDate}</Text>
            </View>
            <View style={styles.ownerMetaTag}>
              <Text style={styles.ownerMetaLabel}>FRAMEWORK</Text>
              <Text style={styles.ownerMetaValue}>{repository.framework}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
    backgroundColor: STITCH_COLORS.background,
  },
  safeAreaModal: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  backRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: STITCH_COLORS.surfaceContainerHighest + '40',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  backIcon: {
    fontSize: 18,
    color: STITCH_COLORS.primary,
    fontWeight: '700',
    marginRight: 6,
  },
  backText: {
    fontSize: 13,
    color: STITCH_COLORS.onSurface,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  projectInfoCard: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '60',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  cardAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: STITCH_COLORS.primaryContainer,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleCol: {
    flex: 1,
    marginRight: 12,
  },
  frameworkBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
    marginBottom: 6,
  },
  frameworkBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.primary,
    letterSpacing: 0.8,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.4,
  },
  blackHoleMotif: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  blackHoleAura: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: STITCH_COLORS.primaryContainer,
    opacity: 0.25,
  },
  blackHoleRing: {
    position: 'absolute',
    width: 32,
    height: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: STITCH_COLORS.primaryContainer,
    transform: [{ rotate: '-25deg' }],
  },
  blackHoleCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: STITCH_COLORS.secondary + '80',
  },
  oneLinerText: {
    fontSize: 14,
    color: STITCH_COLORS.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 14,
  },
  endpointTile: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: STITCH_COLORS.outlineVariant + '40',
    marginBottom: 14,
  },
  endpointLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  endpointIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  endpointTextCol: {
    flex: 1,
  },
  endpointTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: STITCH_COLORS.secondary,
    letterSpacing: 0.8,
  },
  endpointUrl: {
    fontSize: 11,
    color: STITCH_COLORS.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  copyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  launchBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: STITCH_COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  launchBtnIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  launchBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  terminalSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH_COLORS.outline,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  lockedPromptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.primaryContainer,
    letterSpacing: 0.8,
  },
  terminalWindow: {
    borderRadius: 12,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '70',
    overflow: 'hidden',
  },
  terminalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: STITCH_COLORS.surfaceContainerHighest + '40',
  },
  terminalDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  terminalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  terminalFileName: {
    fontSize: 11,
    color: STITCH_COLORS.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginLeft: 6,
  },
  terminalEncoding: {
    fontSize: 10,
    color: STITCH_COLORS.outline,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  terminalBody: {
    padding: 12,
  },
  terminalEmptyText: {
    color: STITCH_COLORS.outline,
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  promptLineRow: {
    flexDirection: 'row',
    marginVertical: 1,
  },
  promptLineNumber: {
    width: 26,
    fontSize: 11,
    color: STITCH_COLORS.surfaceContainerHighest,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  promptLineCode: {
    flex: 1,
    fontSize: 11,
    color: STITCH_COLORS.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  ownerCard: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '50',
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  initialsAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: STITCH_COLORS.primaryContainer + '80',
    marginRight: 12,
  },
  initialsText: {
    fontSize: 15,
    fontWeight: '800',
    color: STITCH_COLORS.primary,
  },
  ownerDetails: {
    flex: 1,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
  },
  verifiedBadge: {
    fontSize: 12,
    color: STITCH_COLORS.primary,
    marginLeft: 4,
    fontWeight: '800',
  },
  ownerSub: {
    fontSize: 12,
    color: STITCH_COLORS.secondary,
    marginTop: 1,
    fontWeight: '600',
  },
  ownerEmail: {
    fontSize: 11,
    color: STITCH_COLORS.outline,
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ownerFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: STITCH_COLORS.surfaceContainerHighest + '40',
  },
  ownerMetaTag: {
    flexDirection: 'column',
  },
  ownerMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: STITCH_COLORS.outline,
    letterSpacing: 0.8,
  },
  ownerMetaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 2,
  },
});
