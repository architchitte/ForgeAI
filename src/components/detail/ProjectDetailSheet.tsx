import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Platform,
  Linking,
  BackHandler,
  Keyboard,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Repository } from '../../types/repository';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CopyIcon,
  AccountTreeIcon,
  FileTextIcon,
} from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { CommentsSection } from './CommentsSection';
import { PublisherProfileSheet } from '../profile/PublisherProfileSheet';
import { LikersSheet } from '../engagement/LikersSheet';
import { ProfileCard } from '../profile/ProfileCard';
import { usePublisherProfile } from '../../hooks/usePublisherProfile';
import { getAvatarUrl } from '../../services/ownProfile';
import { LikeButton } from '../common/LikeButton';
import { useLikes } from '../../context/LikesContext';
import { useLikesLiveSync } from '../../hooks/useLikesLiveSync';
import { useAuth } from '../../context/AuthContext';
import { ProjectScreenshotShowcase } from '../screenshot/ProjectScreenshotShowcase';
import { isRepositoryOwner } from '../../services/screenshots';
import { useProjectTechnologies } from '../../hooks/useProjectTechnologies';
import { TechnologyGroups } from '../technology/TechnologyDisplay';
import { COMMUNITY_MEMBER_LABEL } from '../../constants/identity';

interface ProjectDetailViewProps {
  repository: Repository;
  onBack?: () => void;
  /** Open another project (e.g. from the publisher's profile). */
  onOpenProject?: (repo: Repository) => void;
  /** Show the founder's profile as an in-app screen (keeps the bottom nav). */
  onOpenPublisher?: (repo: Repository) => void;
  /** Open any person's profile (likers, commenters). */
  onOpenUserProfile?: (userId: string) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  repository,
  onBack,
  onOpenProject,
  onOpenPublisher,
  onOpenUserProfile,
}) => {
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [publisherOpen, setPublisherOpen] = useState<boolean>(false);
  const [likersOpen, setLikersOpen] = useState<boolean>(false);
  // Publisher's public profile for the card (falls back to project data).
  const publisher = usePublisherProfile(repository.id);
  const [copied, setCopied] = useState<boolean>(false);

  // Keyboard handling for the comment composer. Rather than depending on how
  // the Android window resizes (edge-to-edge), the docked Launch bar hides
  // while the keyboard is up, the content gets bottom room equal to the
  // keyboard height, and the composer is scrolled near the top of the view.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const commentsSectionY = useRef(0);
  const composerScrollTarget = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      const target = composerScrollTarget.current;
      if (target !== null) {
        // Wait a frame for the extra bottom room to be laid out.
        requestAnimationFrame(() =>
          scrollRef.current?.scrollTo({ y: target, animated: true })
        );
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleComposerFocus = useCallback((offsetInSection: number) => {
    const target = Math.max(0, commentsSectionY.current + offsetInSection - 12);
    composerScrollTarget.current = target;
    scrollRef.current?.scrollTo({ y: target, animated: true });
  }, []);

  const handleComposerBlur = useCallback(() => {
    composerScrollTarget.current = null;
  }, []);

  const isKeyboardVisible = keyboardHeight > 0;

  // Likes: shared with the feed via LikesContext. Re-read this project's
  // count on open, and keep it live (realtime + app foreground) while shown.
  const { likes, pendingIds, refreshLikes, toggleLike } = useLikes();
  const { user } = useAuth();
  const isOwner = isRepositoryOwner(repository, user?.email);
  const { technologies } = useProjectTechnologies(repository.id);
  const hasTechRows = !!technologies && technologies.length > 0;
  // Headline tag: first technology (+N), or the legacy framework text.
  const primaryTag = hasTechRows
    ? `${technologies![0].technology_name}${
        technologies!.length > 1 ? ` +${technologies!.length - 1}` : ''
      }`
    : repository.framework;
  const likeSummary = likes[repository.id];
  const refreshThisLike = useCallback(() => {
    refreshLikes([repository.id]);
  }, [refreshLikes, repository.id]);
  useEffect(() => {
    refreshThisLike();
  }, [refreshThisLike]);
  useLikesLiveSync(true, refreshThisLike);

  // Android hardware back returns to the previous view instead of exiting the app.
  useEffect(() => {
    if (!onBack) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  // Never fall back to the submitter's email — it is private.
  const hasStudentName =
    !!repository.student_name && repository.student_name.trim().length > 0;
  const studentDisplayName = hasStudentName
    ? repository.student_name!.trim()
    : COMMUNITY_MEMBER_LABEL;


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

  // Reset timer for the COPIED label; cleared on unmount / repeat taps.
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    []
  );

  const handleCopyEndpoint = async () => {
    const url = repository.agent_execution_url?.trim();
    if (!url) return;

    try {
      await Clipboard.setStringAsync(url);
    } catch (err) {
      // Only confirm "COPIED" when the clipboard write actually succeeded.
      console.warn('[CopyEndpoint] Failed to copy deployment URL:', err);
      return;
    }

    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
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

  // Project description (stored in system_prompt): blank lines separate
  // paragraphs; single line breaks are kept within a paragraph.
  const descriptionParagraphs = (repository.system_prompt || '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Student Initials
  const publisherName = publisher.profile?.display_name?.trim() || studentDisplayName;
  const publisherCollege =
    publisher.profile?.college?.trim() || repository.university?.trim() || null;

  // No initials for the neutral fallback; the avatar shows a user icon instead.
  const initials = (publisher.profile?.display_name?.trim() || hasStudentName ? publisherName : '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <View style={styles.container}>
      {/* Back Navigation Bar (restored from eba1059) */}
      {onBack && (
        <View style={styles.backRow}>
          <PressableScale
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Back to Projects"
          >
            <View style={styles.backIcon}>
              <ArrowLeftIcon size={18} color={STITCH_COLORS.primary} />
            </View>
            <Text style={styles.backText}>Back to Projects</Text>
          </PressableScale>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title & Metadata Section */}
        <View style={styles.headerSection}>
          <View style={styles.tagsRow}>
            <View style={styles.frameworkChip}>
              <Text style={styles.frameworkChipText}>
                {primaryTag.toUpperCase()}
              </Text>
            </View>
            <View style={styles.envChip}>
              <Text style={styles.envChipText}>Production</Text>
            </View>
          </View>

          <Text style={styles.appName}>{repository.app_name}</Text>
          <Text style={styles.oneLinerText}>{repository.one_liner}</Text>
        </View>

        {/* Project Screenshot (desktop browser frame / mobile phone frame) */}
        <ProjectScreenshotShowcase
          repositoryId={repository.id}
          appName={repository.app_name}
          isOwner={isOwner}
        />

        <LikersSheet
          repositoryId={likersOpen ? repository.id : null}
          appName={repository.app_name}
          onClose={() => setLikersOpen(false)}
          onOpenUser={onOpenUserProfile}
        />

        <PublisherProfileSheet
          visible={publisherOpen}
          repository={repository}
          onClose={() => setPublisherOpen(false)}
          onOpenProject={
            onOpenProject
              ? (repo) => {
                  setPublisherOpen(false);
                  onOpenProject(repo);
                }
              : undefined
          }
        />

        {/* Architecture Specs Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Architecture Specs</Text>

          <View style={styles.specsGrid}>
            <View style={styles.specCard}>
              <View style={[styles.specLabelRow, styles.techLabelRow]}>
                <AccountTreeIcon size={14} color={STITCH_COLORS.outline} />
                <Text style={styles.specLabel}>AI Technologies & Frameworks</Text>
              </View>
              <TechnologyGroups
                technologies={technologies}
                legacyFramework={repository.framework}
              />
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
            <PressableScale
              style={styles.copyButton}
              onPress={handleCopyEndpoint}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <CopyIcon size={13} color={STITCH_COLORS.primaryContainer} />
              <Text style={styles.copyButtonText}>
                {copied ? 'COPIED' : 'COPY'}
              </Text>
            </PressableScale>
          </View>
        </View>

        {/* Project Description */}
        <View style={styles.sectionBlock}>
          <View style={styles.descriptionHeader}>
            <FileTextIcon size={15} color={STITCH_COLORS.onSurface} />
            <Text style={styles.descriptionTitle}>Project Description</Text>
          </View>

          <View style={styles.descriptionCard}>
            {descriptionParagraphs.length === 0 ? (
              <Text style={styles.descriptionEmpty}>No description provided.</Text>
            ) : (
              descriptionParagraphs.map((paragraph, index) => (
                <Text
                  key={index}
                  selectable
                  style={[
                    styles.descriptionText,
                    index < descriptionParagraphs.length - 1 && styles.descriptionParagraphGap,
                  ]}
                >
                  {paragraph}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* Meet the Founder — compact profile card; tap opens the full profile */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Meet the Founder</Text>
          <ProfileCard
            name={publisherName}
            avatarUri={
              publisher.profile?.avatar_path ? getAvatarUrl(publisher.profile.avatar_path) : null
            }
            initials={initials}
            currentEducation={publisher.currentEducation}
            college={publisherCollege}
            onPress={() =>
              onOpenPublisher ? onOpenPublisher(repository) : setPublisherOpen(true)
            }
            accessibilityLabel={`Meet the founder: view ${publisherName}'s profile`}
            testID="publisher-card"
          />
        </View>

        {/* Comments */}
        <View
          onLayout={(e) => {
            commentsSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <CommentsSection
            repositoryId={repository.id}
            onInputFocus={handleComposerFocus}
            onInputBlur={handleComposerBlur}
            onOpenUser={onOpenUserProfile}
          />
        </View>

        {/* Space for docked bottom action bar (or the keyboard while typing) */}
        <View style={{ height: isKeyboardVisible ? keyboardHeight + 24 : 80 }} />
      </ScrollView>

      {/* Docked Bottom Action Bar — hidden while typing so it can't cover the composer */}
      {!isKeyboardVisible && (
      <View style={styles.dockedActionBar}>
        <LikeButton
          variant="large"
          repositoryId={repository.id}
          count={likeSummary?.count}
          liked={likeSummary?.likedByMe ?? false}
          pending={pendingIds[repository.id] === true}
          onToggle={toggleLike}
          onLongPress={() => setLikersOpen(true)}
        />
        <PressableScale
          style={styles.launchButton}
          onPress={handleLaunchAgent}
          disabled={isLaunching}
          activeOpacity={0.8}
          pressedScale={0.98}
          accessibilityState={{ busy: isLaunching, disabled: isLaunching }}
        >
          <Text style={styles.launchButtonText}>
            {isLaunching ? 'Opening Runtime...' : 'Launch App'}
          </Text>
          <ArrowRightIcon size={16} color="#000000" strokeWidth={2.2} />
        </PressableScale>
      </View>
      )}
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
    marginRight: 6,
  },
  backText: {
    fontSize: 13,
    color: STITCH_COLORS.onSurface,
    fontFamily: FONTS.sans.semibold,
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
    fontFamily: FONTS.sans.semibold,
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
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  appName: {
    fontSize: 24,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  oneLinerText: {
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.onSurfaceVariant,
    lineHeight: 22,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
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
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  specLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  techLabelRow: {
    marginBottom: 12,
  },
  specLabel: {
    fontSize: 11,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  endpointBox: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#262626',
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
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  httpMethodText: {
    fontSize: 10,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
  },
  endpointUrlText: {
    flex: 1,
    fontSize: 12,
    color: '#EDEDED',
    fontFamily: FONTS.mono.regular,
  },
  copyButton: {
    backgroundColor: '#171717',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyButtonText: {
    fontSize: 10.5,
    color: '#FFFFFF',
    fontFamily: FONTS.mono.semibold,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  descriptionTitle: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  descriptionCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONTS.sans.regular,
    color: '#D4D4D4',
  },
  descriptionParagraphGap: {
    marginBottom: 12,
  },
  descriptionEmpty: {
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  dockedActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  launchButton: {
    flex: 1,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  launchButtonText: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
});
