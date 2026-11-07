import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import type { useEducation } from '../../hooks/useEducation';
import { CameraIcon, CloseIcon, EditIcon, LogOutIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { EditProfileModal, PersonalInfoValues } from './EditProfileModal';
import { EducationSection } from './EducationSection';
import { AccountSecuritySection } from './AccountSecuritySection';

interface ProfileSettingsSheetProps {
  visible: boolean;
  onClose: () => void;

  // Personal information
  avatarUri: string | null;
  initials: string;
  avatarBusy: boolean;
  /** Opens the choose / replace / remove photo options. */
  onChangeAvatar: () => void;
  personalInfo: PersonalInfoValues;
  savingProfile: boolean;
  onSaveProfile: (values: PersonalInfoValues) => Promise<string | null>;

  // Education (shared with the profile tab)
  education: ReturnType<typeof useEducation>;

  // Logout
  email: string;
  loggingOut: boolean;
  onLogout: () => void;
}

/**
 * Profile settings (opened from the ☰ button on the Profile tab). Everything
 * that changes the profile lives here, in four sections: Personal
 * Information, Education, Security and Log Out. The Profile tab itself is
 * display-only.
 */
export const ProfileSettingsSheet: React.FC<ProfileSettingsSheetProps> = ({
  visible,
  onClose,
  avatarUri,
  initials,
  avatarBusy,
  onChangeAvatar,
  personalInfo,
  savingProfile,
  onSaveProfile,
  education,
  email,
  loggingOut,
  onLogout,
}) => {
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  const rows = [
    { label: 'Full name', value: personalInfo.fullName },
    {
      label: 'Location',
      value: [personalInfo.city, personalInfo.country].filter((v) => v.trim()).join(', '),
    },
    { label: 'Bio', value: personalInfo.bio },
  ];

  const handleSave = async (values: PersonalInfoValues) => {
    const err = await onSaveProfile(values);
    if (!err) setEditOpen(false);
    return err;
  };

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
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <PressableScale
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityLabel="Close settings"
            >
              <CloseIcon size={16} color="#FFFFFF" />
            </PressableScale>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* 1. Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.card}>
                <View style={styles.photoRow}>
                  <View style={styles.avatar}>
                    {avatarUri && !avatarFailed ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatarImg}
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <Text style={styles.avatarText}>{initials}</Text>
                    )}
                    {avatarBusy && (
                      <View style={styles.avatarBusy}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.photoTitle}>Profile picture</Text>
                    <Text style={styles.photoHint}>JPG, PNG or WebP · up to 5 MB</Text>
                  </View>
                  <PressableScale
                    style={[styles.smallButton, avatarBusy && styles.disabled]}
                    onPress={onChangeAvatar}
                    disabled={avatarBusy}
                    activeOpacity={0.8}
                    accessibilityLabel="Change profile picture"
                  >
                    <CameraIcon size={12} color="#EDEDED" />
                    <Text style={styles.smallButtonText}>Change</Text>
                  </PressableScale>
                </View>

                {rows.map((row) => (
                  <View key={row.label} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={[styles.infoValue, !row.value && styles.infoEmpty]}>
                      {row.value || 'Not added'}
                    </Text>
                  </View>
                ))}

                <PressableScale
                  style={styles.wideButton}
                  onPress={() => setEditOpen(true)}
                  activeOpacity={0.8}
                  pressedScale={0.98}
                  testID="edit-profile-button"
                >
                  <EditIcon size={13} color="#EDEDED" />
                  <Text style={styles.wideButtonText}>Edit personal information</Text>
                </PressableScale>
              </View>
            </View>

            {/* 2. Education */}
            <EducationSection education={education} />

            {/* 3. Security */}
            <AccountSecuritySection title="Security" />

            {/* 4. Log Out */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Log Out</Text>
              <View style={[styles.card, styles.logoutCard]}>
                <View style={styles.flex}>
                  <Text style={styles.infoLabel}>Signed in as</Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
                <PressableScale
                  style={[styles.logoutButton, loggingOut && styles.disabled]}
                  onPress={onLogout}
                  disabled={loggingOut}
                  activeOpacity={0.8}
                  testID="logout-button"
                >
                  {loggingOut ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <LogOutIcon size={15} color="#FFFFFF" />
                      <Text style={styles.logoutText}>Log Out</Text>
                    </>
                  )}
                </PressableScale>
              </View>
            </View>
          </ScrollView>

          <EditProfileModal
            visible={editOpen}
            initial={personalInfo}
            saving={savingProfile}
            onClose={() => setEditOpen(false)}
            onSave={handleSave}
          />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
    padding: 14,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 48,
    height: 48,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
  avatarBusy: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
  },
  photoHint: {
    marginTop: 2,
    fontSize: 11.5,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
  },
  smallButtonText: {
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  infoRow: {
    paddingVertical: 10,
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#737373',
  },
  infoValue: {
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: FONTS.sans.regular,
    color: '#EDEDED',
  },
  infoEmpty: {
    color: '#525252',
  },
  wideButton: {
    marginTop: 12,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  wideButtonText: {
    fontSize: 13,
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  email: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: '#EDEDED',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#454545',
    backgroundColor: '#1F1F1F',
  },
  logoutText: {
    fontSize: 13,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.45,
  },
});
