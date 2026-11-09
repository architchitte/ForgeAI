import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Keep the native splash up until fonts are loaded and the stored session has
// been restored, then fade straight into the first real screen.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });

// Safety net: never leave the splash up if initialization stalls.
const SPLASH_MAX_MS = 6000;
const hideSplash = () => {
  SplashScreen.hideAsync().catch(() => {});
};

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignUpScreen } from './src/screens/auth/SignUpScreen';
import { AuthenticatedPlaceholderScreen } from './src/screens/auth/AuthenticatedPlaceholderScreen';
import { SubmitBlueprintScreen } from './src/screens/blueprint/SubmitBlueprintScreen';
import { RepositoryFeedScreen } from './src/screens/feed/RepositoryFeedScreen';
import { ProjectDetailView } from './src/components/detail/ProjectDetailSheet';
import { RepositorySummary } from './src/types/repository';
import { STITCH_COLORS } from './src/constants/theme';
import { FONTS, FONT_ASSETS } from './src/constants/typography';
import RubberSegment from './src/components/navigation/RubberSegment';
import { FadeInView } from './src/components/animation/FadeInView';
import { TutorialOverlay } from './src/components/onboarding/TutorialOverlay';
import { TUTORIAL_STEPS, shouldShowTutorial } from './src/constants/tutorial';
import { useProfileSync } from './src/hooks/useProfileSync';
import { LikesProvider } from './src/context/LikesContext';
import { ResetPasswordScreen } from './src/screens/auth/ResetPasswordScreen';
import { SearchScreen } from './src/screens/search/SearchScreen';
import { ActivityScreen } from './src/screens/activity/ActivityScreen';
import { PublisherProfileView } from './src/components/profile/PublisherProfileSheet';
import {
  SearchIcon,
  BellIcon,
  CompassIcon,
  PlusSquareIcon,
  UserIcon,
} from './src/components/common/AppIcons';
import {
  ChatHeaderButton,
  ChatInboxScreen,
  ChatRoute,
  ChatThreadScreen,
  NewChatScreen,
  useChatConnection,
} from './src/features/chat';

type AuthenticatedTab = 'discover' | 'search' | 'submit' | 'activity' | 'account';

