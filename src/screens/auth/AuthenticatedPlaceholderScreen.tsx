import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';

export const AuthenticatedPlaceholderScreen: React.FC = () => {
  const { user, signOut, authActionLoading } = useAuth();

  const provider =
    user?.app_metadata?.provider ||
    (user?.identities && user.identities.length > 0
      ? user.identities[0].provider
      : 'email');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>MVP Step 3 Complete</Text>
          </View>
          <Text style={styles.title}>ForgeAI Authenticated</Text>
          <Text style={styles.subtitle}>
            Your Supabase authentication session is active and persisted.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Session Profile</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <Text style={styles.fieldValue} testID="authenticated-user-email">
              {user?.email || 'No email available'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>User ID</Text>
            <Text style={styles.fieldSubValue} numberOfLines={1} ellipsizeMode="middle">
              {user?.id || 'Unknown ID'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Auth Provider</Text>
            <View style={styles.providerBadge}>
              <Text style={styles.providerBadgeText}>
                {provider.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Session Storage</Text>
            <Text style={styles.storageValue}>expo-sqlite (Persistent)</Text>
          </View>
        </View>

        <View style={styles.nextStepBox}>
          <Text style={styles.nextStepTitle}>Ready for Step 4</Text>
          <Text style={styles.nextStepText}>
            User session verified. The application is ready for the Repository
            Feed and Blueprint Submission modules.
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <Button
            title="Log Out"
            variant="outline"
            onPress={signOut}
            loading={authActionLoading}
            testID="authenticated-logout-button"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badgeContainer: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 12,
  },
  badgeText: {
    color: '#4338CA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  fieldRow: {
    marginVertical: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  fieldSubValue: {
    fontSize: 13,
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  providerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  providerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  storageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  nextStepBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  nextStepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  nextStepText: {
    fontSize: 13,
    color: '#1E3A8A',
    lineHeight: 18,
  },
  actionContainer: {
    width: '100%',
  },
});
