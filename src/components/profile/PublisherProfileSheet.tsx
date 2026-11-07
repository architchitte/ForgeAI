import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
  ArrowRightIcon,
} from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { EducationItem } from './EducationItem';
import { ProfileCard } from './ProfileCard';

interface PublisherProfileSheetProps {
  visible: boolean;
  /** The project whose publisher is shown. */
  repository: Repository;
  onClose: () => void;
  /** Opens another of the publisher's projects (closes this sheet first). */
  onOpenProject?: (repo: Repository) => void;
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
}) => {
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [projects, setProjects] = useState<Repository[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    });
    return () => {
      cancelled = true;
    };
  }, [visible, repository.id, repository.student_email]);

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
          <View style={styles.topBar}>
            <PressableScale
              style={styles.backButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Back to project"
            >
              <ArrowLeftIcon size={18} color={STITCH_COLORS.primary} />
              <Text style={styles.backText}>Back to project</Text>
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
                <View style={styles.list}>
                  {projects.map((p) => {
                    const current = p.id === repository.id;
                    return (
                      <PressableScale
                        key={p.id}
                        style={[styles.projectCard, current && styles.projectCardCurrent]}
                        onPress={() => {
                          if (current) onClose();
                          else onOpenProject?.(p);
                        }}
                        activeOpacity={0.8}
                        pressedScale={0.98}
                        accessibilityHint={current ? 'Returns to this project' : 'Opens this project'}
                      >
                        <View style={styles.flex}>
                          <Text style={styles.projectName} numberOfLines={1}>
                            {p.app_name}
                          </Text>
                          <Text style={styles.projectDesc} numberOfLines={2}>
                            {p.one_liner}
                          </Text>
                        </View>
                        {current ? (
                          <Text style={styles.viewingTag}>Viewing</Text>
                        ) : (
                          <ArrowRightIcon size={14} color={STITCH_COLORS.outline} />
                        )}
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
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
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
  },
  projectCardCurrent: {
    borderColor: '#454545',
  },
  projectName: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
  projectDesc: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  viewingTag: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#737373',
  },
});