const AuthenticatedView: React.FC = () => {
  const { user, completeTutorial } = useAuth();
  // Mirror the user's display name into public.profiles for comment labels.
  useProfileSync();
  // Chat session (realtime channel + cached state) follows the signed-in user.
  useChatConnection(user?.id);
  const [activeTab, setActiveTab] = useState<AuthenticatedTab>('discover');
  const [selectedRepo, setSelectedRepo] = useState<RepositorySummary | null>(null);
  // Founder profile shown in-app (via one of their projects); sits above the
  // project page, so Back returns to wherever it was opened from.
  const [profileRepo, setProfileRepo] = useState<RepositorySummary | null>(null);
  // …or a profile opened by account id (followers lists, Activity).
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const openRepoProfile = useCallback((repo: RepositorySummary) => {
    setProfileUserId(null);
    setProfileRepo(repo);
  }, []);
  const openUserProfile = useCallback((id: string) => {
    setProfileRepo(null);
    setProfileUserId(id);
  }, []);
  const closeProfile = useCallback(() => {
    setProfileRepo(null);
    setProfileUserId(null);
  }, []);

  // Chats sit above whatever is open (tab, project or profile); closing the
  // inbox returns there. Switching tabs closes chat.
  const [chatRoute, setChatRoute] = useState<ChatRoute | null>(null);
  const openInbox = useCallback(() => setChatRoute({ screen: 'inbox' }), []);
  const closeChat = useCallback(() => setChatRoute(null), []);
  const openNewChat = useCallback(() => setChatRoute({ screen: 'new' }), []);
  const openConversation = useCallback(
    (conversationId: string) => setChatRoute({ screen: 'thread', conversationId }),
    []
  );

  // First-run tutorial: null = hidden, otherwise the current step index.
  // Decided once on mount so a metadata refresh mid-tour doesn't restart it.
  const [tutorialStep, setTutorialStep] = useState<number | null>(() =>
    shouldShowTutorial(user) ? 0 : null
  );

  // Show the real tab each tutorial step describes behind the overlay.
  useEffect(() => {
    if (tutorialStep === null) return;
    const step = TUTORIAL_STEPS[tutorialStep];
    if (!step) return;
    setSelectedRepo(null);
    setProfileRepo(null);
    setProfileUserId(null);
    setChatRoute(null);
    setActiveTab(step.tab);
  }, [tutorialStep]);

  const finishTutorial = useCallback(() => {
    setTutorialStep(null);
    setSelectedRepo(null);
    setProfileRepo(null);
    setProfileUserId(null);
    setChatRoute(null);
    setActiveTab('discover');
    // Hide locally right away; a failed save only means it may show again.
    completeTutorial().catch((err: any) => {
      console.warn('[Tutorial] Failed to save completion:', err?.message || err);
    });
  }, [completeTutorial]);

  const handleTutorialNext = useCallback(() => {
    if (tutorialStep === null) return;
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
      finishTutorial();
    } else {
      setTutorialStep(tutorialStep + 1);
    }
  }, [tutorialStep, finishTutorial]);

  const handleTutorialBack = useCallback(() => {
    setTutorialStep((i) => (i === null || i === 0 ? i : i - 1));
  }, []);

  const handleSelectTab = (tab: AuthenticatedTab) => {
    setActiveTab(tab);
    setSelectedRepo(null);
    setProfileRepo(null);
    setProfileUserId(null);
    setChatRoute(null);
  };

  const noOverlay =
    chatRoute === null && selectedRepo === null && profileRepo === null && profileUserId === null;
  // The thread's composer takes the bottom edge, so the dock steps aside.
  const isDockHidden = chatRoute?.screen === 'thread';
  const isFeedVisible = activeTab === 'discover' && noOverlay;
  // Search also stays mounted, so a query survives opening a project / profile.
  const isSearchVisible = activeTab === 'search' && noOverlay;

  const TAB_LABEL: Record<AuthenticatedTab, string> = {
    discover: 'discover',
    search: 'search',
    submit: 'submit',
    activity: 'activity',
    account: 'profile',
  };
  const profileBackLabel = selectedRepo ? 'Back to project' : `Back to ${TAB_LABEL[activeTab]}`;

  const handleNavigateToSubmit = useCallback(() => {
    setSelectedRepo(null);
    setActiveTab('submit');
  }, []);

  return (
    <SafeAreaView style={styles.authSafeArea}>
      {/* Centered Top Header with Forge Logo (chat screens have their own header) */}
      {chatRoute === null && (
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.appBarBrand}
            onPress={() => handleSelectTab('discover')}
            activeOpacity={0.8}
          >
            <Text style={styles.appBarTitle}>Forge</Text>
          </TouchableOpacity>
          <ChatHeaderButton style={styles.appBarRight} onPress={openInbox} />
        </View>
      )}

      {/* Active Screen View */}
      <View style={styles.screenContainer}>
        {/*
          Discover stays mounted while hidden so it keeps its data, scroll
          position and filters, and refreshes quietly via `isActive` instead
          of refetching behind a spinner on every visit.
        */}
        <FadeInView
          trigger={isFeedVisible}
          disabled={!isFeedVisible}
          offset={6}
          style={[styles.screenTransition, !isFeedVisible && styles.hiddenScreen]}
          pointerEvents={isFeedVisible ? 'auto' : 'none'}
          accessibilityElementsHidden={!isFeedVisible}
          importantForAccessibility={isFeedVisible ? 'auto' : 'no-hide-descendants'}
        >
          <RepositoryFeedScreen
            isActive={isFeedVisible}
            onNavigateToSubmit={handleNavigateToSubmit}
            onSelectRepository={setSelectedRepo}
            onOpenUserProfile={openUserProfile}
          />
        </FadeInView>

        <FadeInView
          trigger={isSearchVisible}
          disabled={!isSearchVisible}
          offset={6}
          style={[styles.screenTransition, !isSearchVisible && styles.hiddenScreen]}
          pointerEvents={isSearchVisible ? 'auto' : 'none'}
          accessibilityElementsHidden={!isSearchVisible}
          importantForAccessibility={isSearchVisible ? 'auto' : 'no-hide-descendants'}
        >
          <SearchScreen
            isActive={isSearchVisible}
            onSelectRepository={setSelectedRepo}
            onOpenProfile={openRepoProfile}
          />
        </FadeInView>

        {/* Other tabs / detail view mount on demand; keyed so each fades in */}
        {!isFeedVisible && !isSearchVisible && (
          <FadeInView
            key={
              chatRoute
                ? `chat-${chatRoute.screen}-${chatRoute.screen === 'thread' ? chatRoute.conversationId : ''}`
                : profileRepo || profileUserId
                ? `profile-${profileRepo?.id ?? profileUserId}`
                : selectedRepo
                  ? `detail-${selectedRepo.id}`
                  : activeTab
            }
            offset={6}
            style={styles.screenTransition}
          >
            {chatRoute?.screen === 'inbox' ? (
              <ChatInboxScreen
                onBack={closeChat}
                onOpenConversation={openConversation}
                onNewChat={openNewChat}
              />
            ) : chatRoute?.screen === 'new' ? (
              <NewChatScreen onBack={openInbox} onOpenConversation={openConversation} />
            ) : chatRoute?.screen === 'thread' ? (
              <ChatThreadScreen conversationId={chatRoute.conversationId} onBack={openInbox} />
            ) : profileRepo || profileUserId ? (
              <PublisherProfileView
                repository={profileRepo}
                userId={profileUserId}
                onOpenUser={openUserProfile}
                backLabel={profileBackLabel}
                onClose={closeProfile}
                onOpenProject={(repo) => {
                  closeProfile();
                  setSelectedRepo(repo);
                }}
              />
            ) : selectedRepo ? (
              <ProjectDetailView
                repository={selectedRepo}
                onBack={() => setSelectedRepo(null)}
                onOpenProject={setSelectedRepo}
                onOpenPublisher={openRepoProfile}
                onOpenUserProfile={openUserProfile}
              />
            ) : activeTab === 'activity' ? (
              <ActivityScreen
                isActive
                onSelectRepository={setSelectedRepo}
                onOpenUserProfile={openUserProfile}
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
                onOpenUserProfile={openUserProfile}
                onNavigateToSubmitBlueprint={handleNavigateToSubmit}
                onSelectRepository={setSelectedRepo}
              />
            )}
          </FadeInView>
        )}
      </View>

      {/* Rounded Bottom Navigation Dock (RubberSegment) */}
      <View style={[styles.bottomDockContainer, isDockHidden && styles.hiddenScreen]}>
        <RubberSegment
          items={[
            {
              value: 'discover',
              label: 'Discover',
              icon: (active: boolean) => (
                <CompassIcon size={20} color={active ? STITCH_COLORS.primaryContainer : STITCH_COLORS.outline} />
              ),
            },
            {
              value: 'search',
              label: 'Search',
              icon: (active: boolean) => (
                <SearchIcon size={20} color={active ? STITCH_COLORS.primaryContainer : STITCH_COLORS.outline} />
              ),
            },
            {
              value: 'submit',
              label: 'Submit',
              icon: (active: boolean) => (
                <PlusSquareIcon size={20} color={active ? STITCH_COLORS.primaryContainer : STITCH_COLORS.outline} />
              ),
            },
            {
              value: 'activity',
              label: 'Activity',
              icon: (active: boolean) => (
                <BellIcon size={20} color={active ? STITCH_COLORS.primaryContainer : STITCH_COLORS.outline} />
              ),
            },
            {
              value: 'account',
              label: 'Profile',
              icon: (active: boolean) => (
                <UserIcon size={20} color={active ? STITCH_COLORS.primaryContainer : STITCH_COLORS.outline} />
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

      {tutorialStep !== null && (
        <TutorialOverlay
          steps={TUTORIAL_STEPS}
          stepIndex={tutorialStep}
          onNext={handleTutorialNext}
          onBack={handleTutorialBack}
          onSkip={finishTutorial}
        />
      )}
    </SafeAreaView>
  );
};

const MainNavigator: React.FC = () => {
  const { user, loading, passwordRecovery } = useAuth();
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');

  // Fonts are already loaded by the time this renders; hide once auth is ready.
  useEffect(() => {
    if (!loading) hideSplash();
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Initializing Forge Core...</Text>
      </View>
    );
  }

  // Keyed fade so moving between Login, Sign Up and the app feels continuous.
  const screenKey = user ? (passwordRecovery ? 'recovery' : 'app') : authScreen;

  return (
    // Static dark backdrop so the fade never reveals the default window colour.
    <View style={styles.rootBackdrop}>
      <FadeInView key={screenKey} offset={0} style={styles.rootTransition}>
        {user && passwordRecovery ? (
          // Opened a password-recovery link: set the new password first.
          <ResetPasswordScreen />
        ) : user ? (
          <LikesProvider>
            <AuthenticatedView />
          </LikesProvider>
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

  useEffect(() => {
    const timer = setTimeout(hideSplash, SPLASH_MAX_MS);
    return () => clearTimeout(timer);
  }, []);

  // Hold on a plain black canvas until Geist is ready so text never renders
  // in the fallback font first. If loading fails, continue with system fonts.
  if (!fontsLoaded && !fontError) {
    return <View style={styles.rootBackdrop} />;
  }

  return (
    <SafeAreaProvider style={styles.rootBackdrop}>
      <AuthProvider>
        <MainNavigator />
        <StatusBar style="light" />
      </AuthProvider>
    </SafeAreaProvider>
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
  appBarRight: {
    position: 'absolute',
    right: 8,
    top: 7,
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
  hiddenScreen: {
    display: 'none',
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
