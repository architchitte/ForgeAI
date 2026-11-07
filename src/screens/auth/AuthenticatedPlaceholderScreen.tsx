import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { Repository } from '../../types/repository';
import {
  fetchUserRepositories,
  updateRepository,
  deleteRepository,
} from '../../services/repositories';
import { TechnologySelector } from '../../components/technology/TechnologySelector';
import {
  SelectedTechnology,
  buildFrameworkSummary,
  selectionFromLegacyFramework,
} from '../../constants/technologies';
import {
  fetchProjectTechnologies,
  replaceProjectTechnologies,
  rowsToSelection,
} from '../../services/technologies';
import { PRIVACY_POLICY_URL } from '../../constants/privacy';
import { useOwnProfile } from '../../hooks/useOwnProfile';
import { getAvatarUrl } from '../../services/ownProfile';
import { pickValidatedImage } from '../../services/screenshotFiles';
import { fetchCommentCounts, fetchLikeSummaries } from '../../services/engagement';
import type { PersonalInfoValues } from '../../components/profile/EditProfileModal';
import { EducationItem } from '../../components/profile/EducationItem';
import { ProfileCard } from '../../components/profile/ProfileCard';
import { FollowStats } from '../../components/profile/FollowControls';
import { FollowListKind, FollowListSheet } from '../../components/profile/FollowListSheet';
import { useFollow } from '../../hooks/useFollow';
import { ProfileSettingsSheet } from '../../components/profile/ProfileSettingsSheet';
import { useEducation } from '../../hooks/useEducation';

import { DesktopFrame, PhoneFrame } from '../../components/screenshot/ScreenshotFrames';
import {
  fetchScreenshotsForRepositories,
  getScreenshotUrl,
} from '../../services/screenshots';
import { ProjectScreenshot } from '../../types/screenshot';
import { PressableScale } from '../../components/animation/PressableScale';
import { FadeInView } from '../../components/animation/FadeInView';
import { staggerDelay } from '../../components/animation/motion';
import {
  EditIcon,
  ArrowRightIcon,
  TrashIcon,
  RocketIcon,
  MenuIcon,
  HeartIcon,
  CommentIcon,
} from '../../components/common/AppIcons';

interface AuthenticatedPlaceholderScreenProps {
  onNavigateToSubmitBlueprint?: () => void;
  onSelectRepository?: (repo: Repository) => void;
  /** Opens someone's profile (from your followers / following lists). */
  onOpenUserProfile?: (userId: string) => void;
}

export const AuthenticatedPlaceholderScreen: React.FC<
  AuthenticatedPlaceholderScreenProps
