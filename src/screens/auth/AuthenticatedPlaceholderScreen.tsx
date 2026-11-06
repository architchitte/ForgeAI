import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { STITCH_COLORS } from '../../constants/theme';
import { Repository } from '../../types/repository';
import { fetchUserRepositories, updateRepository } from '../../services/repositories';
import {
  UserIcon,
  EditIcon,
  LogOutIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from '../../components/common/AppIcons';

interface AuthenticatedPlaceholderScreenProps {
  onNavigateToSubmitBlueprint?: () => void;
  onSelectRepository?: (repo: Repository) => void;
}

export const AuthenticatedPlaceholderScreen: React.FC<
  AuthenticatedPlaceholderScreenProps
> = ({ onNavigateToSubmitBlueprint, onSelectRepository }) => {
  const { user, signOut, authActionLoading, updateUserName } = useAuth();

  const fullName =
    (user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      'Alex Chen') as string;

  // Dynamic Avatar (from Google/OAuth or initials circle fallback)
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string) ||
    (user?.user_metadata?.picture as string) ||
    null;

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

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editedName, setEditedName] = useState<string>(fullName);
  const [savingName, setSavingName] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // User Projects State
  const [myProjects, setMyProjects] = useState<Repository[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Edit Project Modal State
  const [editingProject, setEditingProject] = useState<Repository | null>(null);
  const [editAppName, setEditAppName] = useState<string>('');
  const [editOneLiner, setEditOneLiner] = useState<string>('');
  const [editFramework, setEditFramework] = useState<string>('LangGraph');
  const [editSystemPrompt, setEditSystemPrompt] = useState<string>('');
  const [editDeploymentUrl, setEditDeploymentUrl] = useState<string>('');
  const [savingProject, setSavingProject] = useState<boolean>(false);
  const [projectEditError, setProjectEditError] = useState<string | null>(null);

  // Open Edit Project Modal
  const handleOpenEditProject = (project: Repository) => {
    setEditingProject(project);
    setEditAppName(project.app_name);
    setEditOneLiner(project.one_liner);
    setEditFramework(project.framework || 'LangGraph');
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
    const trimmedFramework = editFramework.trim();
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

    const result = await updateRepository(editingProject.id, {
      app_name: trimmedName,
      one_liner: trimmedOneLiner,
      framework: trimmedFramework,
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

  // Sync editedName when user metadata changes
  useEffect(() => {
    setEditedName(fullName);
  }, [fullName]);

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
      setMyProjects(result.data || []);
    }
    setLoadingProjects(false);
  }, [user?.email]);

  useEffect(() => {
    loadUserProjects();
  }, [loadUserProjects]);

  // Handle Save Name
  const handleSaveName = async () => {
    const trimmed = editedName.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty.');
      return;
    }
    setNameError(null);
    setSavingName(true);
    try {
      await updateUserName(trimmed);
      setIsEditingName(false);
    } catch (err: any) {
      setNameError(err?.message || 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(fullName);
    setNameError(null);
    setIsEditingName(false);
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of ForgeAI?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: signOut },
      ]
    );
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Profile Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.avatarInfoRow}>
            {/* Avatar with Verified Green Check Badge (Dynamic or Stylized Initials) */}
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarInitialsContainer}>
                  <Text style={styles.avatarInitialsText}>{userInitials}</Text>
                </View>
              )}
              <View style={styles.verifiedCheckBadge}>
                <Text style={styles.checkIconText}>✓</Text>
              </View>
            </View>

            {/* User Info & Inline Edit */}
            <View style={styles.userInfoCol}>
              {!isEditingName ? (
                <View style={styles.nameRow}>
                  <Text style={styles.userNameText} numberOfLines={1}>
                    {fullName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsEditingName(true)}
                    style={styles.editIconBtn}
                    activeOpacity={0.7}
                  >
                    <EditIcon size={13} color={STITCH_COLORS.outline} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameEditBox}>
                  <TextInput
                    style={styles.nameInput}
                    value={editedName}
                    onChangeText={(t) => {
                      setEditedName(t);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="Enter full name"
                    placeholderTextColor={STITCH_COLORS.outline}
                    autoFocus
                  />
                  <View style={styles.nameEditBtnRow}>
                    <TouchableOpacity
                      style={styles.saveNameBtn}
                      onPress={handleSaveName}
                      disabled={savingName}
                      activeOpacity={0.7}
                    >
                      {savingName ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveNameBtnText}>✓</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelNameBtn}
                      onPress={handleCancelEdit}
                      disabled={savingName}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelNameBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {nameError && <Text style={styles.nameErrorText}>{nameError}</Text>}
                </View>
              )}

              {/* Verified Email Pill */}
              <View style={styles.verifiedEmailPill}>
                <ShieldCheckIcon size={13} color={STITCH_COLORS.primaryContainer} />
                <Text style={styles.verifiedEmailText} numberOfLines={1}>
                  {user?.email || 'alex.chen@university.edu'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Stats Banner — Projects Count */}
          <View style={styles.bentoGrid}>
            <View style={styles.bentoTileFull}>
              <View style={styles.bentoTileRow}>
                <Text style={styles.bentoNumberPrimary}>{myProjects.length}</Text>
                <View style={styles.bentoLabelCol}>
                  <Text style={styles.bentoLabelTitle}>Published Projects</Text>
                  <Text style={styles.bentoLabelSub}>Blueprints shared in repository</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 2. My Submitted Projects Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionHeading}>My Submitted Projects</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{myProjects.length}</Text>
              </View>
            </View>

            {onNavigateToSubmitBlueprint && (
              <TouchableOpacity
                onPress={onNavigateToSubmitBlueprint}
                style={styles.newProjectLink}
                activeOpacity={0.7}
              >
                <Text style={styles.newProjectIcon}>⊕</Text>
                <Text style={styles.newProjectText}>New Project</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingProjects ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="small" color={STITCH_COLORS.primary} />
              <Text style={styles.loaderText}>Loading your projects...</Text>
            </View>
          ) : projectsError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{projectsError}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={loadUserProjects}
                activeOpacity={0.7}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : myProjects.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyRocketIcon}>🚀</Text>
              <Text style={styles.emptyTitle}>No Projects Submitted Yet</Text>
              <Text style={styles.emptySubtitle}>
                Publish an AI agent blueprint to share it with the university community.
              </Text>
              {onNavigateToSubmitBlueprint && (
                <TouchableOpacity
                  style={styles.submitFirstBtn}
                  onPress={onNavigateToSubmitBlueprint}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitFirstBtnText}>+ Submit First Project</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.projectCardsList}>
              {myProjects.map((project, idx) => (
                <View key={project.id} style={styles.projectArticleCard}>
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

                  {/* Card Body */}
                  <Text style={styles.projectCardTitle}>{project.app_name}</Text>
                  <Text style={styles.projectCardDesc} numberOfLines={2}>
                    {project.one_liner}
                  </Text>

                  {/* Card Bottom Actions */}
                  <View style={styles.cardBottomRow}>
                    <TouchableOpacity
                      style={styles.editProjectBtn}
                      onPress={() => handleOpenEditProject(project)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.editProjectBtnIcon}>✎</Text>
                      <Text style={styles.editProjectBtnText}>Edit Project</Text>
                    </TouchableOpacity>

                    <View style={styles.actionBtnGroup}>
                      {onSelectRepository && (
                        <TouchableOpacity
                          style={styles.viewDetailsBtn}
                          onPress={() => onSelectRepository(project)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.viewDetailsBtnText}>View Details</Text>
                          <ArrowRightIcon size={14} color={'white'} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 3. Signed In & Log Out Card */}
        <View style={styles.logoutCard}>
          <View style={styles.logoutInfoCol}>
            <Text style={styles.signedInLabel}>Signed In</Text>
            <Text style={styles.signedInEmail} numberOfLines={1}>
              {user?.email || 'alex.chen@university.edu'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogoutPress}
            disabled={authActionLoading}
            activeOpacity={0.8}
            testID="logout-button"
          >
            {authActionLoading ? (
              <ActivityIndicator size="small" color={STITCH_COLORS.onErrorContainer} />
            ) : (
              <>
                <LogOutIcon size={16} color={STITCH_COLORS.onErrorContainer} />
                <Text style={styles.logoutText}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Project Modal */}
      <Modal
        visible={editingProject !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalTitle}>Edit Blueprint</Text>
                <Text style={styles.modalSubtitle}>Update your project specifications</Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseEditModal}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
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

              {/* Orchestration Framework */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>ORCHESTRATION FRAMEWORK</Text>
                <View style={styles.frameworkChipsRow}>
                  {['LangGraph', 'CrewAI', 'DSPy', 'AutoGen'].map((fw) => {
                    const isSelected = editFramework === fw;
                    return (
                      <TouchableOpacity
                        key={fw}
                        style={[
                          styles.modalFrameworkChip,
                          isSelected && styles.modalFrameworkChipSelected,
                        ]}
                        onPress={() => setEditFramework(fw)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.modalFrameworkChipText,
                            isSelected && styles.modalFrameworkChipTextSelected,
                          ]}
                        >
                          {fw}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCloseEditModal}
                disabled={savingProject}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
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
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
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
  overviewCard: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest, // #ffffff
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest, // #dae2fd
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  avatarInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    position: 'relative',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
  },
  avatarInitialsContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: STITCH_COLORS.primaryFixed, // #e2dfff
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: STITCH_COLORS.surfaceContainerLowest,
  },
  avatarInitialsText: {
    fontSize: 22,
    fontWeight: '700',
    color: STITCH_COLORS.primary,
    letterSpacing: 0.5,
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: STITCH_COLORS.tertiaryContainer, // #006e4b
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  checkIconText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  userInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    fontSize: 19,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface, // #131b2e
    letterSpacing: -0.3,
  },
  editIconBtn: {
    padding: 4,
    borderRadius: 6,
  },
  editIconText: {
    fontSize: 14,
    color: STITCH_COLORS.onSurfaceVariant, // #464555
  },
  nameEditBox: {
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    fontSize: 16,
    fontWeight: '600',
    color: STITCH_COLORS.onSurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: STITCH_COLORS.primary,
  },
  nameEditBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  saveNameBtn: {
    backgroundColor: STITCH_COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveNameBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelNameBtn: {
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelNameBtnText: {
    color: STITCH_COLORS.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
  },
  nameErrorText: {
    fontSize: 11,
    color: STITCH_COLORS.error,
    marginTop: 4,
  },
  universityText: {
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 2,
    fontWeight: '400',
  },
  verifiedEmailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STITCH_COLORS.surfaceContainerLow, // #f2f3ff
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 5,
  },
  verifiedShieldIcon: {
    fontSize: 11,
  },
  verifiedEmailText: {
    fontSize: 11,
    fontWeight: '500',
    color: STITCH_COLORS.primary, // #3525cd
    maxWidth: 200,
  },

  // Bento Quick Stats — Single Full Banner for Projects
  bentoGrid: {
    marginTop: 14,
    paddingTop: 8,
  },
  bentoTileFull: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow, // #f2f3ff
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
  },
  bentoTileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bentoNumberPrimary: {
    fontSize: 24,
    fontWeight: '700',
    color: STITCH_COLORS.primary, // #3525cd
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bentoLabelCol: {
    flex: 1,
  },
  bentoLabelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: STITCH_COLORS.onSurface,
  },
  bentoLabelSub: {
    fontSize: 11,
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 1,
  },

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
    fontWeight: '600',
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
    fontWeight: '700',
    color: STITCH_COLORS.primary,
  },
  newProjectLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newProjectIcon: {
    fontSize: 15,
    color: STITCH_COLORS.primary,
  },
  newProjectText: {
    fontSize: 13,
    fontWeight: '600',
    color: STITCH_COLORS.primary,
  },

  loaderWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 12,
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
    fontWeight: '600',
    color: STITCH_COLORS.onSurface,
  },
  emptyCard: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
  },
  emptyRocketIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: STITCH_COLORS.onSurface,
  },
  emptySubtitle: {
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  submitFirstBtn: {
    backgroundColor: STITCH_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  submitFirstBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  projectCardsList: {
    gap: 12,
  },
  projectArticleCard: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest, // #ffffff
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
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
    backgroundColor: STITCH_COLORS.surfaceContainerHigh, // #e2e7ff
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  frameworkPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH_COLORS.onSurface,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STITCH_COLORS.tertiaryContainer, // #006e4b
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#67f4b7',
  },
  activeStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  relativeTimeText: {
    fontSize: 11,
    color: STITCH_COLORS.outline,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  projectCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: STITCH_COLORS.onSurface,
    marginBottom: 4,
  },
  projectCardDesc: {
    fontSize: 13,
    color: STITCH_COLORS.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: STITCH_COLORS.surfaceContainerLow,
  },
  editProjectBtn: {
    backgroundColor: STITCH_COLORS.surfaceContainerHigh, // #e2e7ff
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editProjectBtnIcon: {
    color: STITCH_COLORS.primary,
    fontSize: 12,
  },
  editProjectBtnText: {
    color: STITCH_COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewDetailsBtn: {
    backgroundColor: STITCH_COLORS.primary, // #3525cd
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  arrowIcon: {
    color: '#ffffff',
    fontSize: 12,
  },

  // 3. Signed In & Logout Card
  logoutCard: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  signedInLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: STITCH_COLORS.onSurface,
  },
  signedInEmail: {
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STITCH_COLORS.errorContainer, // #ffdad6
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  logoutIcon: {
    fontSize: 13,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH_COLORS.onErrorContainer, // #93000a
  },

  // Edit Project Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest, // #ffffff
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: STITCH_COLORS.surfaceContainerLow,
  },
  modalHeaderTitleCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
  },
  modalSubtitle: {
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: STITCH_COLORS.onSurfaceVariant,
  },
  modalErrorBox: {
    backgroundColor: STITCH_COLORS.errorContainer,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  modalErrorText: {
    color: STITCH_COLORS.onErrorContainer,
    fontSize: 12,
    fontWeight: '500',
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
    fontWeight: '700',
    letterSpacing: 0.5,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  modalCharCount: {
    fontSize: 11,
    color: STITCH_COLORS.outline,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalCharCountError: {
    color: STITCH_COLORS.error,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow, // #f2f3ff
    borderRadius: 10,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: STITCH_COLORS.onSurface,
  },
  modalInputMultiline: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  modalPromptInput: {
    minHeight: 100,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  frameworkChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalFrameworkChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
  },
  modalFrameworkChipSelected: {
    backgroundColor: STITCH_COLORS.primary,
    borderColor: STITCH_COLORS.primary,
  },
  modalFrameworkChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH_COLORS.onSurfaceVariant,
  },
  modalFrameworkChipTextSelected: {
    color: '#ffffff',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: STITCH_COLORS.surfaceContainerLow,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: STITCH_COLORS.onSurfaceVariant,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: STITCH_COLORS.primary, // #3525cd
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
