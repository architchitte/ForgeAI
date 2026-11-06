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
  Image,
  Platform,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignUpScreen } from './src/screens/auth/SignUpScreen';
import { AuthenticatedPlaceholderScreen } from './src/screens/auth/AuthenticatedPlaceholderScreen';
import { SubmitBlueprintScreen } from './src/screens/blueprint/SubmitBlueprintScreen';
import { RepositoryFeedScreen } from './src/screens/feed/RepositoryFeedScreen';
import { ProjectDetailView } from './src/components/detail/ProjectDetailSheet';
import { Repository } from './src/types/repository';
import { STITCH_COLORS, STITCH_ASSETS } from './src/constants/theme';
import {
  TargetIcon,
  RocketIcon,
  SlidersIcon,
} from './src/components/navigation/NavIcons';

type AuthenticatedTab = 'discover' | 'submit' | 'account';

const AuthenticatedView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AuthenticatedTab>('discover');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const handleSelectTab = (tab: AuthenticatedTab) => {
    setActiveTab(tab);
    setSelectedRepo(null);
  };

  return (
    <SafeAreaView style={styles.authSafeArea}>
      {/* Centered Top Header with ForgeAI Logo */}
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.appBarBrand}
          onPress={() => handleSelectTab('discover')}
          activeOpacity={0.8}
        >
          <Text style={styles.appBarTitle}>
            Forge<Text style={styles.appBarTitleAccent}>AI</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Screen View */}
      <View style={styles.screenContainer}>
        {selectedRepo ? (
          <ProjectDetailView
            repository={selectedRepo}
            onBack={() => setSelectedRepo(null)}
          />
        ) : activeTab === 'discover' ? (
          <RepositoryFeedScreen
            isActive={activeTab === 'discover'}
            onNavigateToSubmit={() => {
              setSelectedRepo(null);
              setActiveTab('submit');
            }}
            onSelectRepository={(repo) => setSelectedRepo(repo)}
          />
        ) : activeTab === 'submit' ? (
          <SubmitBlueprintScreen
            onSuccess={() => {
              setSelectedRepo(null);
              setActiveTab('discover');
            }}
          />
        ) : (
          <AuthenticatedPlaceholderScreen
            onNavigateToSubmitBlueprint={() => {
              setSelectedRepo(null);
              setActiveTab('submit');
            }}
            onSelectRepository={(repo) => setSelectedRepo(repo)}
          />
        )}
      </View>

      {/* Rounded Bottom Navigation Dock (3 Tabs: Discover, Submit, Profile) */}
      <View style={styles.bottomDockContainer}>
        <View style={styles.bottomDock}>
          {/* Tab 1: Discover — Minimal Target Reticle */}
          <TouchableOpacity
            style={[
              styles.dockItem,
              activeTab === 'discover' && styles.dockItemActive,
            ]}
            onPress={() => handleSelectTab('discover')}
            activeOpacity={0.7}
          >
            <View style={styles.dockIconWrapper}>
              <TargetIcon
                size={22}
                color={
                  activeTab === 'discover'
                    ? STITCH_COLORS.primaryContainer
                    : STITCH_COLORS.outline
                }
                strokeWidth={1.8}
              />
            </View>
            <Text
              style={[
                styles.dockLabel,
                activeTab === 'discover' && styles.dockLabelActive,
              ]}
            >
              Discover
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Submit — Minimal Rocket */}
          <TouchableOpacity
            style={[
              styles.dockItem,
              activeTab === 'submit' && styles.dockItemActive,
            ]}
            onPress={() => handleSelectTab('submit')}
            activeOpacity={0.7}
          >
            <View style={styles.dockIconWrapper}>
              <RocketIcon
                size={22}
                color={
                  activeTab === 'submit'
                    ? STITCH_COLORS.primaryContainer
                    : STITCH_COLORS.outline
                }
                strokeWidth={1.8}
              />
            </View>
            <Text
              style={[
                styles.dockLabel,
                activeTab === 'submit' && styles.dockLabelActive,
              ]}
            >
              Submit
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Profile — Person / Sliders */}
          <TouchableOpacity
            style={[
              styles.dockItem,
              activeTab === 'account' && styles.dockItemActive,
            ]}
            onPress={() => handleSelectTab('account')}
            activeOpacity={0.7}
          >
            <View style={styles.dockIconWrapper}>
              <SlidersIcon
                size={22}
                color={
                  activeTab === 'account'
                    ? STITCH_COLORS.primaryContainer
                    : STITCH_COLORS.outline
                }
                strokeWidth={1.8}
              />
            </View>
            <Text
              style={[
                styles.dockLabel,
                activeTab === 'account' && styles.dockLabelActive,
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
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
        <ActivityIndicator size="large" color={STITCH_COLORS.primaryContainer} />
        <Text style={styles.loadingText}>Initializing ForgeAI Core...</Text>
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
    backgroundColor: STITCH_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: STITCH_COLORS.onSurfaceVariant,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  authSafeArea: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  appBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(250, 248, 255, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: STITCH_COLORS.surfaceContainerHighest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  appBarBrand: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  appBarTitleAccent: {
    color: STITCH_COLORS.primaryContainer,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  bottomDockContainer: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    paddingTop: 4,
    backgroundColor: STITCH_COLORS.background,
  },
  bottomDock: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    paddingHorizontal: 6,
  },
  dockItem: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  dockItemActive: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
  },
  dockIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 3,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  dockLabelActive: {
    color: STITCH_COLORS.primaryContainer,
    fontWeight: '700',
  },
});
