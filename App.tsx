import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignUpScreen } from './src/screens/auth/SignUpScreen';
import { AuthenticatedPlaceholderScreen } from './src/screens/auth/AuthenticatedPlaceholderScreen';

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
    return <AuthenticatedPlaceholderScreen />;
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
});
