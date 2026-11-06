import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
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
import { FONTS, FONT_ASSETS } from './src/constants/typography';
import {
  TargetIcon,
  RocketIcon,
  SlidersIcon,
} from './src/components/navigation/NavIcons';
import RubberSegment from './src/components/navigation/RubberSegment';
import { FadeInView } from './src/components/animation/FadeInView';

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
        {/* Keyed so each tab / detail view fades in when it is shown */}
        <FadeInView
          key={selectedRepo ? `detail-${selectedRepo.id}` : activeTab}
          offset={6}
          style={styles.screenTransition}
        >
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
        </FadeInView>
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

  // Keyed fade so moving between Login, Sign Up and the app feels continuous.
  const screenKey = user ? 'app' : authScreen;

  return (
    // Static dark backdrop so the fade never reveals the default window colour.
    <View style={styles.rootBackdrop}>
      <FadeInView key={screenKey} offset={0} style={styles.rootTransition}>
        {user ? (
          <AuthenticatedView />
        ) : authScreen === 'signup' ? (
          <SignUpScreen onNavigateToLogin={() => setAuthScreen('login')} />
        ) : (
          <LoginScreen onNavigateToSignUp={() => setAuthScreen('signup')} />
        )}
      </FadeInView>
    </View>
  );
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);

  // Hold on a plain black canvas until Geist is ready so text never renders
  // in the fallback font first. If loading fails, continue with system fonts.
  if (!fontsLoaded && !fontError) {
    return <View style={styles.rootBackdrop} />;
  }

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
    fontFamily: FONTS.sans.medium,
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
    fontFamily: FONTS.sans.semibold,
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
  screenTransition: {
    flex: 1,
  },
  rootBackdrop: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  rootTransition: {
    flex: 1,
  },
  bottomDockContainer: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    paddingTop: 4,
    backgroundColor: STITCH_COLORS.background,
  },
});
