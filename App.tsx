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
import RubberSegment from './src/components/navigation/RubberSegment';

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

      {/* Rounded Bottom Navigation Dock (RubberSegment) */}
      <View style={styles.bottomDockContainer}>
        <RubberSegment
          items={[
            {
              value: 'discover',
              label: 'Discover',
              icon: (active: boolean) => (
                <TargetIcon
                  size={20}
                  color={
                    active
                      ? STITCH_COLORS.primaryContainer
                      : STITCH_COLORS.outline
                  }
                  strokeWidth={1.8}
                />
              ),
            },
            {
              value: 'submit',
              label: 'Submit',
              icon: (active: boolean) => (
                <RocketIcon
                  size={20}
                  color={
                    active
                      ? STITCH_COLORS.primaryContainer
                      : STITCH_COLORS.outline
                  }
                  strokeWidth={1.8}
                />
              ),
            },
            {
              value: 'account',
              label: 'Profile',
              icon: (active: boolean) => (
                <SlidersIcon
                  size={20}
                  color={
                    active
                      ? STITCH_COLORS.primaryContainer
                      : STITCH_COLORS.outline
                  }
                  strokeWidth={1.8}
                />
              ),
            },
          ]}
          value={activeTab}
          onChange={(val) => handleSelectTab(val as AuthenticatedTab)}
          trackColor={STITCH_COLORS.surfaceContainerLowest}
          thumbColor={STITCH_COLORS.surfaceContainerHigh}
          textColor={STITCH_COLORS.onSurfaceVariant}
          activeTextColor="#ffffff"
          height={62}
          radius={22}
          inset={4}
          stretch={100}
          squash={3}
          speed={1}
          glide={75}
          equalSlots
          draggable
        />
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
        <ActivityIndicator size="large" color="#ffffff" />
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
    color: STITCH_COLORS.onSurfaceVariant,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  authSafeArea: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  appBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: STITCH_COLORS.borderSubtle,
  },
  appBarBrand: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  appBarTitleAccent: {
    color: STITCH_COLORS.onSurfaceVariant,
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
});
