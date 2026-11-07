import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { COMMUNITY_MEMBER_LABEL } from '../../constants/identity';
import { Repository } from '../../types/repository';
import {
  PublisherProfile,
  sortEducation,
} from '../../types/profile';
import { fetchPublisherProfile } from '../../services/publisher';
import { fetchUserRepositories } from '../../services/repositories';
import { getAvatarUrl } from '../../services/ownProfile';
import {
  ArrowLeftIcon,
} from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { EducationItem } from './EducationItem';
import { ProfileCard } from './ProfileCard';
import { ProjectCard } from '../feed/ProjectCard';
import { LikersSheet } from '../engagement/LikersSheet';
import { useLikes } from '../../context/LikesContext';
import { fetchScreenshotsForRepositories } from '../../services/screenshots';
import {
  ProjectTechnology,
  fetchTechnologiesForRepositories,
} from '../../services/technologies';
import { ProjectScreenshot } from '../../types/screenshot';

interface PublisherProfileSheetProps {
  visible: boolean;
  /** The project whose publisher is shown. */
  repository: Repository;
  onClose: () => void;
  /** Opens one of the publisher's projects (closes this sheet first). */
  onOpenProject?: (repo: Repository) => void;
  /** Top-left back label, e.g. "Back to search" (default "Back to project"). */
  backLabel?: string;
  /**
   * Render inside the app's screen area instead of a full-screen modal, so
   * the bottom navigation stays visible (Android back → onClose).
   */
  inline?: boolean;
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

/**
 * Read-only public profile of a project's publisher: picture, name, college,
 * location, bio, education and their other projects. No email or account id
 * is ever shown or fetched.
 */
export const PublisherProfileSheet: React.FC<PublisherProfileSheetProps> = ({
  visible,
  repository,
  onClose,
  onOpenProject,
  backLabel = 'Back to project',
  inline = false,
}) => {
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [projects, setProjects] = useState<Repository[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Same data the Discover cards use (batched for this founder's projects).
  const [screenshots, setScreenshots] = useState<Record<string, ProjectScreenshot>>({});
  const [technologies, setTechnologies] = useState<Record<string, ProjectTechnology[]>>({});
  const [likersFor, setLikersFor] = useState<string | null>(null);
  const { likes, pendingIds, refreshLikes, toggleLike } = useLikes();

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchPublisherProfile(repository.id),
      fetchUserRepositories(repository.student_email),
    ]).then(([p, r]) => {
      if (cancelled) return;
      setProfile(p.data);
      setError(p.error);
      setProjects(r.data ?? null);
      setLoading(false);
      const ids = (r.data ?? []).map((x) => x.id);
      if (ids.length === 0) return;
      // Card extras: screenshots, technologies and like state (all batched).
      fetchScreenshotsForRepositories(ids).then((res) => {
        if (!cancelled && res.data) setScreenshots(res.data);
      });
      fetchTechnologiesForRepositories(ids).then((res) => {
        if (!cancelled && res.data) setTechnologies(res.data);
      });
      refreshLikes(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, repository.id, repository.student_email, refreshLikes]);

  // Fall back to what the project itself says if the profile can't load.
  const name =
    profile?.display_name?.trim() ||
    repository.student_name?.trim() ||
    COMMUNITY_MEMBER_LABEL;
  const college = profile?.college?.trim() || repository.university?.trim() || '';
  const location = [profile?.city, profile?.country]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .join(', ');
  const initials = name === COMMUNITY_MEMBER_LABEL ? '' : initialsOf(name);
  const education = useMemo(() => sortEducation(profile?.education ?? []), [profile]);
  // Same rule as the owner's profile: ongoing first, else latest completed.
  const currentEducation = education[0] ?? null;

  // Android back closes the inline view (the modal handles it itself).
  useEffect(() => {
    if (!inline) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [inline, onClose]);

  const body = (
    <>
          <View style={styles.topBar}>
            <PressableScale
              style={styles.backButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={backLabel}
            >
              <ArrowLeftIcon size={18} color={STITCH_COLORS.primary} />
              <Text style={styles.backText}>{backLabel}</Text>
            </PressableScale>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header (same card as the Profile tab / project page) */}
            <ProfileCard
              name={name}
              avatarUri={profile?.avatar_path ? getAvatarUrl(profile.avatar_path) : null}
              initials={initials}
              currentEducation={currentEducation}
              college={college}
              location={location}
              bio={profile?.bio}
              style={styles.headerCard}
            />
            {loading && (
              <ActivityIndicator
                style={styles.headerSpinner}
                size="small"
                color={STITCH_COLORS.onSurfaceVariant}
              />
            )}
            {!loading && error ? <Text style={styles.note}>{error}</Text> : null}

            {/* Education */}
            {!loading && profile?.has_account !== false && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Education</Text>
                {education.length === 0 ? (
                  <Text style={styles.empty}>No education added yet.</Text>
                ) : (
                  <View style={styles.list}>
                    {education.map((e, i) => (
                      <EducationItem
                        key={`${e.degree}-${e.institution_name}-${e.start_year}-${i}`}
                        education={e}
                        position={i + 1}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Projects */}
            {!loading && projects && projects.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Projects <Text style={styles.count}>({projects.length})</Text>
                </Text>
                {/* Same cards as the Discover feed */}
                <View>
                  {projects.map((p, index) => {
                    const summary = likes[p.id];
                    return (
                      <ProjectCard
                        key={p.id}
                        item={p}
                        index={index}
                        onPress={(repo) => (onOpenProject ? onOpenProject(repo) : onClose())}
                        likeCount={summary?.count}
                        liked={summary?.likedByMe ?? false}
                        likePending={pendingIds[p.id] === true}
                        onToggleLike={toggleLike}
                        onShowLikers={setLikersFor}
                        screenshot={screenshots[p.id]}
                        technologies={technologies[p.id]}
                      />
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
          <LikersSheet
            repositoryId={likersFor}
            appName={projects?.find((x) => x.id === likersFor)?.app_name}
            onClose={() => setLikersFor(null)}
          />
    </>
  );

  if (inline) {
    return <View style={styles.sheet}>{body}</View>;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaProvider>
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom', 'left', 'right']}>
          {body}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

/** The publisher profile as an in-app screen (bottom navigation stays visible). */
export const PublisherProfileView: React.FC<
  Omit<PublisherProfileSheetProps, 'visible' | 'inline'>
> = (props) => <PublisherProfileSheet {...props} visible inline />;

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  topBar: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 13,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurface,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    marginBottom: 16,
  },
  headerSpinner: {
    marginBottom: 16,
  },
  note: {
    marginTop: -6,
    marginBottom: 16,
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  count: {
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  empty: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  list: {
    gap: 10,
  },
});
