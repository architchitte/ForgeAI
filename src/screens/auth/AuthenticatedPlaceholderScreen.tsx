import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { STITCH_COLORS, STITCH_ASSETS } from '../../constants/theme';

interface AuthenticatedPlaceholderScreenProps {
  onNavigateToSubmitBlueprint?: () => void;
}

export const AuthenticatedPlaceholderScreen: React.FC<
  AuthenticatedPlaceholderScreenProps
> = ({ onNavigateToSubmitBlueprint }) => {
  const { user, signOut, authActionLoading } = useAuth();

  const provider =
    user?.app_metadata?.provider ||
    (user?.identities && user.identities.length > 0
      ? user.identities[0].provider
      : 'email');

  const fullName =
    (user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      'Student Builder') as string;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Horizon */}
        <View style={styles.header}>
          <View style={styles.badgeContainer}>
            <View style={styles.pingBeacon} />
            <Text style={styles.badgeText}>OPERATOR PROFILE</Text>
          </View>
          <Text style={styles.title}>Account Settings</Text>
          <Text style={styles.subtitle}>
            Your Supabase authentication session is active and verified.
          </Text>
        </View>

        {/* Identity Cosmic Glass Card */}
        <View style={styles.card}>
          <View style={styles.photonLine} />

          <View style={styles.profileHeader}>
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: STITCH_ASSETS.defaultAvatar }}
                style={styles.avatarImg}
              />
              <View style={styles.avatarRing} />
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{fullName}</Text>
              <Text style={styles.profileEmail} testID="authenticated-user-email">
                {user?.email || 'No email available'}
              </Text>
              <View style={styles.providerBadge}>
                <Text style={styles.providerBadgeText}>
                  AUTH: {provider.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.telemetryDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>USER UUID</Text>
            <Text style={styles.fieldValueMono} numberOfLines={1} ellipsizeMode="middle">
              {user?.id || 'Unknown ID'}
            </Text>
          </View>

          <View style={styles.telemetryDivider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>SESSION CACHE</Text>
            <Text style={styles.fieldValueHighlight}>expo-sqlite (Persistent)</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          {onNavigateToSubmitBlueprint ? (
            <Button
              title="Submit Blueprint"
              onPress={onNavigateToSubmitBlueprint}
              style={{ marginBottom: 12 }}
              testID="go-to-blueprint-button"
            />
          ) : null}

          <Button
            title="Log Out"
            variant="outline"
            onPress={signOut}
            loading={authActionLoading}
            testID="logout-button"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  pingBeacon: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.primaryContainer,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.primary,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  card: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '60',
    overflow: 'hidden',
    marginBottom: 24,
  },
  photonLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: STITCH_COLORS.primaryContainer,
    opacity: 0.7,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    position: 'relative',
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: STITCH_COLORS.primary + '60',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
  },
  profileEmail: {
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  providerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  providerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: STITCH_COLORS.secondary,
    letterSpacing: 0.8,
  },
  telemetryDivider: {
    height: 1,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest + '40',
    marginVertical: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH_COLORS.outline,
    letterSpacing: 0.8,
  },
  fieldValueMono: {
    fontSize: 11,
    color: STITCH_COLORS.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    maxWidth: '60%',
  },
  fieldValueHighlight: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH_COLORS.primary,
  },
  actionContainer: {
    marginTop: 8,
  },
});
