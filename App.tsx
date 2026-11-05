import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignUpScreen } from './src/screens/auth/SignUpScreen';
import { AuthenticatedPlaceholderScreen } from './src/screens/auth/AuthenticatedPlaceholderScreen';
import { SubmitBlueprintScreen } from './src/screens/blueprint/SubmitBlueprintScreen';
import { RepositoryFeedScreen } from './src/screens/feed/RepositoryFeedScreen';

type AuthenticatedTab = 'feed' | 'blueprint' | 'profile';

const AuthenticatedView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AuthenticatedTab>('feed');

  return (
    <SafeAreaView style={styles.authSafeArea}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandLogo}>⚡</Text>
          <Text style={styles.brandTitle}>ForgeAI</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.navTab,
              activeTab === 'feed' && styles.navTabActive,
            ]}
            onPress={() => setActiveTab('feed')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navTabText,
                activeTab === 'feed' && styles.navTabTextActive,
              ]}
            >
              Feed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navTab,
              activeTab === 'blueprint' && styles.navTabActive,
            ]}
            onPress={() => setActiveTab('blueprint')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navTabText,
                activeTab === 'blueprint' && styles.navTabTextActive,
              ]}
            >
              Submit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navTab,
              activeTab === 'profile' && styles.navTabActive,
            ]}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navTabText,
                activeTab === 'profile' && styles.navTabTextActive,
              ]}
            >
              Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen View */}
      <View style={styles.screenContainer}>
        {activeTab === 'feed' ? (
          <RepositoryFeedScreen
            isActive={activeTab === 'feed'}
            onNavigateToSubmit={() => setActiveTab('blueprint')}
          />
        ) : activeTab === 'blueprint' ? (
          <SubmitBlueprintScreen
            onSuccess={() => setActiveTab('feed')}
          />
        ) : (
          <AuthenticatedPlaceholderScreen
            onNavigateToSubmitBlueprint={() => setActiveTab('blueprint')}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const MainNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Initializing ForgeAI...</Text>
      </View>
    );
  }

  if (user) {
    return <AuthenticatedView />;
  }

  if (authScreen === 'signup') {
    return <SignUpScreen onNavigateToLogin={() => setAuthScreen('login')} />;
  }

  return <LoginScreen onNavigateToSignUp={() => setAuthScreen('signup')} />;
};

export default function App() {
  return (
    <AuthProvider>
      <MainNavigator />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  authSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandLogo: {
    fontSize: 20,
    marginRight: 6,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
  },
  navTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  navTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  navTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  navTabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