> = ({ onNavigateToSubmitBlueprint, onSelectRepository, onOpenUserProfile }) => {
  const { user, signOut, authActionLoading, updateUserProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const fullName =
    (user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.user_name ||
      'Your name') as string;

  // Profile data (avatar + private details) from Supabase.
  const ownProfile = useOwnProfile();
  // One education state for the header and the Education section.
  const education = useEducation();
  // Your own follower / following counts and lists.
  const follow = useFollow(user?.id);
  const [followList, setFollowList] = useState<FollowListKind | null>(null);
  // Sorted ongoing-first, so the first item is the current qualification
  // (or the latest completed one when nothing is ongoing).
  const currentEducation = education.items[0] ?? null;

  // Avatar: uploaded picture → Google/OAuth picture (the default) → initials.
  const oauthAvatarUrl =
    (user?.user_metadata?.avatar_url as string) ||
    (user?.user_metadata?.picture as string) ||
    null;
  const avatarUrl = ownProfile.profile?.avatar_path
    ? getAvatarUrl(ownProfile.profile.avatar_path)
    : oauthAvatarUrl;


  const userInitials = (() => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return 'U';
  })();

  // Settings (☰): every profile change happens there; this tab only displays.
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [savingName, setSavingName] = useState<boolean>(false);

  // Engagement received on my projects (batched: one likes + one comments query)
  const [projectLikes, setProjectLikes] = useState<Record<string, number>>({});
  const [projectComments, setProjectComments] = useState<Record<string, number>>({});
  // Screenshots of my projects (one batched query); failed images are hidden.
  const [projectShots, setProjectShots] = useState<Record<string, ProjectScreenshot>>({});
  const [failedShots, setFailedShots] = useState<Record<string, true>>({});

  // User Projects State
  const [myProjects, setMyProjects] = useState<Repository[]>([]);

  // Profile university lives in user_metadata; fall back to the newest project's
  // value (list is created_at desc) for accounts whose metadata was never set.
  const metadataUniversity = ((user?.user_metadata?.university as string) || '').trim();
  const university =
    metadataUniversity ||
    (myProjects.find((p) => p.university && p.university.trim())?.university?.trim() ?? '');
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Edit Project Modal State
  const [editingProject, setEditingProject] = useState<Repository | null>(null);
  const [editAppName, setEditAppName] = useState<string>('');
  const [editOneLiner, setEditOneLiner] = useState<string>('');
  // Technologies being edited; null while the saved list is loading.
  const [editTechnologies, setEditTechnologies] = useState<SelectedTechnology[] | null>(null);
  const [editSystemPrompt, setEditSystemPrompt] = useState<string>('');
  const [editDeploymentUrl, setEditDeploymentUrl] = useState<string>('');
  const [savingProject, setSavingProject] = useState<boolean>(false);
  const [projectEditError, setProjectEditError] = useState<string | null>(null);

  // Open Edit Project Modal
  const handleOpenEditProject = (project: Repository) => {
    setEditingProject(project);
    setEditAppName(project.app_name);
    setEditOneLiner(project.one_liner);
    // Saved selections, or (legacy project) a prefill from its framework text.
    setEditTechnologies(null);
    fetchProjectTechnologies(project.id).then((res) => {
      const rows = res.data ?? [];
      setEditTechnologies(
        rows.length > 0 ? rowsToSelection(rows) : selectionFromLegacyFramework(project.framework)
      );
    });
    setEditSystemPrompt(project.system_prompt || '');
    setEditDeploymentUrl(project.agent_execution_url || '');
    setProjectEditError(null);
  };

  const handleCloseEditModal = () => {
    if (savingProject) return;
    setEditingProject(null);
    setProjectEditError(null);
  };

  const handleSaveProjectEdit = async () => {
    if (!editingProject) return;

    const trimmedName = editAppName.trim();
    const trimmedOneLiner = editOneLiner.trim();
    const trimmedPrompt = editSystemPrompt.trim();
    const trimmedUrl = editDeploymentUrl.trim();

    if (!trimmedName) {
      setProjectEditError('App Name cannot be empty.');
      return;
    }
    if (!trimmedOneLiner) {
      setProjectEditError('One-Liner cannot be empty.');
      return;
    }
    if (trimmedOneLiner.length > 140) {
      setProjectEditError('One-Liner cannot exceed 140 characters.');
      return;
    }
    if (!editTechnologies) {
      setProjectEditError('Technologies are still loading. Please wait a moment.');
      return;
    }
    if (editTechnologies.length === 0) {
      setProjectEditError('Select at least one AI technology or framework.');
      return;
    }
    if (!trimmedPrompt) {
      setProjectEditError('System Prompt cannot be empty.');
      return;
    }
    if (!trimmedUrl) {
      setProjectEditError('Deployment URL cannot be empty.');
      return;
    }

    try {
      const parsedUrl = new URL(trimmedUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        setProjectEditError('Deployment URL must start with http:// or https://');
        return;
      }
    } catch {
      setProjectEditError('Please enter a valid HTTP or HTTPS deployment URL.');
      return;
    }

    setSavingProject(true);
    setProjectEditError(null);

    // Technologies first: if they can't be saved, the project is left as is.
    const techResult = await replaceProjectTechnologies(editingProject.id, editTechnologies);
    if (techResult.error) {
      setSavingProject(false);
      setProjectEditError(techResult.error);
      return;
    }

    const result = await updateRepository(editingProject.id, {
      app_name: trimmedName,
      one_liner: trimmedOneLiner,
      framework: buildFrameworkSummary(editTechnologies),
      system_prompt: trimmedPrompt,
      agent_execution_url: trimmedUrl,
    });

    setSavingProject(false);

    if (result.error || !result.data) {
      setProjectEditError(result.error || 'Failed to update blueprint.');
    } else {
      const updated = result.data;
      setMyProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setEditingProject(null);
      Alert.alert('Blueprint Updated', 'Your project details have been successfully saved.');
    }
  };

  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const handleDeleteProject = (project: Repository) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.app_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingProjectId(project.id);
            const { error } = await deleteRepository(project.id);
            setDeletingProjectId(null);
            if (error) {
              Alert.alert('Delete Failed', error);
            } else {
              setMyProjects((prev) => prev.filter((p) => p.id !== project.id));
            }
          },
        },
      ]
    );
  };

  // Load user's submitted blueprints
  const loadUserProjects = useCallback(async () => {
    if (!user?.email) {
      setLoadingProjects(false);
      return;
    }
    setProjectsError(null);
    setLoadingProjects(true);
    const result = await fetchUserRepositories(user.email);
    if (result.error) {
      setProjectsError(result.error);
    } else {
      const projects = result.data || [];
      setMyProjects(projects);
      const ids = projects.map((p) => p.id);
      Promise.all([
        fetchLikeSummaries(ids, user.id),
        fetchCommentCounts(ids),
        fetchScreenshotsForRepositories(ids),
      ]).then(([likes, comments, shots]) => {
        if (likes.data) {
          setProjectLikes(
            Object.fromEntries(Object.entries(likes.data).map(([id, s]) => [id, s.count]))
          );
        }
        if (comments.data) setProjectComments(comments.data);
        if (shots.data) {
          setProjectShots(shots.data);
          setFailedShots({});
        }
      });
    }
    setLoadingProjects(false);
  }, [user?.email, user?.id]);

  useEffect(() => {
    loadUserProjects();
  }, [loadUserProjects]);

  // Save Edit Profile: name + college keep using the existing auth-metadata
  // flow (copied onto projects), city / country / bio go to profile_details.
  const handleSaveProfile = async (values: PersonalInfoValues): Promise<string | null> => {
    const trimmed = values.fullName.trim();
    const nextUniversity = values.college.trim() || null;
    setSavingName(true);

    const nameChanged =
      trimmed !== fullName.trim() || (nextUniversity || '') !== (university || '');
    if (nameChanged) {
      try {
        await updateUserProfile({ name: trimmed, university: nextUniversity });
      } catch (err: any) {
        setSavingName(false);
        return err?.message || 'Failed to update profile.';
      }
    }

    const detailsError = await ownProfile.saveDetails({
      city: values.city,
      country: values.country,
      bio: values.bio,
    });
    if (detailsError) {
      setSavingName(false);
      return nameChanged
        ? `Your name and college were saved, but your other details were not: ${detailsError}`
        : detailsError;
    }

    // student_name and university are copied onto each project at publish
    // time, so keep the user's existing projects in sync with the profile.
    const stale = myProjects.filter(
      (p) => (p.student_name || null) !== trimmed || (p.university || null) !== nextUniversity
    );
    if (stale.length > 0) {
      const results = await Promise.all(
        stale.map((p) =>
          updateRepository(p.id, { student_name: trimmed, university: nextUniversity })
        )
      );
      const updatedById = new Map(
        results.filter((r) => r.data).map((r) => [r.data!.id, r.data!])
      );
      setMyProjects((prev) => prev.map((p) => updatedById.get(p.id) ?? p));
      const failed = results.filter((r) => r.error).length;
      if (failed > 0) {
        Alert.alert(
          'Profile Saved',
          `Your profile was updated, but ${failed} project${failed > 1 ? 's' : ''} could not be updated with your new profile details.`
        );
      }
    }
    setSavingName(false);
    return null;
  };

  // Profile picture: choose (with square crop) / replace / remove.
  const pickAndUploadAvatar = async () => {
    const picked = await pickValidatedImage({ cropAspect: [1, 1], maxLongEdge: 512, maxShortEdge: 512 });
    if (picked.canceled) return;
    if (picked.error || !picked.data) {
      Alert.alert('Cannot use this image', picked.error || 'Please choose another image.');
      return;
    }
    const { error, warning } = await ownProfile.changeAvatar(picked.data);
    if (error) Alert.alert('Upload failed', error);
    else Alert.alert('Profile picture updated', warning || 'Your new picture is live.');
  };

  const handleAvatarPress = () => {
    if (ownProfile.avatarBusy) return;
    const hasUpload = !!ownProfile.profile?.avatar_path;
    Alert.alert('Profile picture', 'JPG, PNG or WebP, up to 5 MB. You can crop it after choosing.', [
      { text: hasUpload ? 'Choose a new photo' : 'Choose from gallery', onPress: pickAndUploadAvatar },
      ...(hasUpload
        ? [
            {
              text: 'Remove photo',
              style: 'destructive' as const,
              onPress: () =>
                Alert.alert('Remove profile picture?', 'Your default avatar will be shown instead.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      const { error, warning } = await ownProfile.clearAvatar();
                      if (error) Alert.alert('Could not remove picture', error);
                      else if (warning) Alert.alert('Picture removed', warning);
                    },
                  },
                ]),
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const location = [ownProfile.details?.city, ownProfile.details?.country]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .join(', ');
  const bio = ownProfile.details?.bio?.trim() || '';
  const personalInfo: PersonalInfoValues = {
    fullName: fullName === 'Your name' ? '' : fullName,
    college: university,
    city: ownProfile.details?.city ?? '',
    country: ownProfile.details?.country ?? '',
    bio: ownProfile.details?.bio ?? '',
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Forge?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      const canOpen = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (canOpen) {
        await Linking.openURL(PRIVACY_POLICY_URL);
      } else {
        Alert.alert(
          'Privacy Policy',
          `Please visit our Privacy Policy at:\n${PRIVACY_POLICY_URL}`
        );
      }
    } catch {
      Alert.alert(
        'Privacy Policy',
        `Please visit our Privacy Policy at:\n${PRIVACY_POLICY_URL}`
      );
    }
  };

  // Format relative time helper
  const getRelativeTime = (dateStr: string) => {
    try {
      const now = new Date().getTime();
      const diff = now - new Date(dateStr).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days <= 0) return 'Today';
      if (days === 1) return '1d ago';
      if (days < 7) return `${days}d ago`;
      const weeks = Math.floor(days / 7);
      if (weeks === 1) return '1w ago';
      return `${weeks}w ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title row + settings menu */}
        <View style={styles.profileTopRow}>
          <Text style={styles.profileTopTitle}>Profile</Text>
          <PressableScale
            style={styles.menuButton}
            onPress={() => setSettingsOpen(true)}
            activeOpacity={0.7}
            pressedScale={0.92}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Open profile settings"
            testID="profile-settings-button"
          >
            <MenuIcon size={18} color="#EDEDED" />
          </PressableScale>
        </View>

        {/* 1. Profile card (same card as the publisher profile / project page) */}
        <ProfileCard
          name={fullName}
          avatarUri={avatarUrl}
          initials={userInitials}
          currentEducation={currentEducation}
          college={university}
          collegePlaceholder="Add your college / university"
          location={location}
          bio={bio}
          avatarBusy={ownProfile.avatarBusy}
          style={styles.profileCard}
          footer={
            follow.supported && follow.counts ? (
              <FollowStats
                counts={follow.counts}
                onPressFollowers={() => setFollowList('followers')}
                onPressFollowing={() => setFollowList('following')}
              />
            ) : null
          }
        />

        {/* 2. Education (read-only; managed in Settings) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>Education</Text>
          </View>
          {education.loading ? (
            <View style={styles.infoCard}>
              <ActivityIndicator size="small" color={STITCH_COLORS.onSurfaceVariant} />
            </View>
          ) : education.items.length === 0 ? (
            <View style={styles.infoCard}>
              <Text style={styles.emptyEducationText}>
                {education.error || 'No education added yet. Add it from Settings (☰).'}
              </Text>
            </View>
          ) : (
            <View style={styles.educationList}>
              {education.items.map((e, i) => (
                <EducationItem key={e.id} education={e} position={i + 1} compact={i > 0} />
              ))}
            </View>
          )}
        </View>

        {/* 3. My Submitted Projects Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionHeading}>My Projects</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{myProjects.length}</Text>
              </View>
            </View>

          </View>

          {loadingProjects ? (
            <FadeInView offset={0} style={styles.loaderWrap}>
              <ActivityIndicator size="small" color={STITCH_COLORS.primary} />
              <Text style={styles.loaderText}>Loading your projects...</Text>
            </FadeInView>
          ) : projectsError ? (
            <FadeInView style={styles.errorCard}>
              <Text style={styles.errorText}>{projectsError}</Text>
              <PressableScale
                style={styles.retryBtn}
                onPress={loadUserProjects}
                activeOpacity={0.7}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </PressableScale>
            </FadeInView>
          ) : myProjects.length === 0 ? (
            <FadeInView style={styles.emptyCard}>
              <View style={styles.emptyRocketContainer}>
                <RocketIcon size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.emptyTitle}>No Projects Submitted Yet</Text>
              <Text style={styles.emptySubtitle}>
                Publish an AI agent blueprint to share it with the university community.
              </Text>
              {onNavigateToSubmitBlueprint && (
                <PressableScale
                  style={styles.submitFirstBtn}
                  onPress={onNavigateToSubmitBlueprint}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitFirstBtnText}>+ Submit First Project</Text>
                </PressableScale>
              )}
            </FadeInView>
          ) : (
            <View style={styles.projectCardsList}>
              {myProjects.map((project, idx) => (
                <FadeInView
                  key={project.id}
                  delay={staggerDelay(idx)}
                  style={styles.projectArticleCard}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.chipRow}>
                      <View style={styles.frameworkPill}>
                        <Text style={styles.frameworkPillText}>
                          {project.framework}
                        </Text>
                      </View>
                      <View style={styles.activeStatusPill}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeStatusText}>Active</Text>
                      </View>
                    </View>
                    <Text style={styles.relativeTimeText}>
                      {getRelativeTime(project.created_at)}
                    </Text>
                  </View>

                  {/* Card Body (+ screenshot: browser frame / phone frame) */}
                  {(() => {
                    const shot = failedShots[project.id] ? undefined : projectShots[project.id];
                    const shotUri = shot ? getScreenshotUrl(shot.storage_path) : null;
                    const hideShot = () =>
                      setFailedShots((prev) => ({ ...prev, [project.id]: true }));
                    const body = (
                      <>
                        <Text style={styles.projectCardTitle}>{project.app_name}</Text>
                        <Text
                          style={styles.projectCardDesc}
                          numberOfLines={shot?.screenshot_type === 'mobile' ? 4 : 2}
                        >
                          {project.one_liner}
                        </Text>
                        <View style={styles.engagementRow}>
                          <View style={styles.engagementItem}>
                            <HeartIcon size={12} color="#A1A1A1" />
                            <Text style={styles.engagementText}>
                              {projectLikes[project.id] ?? '–'}
                            </Text>
                          </View>
                          <View style={styles.engagementItem}>
                            <CommentIcon size={12} color="#A1A1A1" />
                            <Text style={styles.engagementText}>
                              {projectComments[project.id] ?? '–'}
                            </Text>
                          </View>
                        </View>
                      </>
                    );
                    if (shotUri && shot?.screenshot_type === 'mobile') {
                      return (
                        <View style={styles.mobileShotRow}>
                          <View style={styles.mobileShotText}>{body}</View>
                          <PhoneFrame
                            uri={shotUri}
                            width={88}
                            thumbnail
                            onError={hideShot}
                            accessibilityLabel={`${project.app_name} mobile screenshot`}
                          />
                        </View>
                      );
                    }
                    return (
                      <>
                        {body}
                        {shotUri && (
                          <DesktopFrame
                            uri={shotUri}
                            compact
                            thumbnail
                            style={styles.desktopShot}
                            onError={hideShot}
                            accessibilityLabel={`${project.app_name} desktop screenshot`}
                          />
                        )}
                      </>
                    );
                  })()}

                  {/* Card Bottom Actions */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.projectManageGroup}>
                      <PressableScale
                        style={styles.iconActionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleOpenEditProject(project)}
                        activeOpacity={0.7}
                        accessibilityLabel="Edit Project"
                      >
                        <EditIcon size={14} color="#EDEDED" />
                      </PressableScale>

                      <PressableScale
                        style={[styles.iconActionBtn, styles.deleteActionBtn]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleDeleteProject(project)}
                        activeOpacity={0.7}
                        accessibilityLabel="Delete Project"
                        disabled={deletingProjectId === project.id}
                      >
                        {deletingProjectId === project.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <TrashIcon size={14} color="#FFFFFF" />
                        )}
                      </PressableScale>
                    </View>

                    <View style={styles.actionBtnGroup}>
                      {onSelectRepository && (
                        <PressableScale
                          style={styles.viewDetailsBtn}
                          onPress={() => onSelectRepository(project)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.viewDetailsBtnText}>View Details</Text>
                          <ArrowRightIcon size={14} color="#000000" />
                        </PressableScale>
                      )}
                    </View>
                  </View>
                </FadeInView>
              ))}
            </View>
          )}
        </View>

        {/* 4. Privacy Policy Link */}
        <PressableScale
          style={styles.privacyLinkRow}
          onPress={handleOpenPrivacyPolicy}
          activeOpacity={0.7}
        >
          <Text style={styles.privacyLinkText}>Privacy Policy</Text>
        </PressableScale>
      </ScrollView>

      <FollowListSheet
        userId={followList ? user?.id ?? null : null}
        kind={followList ?? 'followers'}
        onChangeKind={setFollowList}
        onClose={() => setFollowList(null)}
        onOpenUser={
          onOpenUserProfile
            ? (id) => {
                setFollowList(null);
                onOpenUserProfile(id);
              }
            : undefined
        }
      />

      <ProfileSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        avatarUri={avatarUrl}
        initials={userInitials}
        avatarBusy={ownProfile.avatarBusy}
        onChangeAvatar={handleAvatarPress}
        personalInfo={personalInfo}
        savingProfile={savingName}
        onSaveProfile={handleSaveProfile}
        education={education}
        email={user?.email || ''}
        loggingOut={authActionLoading}
        onLogout={handleLogoutPress}
      />

      {/* Edit Project Modal */}
      <Modal
        visible={editingProject !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <FadeInView
            offset={48}
            style={[
              styles.modalContent,
              // Edge-to-edge Android draws the sheet under the navigation bar;
              // iOS keeps its original fixed padding.
              Platform.OS === 'android' && { paddingBottom: 20 + insets.bottom },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalTitle}>Edit Blueprint</Text>
                <Text style={styles.modalSubtitle}>Update your project specifications</Text>
              </View>
              <PressableScale
                onPress={handleCloseEditModal}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </PressableScale>
            </View>

            {projectEditError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{projectEditError}</Text>
              </View>
            )}

            <ScrollView
              style={styles.modalFormScroll}
              contentContainerStyle={styles.modalFormContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* App Name */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>APP NAME</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editAppName}
                  onChangeText={(t) => {
                    setEditAppName(t);
                    if (projectEditError) setProjectEditError(null);
                  }}
                  placeholder="e.g. StudySchedule Copilot"
                  placeholderTextColor={STITCH_COLORS.outline}
                />
              </View>

              {/* One-Liner */}
              <View style={styles.modalFieldGroup}>
                <View style={styles.modalLabelRow}>
                  <Text style={styles.modalFieldLabel}>ONE-LINER DESCRIPTION</Text>
                  <Text
                    style={[
                      styles.modalCharCount,
                      editOneLiner.length > 140 && styles.modalCharCountError,
                    ]}
                  >
                    {editOneLiner.length}/140
                  </Text>
                </View>
                <TextInput
                  style={[styles.modalInput, styles.modalInputMultiline]}
                  value={editOneLiner}
                  onChangeText={(t) => {
                    setEditOneLiner(t);
                    if (projectEditError) setProjectEditError(null);
                  }}
                  maxLength={140}
                  multiline
                  placeholder="A concise summary of what your AI application does"
                  placeholderTextColor={STITCH_COLORS.outline}
                />
              </View>

              {/* AI Technologies & Frameworks (multi-select) */}
              <View style={styles.modalFieldGroup}>
                {editTechnologies === null ? (
                  <Text style={styles.modalFieldLabel}>LOADING TECHNOLOGIES…</Text>
                ) : (
                  <TechnologySelector
                    value={editTechnologies}
                    onChange={setEditTechnologies}
                    disabled={savingProject}
                    required
                    compactLabel
                  />
                )}
              </View>

              {/* System Prompt */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>COMPLETE SYSTEM PROMPT</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalPromptInput]}
                  value={editSystemPrompt}
                  onChangeText={(t) => {
                    setEditSystemPrompt(t);
                    if (projectEditError) setProjectEditError(null);
                  }}
                  multiline
                  textAlignVertical="top"
                  placeholder="Paste complete system prompt instructions..."
                  placeholderTextColor={STITCH_COLORS.outline}
                />
              </View>

              {/* Deployment Runtime URL */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>ACTIVE DEPLOYMENT RUNTIME URL</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editDeploymentUrl}
                  onChangeText={(t) => {
                    setEditDeploymentUrl(t);
                    if (projectEditError) setProjectEditError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="https://your-agent.up.railway.app"
                  placeholderTextColor={STITCH_COLORS.outline}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <PressableScale
                style={styles.modalCancelBtn}
                onPress={handleCloseEditModal}
                disabled={savingProject}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </PressableScale>

              <PressableScale
                style={styles.modalSaveBtn}
                onPress={handleSaveProjectEdit}
                disabled={savingProject}
                activeOpacity={0.8}
              >
                {savingProject ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                )}
              </PressableScale>
            </View>
          </FadeInView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background, // #faf8ff
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  // 1. Profile Overview Card
  profileCard: {
    marginBottom: 20,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profileTopTitle: {
    fontSize: 22,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  educationList: {
    gap: 10,
  },
  emptyEducationText: {
    paddingVertical: 10,
    fontSize: 12.5,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  mobileShotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  mobileShotText: {
    flex: 1,
    minWidth: 0,
  },
  desktopShot: {
    marginTop: 12,
  },
  engagementRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  engagementText: {
    fontSize: 12,
    fontFamily: FONTS.mono.medium,
    color: '#A1A1A1',
  },

  // Bento Quick Stats — Single Full Banner for Projects

  // 2. My Submitted Projects Section
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurface,
  },
  countBadge: {
    backgroundColor: STITCH_COLORS.surfaceContainerHigh, // #e2e7ff
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.primary,
  },

  loaderWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.outline,
    marginTop: 6,
  },
  errorCard: {
    backgroundColor: STITCH_COLORS.errorContainer,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.onErrorContainer,
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
  },
  retryBtnText: {
    fontSize: 11,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurface,
  },
  emptyCard: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
  },
  emptyRocketContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurface,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  submitFirstBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitFirstBtnText: {
    color: '#000000',
    fontSize: 12,
    fontFamily: FONTS.sans.semibold,
  },

  projectCardsList: {
    gap: 12,
  },
  projectArticleCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  frameworkPill: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  frameworkPillText: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  activeStatusText: {
    fontSize: 10,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  relativeTimeText: {
    fontSize: 11,
    color: '#737373',
    fontFamily: FONTS.mono.regular,
  },
  projectCardTitle: {
    fontSize: 17,
    fontFamily: FONTS.sans.semibold,
    letterSpacing: -0.3,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  projectCardDesc: {
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#171717',
  },
  projectManageGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionBtn: {
    backgroundColor: '#1F1F1F',
    borderColor: '#333333',
  },
  actionBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewDetailsBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsBtnText: {
    color: '#000000',
    fontSize: 12,
    fontFamily: FONTS.sans.semibold,
  },

  // 3. Signed In & Logout Card

  // 4. Privacy Policy Link
  privacyLinkRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  privacyLinkText: {
    fontSize: 12,
    color: 'grey',
    fontFamily: FONTS.sans.medium,
  },

  // Edit Project Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    maxHeight: '90%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  modalHeaderTitleCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.sans.semibold,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontFamily: FONTS.sans.semibold,
    color: '#A1A1A1',
  },
  modalErrorBox: {
    backgroundColor: '#1F1F1F',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#737373',
    padding: 10,
    marginTop: 10,
  },
  modalErrorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
  },
  modalFormScroll: {
    marginTop: 10,
    maxHeight: 420,
  },
  modalFormContent: {
    gap: 14,
    paddingBottom: 16,
  },
  modalFieldGroup: {
    gap: 6,
  },
  modalLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFieldLabel: {
    fontSize: 11,
    fontFamily: FONTS.sans.semibold,
    letterSpacing: 0.5,
    color: '#EDEDED',
  },
  modalCharCount: {
    fontSize: 11,
    color: '#737373',
    fontFamily: FONTS.mono.regular,
  },
  modalCharCountError: {
    color: '#FFFFFF',
    fontFamily: FONTS.sans.semibold,
  },
  modalInput: {
    backgroundColor: '#000000',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontFamily: FONTS.sans.regular,
    color: '#EDEDED',
  },
  modalInputMultiline: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  modalPromptInput: {
    minHeight: 100,
    fontFamily: FONTS.mono.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
});
