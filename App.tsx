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
  WorkflowIcon,
  SlidersIcon,
} from './src/components/navigation/NavIcons';

type AuthenticatedTab = 'discover' | 'submit' | 'activity' | 'account';

const AuthenticatedView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AuthenticatedTab>('discover');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const handleSelectTab = (tab: AuthenticatedTab) => {
    setActiveTab(tab);
    if (tab === 'discover') {
      // Return to feed listings when Discover is clicked
      setSelectedRepo(null);
    }
  };

  return (
    <SafeAreaView style={styles.authSafeArea}>
      {/* Unified Glassmorphic Top Header on ALL pages (No 'Student Projects') */}
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.appBarBrand}
          onPress={() => handleSelectTab('discover')}
          activeOpacity={0.8}
        >
          <Image
            source={STITCH_ASSETS.singularityLogo}
            style={styles.appBarLogo}
            resizeMode="contain"
          />
          <Text style={styles.appBarTitle}>ForgeAI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.appBarRight}
          onPress={() => handleSelectTab('account')}
          activeOpacity={0.7}
        >
          <View style={styles.appBarAvatar}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Active Screen View */}
      <View style={styles.screenContainer}>
        {activeTab === 'discover' ? (
          selectedRepo ? (
            <ProjectDetailView
              repository={selectedRepo}
              onBack={() => setSelectedRepo(null)}
            />
          ) : (
            <RepositoryFeedScreen
              isActive={activeTab === 'discover' && !selectedRepo}
              onNavigateToSubmit={() => {
                setSelectedRepo(null);
                setActiveTab('submit');
              }}
              onSelectRepository={(repo) => setSelectedRepo(repo)}
            />
          )
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
          />
        )}
      </View>

      {/* Rounded Bottom Navigation Dock based on reference */}
      <View style={styles.bottomDockContainer}>
        <View style={styles.bottomDock}>
          {/* Tab 1: Discover — Minimal Target Reticle */}
          <TouchableOpacity
            style={[
              styles.dockItem,
              activeTab === 'discover' && !selectedRepo && styles.dockItemActive,
            ]}
            onPress={() => handleSelectTab('discover')}
            activeOpacity={0.7}
          >
            <View style={styles.dockIconWrapper}>
              <TargetIcon
                size={22}
                color={STITCH_COLORS.primaryContainer}
                strokeWidth={1.8}
              />
            </View>
            <Text
              style={[
                styles.dockLabel,
                activeTab === 'discover' && !selectedRepo && styles.dockLabelActive,
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
                color={STITCH_COLORS.primaryContainer}
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

          {/* Tab 3: Activity — Minimal Workflow Nodes */}
          <TouchableOpacity
            style={[
              styles.dockItem,
              activeTab === 'activity' && styles.dockItemActive,
            ]}
            onPress={() => handleSelectTab('activity')}
            activeOpacity={0.7}
          >
            <View style={styles.dockIconWrapper}>
              <WorkflowIcon
                size={22}
                color={STITCH_COLORS.primaryContainer}
                strokeWidth={1.8}
              />
            </View>
            <Text
              style={[
                styles.dockLabel,
                activeTab === 'activity' && styles.dockLabelActive,
              ]}
            >
              Activity
            </Text>
          </TouchableOpacity>

          {/* Tab 4: Account — Minimal Settings / Sliders */}
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
                color={STITCH_COLORS.primaryContainer}
                strokeWidth={1.8}
              />
            </View>
            <Text
              style={[
                styles.dockLabel,
                activeTab === 'account' && styles.dockLabelActive,
              ]}
            >
              Account
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
      <StatusBar style="light" />
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
    color: STITCH_COLORS.outline,
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(17, 19, 25, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 53, 59, 0.65)',
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  appBarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appBarLogo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  appBarTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.4,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appBarAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: STITCH_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: STITCH_COLORS.primaryContainer + '60',
  },
  avatarIcon: {
    fontSize: 14,
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
    backgroundColor: 'rgba(12, 14, 19, 0.96)',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(99, 102, 241, 0.4)', // subtle indigo/violet border matching the reference screenshot
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
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
    backgroundColor: 'rgba(255, 107, 26, 0.08)', // subtle active background pill indicator
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
    color: '#94A3B8',
    marginTop: 3,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  dockLabelActive: {
    color: STITCH_COLORS.primaryContainer,
    fontWeight: '700',
  },
});
